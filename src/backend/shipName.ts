/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChangeSet } from "../models/contribution"

/**
 * The ship name a contribution is about, or null.
 *
 * The ship name is not a column on the contribution -- it lives inside the
 * changeSet, under the root's `Voyage_Ship` section as the
 * `VoyageShip_ship_name` direct change (falling back to the owned entity's
 * "Name of vessel"). It is read out here so it can be denormalised into a
 * `contributions.shipName` column that the list can order by; a JSON path has
 * no fixed shape to sort on, and doing it per-row at query time is slow.
 *
 * Matches the frontend's `extractShipData` so the sorted value is the same one
 * the grid shows. Contributions not rooted on a voyage (Enslaver / Enslaved),
 * or edits that never touched the ship, simply have none.
 */
export const extractShipName = (
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
  const directChange = ship.changes?.find(
    (s: any) => s?.kind === "direct" && s?.property === "VoyageShip_ship_name"
  )
  // A direct change to the name wins even when it clears it (changed: null);
  // only an edit that never touches the name leaves the current vessel name to
  // stand. `changed ?? owned` would resurrect a name the contribution removed.
  const name = directChange
    ? directChange.changed
    : ship.ownedEntity?.data?.["Name of vessel"]
  const trimmed = name == null ? "" : String(name).trim()
  return trimmed === "" ? null : trimmed
}
