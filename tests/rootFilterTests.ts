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

test("an author is found by address, whatever name is recorded beside it", async () => {
  const { authorIdentity } = await import("../src/backend/authz")

  // The address is the identity; the name is only there to be read. The last
  // bracketed group wins, so a name cannot pass itself off as the address.
  expect(authorIdentity("Jane Doe <j@x.com>")).toBe("j@x.com")
  expect(authorIdentity("j@x.com")).toBe("j@x.com")
  expect(authorIdentity("  J@X.com  ")).toBe("j@x.com")
  expect(authorIdentity("Evil <victim@x.com> <attacker@x.com>")).toBe(
    "attacker@x.com"
  )

  // Three records for one person: created before names were recorded, after,
  // and after they corrected their name. All three are theirs.
  const stored = [
    "j@x.com",
    "Jane Doe <j@x.com>",
    "Jane Q. Doe <j@x.com>",
    "Someone Else <other@x.com>"
  ]
  for (const [index, authorValue] of stored.entries()) {
    const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
      author: authorValue,
      title: "t",
      comments: "",
      timestamp: 0,
      changes: []
    })
    await AppDataSource.manager.save(ContributionEntity, {
      id: `author-${index}`,
      root: { type: "existing", schema: "Voyage", id: 900000 + index },
      changeSet,
      status: ContributionStatus.WorkInProgress
    } as ContributionEntity)
  }

  const mine = await service.listContributions({
    author: "Jane Q. Doe <j@x.com>",
    limit: 100
  })
  expect(mine.data.map((c) => c.id).sort()).toEqual([
    "author-0",
    "author-1",
    "author-2"
  ])

  // Someone else's work stays theirs, and a wildcard does not collect it.
  const theirs = await service.listContributions({
    author: "other@x.com",
    limit: 100
  })
  expect(theirs.data.map((c) => c.id)).toEqual(["author-3"])
  expect(
    (await service.listContributions({ author: "%", limit: 100 })).data
  ).toEqual([])
})

test("a contribution is never fetched without an id", async () => {
  // TypeORM drops an undefined condition, turning "this contribution" into
  // "any contribution", which callers then write to.
  expect(await service.getContribution(undefined as unknown as string)).toBeNull()
  expect(await service.getContribution("")).toBeNull()
  expect(await service.getContribution("a")).not.toBeNull()
})
