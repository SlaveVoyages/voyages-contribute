import { randomUUID } from "crypto"
import { BulkStatusOutcome } from "./statusChange"

/**
 * In-memory job manager for batch bulk-approve operations.
 *
 * A whole batch may hold thousands of contributions, and accepting them one at
 * a time (each read-modify-write with readiness gating) can outlast an HTTP
 * request. So the approve endpoint starts a job and returns its id, and the
 * client polls for progress and the final summary -- the same shape as the
 * bulk-import flow, but kept separate from that job manager because the result
 * it carries (a status-change tally) is not an import result.
 *
 * Caveats, as with the import jobs: kept in a module-level Map, lost on restart,
 * and not visible across replicas. Terminal jobs are evicted lazily after
 * JOB_RETENTION_MS.
 */

export type ApproveJobStatus = "pending" | "running" | "failed" | "completed"

export interface ApproveJobState {
  jobId: string
  status: ApproveJobStatus
  batchId: number
  batchTitle: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  progress: { processed: number; total: number }
  result?: BulkStatusOutcome
  failureReason?: string
}

const JOB_RETENTION_MS = 24 * 60 * 60 * 1000 // 24h after finishedAt

const jobs = new Map<string, ApproveJobState>()

const evictExpired = (now: number) => {
  for (const [id, job] of jobs) {
    if (
      job.finishedAt !== undefined &&
      now - job.finishedAt > JOB_RETENTION_MS
    ) {
      jobs.delete(id)
    }
  }
}

export const createApproveJob = (init: {
  batchId: number
  batchTitle: string
  total: number
}): ApproveJobState => {
  const now = Date.now()
  evictExpired(now)
  const job: ApproveJobState = {
    jobId: randomUUID(),
    status: "pending",
    batchId: init.batchId,
    batchTitle: init.batchTitle,
    createdAt: now,
    progress: { processed: 0, total: init.total }
  }
  jobs.set(job.jobId, job)
  return job
}

export const getApproveJob = (jobId: string): ApproveJobState | undefined => {
  evictExpired(Date.now())
  return jobs.get(jobId)
}

export const markApproveRunning = (jobId: string): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "running"
  job.startedAt = Date.now()
}

// Advance the processed count by however many contributions a chunk covered.
export const advanceApproveProgress = (jobId: string, by: number): void => {
  const job = jobs.get(jobId)
  if (job) {
    job.progress.processed += by
  }
}

export const completeApproveJob = (
  jobId: string,
  result: BulkStatusOutcome
): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "completed"
  job.result = result
  job.progress.processed = job.progress.total
  job.finishedAt = Date.now()
}

export const failApproveJob = (jobId: string, reason: string): void => {
  const job = jobs.get(jobId)
  if (!job) {
    return
  }
  job.status = "failed"
  job.failureReason = reason
  job.finishedAt = Date.now()
}

// Exposed for tests only.
export const __resetApproveJobsForTests = (): void => {
  jobs.clear()
}
