import { expect, test } from "vitest"
import {
  combineChanges,
  foldCombinedChanges,
  EntityChange,
  PropertyChange
} from "../src/models/changeSets"
import { getSchema } from "../src/models/entities"
import { MaterializedEntity } from "../src/models/materialization"

/**
 * A new entity linked without linkedChanges is written from its data; one
 * linked with linkedChanges is written from those alone.
 */

const uid = (schema: string, label: string) => {
  const p = getSchema(schema).properties.find((x) => x.label === label)
  if (!p) throw new Error(`${schema}.${label} not found`)
  return p.uid
}

const newEntity = (
  schema: string,
  id: string,
  data: MaterializedEntity["data"]
): MaterializedEntity => ({
  entityRef: { schema, id, type: "new" },
  data,
  state: "new"
})

const SOURCE_LINK = uid("Voyage Source Connection", "Source")

// Links `source` from an existing connection and folds the result, the way
// acceptance does.
const fold = (source: MaterializedEntity, linkedChanges?: PropertyChange[]) => {
  const change: EntityChange = {
    type: "update",
    entityRef: { schema: "Voyage Source Connection", id: 99, type: "existing" },
    changes: [
      {
        kind: "linked",
        property: SOURCE_LINK,
        changed: source,
        linkedChanges
      } as PropertyChange
    ]
  }
  return foldCombinedChanges([{ ...combineChanges([change]), label: "test" }])
}

const written = (result: ReturnType<typeof fold>, id: string | number) =>
  result.updates
    .filter((u) => String(u.entityRef.id) === String(id))
    .flatMap((u) => u.changes.map((c) => [c.property, c.changed]))

const shortRefErrors = (result: ReturnType<typeof fold>) =>
  result.validation.filter(
    (v) => v.kind === "error" && /Short reference/.test(v.message)
  )

test("a new source without linkedChanges is written from its data, nested new entities included", () => {
  const result = fold(
    newEntity("Voyage Source", "src-1", {
      Title: "T",
      "Short reference": newEntity("Voyage Source Short Reference", "sr-1", {
        Name: "SR"
      })
    })
  )
  expect(shortRefErrors(result)).toEqual([])
  expect(written(result, "src-1")).toContainEqual(["title", "T"])
  expect(written(result, "src-1")).toContainEqual(["short_ref_id", "sr-1"])
  expect(written(result, "sr-1")).toContainEqual(["name", "SR"])
})

test("its link to an existing entity is written as the foreign key only", () => {
  const result = fold(
    newEntity("Voyage Source", "src-1", {
      Title: "T",
      "Short reference": {
        entityRef: {
          schema: "Voyage Source Short Reference",
          id: 7,
          type: "existing"
        },
        data: { Name: "SR" },
        state: "lazy"
      }
    })
  )
  expect(shortRefErrors(result)).toEqual([])
  expect(written(result, "src-1")).toContainEqual(["short_ref_id", 7])
  expect(written(result, 7)).toEqual([])
})

test("data without a short reference still fails the required check", () => {
  const result = fold(newEntity("Voyage Source", "src-1", { Title: "T" }))
  expect(shortRefErrors(result)).toHaveLength(1)
  expect(written(result, "src-1")).toContainEqual(["title", "T"])
})

test("linkedChanges, when present, are used instead of the data", () => {
  const source = newEntity("Voyage Source", "src-1", { Title: "From data" })
  const fromChanges = fold(source, [
    {
      kind: "direct",
      property: uid("Voyage Source", "Title"),
      changed: "From changes"
    }
  ])
  expect(written(fromChanges, "src-1")).toContainEqual([
    "title",
    "From changes"
  ])
  expect(written(fromChanges, "src-1")).not.toContainEqual([
    "title",
    "From data"
  ])

  // An explicit empty list is kept as "no fields".
  expect(written(fold(source, []), "src-1")).toEqual([])
})
