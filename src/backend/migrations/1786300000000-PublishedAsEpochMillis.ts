import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

/**
 * Declares a batch's publication date as the integer it holds.
 *
 * Stamping a batch writes `Date.now()` into what was a `varchar`. That is not
 * what decides the type a caller reads back — the entity coerces, because no
 * column type makes every driver agree — and a decimal string round-trips an
 * integer exactly, so nothing was lost. What the declared type does decide is
 * how the database itself sorts and compares the column, and as text "900"
 * falls after "1000".
 *
 * `bigint` matches the other two columns holding epoch milliseconds,
 * `changesets.timestamp` and `contributions.decidedAt`.
 *
 * Nothing wrote the column before this, so every existing row holds null and
 * there is no text to reinterpret.
 */
export class PublishedAsEpochMillis1786300000000 implements MigrationInterface {
  name = "PublishedAsEpochMillis1786300000000"

  private readonly published = (type: "bigint" | "varchar") =>
    new TableColumn({ name: "published", type, isNullable: true })

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      "publication_batches",
      "published",
      this.published("bigint")
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      "publication_batches",
      "published",
      this.published("varchar")
    )
  }
}
