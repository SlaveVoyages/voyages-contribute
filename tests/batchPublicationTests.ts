import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * What a batch records about its own publication, and what that record forbids.
 *
 * Both answers come from the database rather than from the entity: the dates
 * are columns whose type decides what the driver hands back, and the guard
 * reads a relation that has to be loaded to be read at all. Neither shows up
 * against a mock.
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

const db = new DatabaseService()

const contribution = async (id: string, status: ContributionStatus) => {
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "tester",
    title: "t",
    comments: "",
    timestamp: 0,
    changes: []
  })
  return await AppDataSource.manager.save(ContributionEntity, {
    id,
    root: { type: "existing", schema: "Voyage", id: 1 },
    changeSet,
    status
  } as ContributionEntity)
}

const setStatus = (id: string, status: ContributionStatus) =>
  AppDataSource.manager.update(ContributionEntity, id, { status })

const statusOf = async (id: string) =>
  (await AppDataSource.manager.findOneBy(ContributionEntity, { id }))?.status

test("an epoch column answers with a number, whatever the driver hands back", () => {
  // sqlite returns these as numbers; TypeORM asks mysql2 for big numbers as
  // strings, so on MySQL the same column arrives as "1786200000000". The
  // interfaces declare `number`, and a caller building a Date out of one has
  // no reason to ask which database answered. Nothing here can stand up a
  // MySQL server, so the coercion is exercised where it is declared.
  const columns = [
    [PublicationBatchEntity, "published"],
    [ContributionEntity, "decidedAt"],
    [ChangeSetEntity, "timestamp"]
  ] as const

  for (const [entity, property] of columns) {
    const declared = AppDataSource.getMetadata(entity).findColumnWithPropertyName(
      property
    )?.transformer
    const transformer = Array.isArray(declared) ? declared[0] : declared
    expect(transformer, `${entity.name}.${property}`).toBeDefined()

    const read = transformer!.from
    expect(read("1786200000000")).toBe(1786200000000)
    expect(typeof read("1786200000000")).toBe("number")
    expect(new Date(read("1786200000000")).toISOString()).toBe(
      new Date(1786200000000).toISOString()
    )
    // A number is left alone, and an absent date stays absent rather than
    // becoming the epoch.
    expect(read(1786200000000)).toBe(1786200000000)
    expect(read(null)).toBeNull()
  }
})

test("a publication date comes back as the number it was written as", async () => {
  const batch = await db.createPublicationBatch({ title: "dated", comments: "" })
  const at = 1786200000000

  expect(await db.markBatchPublished(batch.id, "editor@x", at)).toBe(true)
  const read = (await db.getBatchById(batch.id))!

  expect(typeof read.published).toBe("number")
  expect(read.published).toBe(at)
  expect(new Date(read.published!).toISOString()).toBe(new Date(at).toISOString())

  // Publication is polled, so the stamp is attempted more than once. Only the
  // first one lands, and it takes the publisher with it.
  expect(await db.markBatchPublished(batch.id, "someone@else", at + 1)).toBe(false)
  expect((await db.getBatchById(batch.id))!.published).toBe(at)
  expect((await db.getBatchById(batch.id))!.publishedBy).toBe("editor@x")
})

test("a completed publication is recorded whole", async () => {
  const batch = await db.createPublicationBatch({ title: "recorded", comments: "" })
  await contribution("rec-a", ContributionStatus.Accepted)
  await contribution("rec-b", ContributionStatus.Accepted)
  await db.assignContributionToBatch(["rec-a", "rec-b"], batch.id)

  const at = 1786300000000
  expect(await db.recordPublication(["rec-a", "rec-b"], batch.id, "editor@y", at)).toEqual(
    { updated: 2, stamped: true }
  )
  expect(await statusOf("rec-a")).toBe(ContributionStatus.Published)
  expect(await statusOf("rec-b")).toBe(ContributionStatus.Published)
  expect((await db.getBatchById(batch.id))!.published).toBe(at)

  // A repeated poll moves nothing and does not push the date forward.
  expect(await db.recordPublication(["rec-a"], batch.id, "editor@z", at + 1)).toEqual({
    updated: 1,
    stamped: false
  })
  expect((await db.getBatchById(batch.id))!.publishedBy).toBe("editor@y")

  // Work published on its own has no batch to stamp.
  await contribution("alone", ContributionStatus.Accepted)
  expect(await db.recordPublication(["alone"], null, "editor@y", at)).toEqual({
    updated: 1,
    stamped: false
  })
  expect(await statusOf("alone")).toBe(ContributionStatus.Published)
})

test("what a published batch holds is fixed, and what an open one holds is not", async () => {
  const published = await db.createPublicationBatch({ title: "out", comments: "" })
  const open = await db.createPublicationBatch({ title: "open", comments: "" })
  await contribution("published-member", ContributionStatus.Accepted)
  await contribution("elsewhere", ContributionStatus.Accepted)

  await db.assignContributionToBatch("published-member", published.id)
  await db.markBatchPublished(published.id, "editor@x", 1786200000000)

  // Neither end of a move may be a published batch, and the batch is named so
  // the editor knows which record refused them.
  for (const to of [null, open.id]) {
    expect(await db.assignContributionToBatch("published-member", to)).toMatchObject({
      error: expect.stringContaining(published.title)
    })
  }
  expect(
    await db.assignContributionToBatch("elsewhere", published.id)
  ).toHaveProperty("error")

  // Naming the batch it is already in moves it nowhere, so there is nothing to
  // refuse -- a retry is answered rather than told it is forbidden.
  expect(
    await db.assignContributionToBatch("published-member", published.id)
  ).not.toHaveProperty("error")

  // Demoting a member out of Published does not release it: its place in the
  // batch that published it stands on the batch's own record.
  await setStatus("published-member", ContributionStatus.Submitted)
  expect(await db.assignContributionToBatch("published-member", null)).toHaveProperty(
    "error"
  )

  // Published work is fixed even where no batch can answer for it. Published
  // on its own it carries no batch at all, and would otherwise be free to join
  // one and be counted among what that batch published.
  await contribution("published-alone", ContributionStatus.Published)
  expect(
    await db.assignContributionToBatch("published-alone", open.id)
  ).toMatchObject({ error: expect.stringContaining("published-alone") })

  // An open batch moves freely, including a member rejected after it was
  // assigned -- which is the only way such a batch can ever be emptied.
  expect(await db.assignContributionToBatch("elsewhere", open.id)).not.toHaveProperty(
    "error"
  )
  await setStatus("elsewhere", ContributionStatus.Rejected)
  expect(await db.assignContributionToBatch("elsewhere", null)).not.toHaveProperty(
    "error"
  )
  expect(await db.batchHasContributions(open.id)).toBe(false)
  expect(await db.deleteBatch(open.id)).toBe(true)
})
