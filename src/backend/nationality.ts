 
import type { ChangeSet } from "../models/contribution"

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
  // an edit that never touches nationality falls back to the ship's current
  // "National carrier", so a partial edit keeps its sort value instead of
  // clearing the denormalised column.
  const name = linked
    ? linked.changed?.data?.["Nation name"]
    : ship.ownedEntity?.data?.["National carrier"]?.data?.["Nation name"]
  const trimmed = name == null ? "" : String(name).trim()
  return trimmed === "" ? null : trimmed
}
