import { Router, Request, Response, NextFunction } from "express"
import multer from "multer"
import path from "path"
import fs from "fs/promises"
import { randomUUID } from "crypto"
import { DatabaseService } from "./db"
import { DataResolver } from "../models/query"
import { requireEditor } from "./authz"
import {
  bumpProgress,
  completeJob,
  createJob,
  failJob,
  getJob,
  markRunning,
  setErrors
} from "./jobManager"
import { AllMappings } from "../tools/allMappings"
import {
  getCSVHeadersFromBuffer,
  importCSVFromBuffer
} from "../tools/csv"
import { createDirectLookup } from "../tools/lookup"
import {
  debugCheckHeaders,
  LookupError,
  TrackedMappingErrors
} from "../tools/importer"
import {
  Contribution,
  ContributionStatus,
  PublicationBatch
} from "../models/contribution"

type AuthenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void

interface BulkImportDeps {
  authenticateJWT: AuthenticateJWT
  getAuthorFromRequest: (req: Request) => string | null
  dbService: DatabaseService
  resolver: DataResolver
  uploadDir: string
}

// Rejected and Published are deliberately excluded: a bulk CSV import is the
// *creation* of contributions. Rejected/Published are end-of-lifecycle
// states that should only be reached via the review/publish pipeline, not
// asserted at insert time.
const VALID_STATUSES = new Set<number>([
  ContributionStatus.WorkInProgress,
  ContributionStatus.Submitted,
  ContributionStatus.Accepted
])

const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel"
])

const CSV_FILE_FILTER: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (CSV_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
    return
  }
  cb(new Error(`File type ${file.mimetype} not allowed for CSV upload`))
}

const CSV_SIZE_LIMIT = 100 * 1024 * 1024 // 100 MB

/**
 * Wrap a multer middleware so its errors land as a 400 instead of being
 * forwarded to the global 500 handler (which would echo a stack trace). Also
 * cleans up any partial disk file that multer wrote before failing.
 */
const wrapMulter =
  (upload: (req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, async (err: unknown) => {
      if (!err) {
        next()
        return
      }
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {})
      }
      if (err instanceof multer.MulterError) {
        const detail =
          err.code === "LIMIT_FILE_SIZE"
            ? `Maximum CSV size is ${CSV_SIZE_LIMIT / (1024 * 1024)}MB`
            : err.code === "LIMIT_UNEXPECTED_FILE"
              ? "Use 'file' as the multipart field name for the CSV"
              : err.message
        res.status(400).json({ error: "Upload error", details: detail })
        return
      }
      // fileFilter rejection or any other error in the upload chain.
      res
        .status(400)
        .json({ error: "Invalid upload", details: (err as Error).message })
    })
  }

const truncateRowNumbers = (
  errors: TrackedMappingErrors[],
  maxKept = 6
): TrackedMappingErrors[] => {
  for (const e of errors) {
    e.count = e.rowNumbers.length
    if (e.rowNumbers.length > maxKept) {
      const kept = maxKept - 1
      const more = e.rowNumbers.length - kept
      e.rowNumbers.splice(kept)
      e.rowNumbers.push(`... and ${more} more`)
    }
  }
  return errors
}

const sortErrors = (errors: TrackedMappingErrors[]) => {
  errors.sort((a, b) => {
    let cmp = a.error.kind.localeCompare(b.error.kind)
    if (cmp === 0 && a.error.kind === "lookup") {
      const la = a.error as LookupError
      const lb = b.error as LookupError
      cmp = la.schema.localeCompare(lb.schema)
      if (cmp === 0) {
        cmp = la.value.localeCompare(lb.value)
      }
    }
    return cmp
  })
  return errors
}

export interface UploadMetadata {
  contribStatus: number
  onError: "abort" | "continue"
  batchTitle?: string
  batchComments?: string
  contributionTitle?: string
  contributionComments?: string
  maxRows?: number
}

/**
 * Substitute per-row placeholders in a user-supplied template. Supported
 * tokens: {id}, {entityName}, {filename}, {index} (1-based row position).
 * Unknown tokens are left untouched.
 */
export const applyContributionTemplate = (
  template: string,
  ctx: {
    entityName: string
    filename: string
    id: string | number
    index: number
  }
): string =>
  template.replace(
    /\{(id|entityName|filename|index)\}/g,
    (_, key: keyof typeof ctx) => String(ctx[key])
  )

