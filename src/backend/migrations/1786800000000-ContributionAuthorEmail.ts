import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex
} from "typeorm"

const INDEX = "IDX_contributions_authorEmail_status"

/**
 * Copies the author's address onto `contributions.authorEmail` and indexes it
 * with `status`, the pair the author filter matches.
 *
 * Backfilled one statement per distinct address, each selecting the change sets
 * that carry it. Re-running writes the same values, so it repairs a row that
 * has drifted rather than skipping it.
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

    // Created before the backfill, so the statements below write through it.
    const table = await queryRunner.getTable("contributions")
    if (!table?.indices.some((index) => index.name === INDEX)) {
      await queryRunner.createIndex(
        "contributions",
        new TableIndex({ name: INDEX, columnNames: ["authorEmail", "status"] })
      )
    }

    const addresses: { authorEmail: string }[] = await queryRunner.query(
      "SELECT DISTINCT authorEmail FROM changesets WHERE authorEmail IS NOT NULL"
    )
    for (const { authorEmail } of addresses) {
      await queryRunner.query(
        "UPDATE contributions SET authorEmail = ?" +
          " WHERE changeSetId IN (SELECT id FROM changesets WHERE authorEmail = ?)",
        [authorEmail, authorEmail]
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
