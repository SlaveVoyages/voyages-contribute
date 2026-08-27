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

const { AppDataSource, DatabaseService, ChangeSetEntity, ContributionEntity } =
  await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

const rows = [
  { id: "a", comments: "cherry", timestamp: 300, status: 1 },
  { id: "b", comments: "apple", timestamp: 100, status: 3 },
  { id: "c", comments: "banana", timestamp: 200, status: 0 },
  { id: "d", comments: "damson", timestamp: 400, status: 2 }
]

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

for (const { id, comments, timestamp, status } of rows) {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "tester",
    title: "t",
    comments,
    timestamp,
    changes: []
  })
  await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "existing", schema: "Voyage", id: 1 },
    changeSet,
    status
  } as ContributionEntity)
}

const service = new DatabaseService()

const idsSortedBy = async (
  sortBy: "author" | "timestamp" | "comments" | "status" | "id",
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

/** Unchanged, and still the fallback for anything the caller cannot name. */
test("contributions order by id when nothing else is asked for", async () => {
  expect(await idsSortedBy("id", "ASC")).toEqual(["a", "b", "c", "d"])
})

test("statuses are the ones the app uses", () => {
  expect(ContributionStatus.WorkInProgress).toBe(0)
  expect(ContributionStatus.Rejected).toBe(3)
})
