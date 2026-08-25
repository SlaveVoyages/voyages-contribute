import { expect, test } from "vitest"
import { voyageMapping } from "../src/tools/voyageMapping"
import { EntitySchema, VoyageSchema, getSchema } from "../src/models/entities"
import { DataMapping, EntityLookUp, MapRow } from "../src/tools/importer"

/**
 * A mapping's `targetField` is a property *label*, resolved at run time by
 * `importer.ts`. A typo therefore survives `tsc` and only surfaces mid-import,
 * so walk the mapping here and resolve every target against its schema.
 */

interface Walked {
  headers: Set<string>
  ignored: Set<string>
  problems: string[]
}

const resolveBinding = (value: string, bindings: Record<string, string>) =>
  value && value.startsWith("$") ? (bindings[value] ?? value) : value

const propByLabel = (schema: EntitySchema, label: string) =>
  schema.properties.find((p) => p.label === label)

const walk = (
  mapping: DataMapping | DataMapping[],
  schema: EntitySchema,
  bindings: Record<string, string>,
  out: Walked
): void => {
  if (Array.isArray(mapping)) {
    mapping.forEach((m) => walk(m, schema, bindings, out))
    return
  }
  const at = (what: string) => `${schema.name}: ${what}`
  const target = (m: { targetField: string }) =>
    resolveBinding(m.targetField, bindings)

  if (mapping.kind === "ignored") {
    mapping.headers.forEach((h) => out.ignored.add(h))
    return
  }
  if (mapping.kind === "conditional") {
    walk(mapping.mappings, schema, bindings, out)
    return
  }
  if (mapping.kind === "multiple") {
    mapping.bindings.forEach((b) =>
      walk(mapping.mappings, schema, { ...bindings, ...b }, out)
    )
    return
  }
  if (mapping.kind === "table") {
    const label = target(mapping)
    const prop = propByLabel(schema, label)
    if (prop?.kind !== "table") {
      out.problems.push(at(`table target '${label}' is not a table property`))
      return
    }
    const cells = new Set<string>()
    for (let row = 0; row < prop.rows.length; ++row) {
      for (let col = 0; col < prop.columns.length; ++col) {
        const field = prop.cellField(col, row)
        if (field !== undefined) {
          cells.add(field)
        }
      }
    }
    mapping.mappings.forEach((cell) => {
      out.headers.add(resolveBinding(cell.header, bindings))
      if (!cells.has(cell.targetField)) {
        out.problems.push(
          at(`table '${label}' has no cell '${cell.targetField}'`)
        )
      }
    })
    return
  }
  if (mapping.kind === "owned") {
    // A nested `owned` inside createIfMissing/addedToList carries no target.
    if (!mapping.targetField) {
      walk(mapping.importUpdates, schema, bindings, out)
      return
    }
    const label = target(mapping)
    const prop = propByLabel(schema, label)
    if (prop?.kind !== "entityOwned" && prop?.kind !== "linkedEntity") {
      out.problems.push(at(`owned target '${label}' not found or wrong kind`))
      return
    }
    walk(
      mapping.importUpdates,
      getSchema(prop.linkedEntitySchema),
      bindings,
      out
    )
    return
  }
  if (mapping.kind === "ownedList") {
    const label = target(mapping)
    const prop = propByLabel(schema, label)
    if (prop?.kind !== "ownedEntityList") {
      out.problems.push(at(`ownedList target '${label}' not found`))
      return
    }
    walk(mapping.addedToList, getSchema(prop.linkedEntitySchema), bindings, out)
    return
  }
  if (mapping.kind === "linked") {
    const label = target(mapping)
    const prop = propByLabel(schema, label)
    if (prop?.kind !== "linkedEntity") {
      out.problems.push(at(`linked target '${label}' not found`))
      return
    }
    out.headers.add(resolveBinding(mapping.header, bindings))
    if (mapping.createIfMissing) {
      walk(
        mapping.createIfMissing.importUpdates,
        getSchema(prop.linkedEntitySchema),
        bindings,
        out
      )
    }
    return
  }
  if (mapping.kind === "direct" || mapping.kind === "const") {
    const label = target(mapping)
    if (!propByLabel(schema, label)) {
      out.problems.push(at(`${mapping.kind} target '${label}' not found`))
      return
    }
    if (mapping.kind === "direct") {
      out.headers.add(resolveBinding(mapping.header, bindings))
    }
    return
  }
  out.problems.push(at(`unknown mapping kind ${JSON.stringify(mapping)}`))
}

const walkVoyageMapping = () => {
  const out: Walked = {
    headers: new Set(),
    ignored: new Set(),
    problems: []
  }
  walk(voyageMapping, VoyageSchema, {}, out)
  return out
}

test("voyage mapping resolves against the schemas", () => {
  const { problems, headers, ignored } = walkVoyageMapping()
  // Reported as a list so a failure names every broken target at once.
  expect(problems).toEqual([])
  // Guards against a walk that silently visits nothing.
  expect(headers.size).toBeGreaterThan(200)
  expect(ignored.size).toBeGreaterThan(20)
  // A header cannot be both consumed and declared ignored.
  const both = [...ignored].filter((h) => headers.has(h))
  expect(both).toEqual([])
})

/**
 * The relation type and the roles are foreign keys written as literals, so
 * nothing about the mapping says whether the number picked is the row meant.
 * `past_enslavementrelationtype` reads 1 Transaction, 2 Transportation, and
 * `past_enslaverrole` reads 1 Captain, 2 Investor, 3 Buyer, 4 Seller, 5 Owner.
 * A voyage carries people, so the relation is Transportation, and the columns
 * named for owners hold the people the database calls investors -- 57,446 of
 * them against 122 sellers, none of whom appear in a transportation relation.
 */

/** Resolves anything, and records what was asked of each lookup table. */
const recordingLookup = () => {
  const asked: { schema: string; value: string }[] = []
  const lookup: EntityLookUp = {
    lookup: async (schema, _field, value) => {
      asked.push({ schema: schema.name, value: String(value) })
      return {
        entityRef: { type: "existing", schema: schema.name, id: value },
        state: "original",
        data: {},
        lookupValue: String(value)
      } as any
    }
  }
  const idsFor = (schema: string) => [
    ...new Set(asked.filter((a) => a.schema === schema).map((a) => a.value))
  ]
  return { lookup, idsFor }
}

const rolesAskedFor = async (column: string) => {
  const { lookup, idsFor } = recordingLookup()
  await MapRow(
    { voyageid: "1", [column]: "Amsterdam, Jan van" },
    voyageMapping,
    VoyageSchema,
    lookup,
    []
  )
  return {
    roles: idsFor("EnslaverRole"),
    relationTypes: idsFor("EnslavementRelationType")
  }
}

test("every enslaver column asks for the role the database gives that name", async () => {
  const owners = "abcdefghijklmnopqr".split("").map((s) => `owner${s}`)
  for (const column of owners) {
    const { roles, relationTypes } = await rolesAskedFor(column)
    expect({ column, roles, relationTypes }).toEqual({
      column,
      roles: ["2"],
      relationTypes: ["2"]
    })
  }
  for (const column of ["captaina", "captainb", "captainc"]) {
    const { roles, relationTypes } = await rolesAskedFor(column)
    expect({ column, roles, relationTypes }).toEqual({
      column,
      roles: ["1"],
      relationTypes: ["2"]
    })
  }
})
