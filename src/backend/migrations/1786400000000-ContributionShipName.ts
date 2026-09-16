import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

import { extractShipName } from "../shipName"

/**
 * Denormalises the ship name onto `contributions.shipName` so the list can
 * order by it.
 *
 * The ship name lives inside the changeSet, with no column and no fixed JSON
 * path, so it could be searched (a LIKE over the whole change tree) but not
 * ordered. Copying it into a column on write -- and backfilling existing rows
 * here with the same extraction -- makes `ORDER BY shipName` cheap and exact.
 *
 * Nullable with no default: a contribution not about a voyage, or an edit that
 * never touched the ship, genuinely names none.
 */
export class ContributionShipName1786400000000 implements MigrationInterface {
  name = "ContributionShipName1786400000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded so a re-run is a no-op, matching the other migrations.
    if (!(await queryRunner.hasColumn("contributions", "shipName"))) {
      await queryRunner.addColumn(
        "contributions",
        new TableColumn({
          name: "shipName",
          type: "varchar",
          isNullable: true
        })
      )
    }

    // Backfill from each contribution's changeSet. `changesets.changes` stores
    // the change array as JSON text; extractShipName reads it the same way the
    // write path does, so existing rows sort like new ones.
    const rows: { id: string; changes: string | null }[] =
      await queryRunner.query(
        "SELECT c.id AS id, cs.changes AS changes " +
          "FROM contributions c JOIN changesets cs ON cs.id = c.changeSetId"
      )
    for (const { id, changes } of rows) {
      let parsed: unknown = []
      try {
        parsed = changes ? JSON.parse(changes) : []
      } catch {
        parsed = []
      }
      const shipName = extractShipName({ changes: parsed } as never)
      if (shipName !== null) {
        await queryRunner.query(
          "UPDATE contributions SET shipName = ? WHERE id = ?",
          [shipName, id]
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("contributions", "shipName")) {
      await queryRunner.dropColumn("contributions", "shipName")
    }
  }
}