export const parseUploadMetadata = (
  raw: unknown
): UploadMetadata | { error: string } => {
  let body: Record<string, unknown> = {}
  if (raw !== undefined && raw !== "" && raw !== null) {
    if (typeof raw !== "string") {
      return { error: "metadata must be a JSON string" }
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { error: "metadata must be a JSON object" }
      }
      body = parsed as Record<string, unknown>
    } catch (e) {
      return { error: `metadata is not valid JSON: ${(e as Error).message}` }
    }
  }
  let contribStatus: number = ContributionStatus.WorkInProgress
  if (body.contribStatus !== undefined && body.contribStatus !== null) {
    const n =
      typeof body.contribStatus === "number"
        ? body.contribStatus
        : parseInt(String(body.contribStatus), 10)
    if (!Number.isFinite(n) || !VALID_STATUSES.has(n)) {
      return {
        error:
          "contribStatus must be one of 0 (WorkInProgress), 1 (Submitted), 2 (Accepted). Rejected and Published are reached via review/publish, not on import."
      }
    }
    contribStatus = n
  }
  let onError: "abort" | "continue" = "abort"
  if (body.onError !== undefined && body.onError !== null && body.onError !== "") {
    if (body.onError !== "abort" && body.onError !== "continue") {
      return { error: "onError must be 'abort' or 'continue'" }
    }
    onError = body.onError
  }
  const batchTitle =
    body.batchTitle !== undefined && body.batchTitle !== null
      ? String(body.batchTitle).trim()
      : undefined
  if (batchTitle !== undefined && batchTitle.length === 0) {
    return { error: "batchTitle, if provided, must not be empty" }
  }
  const batchComments =
    body.batchComments !== undefined && body.batchComments !== null
      ? String(body.batchComments)
      : undefined
  const contributionTitle =
    body.contributionTitle !== undefined && body.contributionTitle !== null
      ? String(body.contributionTitle).trim()
      : undefined
  if (contributionTitle !== undefined && contributionTitle.length === 0) {
    return { error: "contributionTitle, if provided, must not be empty" }
  }
  const contributionComments =
    body.contributionComments !== undefined &&
    body.contributionComments !== null
      ? String(body.contributionComments)
      : undefined
  let maxRows: number | undefined
  if (body.maxRows !== undefined && body.maxRows !== null) {
    const n =
      typeof body.maxRows === "number"
        ? body.maxRows
        : parseInt(String(body.maxRows), 10)
    if (!Number.isInteger(n) || n <= 0) {
      return { error: "maxRows, if provided, must be a positive integer" }
    }
    maxRows = n
  }
  return {
    contribStatus,
    onError,
    batchTitle,
    batchComments,
    contributionTitle,
    contributionComments,
    maxRows
  }
}

interface RunImportArgs {
  jobId: string
  schemaName: string
  filePath: string
  status: number
  onError: "abort" | "continue"
  filename: string
  author: string
  batchTitle?: string
  batchComments?: string
  contributionTitle?: string
  contributionComments?: string
  maxRows?: number
  dbService: DatabaseService
  resolver: DataResolver
}

const runImport = async (args: RunImportArgs): Promise<void> => {
  const {
    jobId,
    schemaName,
    filePath,
    status,
    onError,
    filename,
    author,
    dbService,
    resolver
  } = args
  try {
    const buffer = await fs.readFile(filePath)
    const errors: TrackedMappingErrors[] = []
    const lookup = createDirectLookup(resolver)
    const updates = await importCSVFromBuffer(
      buffer,
      schemaName,
      lookup,
      errors,
      args.maxRows
    )
    if (errors.length > 0) {
      setErrors(jobId, sortErrors(truncateRowNumbers(errors)))
      if (onError === "abort") {
        failJob(
          jobId,
          `Aborted: ${errors.length} mapping error(s) (set onError=continue to push valid rows anyway)`
        )
        return
      }
    }
    markRunning(jobId, updates.length)
    // Resolve or create the publication batch for this import. The caller may
    // override the auto-generated title/comments via the metadata payload; if
    // a batch with the resolved title already exists we reuse it (mirrors the
    // CLI's 409-handling at command.ts:108-109) — but we refuse to import
    // into an already-published batch, since that would silently append new
    // contributions to a batch the publish pipeline has already finalised.
    const resolvedBatchTitle =
      args.batchTitle ?? `Import of ${schemaName} from ${filename}`
    const resolvedBatchComments =
      args.batchComments ??
      `Batch created for bulk import of ${schemaName} from ${filename}`
    const existingBatch = await dbService.getBatchByTitle(resolvedBatchTitle)
    if (existingBatch && existingBatch.published) {
      failJob(
        jobId,
        `Batch "${resolvedBatchTitle}" is already published; choose a different batchTitle to import into a new batch`
      )
      return
    }
    const batchEntity =
      existingBatch ??
      (await dbService.createPublicationBatch({
        title: resolvedBatchTitle,
        comments: resolvedBatchComments
      }))
    const batch: PublicationBatch = {
      id: batchEntity.id,
      title: batchEntity.title,
      comments: batchEntity.comments,
      published: batchEntity.published ?? null
    }
    let pushed = 0
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i]
      const templateCtx = {
        entityName: schemaName,
        filename,
        id: update.entityRef.id,
        index: i + 1
      }
      const title = args.contributionTitle
        ? applyContributionTemplate(args.contributionTitle, templateCtx)
        : `Import of ${schemaName} #${update.entityRef.id}`
      const comments =
        args.contributionComments !== undefined
          ? applyContributionTemplate(args.contributionComments, templateCtx)
          : `Imported from CSV file ${filename} on ${new Date().toISOString()}`
      const contribution: Partial<Contribution> = {
        id: `${schemaName}.${schemaName}.${update.entityRef.id}`,
        root: update.entityRef,
        changeSet: {
          id: randomUUID(),
          author,
          changes: [update],
          comments,
          title,
          timestamp: Date.now()
        },
        status,
        reviews: [],
        media: [],
        batch
      }
      await dbService.createContribution(contribution)
      pushed++
      bumpProgress(jobId)
    }
    completeJob(jobId, {
      pushed,
      batchId: batch.id,
      batchTitle: batch.title
    })
  } catch (err) {
    failJob(jobId, (err as Error).message)
  } finally {
    await fs.unlink(filePath).catch(() => {})
  }
}

