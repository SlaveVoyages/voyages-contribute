import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The batch list sends counts, not contributions.
 *
 * It used to join the contributions and their change sets, so listing a
 * handful of batches shipped every stored diff they contained -- tens of
 * megabytes for a screen that renders numbers. These run against a real
 * database because the counts come from a grouped query.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-batch-")),
  "test.db"
)

const {
  AppDataSource,
  DatabaseService,
  ChangeSetEntity,
  ContributionEntity,
  PublicationBatchEntity
} = await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

const mkBatch = async (title: string, published: number | null) =>
  AppDataSource.manager.save(PublicationBatchEntity, {
    title,
    comments: "",
    published,
    publishedBy: published === null ? null : "editor"
  } as Partial<PublicationBatchEntity> as PublicationBatchEntity)

const pending = await mkBatch("pending batch", null)
const donePub = await mkBatch("published batch", 1700000000000)
const emptyBatch = await mkBatch("empty batch", null)

const mkContribution = async (
  id: string,
  status: ContributionStatus,
  batch: PublicationBatchEntity | null
) => {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "tester",
    title: "t",
    comments: "",
    timestamp: 0,
    // Big enough that a join would be obvious if one came back.
    changes: [{ filler: "x".repeat(500) }]
  })
  await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "new", schema: "Voyage", id },
    changeSet,
    status,
    batch
  } as ContributionEntity)
}

await mkContribution("p1", ContributionStatus.Accepted, pending)
await mkContribution("p2", ContributionStatus.Accepted, pending)
await mkContribution("p3", ContributionStatus.Submitted, pending)
await mkContribution("d1", ContributionStatus.Published, donePub)
await mkContribution("loose", ContributionStatus.WorkInProgress, null)

const service = new DatabaseService()

const byTitle = async (filter: "all" | "published" | "pending") => {
  const batches = await service.getBatchesByStatus(filter)
  return Object.fromEntries(batches.map((b) => [b.title, b]))
}

test("a batch reports how many contributions it holds, by status", async () => {
  const batches = await byTitle("pending")
  expect(batches["pending batch"].contributionCount).toBe(3)
  expect(batches["pending batch"].statusCounts).toEqual({
    [ContributionStatus.Accepted]: 2,
    [ContributionStatus.Submitted]: 1
  })
})

/** A batch with nothing in it gets no rows from the grouped query. */
test("an empty batch counts zero rather than going missing", async () => {
  const batches = await byTitle("pending")
  expect(batches["empty batch"]).toBeDefined()
  expect(batches["empty batch"].contributionCount).toBe(0)
  expect(batches["empty batch"].statusCounts).toEqual({})
})

test("contributions in other batches, and in none, are not counted", async () => {
  const batches = await byTitle("all")
  expect(batches["published batch"].contributionCount).toBe(1)
  // "loose" belongs to no batch and must not land in anyone's count.
  const total = Object.values(batches).reduce(
    (sum, b) => sum + b.contributionCount,
    0
  )
  expect(total).toBe(4)
})

test("the filters still select on published", async () => {
  expect(Object.keys(await byTitle("pending")).sort()).toEqual([
    "empty batch",
    "pending batch"
  ])
  expect(Object.keys(await byTitle("published"))).toEqual(["published batch"])
  expect(Object.keys(await byTitle("all")).length).toBe(3)
})

/** The point of the change: no contribution bodies ride along. */
test("no change sets are attached to a listed batch", async () => {
  const batches = await service.getBatchesByStatus("all")
  for (const batch of batches) {
    expect(
      (batch as unknown as { contributions?: unknown[] }).contributions
    ).toBeUndefined()
  }
})
