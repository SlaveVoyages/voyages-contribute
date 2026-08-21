import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

/**
 * Records *who* decided a contribution and who published a batch.
 *
 * `changeSet.author` already names whoever wrote a contribution or a review,
 * but that is a different question from who accepted or rejected it — an editor
 * can decide without leaving a review, and until now nothing stored that. The
 * Reviewer column in the editorial UI had no source to read and was hardcoded.
 *
 * All three columns are nullable with no default: rows decided before this
 * migration genuinely have no recorded decider, and inventing one — the
 * contribution's own author, say — would assert something untrue about the
 * historical record.
 *
 * Timestamps are `bigint` epoch milliseconds, matching `changesets.timestamp`.
 */
export class RecordDecisionAuthors1786200000000 implements MigrationInterface {
  name = "RecordDecisionAuthors1786200000000"

  private readonly columns = [
    {
      table: "contributions",
      column: new TableColumn({
        name: "decidedBy",
        type: "varchar",
        isNullable: true
      })
    },
    {
      table: "contributions",
      column: new TableColumn({
        name: "decidedAt",
        type: "bigint",
        isNullable: true
      })
    },
    {
      table: "publication_batches",
      column: new TableColumn({
        name: "publishedBy",
        type: "varchar",
        isNullable: true
      })
    }
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.columns) {
      // Guarded so re-running on a database that already has the column is a
      // no-op rather than an error, matching how the initial migration passes
      // `ifNotExist` to every createTable.
      if (!(await queryRunner.hasColumn(table, column.name))) {
        await queryRunner.addColumn(table, column)
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of [...this.columns].reverse()) {
      if (await queryRunner.hasColumn(table, column.name)) {
        await queryRunner.dropColumn(table, column.name)
      }
    }
  }
}
