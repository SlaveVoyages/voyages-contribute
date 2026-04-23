import {
  EntitySchema,
  getSchema,
  getSchemaProp,
  MaterializedEntity
} from "../models"
import { EntityLookUp } from "./importer"

export type LookupMaterializedEntity = MaterializedEntity & {
  lookupValue: string
}

const getCacheEntry = async (
  url: string,
  schema: EntitySchema,
  field: string,
  errorCount = 0
): Promise<Record<string, LookupMaterializedEntity>> => {
  try {
    const res = await fetch(new URL(`${url}/enumerate/${schema.name}`))
    const items: LookupMaterializedEntity[] = await res.json()
    const data: Record<string, LookupMaterializedEntity> = {}
    const nonUnique: Set<string> = new Set()
    for (const item of items) {
      const rowKey = String(item.data[field])
      if (rowKey) {
        if (data[rowKey]) {
          // If we already have this key, mark it as non-unique.
          nonUnique.add(rowKey)
        }
        item.lookupValue = rowKey
        data[rowKey] = item
      }
    }
    // Remove non-unique keys.
    for (const key of nonUnique) {
      delete data[key]
    }
    return data
  } catch (err) {
    console.error(
      `Error fetching data for schema "${schema.name}" and field "${field}":`,
      err
    )
    return errorCount > 3 ? {} : await getCacheEntry(url, schema, field, errorCount + 1)
  }
}

export const createApiLookup = (url: string): EntityLookUp => {
  const cache: Record<string, Promise<Record<string, LookupMaterializedEntity>>> = {}
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
      linked = await lookup(
        getSchema(prop.linkedEntitySchema),
        nested,
        value
      )
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
      cache[key] = data = getCacheEntry(url, schema, field)
    }
    // We already have a cache of the entity_field pair.
    const updateLookup = (res: LookupMaterializedEntity | undefined | null) => {
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
  return {
    lookup
  }
}
