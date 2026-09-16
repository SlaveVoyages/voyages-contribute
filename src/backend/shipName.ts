 
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
  const name = ship.changes?.find(
    (s: any) => s?.kind === "direct" && s?.property === "VoyageShip_ship_name"
  )?.changed
  const trimmed = name == null ? "" : String(name).trim()
  return trimmed === "" ? null : trimmed
}
