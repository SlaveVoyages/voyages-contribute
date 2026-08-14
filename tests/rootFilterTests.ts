import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The root filter matches a `simple-json` column as text, so its correctness
 * depends on how the value happens to be serialized — which varies by caller
 * and is not something the query can normalize. That only shows up against a
 * real database, so this exercises one.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-root-")),
  "test.db"
)

const { AppDataSource, DatabaseService, ChangeSetEntity, ContributionEntity } =
  await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

/** The key orders EntityRef is built in across the codebase, plus id types. */
const rows: { id: string; root: Record<string, unknown> }[] = [
  // contribute.ts builds { id, schema, type } — id first
  { id: "a", root: { id: 500002, schema: "Voyage", type: "existing" } },
  // entityFetch.ts builds { type, schema, id } — id last, the case that broke
  { id: "b", root: { type: "existing", schema: "Voyage", id: 500003 } },
  // server.ts builds { type, id, schema } — id in the middle
  { id: "c", root: { type: "existing", id: 500004, schema: "Voyage" } },
  // ids also occur as strings
  { id: "d", root: { type: "existing", schema: "Voyage", id: "500005" } },
  // same id under a different schema, which must not be confused for a voyage
  { id: "e", root: { type: "existing", schema: "Enslaver", id: 500002 } }
]

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

for (const { id, root } of rows) {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "tester",
    title: "t",
    comments: "",
    timestamp: 0,
    changes: []
  })
  await AppDataSource.manager.save(ContributionEntity, {
    id,
    root,
    changeSet,
    status: ContributionStatus.WorkInProgress
  } as ContributionEntity)
}

const service = new DatabaseService()

const idsMatching = async (options: {
  rootId?: string | number
  rootSchema?: string
}): Promise<string[]> => {
  const result = await service.listContributions({ ...options, limit: 100 })
  return result.data.map((c) => c.id).sort()
}

test("the root filter finds an entity however its ref was serialized", async () => {
  // Every key order and both id types, including id-last, which a pattern
  // requiring a trailing comma misses entirely.
  expect(await idsMatching({ rootId: 500002 })).toEqual(["a", "e"])
  expect(await idsMatching({ rootId: 500003 })).toEqual(["b"])
  expect(await idsMatching({ rootId: 500004 })).toEqual(["c"])
  expect(await idsMatching({ rootId: "500005" })).toEqual(["d"])

  // An id is only unique within its schema.
  expect(await idsMatching({ rootId: 500002, rootSchema: "Voyage" })).toEqual([
    "a"
  ])
  expect(await idsMatching({ rootId: 500002, rootSchema: "Enslaver" })).toEqual([
    "e"
  ])
  expect(await idsMatching({ rootSchema: "Enslaver" })).toEqual(["e"])

  // A prefix must not match a longer id.
  expect(await idsMatching({ rootId: 50000 })).toEqual([])
  expect(await idsMatching({ rootId: 5000021 })).toEqual([])

  // LIKE metacharacters arrive from the query string, so they have to be
  // matched literally rather than widening the search to everything.
  expect(await idsMatching({ rootId: "%" })).toEqual([])
  expect(await idsMatching({ rootId: "______" })).toEqual([])
  expect(await idsMatching({ rootSchema: "%" })).toEqual([])
  expect(await idsMatching({ rootId: 500002, rootSchema: "%" })).toEqual([])
})

test("a contribution is never fetched without an id", async () => {
  // TypeORM drops an undefined condition, turning "this contribution" into
  // "any contribution", which callers then write to.
  expect(await service.getContribution(undefined as unknown as string)).toBeNull()
  expect(await service.getContribution("")).toBeNull()
  expect(await service.getContribution("a")).not.toBeNull()
})
