import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { PublishedAsEpochMillis1786300000000 } from "../src/backend/migrations/1786300000000-PublishedAsEpochMillis"
import { ChangeSetTimestampIndex1786700000000 } from "../src/backend/migrations/1786700000000-ChangeSetTimestampIndex"

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

test("the changeset timestamp index is created, rolled back, and re-created, each at most once", async () => {
  await AppDataSource.runMigrations({ transaction: "all" })
  const timestampIndexes = async () =>
    (await AppDataSource.query("PRAGMA index_list(changesets)"))
      .map((index: { name: string }) => index.name)
      .filter((name: string) => name === "IDX_changesets_timestamp")

  expect(await timestampIndexes()).toHaveLength(1)

  const migration = new ChangeSetTimestampIndex1786700000000()
  const runner = AppDataSource.createQueryRunner()
  try {
    await migration.down(runner)
    await migration.down(runner)
    expect(await timestampIndexes()).toHaveLength(0)

    await migration.up(runner)
    await migration.up(runner)
    expect(await timestampIndexes()).toHaveLength(1)
  } finally {
    await runner.release()
  }
})
