import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { PublishedAsEpochMillis1786300000000 } from "../src/backend/migrations/1786300000000-PublishedAsEpochMillis"
import { AllMigrations } from "../src/backend/migrations/1786100000000-InitialSchema"

/**
 * That the migrations produce the schema the entities are declared against.
 *
 * Changing a column type is the operation with the least in common between
 * dialects: sqlite has no ALTER for it and rebuilds the table instead, copying
 * the rows and re-declaring every constraint. Whether the foreign keys survive
 * that is not something the migration says, so it is asked here.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(mkdtempSync(join(tmpdir(), "contrib-mig-")), "t.db")

const { AppDataSource } = await import("../src/backend/db")
await AppDataSource.initialize()

const publishedType = async () => {
  const info = await AppDataSource.query("PRAGMA table_info(publication_batches)")
  return info.find((c: { name: string }) => c.name === "published")?.type
}

test("a publication date is stored as a number, and can be rolled back", async () => {
  await AppDataSource.runMigrations({ transaction: "all" })
  expect(await publishedType()).toBe("bigint")

  const fks = await AppDataSource.query("PRAGMA foreign_key_list(contributions)")
  expect(fks.map((f: { table: string }) => f.table).sort()).toEqual([
    "changesets",
    "publication_batches"
  ])

  // Roll back past PublishedAsEpochMillis. It is no longer necessarily the last
  // migration (later ones may sit on top), so undo one at a time until the
  // published column reverts, rather than assuming a single undo reaches it.
  let guard = 0
  while ((await publishedType()) !== "varchar") {
    await AppDataSource.undoLastMigration({ transaction: "all" })
    if (++guard > 20) throw new Error("published column never reverted")
  }
  expect(await publishedType()).toBe("varchar")

  // Applied again after the rollback.
  await AppDataSource.runMigrations({ transaction: "all" })
  expect(await publishedType()).toBe("bigint")

  // And applied to a database that already has the change. Calling
  // `runMigrations` a second time would show nothing, because the bookkeeping
  // table stops it before any DDL runs; a rebuild that failed partway leaves
  // no such row, which is why the sibling migration guards its own columns.
  const runner = AppDataSource.createQueryRunner()
  try {
    await new PublishedAsEpochMillis1786300000000().up(runner)
    expect(await publishedType()).toBe("bigint")
  } finally {
    await runner.release()
  }
})

test("the changeset author email is split out of the author, indexed, and folded back on rollback", async () => {
  await AppDataSource.runMigrations({ transaction: "all" })
  const migration = AllMigrations.map((m) => new m()).find(
    (m) => (m as { name?: string }).name === "ChangeSetAuthorEmailAndTimestampIndex1786700000000"
  )!
  const indexes = async (): Promise<string[]> =>
    (await AppDataSource.query("PRAGMA index_list(changesets)"))
      .map((index: { name: string }) => index.name)
      .filter((name: string) => name.startsWith("IDX_changesets_"))
      .sort()
  const authors = async (): Promise<Record<string, string>> =>
    Object.fromEntries(
      (
        await AppDataSource.query(
          "SELECT id, author, authorEmail FROM changesets WHERE id LIKE 'legacy-%' ORDER BY id"
        )
      ).map((row: { id: string; author: string; authorEmail: string | null }) => [
        row.id,
        `${row.author} | ${row.authorEmail ?? "(none)"}`
      ])
    )

  expect(await indexes()).toEqual([
    "IDX_changesets_authorEmail",
    "IDX_changesets_timestamp"
  ])

  const runner = AppDataSource.createQueryRunner()
  try {
    await migration.down(runner)
    expect(await indexes()).toEqual([])

    // Author values with and without an embedded address.
    const legacy: [string, string][] = [
      ["legacy-name", "Jane Doe <j@x.com>"],
      ["legacy-bare", "k@x.com"],
      ["legacy-none", "Local Dev"],
      ["legacy-subject", "Nameless <7d1f6a52-0c33-4f1e-9a77-2b6c1f0e5d84>"],
      // Addresses are lowercased where a token is read, so a value recorded in
      // another case has to arrive in that same form to be matched against.
      ["legacy-upper", "Jane Doe <J@X.com>"],
      ["legacy-padded", "  K@X.com  "]
    ]
    for (const [id, author] of legacy) {
      await AppDataSource.query(
        "INSERT INTO changesets (id, author, title, comments, timestamp, changes) VALUES (?, ?, 't', '', 0, '[]')",
        [id, author]
      )
    }

    await migration.up(runner)
    await migration.up(runner)
    expect(await indexes()).toEqual([
      "IDX_changesets_authorEmail",
      "IDX_changesets_timestamp"
    ])
    expect(await authors()).toEqual({
      "legacy-name": "Jane Doe | j@x.com",
      // An author value that is just an address.
      "legacy-bare": "k@x.com | k@x.com",
      // Neither of these holds an address, so none comes out of them.
      "legacy-none": "Local Dev | (none)",
      "legacy-subject":
        "Nameless <7d1f6a52-0c33-4f1e-9a77-2b6c1f0e5d84> | (none)",
      "legacy-upper": "Jane Doe | j@x.com",
      "legacy-padded": "k@x.com | k@x.com"
    })

    await migration.down(runner)
    await migration.down(runner)
    expect(
      Object.fromEntries(
        (
          await AppDataSource.query(
            "SELECT id, author FROM changesets WHERE id LIKE 'legacy-%' ORDER BY id"
          )
        ).map((row: { id: string; author: string }) => [row.id, row.author])
      )
    ).toEqual({
      ...Object.fromEntries(legacy),
      // A value the split normalised comes back in the normalised form.
      "legacy-upper": "Jane Doe <j@x.com>",
      "legacy-padded": "k@x.com"
    })

    await migration.up(runner)
  } finally {
    await runner.release()
  }
})

test("a contribution carries the address of its change set, indexed with the status", async () => {
  await AppDataSource.runMigrations({ transaction: "all" })
  const migration = AllMigrations.map((m) => new m()).find(
    (m) => (m as { name?: string }).name === "ContributionAuthorEmail1786800000000"
  )!
  const indexes = async (): Promise<string[]> =>
    (await AppDataSource.query("PRAGMA index_list(contributions)"))
      .map((index: { name: string }) => index.name)
      .filter((name: string) => name === "IDX_contributions_authorEmail_status")
  const addresses = async (): Promise<Record<string, string>> =>
    Object.fromEntries(
      (
        await AppDataSource.query(
          "SELECT id, authorEmail FROM contributions WHERE id LIKE 'mig-%' ORDER BY id"
        )
      ).map((row: { id: string; authorEmail: string | null }) => [
        row.id,
        row.authorEmail ?? "(none)"
      ])
    )

  const runner = AppDataSource.createQueryRunner()
  try {
    await migration.down(runner)
    expect(await indexes()).toEqual([])

    // Rows written before the column existed: one change set with an address,
    // one without.
    await AppDataSource.query(
      "INSERT INTO changesets (id, author, authorEmail, title, comments, timestamp, changes)" +
        " VALUES ('mig-cs-1', 'Jane Doe', 'j@x.com', 't', '', 0, '[]')," +
        " ('mig-cs-2', 'CSV importer script', NULL, 't', '', 0, '[]')"
    )
    for (const [id, changeSetId] of [
      ["mig-1", "mig-cs-1"],
      ["mig-2", "mig-cs-2"]
    ]) {
      await AppDataSource.query(
        "INSERT INTO contributions (id, root, status, changeSetId) VALUES (?, '{}', 0, ?)",
        [id, changeSetId]
      )
    }

    await migration.up(runner)
    await migration.up(runner)
    expect(await addresses()).toEqual({ "mig-1": "j@x.com", "mig-2": "(none)" })
    expect(await indexes()).toEqual(["IDX_contributions_authorEmail_status"])

    await migration.down(runner)
    await migration.down(runner)
    expect(await indexes()).toEqual([])
    expect(
      (
        await AppDataSource.query(
          "SELECT COUNT(*) AS n FROM pragma_table_info('contributions') WHERE name = 'authorEmail'"
        )
      )[0].n
    ).toBe(0)

    await migration.up(runner)
  } finally {
    await runner.release()
  }
})
