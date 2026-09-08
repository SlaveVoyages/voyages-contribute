import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The grid on Contribute Home sorts server side -- an infinite row model asks
 * the datasource for ordered blocks -- so a sortable column is only sortable
 * if `listContributions` can order by it. These run against a real database
 * because the order clause is built for TypeORM and only means anything once
 * a query is executed.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-sort-")),
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

// Each row also carries the fields the derived columns are ordered by:
// `voyageId` is root.id (the Voyage ID column), `decidedBy` is the Reviewer,
// and `batch` is the publication batch title it belongs to.
const rows = [
  { id: "a", comments: "cherry", timestamp: 300, status: 1, voyageId: 30, decidedBy: "carol", batch: "Gamma" },
  { id: "b", comments: "apple", timestamp: 100, status: 3, voyageId: 10, decidedBy: "alice", batch: "Alpha" },
  { id: "c", comments: "banana", timestamp: 200, status: 0, voyageId: 20, decidedBy: "bob", batch: "Delta" },
  { id: "d", comments: "damson", timestamp: 400, status: 2, voyageId: 5, decidedBy: "dave", batch: "Beta" }
]

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

const batchByTitle = new Map<string, InstanceType<typeof PublicationBatchEntity>>()
for (const title of new Set(rows.map((r) => r.batch))) {
  batchByTitle.set(
    title,
    await AppDataSource.manager.save(PublicationBatchEntity, {
      title,
      comments: ""
    } as InstanceType<typeof PublicationBatchEntity>)
  )
}

for (const { id, comments, timestamp, status, voyageId, decidedBy, batch } of rows) {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "tester",
    title: "t",
    comments,
    timestamp,
    changes: []
  })
  await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "existing", schema: "Voyage", id: voyageId },
    changeSet,
    status,
    decidedBy,
    batch: batchByTitle.get(batch)
  } as ContributionEntity)
}

const service = new DatabaseService()

const idsSortedBy = async (
  sortBy:
    | "author"
    | "timestamp"
    | "comments"
    | "status"
    | "id"
    | "decidedBy"
    | "batch"
    | "voyage_id",
  sortOrder: "ASC" | "DESC"
): Promise<string[]> =>
  (await service.listContributions({ sortBy, sortOrder, limit: 100 })).data.map(
    (c) => c.id
  )

test("contributions order by the date the grid shows", async () => {
  expect(await idsSortedBy("timestamp", "ASC")).toEqual(["b", "c", "a", "d"])
  expect(await idsSortedBy("timestamp", "DESC")).toEqual(["d", "a", "c", "b"])
})

/**
 * Both were sortable columns on the form that the server could not order by,
 * so clicking them moved the arrow and returned the same rows.
 */
test("contributions order by comments", async () => {
  expect(await idsSortedBy("comments", "ASC")).toEqual(["b", "c", "a", "d"])
  expect(await idsSortedBy("comments", "DESC")).toEqual(["d", "a", "c", "b"])
})

test("contributions order by status", async () => {
  expect(await idsSortedBy("status", "ASC")).toEqual(["c", "a", "d", "b"])
  expect(await idsSortedBy("status", "DESC")).toEqual(["b", "d", "a", "c"])
})

/**
 * `id` is both a sortable column and the tiebreaker, so its own direction has
 * to be honoured -- the tiebreaker line used to force ASC unconditionally, so
 * `sortBy=id&sortOrder=DESC` came back ascending.
 */
test("contributions order by id in the direction asked for", async () => {
  expect(await idsSortedBy("id", "ASC")).toEqual(["a", "b", "c", "d"])
  expect(await idsSortedBy("id", "DESC")).toEqual(["d", "c", "b", "a"])
})

// The derived columns the committee asked to sort as well. Reviewer and Batch
// are a real column and a to-one relation; Voyage ID is materialized from the
// root JSON, ordered by a JSON path.
test("contributions order by reviewer (decidedBy)", async () => {
  // alice, bob, carol, dave
  expect(await idsSortedBy("decidedBy", "ASC")).toEqual(["b", "c", "a", "d"])
  expect(await idsSortedBy("decidedBy", "DESC")).toEqual(["d", "a", "c", "b"])
})

test("contributions order by batch title", async () => {
  // Alpha(b), Beta(d), Delta(c), Gamma(a)
  expect(await idsSortedBy("batch", "ASC")).toEqual(["b", "d", "c", "a"])
  expect(await idsSortedBy("batch", "DESC")).toEqual(["a", "c", "d", "b"])
})

test("contributions order by voyage id (root.id via JSON path)", async () => {
  // Numeric ids 5(d), 10(b), 20(c), 30(a), ordered numerically.
  expect(await idsSortedBy("voyage_id", "ASC")).toEqual(["d", "b", "c", "a"])
  expect(await idsSortedBy("voyage_id", "DESC")).toEqual(["a", "c", "b", "d"])
})

test("statuses are the ones the app uses", () => {
  expect(ContributionStatus.WorkInProgress).toBe(0)
  expect(ContributionStatus.Rejected).toBe(3)
})
