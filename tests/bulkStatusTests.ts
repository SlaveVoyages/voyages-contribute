import { expect, test } from "vitest"
import {
  BULK_STATUS_LIMIT,
  changeManyStatuses,
  changeOneStatus,
  planBulkStatus,
  StatusChangeDeps
} from "../src/backend/statusChange"
import { Contribution, ContributionStatus } from "../src/models/contribution"
import { sampleContributions } from "./sampleContributions"

/**
 * Deciding many contributions at once.
 *
 * The thing worth holding onto here is not that the loop counts correctly. It
 * is that a bulk decision is the same decision, made repeatedly -- an editor
 * with a thousand checkboxes ticked must not be able to put a contribution
 * somewhere that deciding it on its own would have refused. So the tests that
 * matter are the ones that offer the bulk path a contribution the single path
 * would turn down, and check that it is still turned down.
 *
 * The store is a stub. What is being tested is the sequence of rules and what
 * happens to the ones that fail, not what TypeORM does with a row.
 */

const { WorkInProgress, Submitted, Accepted, Rejected, Published } =
  ContributionStatus

const EDITOR = "editor@slavevoyages.org"
const CONTRIBUTOR = "contributor@slavevoyages.org"

/** A draft with no missing mandatory values, owned by `author`. */
const draft = (
  id: string,
  status: ContributionStatus,
  author = `Someone <${CONTRIBUTOR}>`
): Contribution => ({
  ...sampleContributions[0],
  id,
  status,
  changeSet: { ...sampleContributions[0].changeSet, author }
})

/**
 * A store that answers from a map and records what was written.
 *
 * `changeContributionStatus` honours the from-status the caller passed, which
 * is the optimistic check the real one performs -- a stub that ignored it
 * would make the concurrency test pass for the wrong reason.
 */
const storeOf = (contributions: Contribution[]) => {
  const rows = new Map(contributions.map((c) => [c.id, { ...c }]))
  const writes: { id: string; to: ContributionStatus; by: string | null }[] = []
  const deps: StatusChangeDeps<Contribution> = {
    getContribution: async (id) => rows.get(id) ?? null,
    changeContributionStatus: async (id, from, to, _comments, decidedBy) => {
      const row = rows.get(id)
      if (!row || row.status !== from) {
        return null
      }
      const updated = { ...row, status: to }
      rows.set(id, updated)
      writes.push({ id, to, by: decidedBy ?? null })
      return updated
    }
  }
  return { deps, rows, writes }
}

const asEditor = {
  isEditor: true,
  identity: EDITOR,
  commentSupplied: false
}

test("a request has to name an array of ids", () => {
  expect(planBulkStatus(undefined).kind).toBe("refused")
  expect(planBulkStatus("Voyage.Voyage.1").kind).toBe("refused")
  expect(planBulkStatus([]).kind).toBe("refused")
})

test("an id named twice is decided once", () => {
  const plan = planBulkStatus(["a", "b", "a"])
  expect(plan).toEqual({ kind: "proceed", ids: ["a", "b"] })
})

test("more ids than one request may carry is refused before anything is written", () => {
  const tooMany = Array.from({ length: BULK_STATUS_LIMIT + 1 }, (_, i) => `c${i}`)
  const plan = planBulkStatus(tooMany)
  expect(plan.kind).toBe("refused")
  if (plan.kind === "refused") {
    expect(plan.status).toBe(400)
    expect(String(plan.body.details)).toContain(String(BULK_STATUS_LIMIT))
  }
})

test("an editor accepting drafts decides every one of them", async () => {
  const { deps, writes } = storeOf([
    draft("a", WorkInProgress),
    draft("b", WorkInProgress),
    draft("c", Submitted)
  ])
  const outcome = await changeManyStatuses(
    { ids: ["a", "b", "c"], to: Accepted, ...asEditor },
    deps
  )
  expect(outcome.changed).toEqual(["a", "b", "c"])
  expect(outcome.refused).toEqual([])
  expect(writes.every((w) => w.by === EDITOR)).toBe(true)
})

/**
 * The one that matters. A contributor ticking every box gets exactly what they
 * would get one at a time: their own draft submitted, and nothing else moved.
 */
