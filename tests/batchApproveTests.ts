import { expect, test } from "vitest"
import { approveBatchInChunks } from "../src/backend/batchApprove"
import { BULK_STATUS_LIMIT, StatusChangeDeps } from "../src/backend/statusChange"
import { Contribution, ContributionStatus } from "../src/models/contribution"
import { sampleContributions } from "./sampleContributions"

/**
 * Approving a whole batch is approving each of its contributions, in chunks. It
 * must not become a way around the per-contribution gating: a not-ready one is
 * reported as refused, never quietly accepted, and the chunking only affects how
 * many are decided per loop, not the outcome.
 */

const { Submitted, Accepted } = ContributionStatus
const EDITOR = "editor@slavevoyages.org"
const CONTRIBUTOR = "contributor@slavevoyages.org"

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

// A draft missing its Dataset value -- submittable, but not ready to accept.
const withoutDataset = (id: string, status: ContributionStatus): Contribution => {
  const base = draft(id, status)
  return {
    ...base,
    changeSet: {
      ...base.changeSet,
      changes: base.changeSet.changes.map((change) =>
        change.type === "update"
          ? {
              ...change,
              changes: change.changes.map((c) =>
                (c as any).property === "Voyage_dataset"
                  ? { ...c, changed: null }
                  : c
              )
            }
          : change
      )
    }
  }
}

const storeOf = (contributions: Contribution[]) => {
  const rows = new Map(contributions.map((c) => [c.id, { ...c }]))
  const deps: StatusChangeDeps<Contribution> = {
    getContribution: async (id) => rows.get(id) ?? null,
    changeContributionStatus: async (id, from, to) => {
      const row = rows.get(id)
      if (!row || row.status !== from) {
        return null
      }
      const updated = { ...row, status: to }
      rows.set(id, updated)
      return updated
    }
  }
  return { deps, rows }
}

const asEditor = { isEditor: true, identity: EDITOR }

test("an editor approving a batch accepts every Submitted contribution", async () => {
  const { deps, rows } = storeOf([
    draft("a", Submitted),
    draft("b", Submitted),
    draft("c", Submitted)
  ])
  const outcome = await approveBatchInChunks(
    { ids: ["a", "b", "c"], ...asEditor },
    deps
  )
  expect(outcome.requested).toBe(3)
  expect(outcome.changed.sort()).toEqual(["a", "b", "c"])
  expect(outcome.refused).toEqual([])
  expect(rows.get("a")?.status).toBe(Accepted)
})

test("not-ready contributions are refused, not accepted; ready ones still land", async () => {
  const { deps, rows } = storeOf([
    draft("ready", Submitted),
    withoutDataset("incomplete", Submitted),
    draft("already", Accepted)
  ])
  const outcome = await approveBatchInChunks(
    { ids: ["ready", "incomplete", "already"], ...asEditor },
    deps
  )
  expect(outcome.changed).toEqual(["ready"])
  // Already accepted is a no-op, not a refusal.
  expect(outcome.unchanged).toEqual(["already"])
  expect(outcome.refused.map((r) => ({ id: r.id, status: r.status }))).toEqual([
    { id: "incomplete", status: 400 }
  ])
  expect(rows.get("incomplete")?.status).toBe(Submitted)
})

test("chunking decides more than one request's worth, in order, past the limit", async () => {
  const count = BULK_STATUS_LIMIT + 100
  const ids = Array.from({ length: count }, (_, i) => `c${i}`)
  const { deps, rows } = storeOf(ids.map((id) => draft(id, Submitted)))

  const chunkSizes: number[] = []
  const outcome = await approveBatchInChunks(
    {
      ids,
      ...asEditor,
      onChunkProcessed: (n) => chunkSizes.push(n)
    },
    deps
  )
  // Two chunks: a full one then the remainder.
  expect(chunkSizes).toEqual([BULK_STATUS_LIMIT, 100])
  expect(outcome.requested).toBe(count)
  expect(outcome.changed.length).toBe(count)
  expect(outcome.refused).toEqual([])
  expect(rows.get("c0")?.status).toBe(Accepted)
  expect(rows.get(`c${count - 1}`)?.status).toBe(Accepted)
})

test("a smaller chunk size still decides everything", async () => {
  const ids = ["a", "b", "c", "d", "e"]
  const { deps } = storeOf(ids.map((id) => draft(id, Submitted)))
  const chunkSizes: number[] = []
  const outcome = await approveBatchInChunks(
    { ids, ...asEditor, chunkSize: 2, onChunkProcessed: (n) => chunkSizes.push(n) },
    deps
  )
  expect(chunkSizes).toEqual([2, 2, 1])
  expect(outcome.changed.length).toBe(5)
})

test("a contributor cannot approve a batch of other people's work", async () => {
  const { deps, rows } = storeOf([
    draft("theirs", Submitted, "Someone else <other@x.org>")
  ])
  const outcome = await approveBatchInChunks(
    { ids: ["theirs"], isEditor: false, identity: CONTRIBUTOR },
    deps
  )
  expect(outcome.changed).toEqual([])
  expect(outcome.refused[0].status).toBe(403)
  expect(rows.get("theirs")?.status).toBe(Submitted)
})

test("the fixture's Submitted draft is one acceptance would take", async () => {
  const { deps } = storeOf([draft("ok", Submitted)])
  const outcome = await approveBatchInChunks({ ids: ["ok"], ...asEditor }, deps)
  expect(outcome.changed).toEqual(["ok"])
  expect(outcome.refused).toEqual([])
})
