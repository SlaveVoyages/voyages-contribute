import type { EntityRef } from "../models/changeSets"
import type { ChangeSet } from "../models/contribution"

/** The property uid a voyage's id is recorded under. */
export const VOYAGE_ID_PROPERTY = "Voyage_voyage_id"

/**
 * The last voyage id assigned to the root entity across `changeSets`, read in
 * the order given -- the contribution's own change set, then its reviews by
 * stackOrder -- so the latest assignment wins. `undefined` when none assigns
 * one. An emptied value is not an assignment, so it leaves the previous one
 * standing.
 *
 * Mirrors the frontend's `assignedVoyageId`, which is what the Voyage ID column
 * shows: a new voyage's `root.id` is a uuid handle, and the id an editor gives
 * it lives in a change, often one made in a review.
 */
export const lastAssignedVoyageId = (
  rootId: string | number | undefined,
  changeSets: (Pick<ChangeSet, "changes"> | null | undefined)[]
): string | undefined => {
  if (rootId == null) {
    return undefined
  }
  let assigned: string | undefined
  for (const changeSet of changeSets) {
    for (const entityChange of changeSet?.changes ?? []) {
      if (
        entityChange.type !== "update" ||
        String(entityChange.entityRef.id) !== String(rootId)
      ) {
        continue
      }
      for (const change of entityChange.changes) {
        if (change.kind !== "direct" || change.property !== VOYAGE_ID_PROPERTY) {
          continue
        }
        const value = change.changed == null ? "" : String(change.changed).trim()
        if (value !== "") {
          assigned = value
        }
      }
    }
  }
  return assigned
}

/** A whole number as a string (so a bigint keeps its precision), else null. */
export const wholeNumberOrNull = (value: unknown): string | null =>
  value != null && /^-?\d+$/.test(String(value).trim())
    ? String(value).trim()
    : null

/**
 * The value the list orders the Voyage ID column by: the assigned voyage id
 * when there is one, else the root's own id -- whichever the column shows --
 * as a whole number, or null when it is not one.
 */
export const voyageIdSortKey = (
  root: Pick<EntityRef, "id"> | undefined,
  changeSets: (Pick<ChangeSet, "changes"> | null | undefined)[]
): string | null =>
  wholeNumberOrNull(lastAssignedVoyageId(root?.id, changeSets) ?? root?.id)
