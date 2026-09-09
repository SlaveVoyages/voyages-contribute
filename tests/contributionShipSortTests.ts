import { expect, test } from "vitest"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * Sorting by ship name. The ship name is not a column on the contribution --
 * it lives in the changeSet -- so it is denormalised onto `contributions.shipName`
 * on write and ordered from there. These go through `createContribution` (the
 * real write path) so the extraction, the column and the ORDER BY are all
 * exercised together, against a real database.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"
process.env.CONTRIB_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "contrib-shipsort-")),
  "test.db"
)

const { AppDataSource, DatabaseService } = await import("../src/backend/db")
const { ContributionStatus } = await import("../src/models/contribution")

await AppDataSource.initialize()
await AppDataSource.runMigrations({ transaction: "all" })

const service = new DatabaseService()

// A changeSet that names a ship the way the app records it: a Voyage_Ship owned
// section carrying a direct VoyageShip_ship_name change.
const shipChangeSet = (ship: string | null, voyageId: number) => ({
  author: "tester",
  title: "t",
  comments: "",
  timestamp: voyageId,
  changes:
    ship === null
      ? []
      : [
          {
            type: "update",
            entityRef: { type: "existing", schema: "Voyage", id: voyageId },
            changes: [
              {
                kind: "owned",
                property: "Voyage_Ship",
                ownedEntity: {
                  entityRef: {
                    type: "existing",
                    schema: "VoyageShip",
                    id: voyageId
                  },
                  state: "original",
                  data: { "Name of vessel": ship }
                },
                changes: [
                  {
                    kind: "direct",
                    property: "VoyageShip_ship_name",
                    changed: ship
                  }
                ]
              }
            ]
          }
        ]
})

// Insertion order is deliberately not alphabetical, and one row names no ship.
const fixtures: { id: string; ship: string | null; voyageId: number }[] = [
  { id: "sh-zeus", ship: "Zeus", voyageId: 10 },
  { id: "sh-aramis", ship: "Aramis", voyageId: 11 },
  { id: "sh-none", ship: null, voyageId: 12 },
  { id: "sh-bellone", ship: "Bellone", voyageId: 13 }
]

for (const { id, ship, voyageId } of fixtures) {
  await service.createContribution({
    id,
    root: { type: "existing", schema: "Voyage", id: voyageId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    changeSet: shipChangeSet(ship, voyageId) as any,
    status: ContributionStatus.Submitted
  })
}

const shipsSortedBy = async (sortOrder: "ASC" | "DESC"): Promise<string[]> =>
  (
    await service.listContributions({ sortBy: "shipName", sortOrder, limit: 100 })
  ).data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c) => (c as any).shipName as string | null)
    .filter((s): s is string => s !== null)

test("the ship name is denormalised onto the contribution on write", async () => {
  const one = await service.getContribution("sh-bellone")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((one as any)?.shipName).toBe("Bellone")
  const none = await service.getContribution("sh-none")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((none as any)?.shipName ?? null).toBeNull()
})

test("sort by ship name ascending orders the named ships A→Z", async () => {
  expect(await shipsSortedBy("ASC")).toEqual(["Aramis", "Bellone", "Zeus"])
})

test("sort by ship name descending orders them Z→A", async () => {
  expect(await shipsSortedBy("DESC")).toEqual(["Zeus", "Bellone", "Aramis"])
})

test("search still forces the query-builder path and sorts by ship there", async () => {
  // "t" is in every changeSet title, so the search matches all four rows; the
  // ship sort must still apply in that path.
  const r = await service.listContributions({
    search: "t",
    sortBy: "shipName",
    sortOrder: "ASC",
    limit: 100
  })
  const ships = r.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c) => (c as any).shipName as string | null)
    .filter((s): s is string => s !== null)
  expect(ships).toEqual(["Aramis", "Bellone", "Zeus"])
})
