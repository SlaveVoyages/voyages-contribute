import { EntitySchema, getSchema } from "../models/entities"
import {
  MaterializedEntity,
  NonNullFieldValue
} from "../models/materialization"
import {
  EntityOwnedProperty,
  LinkedEntityProperty,
  OwnedEntityListProperty,
  Property
} from "../models/properties"
import { DataFilter, DataResolver } from "../models/query"

const extractFields = (properties: Property[], additionalFields?: string[]) => {
  const fieldMap = new Map<string, string>()
  for (const p of properties) {
    if (p.kind === "number" || p.kind === "text" || p.kind === "linkedEntity") {
      fieldMap.set(p.backingField, p.label)
    } else if (p.kind === "table") {
      for (let i = 0; i < p.rows.length; ++i) {
        for (let j = 0; j < p.columns.length; ++j) {
          const f = p.cellField(j, i)
          if (f !== undefined) {
            fieldMap.set(f, f)
          }
        }
      }
    }
  }
  if (additionalFields) {
    for (const f of additionalFields) {
      if (!fieldMap.has(f)) {
        fieldMap.set(f, f)
      }
    }
  }
  return fieldMap
}

const bindEntity = (
  s: EntitySchema,
  data: Record<string, any>,
  fieldMap: Map<string, string>
): MaterializedEntity => ({
  data: Object.keys(data).reduce(
    (agg, k) => ({ ...agg, [fieldMap.get(k) ?? k]: data[k] }),
    {}
  ),
  state: "original",
  entityRef: { type: "existing", schema: s.name, id: data[s.pkField] }
})

/**
 * Accepts only a single or no items in the array.
 */
const singleOrNull = <T>(items: T[]) =>
  items.length === 0 ? null : singleOrThrow(items)

/**
 * Ensures that a single item is in the array.
 */
const singleOrThrow = <T>(items: T[]) => {
  if (items.length === 1) {
    return items[0]
  }
  throw new Error(`Expected 1 item, got ${items.length}`)
}

interface EntityFetchOptions {
  /**
   * Ensure these additional fields are fetched.
   */
  additionalFields?: string[]
  /**
   * Do not fetch linked entities.
   */
  shallow?: boolean
}

type FetchPropType<TProp extends Property> = (
  resolver: DataResolver,
  id: NonNullFieldValue,
  entity: MaterializedEntity,
  p: TProp
) => Promise<true | Error>

const entityOwnedFetch: FetchPropType<EntityOwnedProperty> = async (
  resolver,
  id,
  entity,
  p
) => {
  // Fetch the entity (if any) by matching the FK column in the right
  // side entity to the PK in the left side.
  try {
    entity.data[p.label] = singleOrNull(
      await fetchEntities(
        getSchema(p.linkedEntitySchema),
        [{ field: p.oneToOneBackingField, value: id }],
        resolver
      )
    )
    return true
  } catch (err) {
    return err as Error
  }
}

const linkedEntityFetch: FetchPropType<LinkedEntityProperty> = async (
  resolver,
  id,
  entity,
  p
) => {
  try {
    // Fetch the entity by its PK, whose value is a FK in the left side.
    const linkedSchema = getSchema(p.linkedEntitySchema)
    entity.data[p.label] = singleOrNull(
      await fetchEntities(
        linkedSchema,
        [{ field: linkedSchema.databasePkField ?? linkedSchema.pkField, value: id }],
        resolver
      )
    )
    return true
  } catch (err) {
    return err as Error
  }
}

const ownedListFetch: FetchPropType<OwnedEntityListProperty> = async (
  resolver,
  id,
  entity,
  p
) => {
  try {
    const { childBackingProp } = p
    const children = await fetchEntities(
      getSchema(p.linkedEntitySchema),
      [
        {
          field: childBackingProp,
          value: id
        }
      ],
      resolver
    )
    entity.data[p.label] = children
    return true
  } catch (err) {
    return err as Error
  }
}

export const fetchEntities = async (
  schema: EntitySchema,
  filter: DataFilter[],
  resolver: DataResolver,
  options?: EntityFetchOptions
): Promise<MaterializedEntity[]> => {
  // First we determine all the fields that we need to fetch for the backing
  // model of this schema.
  const fieldMap = extractFields(schema.properties, options?.additionalFields)
  // Ensure that the PK field is extracted.
  fieldMap.set(schema.pkField, fieldMap.get(schema.pkField) ?? "id")
  // Public Voyage IDs identify contributions; database IDs own their children.
  const databasePkField = schema.databasePkField ?? schema.pkField
  fieldMap.set(databasePkField, fieldMap.get(databasePkField) ?? databasePkField)
  const fetched = await resolver.fetch({
    query: {
      model: schema.backingTable,
      filter
    },
    fields: [...fieldMap.keys()]
  })
  if (fetched.length === 0) {
    return []
  }
  const entities: MaterializedEntity[] = []
  const promises: Promise<true | Error>[] = []
  for (const fieldValues of fetched) {
    const id = fieldValues[databasePkField]
    if (!id || !fieldValues[schema.pkField]) {
      const missing = !id ? databasePkField : schema.pkField
      throw new Error(
        `The PK field '${missing}' was not fetched by the data resolver`
      )
    }
    const entity = bindEntity(schema, fieldValues, fieldMap)
    for (const p of schema.properties) {
      if (options?.shallow) {
        // This loop's purpose is to fetch related entities.
        break
      }
      if (p.kind === "entityOwned") {
        promises.push(entityOwnedFetch(resolver, id, entity, p))
      } else if (p.kind === "linkedEntity") {
        const fkValue = fieldValues[p.backingField]
        if (fkValue) {
          promises.push(linkedEntityFetch(resolver, fkValue, entity, p))
        }
      } else if (p.kind === "ownedEntityList") {
        promises.push(ownedListFetch(resolver, id, entity, p))
      }
    }
    entities.push(entity)
  }
  const processed = await Promise.all(promises)
  const errors = processed.filter((res) => res !== true)
  if (errors.length > 0) {
    const msg = errors.reduce((agg, e) => `${agg}${e}\n`, "")
    throw new Error(
      `fetchEntities processing had ${errors.length} errors: ${msg}`
    )
  }
  return entities
}
