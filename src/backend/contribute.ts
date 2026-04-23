import {
  EntityDelete,
  EntityRef,
  EntityUpdate,
  PropertyChange
} from "../models/changeSets"
import {
  ChangeSet,
  ContributionStatus,
  ContributionViewModel
} from "../models/contribution"
import { EntitySchema } from "../models/entities"
import { MaterializedEntity, materializeNew } from "../models/materialization"
import { DataResolver } from "../models/query"
import { fetchEntities } from "./entityFetch"
import { randomUUID } from "crypto"

const createEmptyChangeSet = (): ChangeSet => ({
  author: "",
  changes: [],
  id: "new",
  comments: "",
  timestamp: new Date().getDate(),
  title: ""
})

const newUid = randomUUID

const createEmptyContrib = (root: EntityRef) => ({
  id: newUid(),
  changeSet: createEmptyChangeSet(),
  reviews: [],
  media: [],
  status: ContributionStatus.WorkInProgress,
  root
})

export interface EntityContributionArgs {
  schema: EntitySchema
  id: number | string
  resolver: DataResolver
}

const fetchSingle = async ({
  schema,
  id,
  resolver
}: EntityContributionArgs) => {
  const res = await fetchEntities(
    schema,
    [
      {
        field: schema.pkField,
        value: id
      }
    ],
    resolver
  )
  if (res.length !== 1) {
    throw new Error(`Entity ${schema.name} with id ${id} was not found`)
  }
  return res[0]
}

export const initEditContribution = async (
  args: EntityContributionArgs
): Promise<ContributionViewModel> => {
  const entity = await fetchSingle(args)
  const { schema, id } = args
  return {
    schema,
    entity,
    contribution: createEmptyContrib({
      id,
      schema: schema.name,
      type: "existing"
    })
  }
}

export const initNewEntityContribution = (
  schema: EntitySchema
): ContributionViewModel => {
  const uid = newUid()
  return {
    schema,
    entity: materializeNew(schema, uid),
    contribution: createEmptyContrib({
      id: uid,
      schema: schema.name,
      type: "new"
    })
  }
}

export const initDeleteContribution = async (
  args: EntityContributionArgs
): Promise<ContributionViewModel> => {
  const entity = await fetchSingle(args)
  const { schema, id } = args
  const delRef: EntityRef = {
    id,
    schema: schema.name,
    type: "existing"
  }
  const contribution = createEmptyContrib(delRef)
  contribution.changeSet.changes.push({
    entityRef: delRef,
    type: "delete"
  } as EntityDelete)
  return {
    schema,
    entity,
    contribution
  }
}

export type MergeContributionArgs = Omit<EntityContributionArgs, "id"> & {
  ids: Set<number | string>
}

const createMergeChanges = (_: MaterializedEntity[]): PropertyChange[] => {
  throw new Error("Not implemented yet")
}

export const initMergeContribution = async (
  args: MergeContributionArgs
): Promise<ContributionViewModel> => {
  const { schema, ids } = args
  if (ids.size <= 1) {
    throw new Error("A merge requires at least two entities")
  }
  const merged = await Promise.all(
    [...ids].map((id) => fetchSingle({ ...args, id }))
  )
  // Now we need to initialize a new entity with values from the first entity.
  // Then, each merged voyage that presents different values for the same entry.
  const newRef: EntityRef = {
    id: newUid(),
    type: "new",
    schema: schema.name
  }
  const entity = materializeNew(schema, newRef.id)
  const contribution = createEmptyContrib(newRef)
  contribution.changeSet.changes.push({
    entityRef: newRef,
    changes: createMergeChanges([entity, ...merged]),
    type: "update"
  } as EntityUpdate)
  return {
    schema,
    entity,
    contribution
  }
}
