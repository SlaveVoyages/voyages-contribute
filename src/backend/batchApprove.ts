import { Contribution, ContributionStatus } from "../models/contribution"
import {
  BULK_STATUS_LIMIT,
  BulkStatusOutcome,
  changeManyStatuses,
  StatusChangeDeps
} from "./statusChange"

/**
 * Approve a batch's contributions in chunks.
 *
 * The ids are the batch's approvable (Submitted) contributions, gathered
 * server-side so a 7,000-voyage batch is never enumerated in the browser. Each
 * chunk runs through the same acceptance path as the per-row bulk decision
 * (changeManyStatuses -> changeOneStatus), so readiness and ownership gating
 * still apply: a not-ready contribution comes back as `refused`, never silently
 * accepted. The per-chunk outcomes are folded into one tally, and
 * `onChunkProcessed` lets a caller report progress as it goes.
 *
 * Chunked rather than one call so no single decision loop runs unbounded, and
 * so progress advances in steps a poller can see.
 */
export const approveBatchInChunks = async <C extends Contribution>(
  {
    ids,
    isEditor,
    identity,
    chunkSize = BULK_STATUS_LIMIT,
    onChunkProcessed,
    filterEligible
  }: {
    ids: string[]
    isEditor: boolean
    identity: string | null
    chunkSize?: number
    onChunkProcessed?: (processedInChunk: number) => void
   // Optional per-chunk revalidation.  Guards against membership/state moving under a long job.
    filterEligible?: (chunkIds: string[]) => Promise<string[]>
  },
  deps: StatusChangeDeps<C>
): Promise<BulkStatusOutcome> => {
  const aggregate: BulkStatusOutcome = {
    requested: ids.length,
    changed: [],
    unchanged: [],
    refused: []
  }
  const size = chunkSize > 0 ? chunkSize : BULK_STATUS_LIMIT
  for (let i = 0; i < ids.length; i += size) {
    const chunk = ids.slice(i, i + size)
    // Re-validate the chunk against the live state, if a check was given
    const eligible = filterEligible ? await filterEligible(chunk) : chunk
    if (eligible.length > 0) {
      const outcome = await changeManyStatuses(
        {
          ids: eligible,
          to: ContributionStatus.Accepted,
          commentSupplied: false,
          isEditor,
          identity
        },
        deps
      )
      aggregate.changed.push(...outcome.changed)
      aggregate.unchanged.push(...outcome.unchanged)
      aggregate.refused.push(...outcome.refused)
    }
    onChunkProcessed?.(chunk.length)
  }
  return aggregate
}
