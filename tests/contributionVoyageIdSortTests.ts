import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The Voyage ID column shows the id an editor assigned a new voyage -- which
 * lives in a change, on the contribution or on a review -- falling back to the
 * root id. Ordering by the root id alone put every new voyage (root id: a uuid
 * handle) in one unordered block, imported batches included (DD-0532). These
 * run against a real database: the order is only meaningful once executed.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-voyage-id-sort-")),
  "test.db"
)

const { AppDataSource, DatabaseService, ChangeSetEntity, ContributionEntity } =
  await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")
const { AllMigrations } = await import(
  "../src/backend/migrations/1786100000000-InitialSchema"
)
const { lastAssignedVoyageId, voyageIdSortKey } = await import(
  "../src/backend/voyageId"
)

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

const service = new DatabaseService()

const assignId = (rootId: string, voyageId: number | string | null) => ({
  type: "update" as const,
  entityRef: { id: rootId, schema: "Voyage", type: "new" as const },
  changes: [
    { kind: "direct" as const, property: "Voyage_voyage_id", changed: voyageId }
  ]
})

const changeSetOf = (changes: unknown[]) => ({
  author: "tester",
  authorEmail: "tester@example.org",
  title: "t",
  comments: "",
  timestamp: 0,
  changes
})

// An existing voyage: its root id is the voyage id, no assignment needed.
const existing = async (id: string, voyageId: number) => {
  const changeSet = await AppDataSource.manager.save(
    ChangeSetEntity,
    changeSetOf([])
  )
  await AppDataSource.manager.save(
    AppDataSource.manager.create(ContributionEntity, {
      id,
      root: { type: "existing", schema: "Voyage", id: voyageId },
      changeSet,
      status: ContributionStatus.Submitted
    })
  )
}

// A new voyage, root id a uuid handle, optionally assigned an id in its own
// change set.
const newVoyage = async (id: string, assigned?: number) => {
  const rootId = `uuid-${id}`
  await service.createContribution({
    id,
    root: { type: "new", schema: "Voyage", id: rootId },
    changeSet: changeSetOf(
      assigned === undefined ? [] : [assignId(rootId, assigned)]
    ) as never,
    status: ContributionStatus.WorkInProgress
  })
  return rootId
}

await existing("existing-20", 20)
await existing("existing-962250", 962250)
await newVoyage("new-in-changeset", 962257)
await newVoyage("new-unassigned")
const reviewedRoot = await newVoyage("new-in-review", 100)
// The editor corrects the id in a review; the review is the one shown.
await service.addReviewToContribution("new-in-review", {
  ...changeSetOf([assignId(reviewedRoot, 962255)]),
  changes: [assignId(reviewedRoot, 962255)] as never
})
// A later review touching other fields leaves the assigned id standing.
await service.addReviewToContribution("new-in-review", {
  ...changeSetOf([]),
  changes: [] as never
})

const idsSortedByVoyageId = async (sortOrder: "ASC" | "DESC") =>
  (
    await service.listContributions({
      sortBy: "voyage_id",
      sortOrder,
      limit: 100
    })
  ).data.map((c) => c.id)

test("the Voyage ID column orders by the id it shows, assigned ids included", async () => {
  // 20, 962250, 962255 (review), 962257 (change set); the unassigned new
  // voyage has no number and sorts at one end.
  const asc = await idsSortedByVoyageId("ASC")
  expect(asc.filter((id) => id !== "new-unassigned")).toEqual([
    "existing-20",
    "existing-962250",
    "new-in-review",
    "new-in-changeset"
  ])
  const desc = await idsSortedByVoyageId("DESC")
  expect(desc.filter((id) => id !== "new-unassigned")).toEqual([
    "new-in-changeset",
    "new-in-review",
    "existing-962250",
    "existing-20"
  ])
})

test("the latest non-empty assignment wins, as the column shows it", () => {
  const root = "uuid-x"
  expect(
    lastAssignedVoyageId(root, [
      { changes: [assignId(root, 1)] as never },
      { changes: [assignId(root, 2)] as never },
      // Emptied later: not an assignment, so 2 stands.
      { changes: [assignId(root, "")] as never },
      { changes: [assignId(root, null)] as never }
    ])
  ).toBe("2")
  // A change to another entity is not this voyage's id.
  expect(
    lastAssignedVoyageId(root, [{ changes: [assignId("uuid-other", 7)] as never }])
  ).toBeUndefined()
  // Falls back to the root id, and only a whole number sorts.
  expect(voyageIdSortKey({ id: 31888 }, [])).toBe("31888")
  expect(voyageIdSortKey({ id: root }, [])).toBeNull()
})

test("the migration backfills the sort key from change sets and reviews", async () => {
  await AppDataSource.manager
    .createQueryBuilder()
    .update(ContributionEntity)
    .set({ voyageIdNum: null })
    .execute()

  const migration = AllMigrations.map((m) => new m()).find(
    (m) => (m as { name?: string }).name === "ContributionVoyageIdNum1786900000000"
  )!
  const runner = AppDataSource.createQueryRunner()
  try {
    await migration.up(runner)
  } finally {
    await runner.release()
  }

  const keyOf = async (id: string) =>
    (await AppDataSource.manager.findOneBy(ContributionEntity, { id }))
      ?.voyageIdNum
  expect(String(await keyOf("existing-20"))).toBe("20")
  expect(String(await keyOf("new-in-changeset"))).toBe("962257")
  expect(String(await keyOf("new-in-review"))).toBe("962255")
  expect(await keyOf("new-unassigned")).toBeNull()
})
