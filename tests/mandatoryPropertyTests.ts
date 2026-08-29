import { expect, test } from "vitest"
import { foldCombinedChanges } from "../src/models/changeSets"

/**
 * When a mandatory property counts as unset.
 *
 * The answer differs by what is being written. A new entity is described
 * entirely by its changes, so anything mandatory has to be among them. An
 * update to an existing entity is a partial description of a row that is
 * already there, so the properties it says nothing about keep the values they
 * have -- and requiring them again meant a one-field correction to a voyage was
 * refused for a "missing" Dataset that was in the database the whole time.
 */

const voyage = (type: "new" | "existing", id: string | number) => ({
  type,
  schema: "Voyage",
  id
})

const source = (type: "new" | "existing", id: string | number) => ({
  type,
  schema: "Voyage Source",
  id
})

/** `dataset` is the backing field of Voyage's mandatory "Dataset". */
const fold = (
  entityRef: ReturnType<typeof voyage>,
  changes: { property: string; changed: unknown }[]
) =>
  foldCombinedChanges([
    {
      deletions: [],
      updates: [
        {
          entityRef,
          changes: changes.map((c) => ({ kind: "direct", ...c })) as any
        }
      ],
      label: "c1"
    } as any
  ])

const errorsOf = (r: ReturnType<typeof fold>) =>
  r.validation.filter((v) => v.kind === "error").map((v) => v.message)

test("a new entity must carry every mandatory property", () => {
  const errors = errorsOf(
    fold(voyage("new", "tmp-1"), [{ property: "voyage_id", changed: 1 }])
  )
  expect(errors).toContain("Property 'Dataset' is required but not set.")
})

test("a new entity that sets them is accepted", () => {
  const errors = errorsOf(
    fold(voyage("new", "tmp-1"), [
      { property: "voyage_id", changed: 1 },
      { property: "dataset", changed: 0 }
    ])
  )
  expect(errors).not.toContain("Property 'Dataset' is required but not set.")
})

test("an existing entity may be updated without restating what it already holds", () => {
  // The case this rule was getting wrong: a contribution editing one field of a
  // real voyage was told Dataset was missing, while the voyage's own row had it
  // set correctly. Nothing here mentions Dataset, so nothing is being changed
  // about it.
  const errors = errorsOf(
    fold(voyage("existing", 500049), [
      { property: "voyage_id", changed: 500049 }
    ])
  )
  expect(errors).toEqual([])
})

test("an existing entity may not have a mandatory property cleared", () => {
  // Saying nothing leaves the value alone; saying null takes it away, and the
  // column cannot hold that.
  const errors = errorsOf(
    fold(voyage("existing", 500049), [{ property: "dataset", changed: null }])
  )
  expect(errors).toEqual([
    "Property 'Dataset' is required and cannot be cleared."
  ])
})

test("an existing entity may have a mandatory property changed to a new value", () => {
  const errors = errorsOf(
    fold(voyage("existing", 500049), [{ property: "dataset", changed: 2 }])
  )
  expect(errors).toEqual([])
})

test("an entity with nothing mandatory missing reports nothing either way", () => {
  for (const ref of [voyage("new", "tmp-2"), voyage("existing", 7)]) {
    const errors = errorsOf(fold(ref, [{ property: "dataset", changed: 1 }]))
    expect(errors).not.toContain(
      "Property 'Dataset' is required and cannot be cleared."
    )
  }
})

/**
 * A new source must carry a short reference.
 *
 * `document_source.short_ref` is NOT NULL with no default, so a source created
 * without one publishes into a constraint violation -- after acceptance, when
 * nobody can fix it. The picker writes `short_ref_id` as a linked FK, which the
 * fold flattens to a direct change on that column, so an unset one is simply an
 * absent change.
 */
test("a new source must name its short reference", () => {
  const errors = errorsOf(
    fold(source("new", "tmp-src-1"), [{ property: "title", changed: "A book" }])
  )
  expect(errors).toContain("Property 'Short reference' is required but not set.")
})

test("a new source that names one is accepted", () => {
  const errors = errorsOf(
    fold(source("new", "tmp-src-1"), [
      { property: "title", changed: "A book" },
      { property: "short_ref_id", changed: 2727 }
    ])
  )
  expect(errors).not.toContain(
    "Property 'Short reference' is required but not set."
  )
})

test("an existing source referenced without change keeps its short reference", () => {
  // How a contribution usually cites a source: it points at an existing
  // `document_source` row that already satisfies the column. Nothing is said
  // about `short_ref_id`, so nothing is missing.
  const errors = errorsOf(
    fold(source("existing", 19532), [
      { property: "title", changed: "A corrected title" }
    ])
  )
  expect(errors).toEqual([])
})
