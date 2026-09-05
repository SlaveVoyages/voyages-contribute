import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * Free-text search and the date range are applied in the query, so they only
 * mean anything against a real database. Search also has to respect the same
 * visibility rule the handler enforces: a contributor must not be able to probe
 * the redacted content (author / title / comments) of other people's rows, only
 * the public fields (contribution id, voyage id).
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-search-")),
  "test.db"
)

const { AppDataSource, DatabaseService, ChangeSetEntity, ContributionEntity } =
  await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

const rows = [
  {
    id: "sc-alice-1",
    author: "alice@x.com",
    title: "Nossa Senhora da Guia",
    comments: "cherry note",
    voyageId: 700001,
    timestamp: 1000
  },
  {
    id: "sc-bob-1",
    author: "bob@x.com",
    title: "Santa Maria",
    comments: "banana note",
    voyageId: 700002,
    timestamp: 2000
  },
  {
    id: "sc-alice-2",
    author: "alice@x.com",
    title: "Third vessel",
    comments: "damson note",
    voyageId: 700003,
    timestamp: 3000
  }
]

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

for (const { id, author, title, comments, voyageId, timestamp } of rows) {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author,
    title,
    comments,
    timestamp,
    changes: []
  })
  await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "existing", schema: "Voyage", id: voyageId },
    changeSet,
    status: ContributionStatus.Submitted
  } as ContributionEntity)
}

const service = new DatabaseService()

const ids = async (options: object): Promise<string[]> =>
  (await service.listContributions({ limit: 100, ...options })).data
    .map((c) => c.id)
    .sort()

// ── Search: editor scope ("all") ────────────────────────────────────────────

test("search matches the contribution id", async () => {
  expect(await ids({ search: "sc-bob-1" })).toEqual(["sc-bob-1"])
})

test("search matches the voyage id (root.id)", async () => {
  expect(await ids({ search: "700003" })).toEqual(["sc-alice-2"])
})

test("search matches author, title and comments for an editor", async () => {
  expect(await ids({ search: "bob@x.com" })).toEqual(["sc-bob-1"])
  expect(await ids({ search: "Santa" })).toEqual(["sc-bob-1"])
  expect(await ids({ search: "cherry" })).toEqual(["sc-alice-1"])
})

test("search is case-insensitive and escapes LIKE metacharacters", async () => {
  expect(await ids({ search: "SANTA" })).toEqual(["sc-bob-1"])
  // A bare % must not widen the search to every row.
  expect(await ids({ search: "%" })).toEqual([])
})

// ── Search: contributor scope (redaction) ───────────────────────────────────

test("a contributor cannot search into another author's redacted fields", async () => {
  const asAlice = { searchSensitiveScope: { ownIdentity: "alice@x.com" } }
  // "banana" is only in bob's comments -- not alice's to find.
  expect(await ids({ search: "banana", ...asAlice })).toEqual([])
  // "Santa" is bob's title -- likewise hidden.
  expect(await ids({ search: "Santa", ...asAlice })).toEqual([])
  // Her own comment is searchable.
  expect(await ids({ search: "cherry", ...asAlice })).toEqual(["sc-alice-1"])
  // Public fields stay searchable on any row, including bob's voyage id.
  expect(await ids({ search: "700002", ...asAlice })).toEqual(["sc-bob-1"])
})

test("an anonymous contributor matches only public fields", async () => {
  const anon = { searchSensitiveScope: { ownIdentity: null } }
  expect(await ids({ search: "cherry", ...anon })).toEqual([])
  expect(await ids({ search: "700001", ...anon })).toEqual(["sc-alice-1"])
})

// ── Date range ──────────────────────────────────────────────────────────────

test("date range filters on the changeSet timestamp, open-ended or bounded", async () => {
  expect(await ids({ dateFrom: 1500, dateTo: 2500 })).toEqual(["sc-bob-1"])
  expect(await ids({ dateFrom: 2500 })).toEqual(["sc-alice-2"])
  expect(await ids({ dateTo: 1500 })).toEqual(["sc-alice-1"])
  // Bounds are inclusive.
  expect(await ids({ dateFrom: 1000, dateTo: 1000 })).toEqual(["sc-alice-1"])
})

test("search and date range combine", async () => {
  // "note" is in every row's comments; the range narrows it to one.
  expect(await ids({ search: "note", dateFrom: 2500 })).toEqual(["sc-alice-2"])
})

test("search combines with every sortable column without an alias error", async () => {
  // Search forces the query-builder path; sorting by a relation column there
  // used to throw an unknown-alias error. All three rows contain "note".
  const columns = [
    "author",
    "timestamp",
    "comments",
    "status",
    "id",
    "voyage_id",
    "decidedBy",
    "batch"
  ] as const
  for (const sortBy of columns) {
    for (const sortOrder of ["ASC", "DESC"] as const) {
      const r = await service.listContributions({
        search: "note",
        sortBy,
        sortOrder,
        limit: 100
      })
      expect(r.data.length, `${sortBy} ${sortOrder}`).toBe(3)
    }
  }
})

test("search + sort by author orders by the author, in the query-builder path", async () => {
  // Raw order (not the sorted `ids` helper): alice's two rows, then bob's.
  const r = await service.listContributions({
    search: "note",
    sortBy: "author",
    sortOrder: "ASC",
    limit: 100
  })
  expect(r.data.map((c) => c.id)).toEqual([
    "sc-alice-1",
    "sc-alice-2",
    "sc-bob-1"
  ])
})
