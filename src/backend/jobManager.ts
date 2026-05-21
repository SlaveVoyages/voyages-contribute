import { randomUUID } from "crypto"
import { TrackedMappingErrors } from "../tools/importer"

/**
 * In-memory job manager for bulk-import operations.
 *
 * Jobs are kept in a module-level Map for the lifetime of the process. Once a
 * job reaches a terminal state ("completed" or "failed") it is eligible for
 * lazy eviction `JOB_RETENTION_MS` after it finished.
 *
 * Caveats:
 * - Jobs are lost on server restart.
 * - This does not scale beyond a single process — clients that hit a different
 *   replica will get a 404 for jobs they started elsewhere.
 *
 * TODO(persistence): once we run more than one server instance, back this with
 * a database table (e.g. a new `BulkImportJobEntity`) so jobs survive
 * restarts and are visible across instances.
 */

export type JobStatus = "pending" | "running" | "failed" | "completed"

export interface JobResult {
  pushed: number
  batchId: number
  batchTitle: string
}

export interface JobState {
  jobId: string
  status: JobStatus
  entityName: string
  filename: string
  author: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  progress: { processed: number; total: number }
  errors: TrackedMappingErrors[]
  result?: JobResult
  failureReason?: string
}

const JOB_RETENTION_MS = 24 * 60 * 60 * 1000 // 24h after finishedAt

const jobs = new Map<string, JobState>()

const evictExpired = (now: number) => {
  for (const [id, job] of jobs) {
    if (job.finishedAt !== undefined && now - job.finishedAt > JOB_RETENTION_MS) {
      jobs.delete(id)
    }
  }
}

export const createJob = (init: {
  entityName: string
  filename: string
  author: string
}): JobState => {
  const now = Date.now()
  evictExpired(now)
  const job: JobState = {
    jobId: randomUUID(),
    status: "pending",
    entityName: init.entityName,
    filename: init.filename,
    author: init.author,
    createdAt: now,
    progress: { processed: 0, total: 0 },
    errors: []
  }
  jobs.set(job.jobId, job)
  return job
}

export const getJob = (jobId: string): JobState | undefined => {
  evictExpired(Date.now())
  return jobs.get(jobId)
}

export const markRunning = (
  jobId: string,
  total: number,
  initialProcessed = 0
): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "running"
  job.startedAt = Date.now()
  job.progress.total = total
  job.progress.processed = initialProcessed
}

export const bumpProgress = (jobId: string): void => {
  const job = jobs.get(jobId)
  if (job) {
    job.progress.processed++
  }
}

export const setErrors = (
  jobId: string,
  errors: TrackedMappingErrors[]
): void => {
  const job = jobs.get(jobId)
  if (job) {
    job.errors = errors
  }
}

export const completeJob = (jobId: string, result: JobResult): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "completed"
  job.result = result
  job.finishedAt = Date.now()
}

export const failJob = (jobId: string, reason: string): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "failed"
  job.failureReason = reason
  job.finishedAt = Date.now()
}

// Exposed for tests only.
export const __resetJobsForTests = (): void => {
  jobs.clear()
}
