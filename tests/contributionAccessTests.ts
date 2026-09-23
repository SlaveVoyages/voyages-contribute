import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * The root filter matches the denormalised `rootSchema` / `rootId` columns,
 * which an entity hook fills from `root` on every write regardless of how the
 * ref was serialized or which key order the caller built it in. This exercises
 * a real database to confirm the hook and the filter agree across every key
 * order and both id types, and that an id is still only unique within a schema.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-root-")),
  "test.db"
)

const {
  AppDataSource,
  DatabaseService,
  ChangeSetEntity,
  ContributionEntity,
  ContributionMediaEntity,
  PublicationBatchEntity,
  ReviewEntity
} = await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

/** The key orders EntityRef is built in across the codebase, plus id types. */
const rows: { id: string; root: Record<string, unknown> }[] = [
  // contribute.ts builds { id, schema, type } — id first
  { id: "a", root: { id: 500002, schema: "Voyage", type: "existing" } },
  // entityFetch.ts builds { type, schema, id } — id last
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
  // Built with `create` so it is a class instance: the BeforeInsert hook that
  // fills rootSchema / rootId only runs on instances, which is what every
  // production write path (create / find then save) produces.
  const contribution = AppDataSource.manager.create(ContributionEntity, {
    id,
    root,
    changeSet,
    status: ContributionStatus.WorkInProgress
  })
  await AppDataSource.manager.save(contribution)
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
  // Every key order and both id types resolve to the same rootId column value.
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

  // Column equality matches these literally: metacharacters from the query
  // string cannot widen an equality the way they would a LIKE.
  expect(await idsMatching({ rootId: "%" })).toEqual([])
  expect(await idsMatching({ rootId: "______" })).toEqual([])
  expect(await idsMatching({ rootSchema: "%" })).toEqual([])
  expect(await idsMatching({ rootId: 500002, rootSchema: "%" })).toEqual([])
})

test("sorting by voyage id orders numerically, not as text", async () => {
  // Ids of different lengths: a text sort would put "1000" before "999".
  for (const rootId of [999, 1000, 90, 100000]) {
    const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
      author: "tester",
      title: "t",
      comments: "",
      timestamp: 0,
      changes: []
    })
    const contribution = AppDataSource.manager.create(ContributionEntity, {
      id: `sort-${rootId}`,
      root: { type: "existing", schema: "SortProbe", id: rootId },
      changeSet,
      status: ContributionStatus.WorkInProgress
    })
    await AppDataSource.manager.save(contribution)
  }

  const ascending = await service.listContributions({
    rootSchema: "SortProbe",
    sortBy: "voyage_id",
    sortOrder: "ASC",
    limit: 100
  })
  expect(ascending.data.map((c) => c.id)).toEqual([
    "sort-90",
    "sort-999",
    "sort-1000",
    "sort-100000"
  ])
})

test("excludeStatus leaves out those statuses; an explicit status wins", async () => {
  const probes: { id: string; status: number }[] = [
    { id: "flt-wip", status: ContributionStatus.WorkInProgress },
    { id: "flt-sub", status: ContributionStatus.Submitted },
    { id: "flt-acc", status: ContributionStatus.Accepted },
    { id: "flt-pub1", status: ContributionStatus.Published },
    { id: "flt-pub2", status: ContributionStatus.Published }
  ]
  for (const { id, status } of probes) {
    const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
      author: "tester",
      title: "t",
      comments: "",
      timestamp: 0,
      changes: []
    })
    const contribution = AppDataSource.manager.create(ContributionEntity, {
      id,
      root: { type: "existing", schema: "FilterProbe", id: 1 },
      changeSet,
      status
    })
    await AppDataSource.manager.save(contribution)
  }

  const ids = async (options: object): Promise<string[]> =>
    (
      await service.listContributions({
        rootSchema: "FilterProbe",
        limit: 100,
        ...options
      })
    ).data
      .map((c) => c.id)
      .sort()

  // Single value: everything except Published (the editorial default).
  expect(await ids({ excludeStatus: ContributionStatus.Published })).toEqual([
    "flt-acc",
    "flt-sub",
    "flt-wip"
  ])
  // Array: exclude several at once.
  expect(
    await ids({
      excludeStatus: [ContributionStatus.Published, ContributionStatus.Accepted]
    })
  ).toEqual(["flt-sub", "flt-wip"])
  // An explicit status wins over excludeStatus (Published is still reachable).
  expect(
    await ids({
      status: ContributionStatus.Published,
      excludeStatus: ContributionStatus.Published
    })
  ).toEqual(["flt-pub1", "flt-pub2"])
})

