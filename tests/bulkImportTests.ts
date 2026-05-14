import { expect, test, beforeEach } from "vitest"
import { hasEditorRole, requireEditor } from "../src/backend/authz"
import {
  applyContributionTemplate,
  parseUploadMetadata
} from "../src/backend/bulkImport"
import {
  __resetJobsForTests,
  createJob,
  getJob,
  markRunning,
  bumpProgress,
  completeJob,
  failJob,
  setErrors
} from "../src/backend/jobManager"
import { TrackedMappingErrors } from "../src/tools/importer"

beforeEach(() => {
  __resetJobsForTests()
})

const mockRes = () => {
  const calls: { status?: number; body?: any } = {}
  const res: any = {
    status(code: number) {
      calls.status = code
      return res
    },
    json(body: any) {
      calls.body = body
      return res
    }
  }
  return { res, calls }
}

test("hasEditorRole accepts role string", () => {
  expect(hasEditorRole({ role: "Editor" })).toBe(true)
})

test("hasEditorRole accepts roles[] containing Editor", () => {
  expect(hasEditorRole({ roles: ["Editor", "Reviewer"] })).toBe(true)
})

test("hasEditorRole rejects when role is missing or wrong", () => {
  expect(hasEditorRole(undefined)).toBe(false)
  expect(hasEditorRole({})).toBe(false)
  expect(hasEditorRole({ role: "Contributor" })).toBe(false)
  expect(hasEditorRole({ roles: ["Reviewer"] })).toBe(false)
})

test("requireEditor returns 403 when user lacks Editor role", () => {
  const { res, calls } = mockRes()
  let nextCalled = false
  const req: any = { user: { app_metadata: { role: "Contributor" } } }
  requireEditor(req, res, () => {
    nextCalled = true
  })
  expect(nextCalled).toBe(false)
  expect(calls.status).toBe(403)
  expect(calls.body).toEqual({ error: "Editor role required" })
})

test("requireEditor returns 403 when there is no user on the request", () => {
  const { res, calls } = mockRes()
  let nextCalled = false
  const req: any = {}
  requireEditor(req, res, () => {
    nextCalled = true
  })
  expect(nextCalled).toBe(false)
  expect(calls.status).toBe(403)
})

test("requireEditor calls next() when user.app_metadata flags Editor", () => {
  const { res, calls } = mockRes()
  let nextCalled = false
  const req: any = { user: { app_metadata: { role: "Editor" } } }
  requireEditor(req, res, () => {
    nextCalled = true
  })
  expect(nextCalled).toBe(true)
  expect(calls.status).toBeUndefined()
})

test("requireEditor ignores user_metadata as a trust boundary", () => {
  // user_metadata is self-editable in Supabase, so it must NOT grant Editor.
  const { res, calls } = mockRes()
  let nextCalled = false
  const req: any = {
    user: {
      metadata: { role: "Editor" }, // self-editable, ignored
      app_metadata: {}
    }
  }
  requireEditor(req, res, () => {
    nextCalled = true
  })
  expect(nextCalled).toBe(false)
  expect(calls.status).toBe(403)
})

test("jobManager: createJob produces unique pending jobs", () => {
  const a = createJob({ entityName: "Voyage", filename: "a.csv", author: "u" })
  const b = createJob({ entityName: "Voyage", filename: "b.csv", author: "u" })
  expect(a.jobId).not.toBe(b.jobId)
  expect(a.status).toBe("pending")
  expect(a.progress).toEqual({ processed: 0, total: 0 })
  expect(getJob(a.jobId)).toBe(a)
})

test("jobManager: full happy-path lifecycle", () => {
  const job = createJob({
    entityName: "Voyage",
    filename: "x.csv",
    author: "u"
  })
  markRunning(job.jobId, 3)
  expect(getJob(job.jobId)?.status).toBe("running")
  expect(getJob(job.jobId)?.progress.total).toBe(3)
  bumpProgress(job.jobId)
  bumpProgress(job.jobId)
  expect(getJob(job.jobId)?.progress.processed).toBe(2)
  completeJob(job.jobId, { pushed: 3, batchId: 7, batchTitle: "t" })
  const final = getJob(job.jobId)!
  expect(final.status).toBe("completed")
  expect(final.result).toEqual({ pushed: 3, batchId: 7, batchTitle: "t" })
  expect(final.finishedAt).toBeDefined()
})

test("jobManager: failJob captures a reason and timestamps", () => {
  const job = createJob({
    entityName: "Voyage",
    filename: "x.csv",
    author: "u"
  })
  failJob(job.jobId, "bad things happened")
  const final = getJob(job.jobId)!
  expect(final.status).toBe("failed")
  expect(final.failureReason).toBe("bad things happened")
  expect(final.finishedAt).toBeDefined()
})

