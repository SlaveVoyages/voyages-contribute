import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex
} from "typeorm"

const INDEX = "IDX_contributions_authorEmail_status"

/**
 * Copies the author's address onto `contributions.authorEmail` and indexes it
 * with `status`.
 *
 * A contributor's own list filters by address and pages by id. Read from the
 * change set, that costs one changeset row per candidate; on this column it is
 * one index, already in id order.
 *
 * Backfilled one statement per distinct address, each reading the address index
 * on `changesets` rather than the rows behind it. Guarded so a re-run is a
 * no-op.
 */
export class ContributionAuthorEmail1786800000000 implements MigrationInterface {
  name = "ContributionAuthorEmail1786800000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("contributions", "authorEmail"))) {
      await queryRunner.addColumn(
        "contributions",
        new TableColumn({
          name: "authorEmail",
          type: "varchar",
          isNullable: true
        })
      )
    }

    const addresses: { authorEmail: string }[] = await queryRunner.query(
      "SELECT DISTINCT authorEmail FROM changesets WHERE authorEmail IS NOT NULL"
    )
    for (const { authorEmail } of addresses) {
      await queryRunner.query(
        "UPDATE contributions SET authorEmail = ? WHERE authorEmail IS NULL" +
          " AND changeSetId IN (SELECT id FROM changesets WHERE authorEmail = ?)",
        [authorEmail, authorEmail]
      )
    }

    const table = await queryRunner.getTable("contributions")
    if (!table?.indices.some((index) => index.name === INDEX)) {
      await queryRunner.createIndex(
        "contributions",
        new TableIndex({ name: INDEX, columnNames: ["authorEmail", "status"] })
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("contributions")
    if (table?.indices.some((index) => index.name === INDEX)) {
      await queryRunner.dropIndex("contributions", INDEX)
    }
    if (await queryRunner.hasColumn("contributions", "authorEmail")) {
      await queryRunner.dropColumn("contributions", "authorEmail")
    }
  }
}