test("an author owns their work by the email recorded with it, whatever name sits beside it", async () => {
  // One person's records: before they had a name to show, after, and after
  // they corrected it.
  const stored: { author: string; authorEmail: string | null }[] = [
    { author: "j@x.com", authorEmail: "j@x.com" },
    { author: "Jane Doe", authorEmail: "j@x.com" },
    { author: "Jane Q. Doe", authorEmail: "j@x.com" },
    { author: "Someone Else", authorEmail: "other@x.com" },
    // A name that reads like somebody else's address: only the recorded email
    // is compared, so it owns nothing of theirs.
    { author: "Evil <j@x.com>", authorEmail: "evil@x.com" },
    // Work no token stands behind, e.g. an import.
    { author: "CSV importer script", authorEmail: null }
  ]
  for (const [index, { author, authorEmail }] of stored.entries()) {
    await service.createContribution({
      id: `author-${index}`,
      root: { type: "existing", schema: "Voyage", id: 900000 + index },
      changeSet: {
        id: `cs-author-${index}`,
        author,
        authorEmail,
        title: "t",
        comments: "",
        timestamp: 0,
        changes: []
      },
      status: ContributionStatus.WorkInProgress
    })
  }

  const authored = async (author: string): Promise<string[]> =>
    (await service.listContributions({ author, limit: 100 })).data
      .map((c) => c.id)
      .sort()

  expect(await authored("j@x.com")).toEqual([
    "author-0",
    "author-1",
    "author-2"
  ])
  expect(await authored("other@x.com")).toEqual(["author-3"])
  expect(await authored("evil@x.com")).toEqual(["author-4"])

  // Matched whole: a wildcard collects nothing, and neither does a display
  // name or a fragment of an address.
  expect(await authored("%")).toEqual([])
  expect(await authored("CSV importer script")).toEqual([])
  expect(await authored("Jane Doe")).toEqual([])
  expect(await authored("x.com")).toEqual([])
})

test("deleting a contribution, or a batch holding contributions, takes their change sets with it", async () => {
  const changeSetsFor = async (ids: string[]): Promise<number> => {
    if (ids.length === 0) {
      return 0
    }
    const placeholders = ids.map(() => "?").join(", ")
    const [{ n }] = await AppDataSource.query(
      `SELECT COUNT(*) AS n FROM changesets WHERE id IN (${placeholders})`,
      ids
    )
    return Number(n)
  }

  // A contribution with a review and a media item: the rows referencing it
  // have to go first, and every change set it owns goes with it.
  const changeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "Deleter",
    authorEmail: "deleter@x.com",
    title: "t",
    comments: "",
    timestamp: 0,
    changes: []
  })
  const reviewChangeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "Reviewer",
    authorEmail: "reviewer@x.com",
    title: "r",
    comments: "",
    timestamp: 0,
    changes: []
  })
  const contribution = await AppDataSource.manager.save(
    AppDataSource.manager.create(ContributionEntity, {
      id: "del-1",
      root: { type: "existing", schema: "Voyage", id: 910001 },
      changeSet,
      status: ContributionStatus.WorkInProgress
    })
  )
  await AppDataSource.manager.save(ReviewEntity, {
    stackOrder: 1,
    changeSet: reviewChangeSet,
    contribution
  })
  await AppDataSource.manager.save(ContributionMediaEntity, {
    type: "image",
    file: "del-1.png",
    name: "shot",
    comments: "",
    contribution
  })

  expect(await service.deleteContribution("del-1")).toEqual({
    deleted: true,
    mediaFiles: ["del-1.png"]
  })
  expect(await service.getContribution("del-1")).toBeNull()
  expect(await changeSetsFor([changeSet.id, reviewChangeSet.id])).toBe(0)

  // The same for a batch deleted with the contributions it holds.
  const batch = await AppDataSource.manager.save(PublicationBatchEntity, {
    title: "batch to delete",
    comments: ""
  })
  const batchedChangeSet = await AppDataSource.manager.save(ChangeSetEntity, {
    author: "Deleter",
    authorEmail: "deleter@x.com",
    title: "t",
    comments: "",
    timestamp: 0,
    changes: []
  })
  await AppDataSource.manager.save(
    AppDataSource.manager.create(ContributionEntity, {
      id: "del-2",
      root: { type: "existing", schema: "Voyage", id: 910002 },
      changeSet: batchedChangeSet,
      batch,
      status: ContributionStatus.Accepted
    })
  )

  expect(await service.deleteBatch(batch.id, true)).toMatchObject({
    deleted: true
  })
  expect(await service.getContribution("del-2")).toBeNull()
  expect(await changeSetsFor([batchedChangeSet.id])).toBe(0)
})

