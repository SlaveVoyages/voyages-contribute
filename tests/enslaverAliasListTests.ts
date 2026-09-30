import { expect, test } from "vitest"
import { combineChanges, EntityChange } from "../src/models/changeSets"
import { getSchema } from "../src/models/entities"
import {
  applyChanges,
  cloneEntity,
  expandMaterialized,
  materializeNew
} from "../src/models/materialization"

/** An alias added to an enslaver's list is written with the enslaver's id. */

const uid = (schema: string, label: string) => {
  const p = getSchema(schema).properties.find((x) => x.label === label)
  if (!p) throw new Error(`${schema}.${label} not found`)
  return p.uid
}

const enslaver = materializeNew(getSchema("Enslaver"), "enslaver")
const alias = materializeNew(getSchema("EnslaverAlias"), "alias")

const addAlias: EntityChange = {
  type: "update",
  entityRef: enslaver.entityRef,
  changes: [
    {
      kind: "ownedList",
      property: uid("Enslaver", "Aliases"),
      removed: [],
      modified: [
        {
          kind: "owned",
          ownedEntity: alias,
          changes: [
            {
              kind: "direct",
              property: uid("EnslaverAlias", "Alias"),
              changed: "Smith, John"
            }
          ]
        }
      ]
    }
  ]
}

test("an added alias is combined into an update pointing at its enslaver", () => {
  const { updates } = combineChanges([addAlias])
  const aliasUpdate = updates.find((u) => u.entityRef.id === "alias")!
  expect(
    Object.fromEntries(aliasUpdate.changes.map((c) => [c.property, c.changed]))
  ).toEqual({ alias: "Smith, John", identity_id: "enslaver" })
})

test("an added alias shows in the enslaver's list", () => {
  const entity = cloneEntity(enslaver)
  applyChanges(expandMaterialized(entity), [addAlias])
  const aliases = entity.data.Aliases as { data: { Alias: string } }[]
  expect(aliases.map((a) => a.data.Alias)).toEqual(["Smith, John"])
})
