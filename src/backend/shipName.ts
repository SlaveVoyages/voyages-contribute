 
import type { ChangeSet } from "../models/contribution"

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
  // only an edit that never touches the name falls back to the ship's current
  // name, so a partial edit (some other ship field) keeps its sort value
  // instead of clearing the denormalised column. `changed ?? owned` would
  // instead resurrect a name an explicit clear removed.
  const name = directChange
    ? directChange.changed
    : ship.ownedEntity?.data?.["Name of vessel"]
  const trimmed = name == null ? "" : String(name).trim()
  return trimmed === "" ? null : trimmed
}
