import {
  EntitySchema,
  getSchema,
  getSchemaProp,
  MaterializedEntity
} from "../models"
import { EntityData } from "../models/materialization"
import { DataResolver } from "../models/query"
import { EntityLookUp } from "./importer"

export type LookupMaterializedEntity = MaterializedEntity & {
  lookupValue: string
}

type SchemaFieldLoader = (
  schema: EntitySchema,
  field: string
) => Promise<Record<string, LookupMaterializedEntity>>

export const indexByField = (
  items: LookupMaterializedEntity[],
  field: string
): Record<string, LookupMaterializedEntity> => {
  const data: Record<string, LookupMaterializedEntity> = {}
  const nonUnique = new Set<string>()
  for (const item of items) {
    const raw = item.data[field]
    // Skip nullish / empty values. Previously `String(item.data[field])` would
    // turn `null`/`undefined` into the literal strings "null"/"undefined", so
    // a row with a NULL column got indexed under "null" and a CSV cell whose
    // value happened to be the string "null" would spuriously match it.
    if (raw === null || raw === undefined) {
      continue
    }
    const rowKey = String(raw)
    if (rowKey === "") {
      continue
    }
    if (data[rowKey]) {
      nonUnique.add(rowKey)
    }
    item.lookupValue = rowKey
    data[rowKey] = item
  }
  for (const key of nonUnique) {
    delete data[key]
  }
  return data
}

const buildLookup = (loader: SchemaFieldLoader): EntityLookUp => {
  const cache: Record<
    string,
    Promise<Record<string, LookupMaterializedEntity>>
  > = {}
  const lookup: EntityLookUp["lookup"] = async (
    schema: EntitySchema,
    field: string,
    value: string | string[]
  ) => {
    const idxDot = field.indexOf(".")
    let linked: LookupMaterializedEntity | null = null
    if (idxDot !== -1) {
      const nested = field.slice(idxDot + 1)
      field = field.slice(0, idxDot)
      // Ensure that the field is a LinkedEntity field.
      let prop = getSchemaProp(schema, field)
      if (prop?.kind !== "linkedEntity") {
        throw new Error(
          `Field "${field}" is not a linked entity field in schema "${schema.name}".`
        )
      }
      // We can look for a nested linked entity and then search on the parent by
      // the linked entity id.
      linked = await lookup(getSchema(prop.linkedEntitySchema), nested, value)
      if (linked === null) {
        return null
      }
      field = `${field.slice(0, idxDot)} id`
      prop = getSchemaProp(schema, field)
      if (prop?.kind !== "text" && prop?.kind !== "number") {
        throw new Error(
          `Field "${field}" is not a plain field in schema "${schema.name}".`
        )
      }
      value = String(linked.entityRef.id)
    }
    const key = `${schema.name}:${field}`
    let data = cache[key]
    if (data === undefined) {
      cache[key] = data = loader(schema, field)
    }
    const updateLookup = (
      res: LookupMaterializedEntity | undefined | null
    ) => {
      if (!res || !linked) {
        return res || null
      }
      return { ...res, lookupValue: linked.lookupValue }
    }
    const items = await data
    if (typeof value === "string") {
      return updateLookup(items[value])
    }
    for (const v of value) {
      if (items[v]) {
        return updateLookup(items[v])
      }
    }
    return null
  }
  return { lookup }
}

const fetchFromApi = async (
  url: string,
  schema: EntitySchema,
  field: string,
  errorCount = 0
): Promise<Record<string, LookupMaterializedEntity>> => {
  try {
    const res = await fetch(new URL(`${url}/enumerate/${schema.name}`))
    const items: LookupMaterializedEntity[] = await res.json()
    return indexByField(items, field)
  } catch (err) {
    console.error(
      `Error fetching data for schema "${schema.name}" and field "${field}":`,
      err
    )
    return errorCount > 3
      ? {}
      : await fetchFromApi(url, schema, field, errorCount + 1)
  }
}

export const createApiLookup = (url: string): EntityLookUp =>
  buildLookup((schema, field) => fetchFromApi(url, schema, field))

/**
 * In-process lookup that queries the `DataResolver` directly. Mirrors the
 * read side of the `/enumerate/:schema` HTTP route so the server can do bulk
 * imports without a self-HTTP round-trip.
 */
export const createDirectLookup = (resolver: DataResolver): EntityLookUp => {
  const loadFromResolver: SchemaFieldLoader = async (schema, field) => {
    const enumerableFields = schema.properties.filter(
      (p) => p.kind === "text" || p.kind === "number"
    )
    const labelByBackingField = enumerableFields.reduce(
      (acc, f) => {
        acc[f.backingField] = f.label
        return acc
      },
      {} as Record<string, string>
    )
    const rows = await resolver.fetch({
      query: { model: schema.backingTable, filter: [] },
      fields: [
        ...enumerableFields.map((p) => p.backingField),
        schema.pkField
      ]
    })
    const items: LookupMaterializedEntity[] = rows.map((row) => {
      const data: EntityData = {}
      for (const [key, val] of Object.entries(row)) {
        data[labelByBackingField[key] ?? key] = val
      }
      return {
        entityRef: {
          type: "existing",
          id: row[schema.pkField] as string | number,
          schema: schema.name
        },
        data,
        state: "lazy",
        lookupValue: ""
      } as LookupMaterializedEntity
    })
    return indexByField(items, field)
  }
  return buildLookup(loadFromResolver)
}
