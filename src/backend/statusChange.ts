import { Contribution, ContributionStatus } from "../models/contribution"
import { authorIdentity, decideStatusChange } from "./authz"
import { checkSubmissionReadiness } from "./submissionReadiness"

/**
 * One contribution's move from one status to another, decided and applied.
 *
 * Extracted so that deciding many contributions is deciding each of them, and
 * not a second opinion about what deciding one means. The rules that guard a
 * status change -- who may make it, whether the work is ready to leave the
 * draft state, whether somebody else decided it first -- are the reason the
 * single-contribution route is as long as it is. A bulk route that reached for
 * the repository directly would be a way to get a contribution into a status
 * that the route guarding that status would have refused, which is the same as
 * not having the guard.
 *
 * The result says what happened rather than how to say it over HTTP: the
 * routes above turn it into a response, and the bulk route has to turn many of
 * them into one.
 */

export interface StatusChangeRequest {
  id: string
  to: ContributionStatus
  /**
   * Taken as the body had it. Absent and explicitly null differ -- absent
   * leaves a repeated request with nothing to do, an explicit null asks for the
   * existing comment to go -- so this cannot be narrowed to `string | null`
   * without losing the distinction the caller depends on.
   */
  decisionComments?: unknown
  isEditor: boolean
  /** The identity the token verified, never anything the body claimed. */
  identity: string | null
}

export interface StatusChangeDeps<C extends Contribution> {
  getContribution: (id: string) => Promise<C | null>
  changeContributionStatus: (
    id: string,
    from: ContributionStatus,
    to: ContributionStatus,
    decisionComments: string | null | undefined,
    decidedBy?: string | null
  ) => Promise<C | null>
}

export type StatusChangeResult<C extends Contribution> =
  /** The status was moved. */
  | { kind: "changed"; contribution: C }
  /** It already said this, and nothing else came with the request. */
  | { kind: "unchanged"; contribution: C }
  | {
      kind: "refused"
      status: number
      body: Record<string, unknown>
    }

export const changeOneStatus = async <C extends Contribution>(
  { id, to, decisionComments, isEditor, identity }: StatusChangeRequest,
  deps: StatusChangeDeps<C>
): Promise<StatusChangeResult<C>> => {
  const existing = await deps.getContribution(id)
  if (!existing) {
    return {
      kind: "refused",
      status: 404,
      body: { error: "Contribution not found" }
    }
  }

  // A comment is absent, or it is supplied -- including as null, which asks
  // for the existing one to go. The two differ: absent leaves a repeated
  // request with nothing to do, while an explicit null is a change.
  const commentSupplied = decisionComments !== undefined
  const suppliedComment = !commentSupplied
    ? undefined
    : decisionComments === null
      ? null
      : String(decisionComments)

  const verdict = decideStatusChange({
    isEditor,
    isAuthor:
      !!identity &&
      authorIdentity(existing.changeSet?.author ?? "") === identity,
    from: existing.status,
    to,
    commentSupplied
  })
  if (verdict.kind === "refuse") {
    return {
      kind: "refused",
      status: verdict.status,
      body: {
        error: verdict.error,
        ...(verdict.details ? { details: verdict.details } : {})
      }
    }
  }
  if (verdict.kind === "noop") {
    return { kind: "unchanged", contribution: existing }
  }

  // Checked after entitlement, so what a contribution is missing is only ever
  // reported to someone entitled to see it.
  const refusal = checkSubmissionReadiness(existing, to)
  if (refusal) {
    return { kind: "refused", status: 400, body: { ...refusal } }
  }

  const updated = await deps.changeContributionStatus(
    existing.id,
    existing.status,
    to,
    suppliedComment,
    identity
  )
  if (!updated) {
    return {
      kind: "refused",
      status: 409,
      body: {
        error: "Contribution status changed",
        details:
          "Someone else decided this contribution while you were working on it. Reload it and try again."
      }
    }
  }
  return { kind: "changed", contribution: updated }
}

/**
 * The most contributions one request may decide.
 *
 * Each one is folded and written on its own, so a request costs what it names.
 * The cap is what keeps a single request from holding the process for minutes
 * at a time -- the client asks in chunks and can say how far it has got, which
 * a request that never returns cannot.
 */
export const BULK_STATUS_LIMIT = 500

export interface BulkRefusal {
  id: string
  status: number
  error: string
  details?: string
}

export interface BulkStatusOutcome {
  requested: number
  changed: string[]
  unchanged: string[]
  refused: BulkRefusal[]
}

export type BulkStatusPlan =
  | { kind: "proceed"; ids: string[] }
  | { kind: "refused"; status: number; body: Record<string, unknown> }

/**
 * What a bulk request actually names, or why it names nothing usable.
 *
 * Separate from carrying it out because it is the part that can be decided
 * without touching the store, and the part whose answer is about the request
 * rather than about any contribution in it.
 */
export const planBulkStatus = (contributionIds: unknown): BulkStatusPlan => {
  if (!Array.isArray(contributionIds)) {
    return {
      kind: "refused",
      status: 400,
      body: {
        error: "Invalid contribution ids",
        details: "`contributionIds` must be an array of contribution ids."
      }
    }
  }
  // Repeats collapse rather than being applied twice: the second write of a
  // pair would find the row already moved and report a conflict against a
  // decision this same request had just made.
  const ids = [...new Set(contributionIds.map((id: unknown) => String(id)))]
  if (ids.length === 0) {
    return {
      kind: "refused",
      status: 400,
      body: { error: "Nothing to decide", details: "No contributions were named." }
    }
  }
  if (ids.length > BULK_STATUS_LIMIT) {
    return {
      kind: "refused",
      status: 400,
      body: {
        error: "Too many contributions",
        details: `One request may decide at most ${BULK_STATUS_LIMIT} contributions; ${ids.length} were named. Send them in smaller groups.`
      }
    }
  }
  return { kind: "proceed", ids }
}

/**
 * Decide many contributions, one at a time.
 *
 * Deliberately not one transaction. An editor accepting a thousand drafts is
 * making a thousand decisions that happen to have been asked for together, and
 * one of them being refused -- somebody else got there first, one draft is not
 * the editor's to decide -- is not a reason to undo the rest. What comes back
 * is what happened to each, so the ones that did not land can be shown and
 * retried without guessing which they were.
 *
 * Sequential on purpose. Each decision reads the row it is about to write and
 * refuses if it moved underneath, which is a guarantee about one contribution;
 * running them together would let two of them interleave between that read and
 * that write.
 */
export const changeManyStatuses = async <C extends Contribution>(
  {
    ids,
    to,
    decisionComments,
    commentSupplied,
    isEditor,
    identity
  }: {
    ids: string[]
    to: ContributionStatus
    decisionComments?: unknown
    commentSupplied: boolean
    isEditor: boolean
    identity: string | null
  },
  deps: StatusChangeDeps<C>
): Promise<BulkStatusOutcome> => {
  const changed: string[] = []
  const unchanged: string[] = []
  const refused: BulkRefusal[] = []

  for (const id of ids) {
    const result = await changeOneStatus(
      {
        id,
        to,
        ...(commentSupplied ? { decisionComments } : {}),
        isEditor,
        identity
      },
      deps
    )
    if (result.kind === "changed") {
      changed.push(id)
    } else if (result.kind === "unchanged") {
      unchanged.push(id)
    } else {
      refused.push({
        id,
        status: result.status,
        error: String(result.body.error ?? "Refused"),
        ...(result.body.details ? { details: String(result.body.details) } : {})
      })
    }
  }

  return { requested: ids.length, changed, unchanged, refused }
}
