import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

import { extractNationality } from "../nationality"

/**
 * Denormalises the ship nationality onto `contributions.nationality` so the
 * list can order by it, exactly as ContributionShipName does for the ship name.
 *
 * Nationality lives inside the changeSet with no column and no fixed JSON path,
 * so it could be searched but not ordered. Copying it into a column on write --
 * and backfilling existing rows here with the same extraction -- makes
 * `ORDER BY nationality` cheap and exact.
 *
 * Nullable with no default: a contribution not about a voyage, or an edit that
 * never touched the ship's nationality, genuinely names none.
 */
export class ContributionNationality1786500000000 implements MigrationInterface {
  name = "ContributionNationality1786500000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded so a re-run is a no-op, matching the other migrations.
    if (!(await queryRunner.hasColumn("contributions", "nationality"))) {
      await queryRunner.addColumn(
        "contributions",
        new TableColumn({
          name: "nationality",
          type: "varchar",
          isNullable: true
        })
      )
    }

    // Backfill from each contribution's changeSet. `changesets.changes` stores
    // the change array as JSON text; extractNationality reads it the same way
    // the write path does, so existing rows sort like new ones.
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
      const nationality = extractNationality({ changes: parsed } as never)
      if (nationality !== null) {
        await queryRunner.query(
          "UPDATE contributions SET nationality = ? WHERE id = ?",
          [nationality, id]
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("contributions", "nationality")) {
      await queryRunner.dropColumn("contributions", "nationality")
    }
  }
}