test("bulk cannot reach a status the single decision would refuse", async () => {
  const mine = draft("mine", WorkInProgress, `Me <${CONTRIBUTOR}>`)
  const theirs = draft("theirs", WorkInProgress, "Someone else <other@x.org>")
  const { deps, rows } = storeOf([mine, theirs])

  const accepting = await changeManyStatuses(
    {
      ids: ["mine", "theirs"],
      to: Accepted,
      isEditor: false,
      identity: CONTRIBUTOR,
      commentSupplied: false
    },
    deps
  )
  expect(accepting.changed).toEqual([])
  expect(accepting.refused.map((r) => r.status)).toEqual([403, 403])

  const submitting = await changeManyStatuses(
    {
      ids: ["mine", "theirs"],
      to: Submitted,
      isEditor: false,
      identity: CONTRIBUTOR,
      commentSupplied: false
    },
    deps
  )
  expect(submitting.changed).toEqual(["mine"])
  expect(submitting.refused.map((r) => r.status)).toEqual([403])
  expect(rows.get("theirs")?.status).toBe(WorkInProgress)
})

test("one refusal does not undo the decisions around it", async () => {
  const { deps, rows } = storeOf([
    draft("a", WorkInProgress),
    draft("settled", Published),
    draft("c", WorkInProgress)
  ])
  const outcome = await changeManyStatuses(
    { ids: ["a", "missing", "settled", "c"], to: Accepted, ...asEditor },
    deps
  )
  expect(outcome.requested).toBe(4)
  expect(outcome.changed).toEqual(["a", "settled", "c"])
  expect(outcome.refused).toEqual([
    { id: "missing", status: 404, error: "Contribution not found" }
  ])
  expect(rows.get("a")?.status).toBe(Accepted)
  expect(rows.get("c")?.status).toBe(Accepted)
})

test("a contribution already in the status asked for is left alone, not refused", async () => {
  const { deps, writes } = storeOf([
    draft("a", Accepted),
    draft("b", WorkInProgress)
  ])
  const outcome = await changeManyStatuses(
    { ids: ["a", "b"], to: Accepted, ...asEditor },
    deps
  )
  expect(outcome.unchanged).toEqual(["a"])
  expect(outcome.changed).toEqual(["b"])
  expect(writes.map((w) => w.id)).toEqual(["b"])
})

test("a contribution decided underneath the request is reported, not overwritten", async () => {
  const { deps } = storeOf([draft("a", WorkInProgress)])
  // Somebody else decides it between the read and the write.
  const racing: StatusChangeDeps<Contribution> = {
    getContribution: deps.getContribution,
    changeContributionStatus: async () => null
  }
  const outcome = await changeManyStatuses(
    { ids: ["a"], to: Accepted, ...asEditor },
    racing
  )
  expect(outcome.changed).toEqual([])
  expect(outcome.refused[0].status).toBe(409)
})

/**
 * Submitting is the move that is checked for missing mandatory values, and the
 * check has to survive being asked for in bulk -- it is the last point at which
 * a contributor still owns an editable draft.
 */
test("a draft missing a mandatory value is still refused in bulk", async () => {
  const base = draft("incomplete", WorkInProgress, `Me <${CONTRIBUTOR}>`)
  /** The same draft with one mandatory property never set. */
  const incomplete: Contribution = {
    ...base,
    changeSet: {
      ...base.changeSet,
      changes: base.changeSet.changes.map((change) =>
        change.type === "update"
          ? {
              ...change,
              changes: change.changes.filter(
                (c) => (c as any).property !== "Voyage_dataset"
              )
            }
          : change
      )
    }
  }
  const { deps } = storeOf([incomplete])
  const outcome = await changeManyStatuses(
    {
      ids: ["incomplete"],
      to: Submitted,
      isEditor: false,
      identity: CONTRIBUTOR,
      commentSupplied: false
    },
    deps
  )
  expect(outcome.changed).toEqual([])
  expect(outcome.refused[0].status).toBe(400)
})

/**
 * Guards the fixture above. If a schema change makes the sample invalid on its
 * own, or makes Dataset optional, the test above passes while testing nothing.
 */
test("the complete fixture is one a submission would accept", async () => {
  const { deps } = storeOf([draft("ok", WorkInProgress, `Me <${CONTRIBUTOR}>`)])
  const outcome = await changeManyStatuses(
    {
      ids: ["ok"],
      to: Submitted,
      isEditor: false,
      identity: CONTRIBUTOR,
      commentSupplied: false
    },
    deps
  )
  expect(outcome.refused).toEqual([])
  expect(outcome.changed).toEqual(["ok"])
})

test("rejecting reports the same shape as accepting", async () => {
  const { deps } = storeOf([draft("a", Submitted), draft("b", Submitted)])
  const outcome = await changeOneStatus(
    { id: "a", to: Rejected, isEditor: true, identity: EDITOR },
    deps
  )
  expect(outcome.kind).toBe("changed")
})