test("jobManager: setErrors attaches the truncated error list", () => {
  const job = createJob({
    entityName: "Voyage",
    filename: "x.csv",
    author: "u"
  })
  const errors: TrackedMappingErrors[] = [
    {
      error: { kind: "lookup", schema: "Location", value: "X" } as any,
      count: 1,
      rowNumbers: [1]
    }
  ]
  setErrors(job.jobId, errors)
  expect(getJob(job.jobId)?.errors).toEqual(errors)
})

test("jobManager: getJob returns undefined for unknown ids", () => {
  expect(getJob("not-a-real-job-id")).toBeUndefined()
})

test("parseUploadMetadata: missing/empty input uses defaults", () => {
  for (const raw of [undefined, "", null]) {
    const r = parseUploadMetadata(raw)
    expect("error" in r).toBe(false)
    if (!("error" in r)) {
      expect(r.contribStatus).toBe(0) // WorkInProgress
      expect(r.onError).toBe("abort")
      expect(r.batchTitle).toBeUndefined()
      expect(r.batchComments).toBeUndefined()
    }
  }
})

test("parseUploadMetadata: parses valid JSON with all fields", () => {
  const r = parseUploadMetadata(
    JSON.stringify({
      contribStatus: 2,
      onError: "continue",
      batchTitle: "  My batch  ",
      batchComments: "Some notes"
    })
  )
  expect("error" in r).toBe(false)
  if (!("error" in r)) {
    expect(r.contribStatus).toBe(2)
    expect(r.onError).toBe("continue")
    expect(r.batchTitle).toBe("My batch")
    expect(r.batchComments).toBe("Some notes")
  }
})

test("parseUploadMetadata: rejects malformed JSON", () => {
  const r = parseUploadMetadata("{not json")
  expect("error" in r).toBe(true)
})

test("parseUploadMetadata: rejects non-object payload", () => {
  expect("error" in parseUploadMetadata("[1, 2, 3]")).toBe(true)
  expect("error" in parseUploadMetadata('"a string"')).toBe(true)
  expect("error" in parseUploadMetadata("null")).toBe(true)
})

test("parseUploadMetadata: rejects out-of-range contribStatus", () => {
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ contribStatus: 99 }))
  ).toBe(true)
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ contribStatus: "lol" }))
  ).toBe(true)
})

test("parseUploadMetadata: rejects unknown onError value", () => {
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ onError: "panic" }))
  ).toBe(true)
})

test("parseUploadMetadata: rejects empty batchTitle string", () => {
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ batchTitle: "   " }))
  ).toBe(true)
})

test("parseUploadMetadata: parses contributionTitle/contributionComments", () => {
  const r = parseUploadMetadata(
    JSON.stringify({
      contributionTitle: "  Row {index}: {entityName} #{id}  ",
      contributionComments: "From {filename}"
    })
  )
  expect("error" in r).toBe(false)
  if (!("error" in r)) {
    expect(r.contributionTitle).toBe("Row {index}: {entityName} #{id}")
    expect(r.contributionComments).toBe("From {filename}")
  }
})

test("parseUploadMetadata: rejects empty contributionTitle string", () => {
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ contributionTitle: " " }))
  ).toBe(true)
})

test("applyContributionTemplate: substitutes all known placeholders", () => {
  const out = applyContributionTemplate(
    "{entityName} #{id} (row {index}) from {filename}",
    { entityName: "Voyage", filename: "x.csv", id: 42, index: 3 }
  )
  expect(out).toBe("Voyage #42 (row 3) from x.csv")
})

test("applyContributionTemplate: substitutes repeated placeholders", () => {
  const out = applyContributionTemplate("{id}-{id}-{id}", {
    entityName: "Voyage",
    filename: "x.csv",
    id: "abc",
    index: 1
  })
  expect(out).toBe("abc-abc-abc")
})

test("parseUploadMetadata: accepts positive integer maxRows", () => {
  const r = parseUploadMetadata(JSON.stringify({ maxRows: 5 }))
  expect("error" in r).toBe(false)
  if (!("error" in r)) {
    expect(r.maxRows).toBe(5)
  }
})

test("parseUploadMetadata: rejects non-positive or non-integer maxRows", () => {
  expect("error" in parseUploadMetadata(JSON.stringify({ maxRows: 0 }))).toBe(
    true
  )
  expect("error" in parseUploadMetadata(JSON.stringify({ maxRows: -3 }))).toBe(
    true
  )
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ maxRows: 1.5 }))
  ).toBe(true)
  expect(
    "error" in parseUploadMetadata(JSON.stringify({ maxRows: "lots" }))
  ).toBe(true)
})

test("applyContributionTemplate: leaves unknown tokens untouched", () => {
  const out = applyContributionTemplate("hello {who} {id}", {
    entityName: "Voyage",
    filename: "x.csv",
    id: 7,
    index: 1
  })
  expect(out).toBe("hello {who} 7")
})
