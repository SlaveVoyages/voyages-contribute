import { expect, test } from "vitest"
import { fetchEntities } from "../src/backend/entityFetch"
import { EntitySchema, VoyageSchema } from "../src/models/entities"
import { isMaterializedEntity } from "../src/models/materialization"
import { DataResolver } from "../src/models/query"
import { EntityLinkEditMode } from "../src/models/properties"

// Django's public Voyage ID and database primary key are independent. Include a
// decoy whose primary key equals the target's public ID: joining by the public
// ID must not quietly return another voyage's ship, numeric data, or cargo.
const rows: Record<string, Record<string, string | number | null>[]> = {
  voyage_voyage: [
    { id: 31, voyage_id: 800000007, dataset: 0 },
    { id: 800000007, voyage_id: 1234, dataset: 0 }
  ],
  voyage_voyageship: [
    { id: 41, voyage_id: 31, ship_name: "Fictional fixture ship" },
    { id: 42, voyage_id: 800000007, ship_name: "Unrelated decoy" }
  ],
  voyage_voyageslavesnumbers: [
    { id: 51, voyage_id: 31, num_men_embark_first_port_purchase: 4, imp_num_men_total: 9 },
    { id: 52, voyage_id: 800000007, num_men_embark_first_port_purchase: 77, imp_num_men_total: 88 }
  ],
  voyage_voyagecargoconnection: [
    { id: 61, voyage_id: 31, amount: 2, cargo_id: null, unit_id: null },
    { id: 62, voyage_id: 800000007, amount: 99, cargo_id: null, unit_id: null }
  ]
}

const resolver: DataResolver = {
  fetch: async ({ query, fields }) =>
    (rows[query.model] ?? [])
      .filter(row => query.filter.every(filter => row[filter.field] === filter.value))
      .map(row => Object.fromEntries(fields.map(field => [field, row[field] ?? null])))
}

test("materializing a public voyage ID follows its database-owned children", async () => {
  const [voyage] = await fetchEntities(VoyageSchema, [{ field: "voyage_id", value: 800000007 }], resolver)
  expect(voyage.entityRef).toEqual({ type: "existing", schema: "Voyage", id: 800000007 })
  expect(voyage.data["Voyage ID"]).toBe(800000007)
  const ship = voyage.data.Ship
  const numbers = voyage.data["Slave numbers"]
  expect(isMaterializedEntity(ship) && ship.data["Name of vessel"]).toBe("Fictional fixture ship")
  expect(isMaterializedEntity(numbers) && numbers.data.num_men_embark_first_port_purchase).toBe(4)
  expect(isMaterializedEntity(numbers) && numbers.data.imp_num_men_total).toBe(9)
  expect((voyage.data.Cargo as { entityRef: { id: number } }[]).map(c => c.entityRef.id)).toEqual([61])
})

test("a voyage with equal database and public IDs retains its existing behavior", async () => {
  const existing: DataResolver = {
    fetch: async input => {
      if (input.query.model === "voyage_voyage") {
        return [Object.fromEntries(input.fields.map(field => [field, field === "id" || field === "voyage_id" ? 31 : null]))]
      }
      return resolver.fetch(input)
    }
  }
  const [voyage] = await fetchEntities(VoyageSchema, [{ field: "voyage_id", value: 31 }], existing)
  const ship = voyage.data.Ship
  expect(voyage.entityRef.id).toBe(31)
  expect(isMaterializedEntity(ship) && ship.data["Name of vessel"]).toBe("Fictional fixture ship")
})


test("a stored foreign key resolves a voyage by database ID and exposes its public reference", async () => {
  const schema: EntitySchema = {
    name: "Fixture link", backingTable: "fixture_link", pkField: "id", contributionMode: "Owned",
    getLabel: () => "Fixture link",
    properties: [{kind: "linkedEntity", uid: "fixture_voyage", schema: "Fixture link", label: "Voyage",
      backingField: "voyage_id", linkedEntitySchema: "Voyage", mode: EntityLinkEditMode.Select}]
  }
  const linked: DataResolver = {
    fetch: async input => input.query.model === "fixture_link"
      ? [{id: 71, voyage_id: 31}] : resolver.fetch(input)
  }
  const [link] = await fetchEntities(schema, [{field: "id", value: 71}], linked)
  const voyage = link.data.Voyage
  expect(isMaterializedEntity(voyage) && voyage.entityRef.id).toBe(800000007)
  expect(isMaterializedEntity(voyage) && voyage.data["Voyage ID"]).toBe(800000007)
})


test.each(["id", "voyage_id"])("missing %s is refused before binding an incomplete identity", async field => {
  const missing: DataResolver = {
    fetch: async input => {
      const result = await resolver.fetch(input)
      return result.map(row => {
        const value = {...row}
        delete value[field]
        return value
      })
    }
  }
  await expect(fetchEntities(VoyageSchema, [{field: "voyage_id", value: 800000007}], missing))
    .rejects.toThrow(`The PK field '${field}' was not fetched`)
})
