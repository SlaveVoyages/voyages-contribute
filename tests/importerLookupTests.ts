import { expect, test } from "vitest"
import { DataMapping, EntityLookUp, MapRow } from "../src/tools/importer"
import { getSchema } from "../src/models/entities"
import { MappingError } from "../src/tools/importer"
import { voyageMapping } from "../src/tools/voyageMapping"

/**
 * What an import does with a reference it cannot resolve.
 *
 * It used to record the failure and then write it down anyway, as a link set to
 * nothing. Two things followed. The null read as a deliberately emptied value
 * rather than an unanswered question, and -- because an owned list decided
 * whether to create an entity by counting changes rather than looking at them --
 * it was enough to bring a source connection into being whose only content was
 * its own emptiness. Every one of those is refused at publication for the very
 * property the lookup failed to supply, so the import quietly manufactured
 * records that could never be published. There are 6,117 of them in the store.
 */

const sourceConnectionList: DataMapping = {
  kind: "ownedList",
  targetField: "Sources",
  addedToList: [
    {
      kind: "owned",
      importUpdates: [
        {
          kind: "linked",
          targetField: "Source",
          header: "sourcea",
          lookupField: "Short reference.Name"
        },
        {
          kind: "direct",
          targetField: "Page range",
          header: "pages"
        }
      ]
    }
  ]
}

/** A lookup that finds nothing, as it did for these citations. */
const missingLookup: EntityLookUp = { lookup: async () => null }

const mapRow = async (row: Record<string, string>, lookup: EntityLookUp) => {
  const errors: MappingError[] = []
  const changes = await MapRow(
    row,
    sourceConnectionList,
    getSchema("Voyage"),
    lookup,
    errors
  )
  return { changes, errors }
}

test("an unresolved reference is reported, not written down as nothing", async () => {
  const { changes, errors } = await mapRow({ sourcea: "José", pages: "" }, missingLookup)
  expect(errors).toHaveLength(1)
  expect(errors[0]).toMatchObject({ kind: "lookup", value: "José" })
  // Nothing was resolved, so there is nothing to add to the list.
  expect(changes).toEqual([])
})

test("no entity is created out of a row that said nothing usable", async () => {
  const { changes } = await mapRow({ sourcea: "", pages: "" }, missingLookup)
  expect(changes).toEqual([])
})

test("a resolved reference still creates the connection", async () => {
  const found: EntityLookUp = {
    lookup: async () => ({
      entityRef: { type: "existing", schema: "Voyage Source", id: 1 },
      state: "original",
      data: {},
      lookupValue: "José"
    }) as any
  }
  const { changes, errors } = await mapRow({ sourcea: "José", pages: "310" }, found)
  expect(errors).toEqual([])
  expect(changes).toHaveLength(1)
  const list = changes[0] as any
  expect(list.kind).toBe("ownedList")
  expect(list.modified).toHaveLength(1)
  const source = list.modified[0].changes.find(
    (c: any) => c.kind === "linked"
  )
  expect(source.changed).not.toBeNull()
})

test("a citation that resolves to nothing does not become a page range on its own", async () => {
  // The half-built record: no Source, but a page range carrying the citation
  // text. It cannot publish, and it is not what the row meant. 3,861 of the
  // 6,117 in the store look like this.
  const { changes, errors } = await mapRow(
    { sourcea: "Precis, Letters Dispatched, 1649-1662", pages: "v. 306-319" },
    missingLookup
  )
  expect(changes).toEqual([])
  // Reported twice over, and both are worth saying: the reference that could
  // not be found, and the record that could not be built without it.
  expect(errors.map((e) => e.kind).sort()).toEqual(["incomplete", "lookup"])
  expect(errors.find((e) => e.kind === "incomplete")).toMatchObject({
    schema: "Voyage Source Connection",
    missing: "Source"
  })
})

test("the row is still identifiable afterwards, so the import can be re-run", async () => {
  // Dropping the item is only defensible because what it said survives in the
  // error -- otherwise this would be losing data quietly.
  const { errors } = await mapRow({ sourcea: "José", pages: "310" }, missingLookup)
  expect(errors.find((e) => e.kind === "lookup")).toMatchObject({ value: "José" })
})

/**
 * Cargo says the same thing across three columns -- what it was, the unit, and
 * how much -- and a row can fill in any of them alone. Only the first says what
 * the record is about, so "7" with nothing named is seven of nothing, and a
 * type the lookup cannot find leaves the same hole a blank one does.
 */

const mapCargoRow = async (
  row: Record<string, string>,
  lookup: EntityLookUp
) => {
  const errors: MappingError[] = []
  const changes = await MapRow(
    // The mapping is gated on a voyage id, so the row needs one to be read at
    // all.
    { voyageid: "1", ...row },
    voyageMapping,
    getSchema("Voyage"),
    lookup,
    errors
  )
  const cargo = changes.find((c) => c.property === "Voyage_Cargo") as any
  return { cargo, errors }
}

/** A lookup that resolves every name it is given. */
const anyCargoFound: EntityLookUp = {
  lookup: async (schema, _field, value) =>
    ({
      entityRef: { type: "existing", schema: schema.name, id: 42 },
      state: "original",
      data: { Name: value },
      lookupValue: value
    }) as any
}

test("a cargo slot that never says what the cargo was is refused", async () => {
  // An amount and a unit, no type.
  const counted = await mapCargoRow(
    { cargocountc: "7", cargotypec: "", cargounitc: "" },
    missingLookup
  )
  expect(counted.cargo).toBeUndefined()
  expect(counted.errors).toEqual([
    expect.objectContaining({
      kind: "incomplete",
      schema: "VoyageCargoConnectionSchema",
      missing: "Cargo type"
    })
  ])

  // A type the lookup cannot place is the same hole, and the amount beside it
  // must not carry the record through on its own.
  const unresolved = await mapCargoRow(
    { cargotypeb: "Bees wax", cargounitb: "", cargocountb: "5" },
    missingLookup
  )
  expect(unresolved.cargo).toBeUndefined()
  expect(unresolved.errors.map((e) => e.kind).sort()).toEqual([
    "incomplete",
    "lookup"
  ])
  expect(unresolved.errors.find((e) => e.kind === "lookup")).toMatchObject({
    value: "Bees wax"
  })
})

test("a slot that names its cargo still becomes a record", async () => {
  const { cargo, errors } = await mapCargoRow(
    { cargotypea: "Gold", cargounita: "Ounces", cargocounta: "3" },
    anyCargoFound
  )
  expect(errors).toEqual([])
  expect(cargo.modified).toHaveLength(1)
  // All three columns land on the one record.
  expect(cargo.modified[0].changes.map((c: any) => c.property).sort()).toEqual([
    "VoyageCargoConnectionSchema_amount",
    "VoyageCargoConnectionSchema_cargo_id",
    "VoyageCargoConnectionSchema_unit_id"
  ])
})
