import { MigrationInterface, QueryRunner, TableIndex } from "typeorm"

const INDEX = "IDX_changesets_timestamp"

/**
 * Indexes `changesets.timestamp` for date-range filters. Guarded so a re-run
 * is a no-op.
 */
export class ChangeSetTimestampIndex1786700000000
  implements MigrationInterface
{
  name = "ChangeSetTimestampIndex1786700000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("changesets")
    if (!table?.indices.some((index) => index.name === INDEX)) {
      await queryRunner.createIndex(
        "changesets",
        new TableIndex({ name: INDEX, columnNames: ["timestamp"] })
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("changesets")
    if (table?.indices.some((index) => index.name === INDEX)) {
      await queryRunner.dropIndex("changesets", INDEX)
    }
  }
}