test("a root names one entity and nothing else", async () => {
  const { isExactEntityRef } = await import("../src/models/changeSets")

  expect(isExactEntityRef({ type: "existing", schema: "Voyage", id: 2 })).toBe(
    true
  )
  expect(isExactEntityRef({ type: "new", schema: "Voyage", id: "2" })).toBe(true)

  // A stored root is searched as text, so a nested id is indistinguishable
  // from the real one: this shape would answer a "is voyage 2 taken?" probe
  // while being rooted at voyage 9.
  expect(
    isExactEntityRef({
      type: "existing",
      schema: "Voyage",
      id: 9,
      extra: { id: 2 }
    })
  ).toBe(false)

  expect(isExactEntityRef({ schema: "Voyage", id: 2 })).toBe(false)
  expect(isExactEntityRef({ type: "borrowed", schema: "Voyage", id: 2 })).toBe(
    false
  )
  expect(isExactEntityRef(null)).toBe(false)
})

test("a status change only lands on the status it was decided against", async () => {
  const contribution = await service.getContribution("a")
  expect(contribution?.status).toBe(ContributionStatus.WorkInProgress)

  // Two editors read the same row; the first decides.
  const first = await service.changeContributionStatus(
    "a",
    ContributionStatus.WorkInProgress,
    ContributionStatus.Accepted,
    "looks right"
  )
  expect(first?.status).toBe(ContributionStatus.Accepted)
  expect(first?.decisionComments).toBe("looks right")

  // The second is working from what it read before that, so it is refused
  // rather than quietly overwriting the decision it never saw.
  const second = await service.changeContributionStatus(
    "a",
    ContributionStatus.WorkInProgress,
    ContributionStatus.Rejected,
    "not yet"
  )
  expect(second).toBeNull()
  expect((await service.getContribution("a"))?.status).toBe(
    ContributionStatus.Accepted
  )
  expect((await service.getContribution("a"))?.decisionComments).toBe(
    "looks right"
  )

  // An editor correcting the note leaves the status where it is.
  const corrected = await service.changeContributionStatus(
    "a",
    ContributionStatus.Accepted,
    ContributionStatus.Accepted,
    "looks right, sources checked"
  )
  expect(corrected?.status).toBe(ContributionStatus.Accepted)
  expect(corrected?.decisionComments).toBe("looks right, sources checked")

  // The same request again writes nothing and is still a success: what the
  // caller needs to know is that the contribution says what they asked for,
  // not how many rows a driver counted. MySQL counts rows whose values
  // changed, so a replay there writes nothing at all.
  const replayed = await service.changeContributionStatus(
    "a",
    ContributionStatus.Accepted,
    ContributionStatus.Accepted,
    "looks right, sources checked"
  )
  expect(replayed?.decisionComments).toBe("looks right, sources checked")

  // A note can be taken back without moving the contribution.
  const withdrawn = await service.changeContributionStatus(
    "a",
    ContributionStatus.Accepted,
    ContributionStatus.Accepted,
    null
  )
  expect(withdrawn?.decisionComments ?? null).toBeNull()
  await service.changeContributionStatus(
    "a",
    ContributionStatus.Accepted,
    ContributionStatus.Accepted,
    "looks right"
  )

  // A comment explains one decision and does not outlive it, so moving on
  // without a new one leaves nothing behind to be read as a verdict on the
  // status that follows.
  const cleared = await service.changeContributionStatus(
    "a",
    ContributionStatus.Accepted,
    ContributionStatus.Submitted,
    undefined
  )
  expect(cleared?.decisionComments ?? null).toBeNull()
})

test("a contribution is never fetched without an id", async () => {
  // TypeORM drops an undefined condition, turning "this contribution" into
  // "any contribution", which callers then write to.
  expect(await service.getContribution(undefined as unknown as string)).toBeNull()
  expect(await service.getContribution("")).toBeNull()
  expect(await service.getContribution("a")).not.toBeNull()
})

test("a reader who is not the author is told that a contribution exists, and no more", async () => {
  const { redactUnlessAuthor } = await import("../src/backend/authz")
  const row = {
    id: "redact-1",
    root: { type: "existing", schema: "Voyage", id: 7 },
    status: ContributionStatus.Submitted,
    decisionComments: "an editor's note",
    changeSet: { authorEmail: "a@x.com", title: "a title", comments: "notes" }
  }
  const summary = {
    id: "redact-1",
    root: row.root,
    status: ContributionStatus.Submitted
  }

  expect(redactUnlessAuthor(row, "a@x.com")).toBe(row)
  expect(redactUnlessAuthor(row, "b@x.com")).toEqual(summary)
  // A reader with no address, and a row with none, are nobody's author.
  expect(redactUnlessAuthor(row, null)).toEqual(summary)
  expect(
    redactUnlessAuthor({ ...row, changeSet: { authorEmail: null } }, "a@x.com")
  ).toEqual(summary)
})
