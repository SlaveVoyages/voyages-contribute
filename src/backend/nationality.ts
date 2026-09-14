/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChangeSet } from "../models/contribution"

/**
 * The ship nationality a contribution is about, or null.
 *
 * Like the ship name, nationality is not a column on the contribution -- it
 * lives inside the changeSet, under the root's `Voyage_Ship` section as the
 * `VoyageShip_nationality_ship_id` linked change, whose `changed.data`
 * carries the nation's display name ("Nation name"). It is read out here so it
 * can be denormalised into a `contributions.nationality` column the list can
 * order by; a JSON path has no fixed shape to sort on.
 *
 * Reads the contributed nationality, and -- like extractShipName -- falls back
 * to the ship's current nationality ("National carrier") when the edit does not
 * touch it, so a contribution that changed some other field still sorts by the
 * nationality it carries. Contributions not rooted on a voyage, or edits that
 * never touched the ship's nationality, simply have none.
 */
export const extractNationality = (
  changeSet: ChangeSet | undefined | null
): string | null => {
  const first = (changeSet as any)?.changes?.[0]
  const sections: any[] = first?.changes ?? []
  const ship = sections.find(
    (c) => c?.kind === "owned" && c?.property === "Voyage_Ship"
  )
  if (!ship) {
    return null
  }
  const linked = ship.changes?.find(
    (s: any) => s?.property === "VoyageShip_nationality_ship_id"
  )
  // A contributed nationality wins even when it clears it (changed: null); only
  // an edit that never touches nationality leaves the current one to stand.
  const name = linked
    ? linked.changed?.data?.["Nation name"]
    : ship.ownedEntity?.data?.["National carrier"]?.data?.["Nation name"]
  const trimmed = name == null ? "" : String(name).trim()
  return trimmed === "" ? null : trimmed
}
