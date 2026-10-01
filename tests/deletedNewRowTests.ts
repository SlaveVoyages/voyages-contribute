import { expect, test } from "vitest"
import { EntityChange, EntityRef } from "../src/models/changeSets"
import {
  combineContributionChanges,
  Contribution,
  ContributionStatus
} from "../src/models/contribution"
import { getSchema } from "../src/models/entities"
import {
  materializeNew,
  MaterializedEntity
} from "../src/models/materialization"

/**
 * A row added to a list in one layer and removed in a later one is neither
 * created nor deleted, and takes the new entities it links or owns with it.
 */

const uid = (schema: string, label: string) => {
  const p = getSchema(schema).properties.find((x) => x.label === label)
  if (!p) throw new Error(`${schema}.${label} not found`)
  return p.uid
}

const VOYAGE: EntityRef = { schema: "Voyage", id: "v1", type: "new" }
const SOURCES = uid("Voyage", "Sources")

const newRow = (id: string) =>
  materializeNew(getSchema("Voyage Source Connection"), id)

const newSource = (id: string): MaterializedEntity => ({
  entityRef: { schema: "Voyage Source", id, type: "new" },
  data: { Title: "A source" },
  state: "new"
})

const sources = (
  modified: { row: MaterializedEntity; source?: MaterializedEntity }[],
  removed: EntityRef[] = []
): EntityChange => ({
  type: "update",
  entityRef: VOYAGE,
  changes: [
    {
      kind: "ownedList",
      property: SOURCES,
      removed,
      modified: modified.map(({ row, source }) => ({
        kind: "owned" as const,
        ownedEntity: row,
        changes: source
          ? [
              {
                kind: "linked" as const,
                property: uid("Voyage Source Connection", "Source"),
                changed: source
              }
            ]
          : []
      }))
    }
  ]
})

const changeSet = (changes: EntityChange[]) => ({
  id: 0,
  author: "tester",
  title: "t",
  comments: "",
  timestamp: 0,
  changes
})

const combine = (contribution: EntityChange[], ...reviews: EntityChange[][]) =>
  combineContributionChanges({
    id: "c1",
    root: VOYAGE,
    status: ContributionStatus.Submitted,
    changeSet: changeSet(contribution),
    reviews: reviews.map((changes, i) => ({
      stackOrder: i + 1,
      changeSet: changeSet(changes)
    })),
    media: [],
    batch: null
  } as unknown as Contribution)

const updatedIds = (c: ReturnType<typeof combine>) =>
  c.updates.map((u) => String(u.entityRef.id))

test("a row added by the contribution and removed in a review is dropped", () => {
  const kept = newRow("kept")
  const dropped = newRow("dropped")
  const combined = combine(
    [
      sources([
        { row: kept, source: newSource("kept-source") },
        { row: dropped, source: newSource("dropped-source") }
      ])
    ],
    [sources([], [dropped.entityRef])]
  )
  expect(updatedIds(combined).sort()).toEqual(["kept", "kept-source", "v1"])
  expect(combined.deletions).toEqual([])
})

test("a removed existing row is still deleted", () => {
  const existing: EntityRef = {
    schema: "Voyage Source Connection",
    id: 7,
    type: "existing"
  }
  const combined = combine(
    [sources([{ row: newRow("kept") }])],
    [sources([], [existing])]
  )
  expect(combined.deletions.map((d) => d.entityRef.id)).toEqual([7])
  expect(updatedIds(combined)).toContain("kept")
})

test("the rows a removed new row owns go with it", () => {
  const relations = uid("Voyage", "Enslavement relations")
  const relationSchema = getSchema("EnslavementRelation")
  const enslavers = uid("EnslavementRelation", "Enslavers in relation")
  const relation = materializeNew(relationSchema, "relation")
  const child = materializeNew(getSchema("EnslaverInRelation"), "child")
  const list = (removed: EntityRef[], withRow: boolean): EntityChange => ({
    type: "update",
    entityRef: VOYAGE,
    changes: [
      {
        kind: "ownedList",
        property: relations,
        removed,
        modified: withRow
          ? [
              {
                kind: "owned",
                ownedEntity: relation,
                changes: [
                  {
                    kind: "ownedList",
                    property: enslavers,
                    removed: [],
                    modified: [
                      { kind: "owned", ownedEntity: child, changes: [] }
                    ]
                  }
                ]
              }
            ]
          : []
      }
    ]
  })
  const before = combine([list([], true)])
  expect(updatedIds(before).sort()).toEqual(["child", "relation", "v1"])
  const after = combine([list([], true)], [list([relation.entityRef], false)])
  expect(updatedIds(after)).toEqual(["v1"])
  expect(after.deletions).toEqual([])
})

test("purged rows are removed like any other removed row", () => {
  const dropped = newRow("dropped")
  const removal = sources([], [dropped.entityRef])
  const purged: EntityChange = {
    ...removal,
    changes: [{ ...removal.changes[0], purged: [dropped.entityRef] } as never]
  }
  const combined = combine([sources([{ row: dropped }])], [purged])
  expect(updatedIds(combined)).toEqual(["v1"])
  expect(combined.deletions).toEqual([])
})
