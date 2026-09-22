import { expect, test, vi } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The page's ids and the total are read by queries joined only to the
 * relations their filter names.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-count-")),
  "test.db"
)

const {
  AppDataSource,
  DatabaseService,
  ChangeSetEntity,
  ContributionEntity,
  ContributionMediaEntity,
  ReviewEntity
} = await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

// The first contribution has several reviews and a media item, so a query
// joined to them returns more rows than there are contributions.
for (const [index, id] of ["count-a", "count-b", "count-c"].entries()) {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "Alice",
    authorEmail: "alice@x.com",
    title: `title ${id}`,
    comments: `comments ${id}`,
    timestamp: 1000 * (index + 1),
    changes: []
  })
  const contribution = await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "existing", schema: "Voyage", id: 800000 + index },
    changeSet,
    status: ContributionStatus.Submitted
  } as ContributionEntity)
  if (index === 0) {
    for (const stackOrder of [0, 1]) {
      const reviewChangeSet = await AppDataSource.manager.save(
        ChangeSetEntity,
        {
          author: "Editor",
          authorEmail: "editor@x.com",
          title: "review",
          comments: "review",
          timestamp: 5000 + stackOrder,
          changes: []
        }
      )
      await AppDataSource.manager.save(ReviewEntity, {
        stackOrder,
        changeSet: reviewChangeSet,
        contribution
      })
    }
    await AppDataSource.manager.save(ContributionMediaEntity, {
      type: "image",
      file: "f.png",
      name: "f",
      comments: "",
      contribution
    })
  }
}

const service = new DatabaseService()

/**
 * Lists with `options` and returns the result, plus the query that picked the
 * page (the one with a LIMIT) and the one that counted the total.
 */
const listAndCapture = async (options: object) => {
  const spy = vi.spyOn(AppDataSource.logger, "logQuery")
  try {
    const result = await service.listContributions({ limit: 50, ...options })
    const sql = spy.mock.calls.map(([query]) => query)
    const counts = sql.filter((query) => /^SELECT COUNT\(/i.test(query))
    const paged = sql.filter(
      (query) => /\bLIMIT\b/i.test(query) && !/^SELECT COUNT\(/i.test(query)
    )
    expect(counts).toHaveLength(1)
    expect(paged).toHaveLength(1)
    return { result, countSql: counts[0], pageSql: paged[0] }
  } finally {
    spy.mockRestore()
  }
}

test("the page's ids and the total join only the relations the filter names", async () => {
  // No filter: nothing to join.
  const plain = await listAndCapture({})
  expect(plain.pageSql).not.toMatch(/\bJOIN\b/i)
  expect(plain.countSql).not.toMatch(/\bJOIN\b/i)

  // A changeSet sort joins nothing.
  const byTimestamp = await listAndCapture({
    sortBy: "timestamp",
    sortOrder: "DESC"
  })
  expect(byTimestamp.pageSql).not.toMatch(/\bJOIN\b/i)
  expect(byTimestamp.countSql).not.toMatch(/\bJOIN\b/i)
  expect(byTimestamp.result.data.map((c) => c.id)).toEqual([
    "count-c",
    "count-b",
    "count-a"
  ])

  // A changeSet filter joins changesets, and none of the other relations.
  const byDate = await listAndCapture({ dateFrom: 2000 })
  for (const sql of [byDate.pageSql, byDate.countSql]) {
    expect(sql).toMatch(/\bJOIN "changesets"/i)
    expect(sql).not.toMatch(/reviews|contribution_media|publication_batches/i)
  }
  expect(byDate.result.total).toBe(2)

  // Search matches changesets through a subquery, so it joins nothing.
  const bySearch = await listAndCapture({ search: "count-" })
  expect(bySearch.pageSql).not.toMatch(/\bJOIN\b/i)
  expect(bySearch.countSql).not.toMatch(/\bJOIN\b/i)
  expect(bySearch.result.total).toBe(3)
})

test("the total counts only what the search matches, within its redaction scope", async () => {
  // Only count-a's changeSet title holds the term, and a title is redacted
  // from everyone but its author.
  const search = "title count-a"

  const asEditor = await listAndCapture({ search })
  expect(asEditor.result.total).toBe(1)
  expect(asEditor.result.data.map((c) => c.id)).toEqual(["count-a"])

  const asAuthor = await listAndCapture({
    search,
    searchSensitiveScope: { ownIdentity: "alice@x.com" }
  })
  expect(asAuthor.result.total).toBe(1)

  const asSomeoneElse = await listAndCapture({
    search,
    searchSensitiveScope: { ownIdentity: "bob@x.com" }
  })
  expect(asSomeoneElse.result.total).toBe(0)
  expect(asSomeoneElse.result.data).toEqual([])
})

test("the listing total counts contributions, and each row carries its relations", async () => {
  for (const options of [{}, { search: "count-" }]) {
    const { result } = await listAndCapture(options)
    expect(result.total).toBe(3)
    expect(result.data).toHaveLength(3)

    const reviewed = result.data.find((c) => c.id === "count-a")
    expect(reviewed?.changeSet.title).toBe("title count-a")
    expect(reviewed?.reviews.map((r) => r.changeSet.authorEmail)).toEqual([
      "editor@x.com",
      "editor@x.com"
    ])
    expect(reviewed?.media).toHaveLength(1)
  }

  // A later page reports the whole total.
  const { result: second } = await listAndCapture({ page: 2, limit: 2 })
  expect(second.total).toBe(3)
  expect(second.data.map((c) => c.id)).toEqual(["count-c"])
})