export const createBulkImportRouter = (deps: BulkImportDeps): Router => {
  const { authenticateJWT, getAuthorFromRequest, dbService, resolver, uploadDir } =
    deps
  const router = Router()

  const csvDiskStorage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.access(uploadDir)
      } catch {
        await fs.mkdir(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".csv"
      const nameWithoutExt = path.basename(file.originalname, ext)
      // Include a UUID so two uploads of the same originalname within the
      // same millisecond don't collide and clobber each other on disk.
      cb(null, `${Date.now()}_${randomUUID()}_${nameWithoutExt}${ext}`)
    }
  })

  const csvDiskUpload = multer({
    storage: csvDiskStorage,
    fileFilter: CSV_FILE_FILTER,
    limits: { fileSize: CSV_SIZE_LIMIT, files: 1 }
  })

  const csvMemoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: CSV_FILE_FILTER,
    limits: { fileSize: CSV_SIZE_LIMIT, files: 1 }
  })

  router.post(
    "/inspect-batched-contributions/:entityName",
    authenticateJWT,
    requireEditor,
    wrapMulter(csvMemoryUpload.single("file")),
    (req: Request, res: Response) => {
      const { entityName } = req.params
      if (!Object.prototype.hasOwnProperty.call(AllMappings, entityName)) {
        res
          .status(404)
          .json({ error: "Unknown entity", details: entityName })
        return
      }
      if (!req.file) {
        res.status(400).json({
          error: "No file uploaded",
          details: "A CSV file must be provided in the 'file' field"
        })
        return
      }
      const mappingEntry = AllMappings[entityName]
      const mappingHeaders = debugCheckHeaders(mappingEntry.mapping)
      const csvHeaders = getCSVHeadersFromBuffer(req.file.buffer)
      const csvSet = new Set(csvHeaders)
      const csvHeadersNotInMapping = csvHeaders.filter(
        (h) => !mappingHeaders.has(h)
      )
      const mappingHeadersNotInCsv = [...mappingHeaders].filter(
        (h) => !csvSet.has(h)
      )
      res.status(200).json({
        entityName,
        csvHeadersNotInMapping,
        mappingHeadersNotInCsv
      })
    }
  )

  router.post(
    "/upload-batched-contributions/:entityName",
    authenticateJWT,
    requireEditor,
    wrapMulter(csvDiskUpload.single("file")),
    async (req: Request, res: Response) => {
      const { entityName } = req.params
      const cleanup = async () => {
        if (req.file?.path) {
          await fs.unlink(req.file.path).catch(() => {})
        }
      }
      if (!Object.prototype.hasOwnProperty.call(AllMappings, entityName)) {
        await cleanup()
        res
          .status(404)
          .json({ error: "Unknown entity", details: entityName })
        return
      }
      if (!req.file) {
        res.status(400).json({
          error: "No file uploaded",
          details: "A CSV file must be provided in the 'file' field"
        })
        return
      }
      const parsed = parseUploadMetadata(req.body?.metadata)
      if ("error" in parsed) {
        await cleanup()
        res.status(400).json({
          error: "Invalid metadata",
          details: parsed.error
        })
        return
      }
      const author = getAuthorFromRequest(req)
      if (!author) {
        await cleanup()
        res
          .status(401)
          .json({ error: "Cannot determine author from token" })
        return
      }
      const job = createJob({
        entityName,
        filename: req.file.originalname,
        author
      })
      // Fire-and-forget; the cleanup of the uploaded file happens inside
      // runImport's finally block. We don't await here so the HTTP response
      // can return 202 immediately.
      void runImport({
        jobId: job.jobId,
        schemaName: entityName,
        filePath: req.file.path,
        status: parsed.contribStatus,
        onError: parsed.onError,
        filename: req.file.originalname,
        author,
        batchTitle: parsed.batchTitle,
        batchComments: parsed.batchComments,
        contributionTitle: parsed.contributionTitle,
        contributionComments: parsed.contributionComments,
        maxRows: parsed.maxRows,
        dbService,
        resolver
      })
      res.status(202).json({ jobId: job.jobId })
    }
  )

  router.get(
    "/upload-jobs/:jobId",
    authenticateJWT,
    requireEditor,
    (req: Request, res: Response) => {
      const job = getJob(req.params.jobId)
      if (!job) {
        res.status(404).json({ error: "Unknown job" })
        return
      }
      res.status(200).json({
        jobId: job.jobId,
        status: job.status,
        entityName: job.entityName,
        filename: job.filename,
        progress: job.progress,
        errors: job.errors,
        result: job.result,
        failureReason: job.failureReason
      })
    }
  )

  return router
}
