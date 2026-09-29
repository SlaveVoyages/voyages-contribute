import { expect, test } from "vitest"
import {
  combineChanges,
  foldCombinedChanges,
  EntityChange,
  EntityRef,
  PropertyChange
} from "../src/models/changeSets"
import { getSchema } from "../src/models/entities"

/**
 * A new entity created through a link is published only while some link
 * still points at it (DD-0559). Replacing or clearing the link -- a review
 * picking another source, another short reference -- used to leave the
 * earlier new entity queued, validated (so a replaced source still had to
 * have a short reference) and published. What it owns goes with it; what is
 * still linked, for every field that can create an entity, stays.
 */

const uid = (schema: string, label: string) => {
  const p = getSchema(schema).properties.find((x) => x.label === label)
  if (!p) throw new Error(`${schema}.${label} not found`)
  return p.uid
}
const ref = (schema: string, id: string | number, type = "new") =>
  ({ schema, id, type }) as EntityRef
const entity = (r: EntityRef) =>
  ({ entityRef: r, data: {}, state: r.type === "new" ? "new" : "lazy" }) as never

const link = (
  owner: EntityRef,
  schema: string,
  label: string,
  target: EntityRef | null,
  linkedChanges: PropertyChange[] = []
): EntityChange => ({
  type: "update",
  entityRef: owner,
  changes: [
    {
      kind: "linked",
      property: uid(schema, label),
      changed: target ? entity(target) : null,
      linkedChanges: target ? linkedChanges : undefined
    } as PropertyChange
  ]
})

const direct = (schema: string, label: string, value: unknown) =>
  ({ kind: "direct", property: uid(schema, label), changed: value }) as PropertyChange

// A new source with its own new short reference, both named.
const sourceWithShortRef = (n: string): PropertyChange[] => [
  direct("Voyage Source", "Title", `Source ${n}`),
  {
    kind: "linked",
    property: uid("Voyage Source", "Short reference"),
    changed: entity(ref("Voyage Source Short Reference", `sr-${n}`)),
    linkedChanges: [direct("Voyage Source Short Reference", "Name", `SR ${n}`)]
  } as PropertyChange
]

const updatedIds = (changes: EntityChange[]) =>
  combineChanges(changes).updates.map((u) => String(u.entityRef.id))

const CONNECTION = ref("Voyage Source Connection", 99, "existing")

test("a replaced new source is dropped with its new short reference", () => {
  const ids = updatedIds(
    ["a", "b", "c"].map((n) =>
      link(
        CONNECTION,
        "Voyage Source Connection",
        "Source",
        ref("Voyage Source", `src-${n}`),
        sourceWithShortRef(n)
      )
    )
  )
  expect(ids).toContain("src-c")
  expect(ids).toContain("sr-c")
  for (const gone of ["src-a", "sr-a", "src-b", "sr-b"]) {
    expect(ids).not.toContain(gone)
  }
})

test("a cleared link drops the new entity it pointed at", () => {
  const ids = updatedIds([
    link(
      CONNECTION,
      "Voyage Source Connection",
      "Source",
      ref("Voyage Source", "src-x"),
      sourceWithShortRef("x")
    ),
    link(CONNECTION, "Voyage Source Connection", "Source", null)
  ])
  expect(ids).not.toContain("src-x")
  expect(ids).not.toContain("sr-x")
  // The connection itself still records the cleared link.
  expect(ids).toContain("99")
})

test("still-linked new entities stay, for every field that can create one", () => {
  const ids = updatedIds([
    link(
      CONNECTION,
      "Voyage Source Connection",
      "Source",
      ref("Voyage Source", "src-kept"),
      sourceWithShortRef("kept")
    ),
    link(
      ref("EnslavedInRelation", 7, "existing"),
      "EnslavedInRelation",
      "Enslaved",
      ref("Enslaved", "enslaved-kept"),
      [direct("Enslaved", "Documented name", "Ana")]
    ),
    link(
      ref("EnslaverInRelation", 8, "existing"),
      "EnslaverInRelation",
      "Enslaver alias",
      ref("EnslaverAliasWithIdentity", "alias-kept"),
      [
        direct("EnslaverAliasWithIdentity", "Alias", "J. Smith"),
        {
          kind: "linked",
          property: uid("EnslaverAliasWithIdentity", "Identity"),
          changed: entity(ref("Enslaver", "identity-kept")),
          linkedChanges: [direct("Enslaver", "Principal alias", "John Smith")]
        } as PropertyChange
      ]
    )
  ])
  for (const kept of [
    "src-kept",
    "sr-kept",
    "enslaved-kept",
    "alias-kept",
    "identity-kept"
  ]) {
    expect(ids).toContain(kept)
  }
})

test("a replaced new source takes its new date with it", () => {
  const withDate = (n: string): PropertyChange[] => [
    ...sourceWithShortRef(n),
    {
      kind: "linked",
      property: uid("Voyage Source", "Date"),
      changed: entity(ref("VoyageSparseDate", `date-${n}`)),
      linkedChanges: []
    } as PropertyChange
  ]
  const ids = updatedIds(
    ["old", "new"].map((n) =>
      link(
        CONNECTION,
        "Voyage Source Connection",
        "Source",
        ref("Voyage Source", `src-${n}`),
        withDate(n)
      )
    )
  )
  expect(ids).toContain("src-new")
  expect(ids).toContain("date-new")
  expect(ids).not.toContain("src-old")
  expect(ids).not.toContain("date-old")
})

test("acceptance checks only the source the connection ends with (191766)", () => {
  const titled = (n: string): PropertyChange[] => [
    direct("Voyage Source", "Title", `Source ${n}`)
  ]
  const combined = combineChanges([
    // Two sources without a short reference, each replaced...
    link(CONNECTION, "Voyage Source Connection", "Source", ref("Voyage Source", "src-1"), titled("1")),
    link(CONNECTION, "Voyage Source Connection", "Source", ref("Voyage Source", "src-2"), titled("2")),
    // ...by the one it ends with, which has one.
    link(CONNECTION, "Voyage Source Connection", "Source", ref("Voyage Source", "src-3"), sourceWithShortRef("3"))
  ])
  const { validation } = foldCombinedChanges([{ ...combined, label: "191766" }])
  expect(validation.filter((v) => /Short reference/.test(v.message))).toEqual([])
})
