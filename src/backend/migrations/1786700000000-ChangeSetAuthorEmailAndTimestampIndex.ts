import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex
} from "typeorm"

const INDEXES: { name: string; column: string }[] = [
  { name: "IDX_changesets_authorEmail", column: "authorEmail" },
  { name: "IDX_changesets_timestamp", column: "timestamp" }
]

/**
 * Gives the author's email a column of its own, `authorEmail`, and indexes it
 * and `changesets.timestamp`.
 *
 * `author` holds the name to display; `authorEmail` holds the address that
 * ownership and the author filter compare, whole and off an index. Existing
 * rows are split here: an address recorded alone, or closing a `Name <address>`
 * value, becomes the identity, and a value holding no address leaves it null.
 *
 * Guarded so a re-run is a no-op, and reversible: `down` folds the address back
 * into `author`.
 */
export class ChangeSetAuthorEmailAndTimestampIndex1786700000000
  implements MigrationInterface
{
  name = "ChangeSetAuthorEmailAndTimestampIndex1786700000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("changesets", "authorEmail"))) {
      await queryRunner.addColumn(
        "changesets",
        new TableColumn({
          name: "authorEmail",
          type: "varchar",
          isNullable: true
        })
      )
    }

    // An address on its own is the whole value. Set in one statement: these
    // rows are wide, so reading them one at a time costs a page each.
    await queryRunner.query(
      "UPDATE changesets SET authorEmail = TRIM(author) WHERE authorEmail IS NULL" +
        " AND author LIKE '%@%' AND author NOT LIKE '%<%' AND TRIM(author) NOT LIKE '% %'"
    )

    // `Name <address>`, where the address closes the value. Split in
    // JavaScript, which both dialects spell the same way, and written back one
    // statement per distinct value: an account writes the same author on every
    // row it authors, and these rows are wide enough that touching them one at
    // a time dominates the migration.
    const bracketed: { author: string }[] = await queryRunner.query(
      "SELECT DISTINCT author FROM changesets WHERE authorEmail IS NULL AND author LIKE '%<%>'"
    )
    for (const { author } of bracketed) {
      const match = /^(.*?)\s*<([^<>]*)>$/.exec(author)
      const email = match?.[2]?.trim()
      if (!email?.includes("@")) {
        continue
      }
      const name = match?.[1]?.trim()
      await queryRunner.query(
        "UPDATE changesets SET author = ?, authorEmail = ? WHERE authorEmail IS NULL AND author = ?",
        [name || email, email, author]
      )
    }

    for (const { name, column } of INDEXES) {
      const table = await queryRunner.getTable("changesets")
      if (!table?.indices.some((index) => index.name === name)) {
        await queryRunner.createIndex(
          "changesets",
          new TableIndex({ name, columnNames: [column] })
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("changesets")
    for (const { name } of INDEXES) {
      if (table?.indices.some((index) => index.name === name)) {
        await queryRunner.dropIndex("changesets", name)
      }
    }
    if (!(await queryRunner.hasColumn("changesets", "authorEmail"))) {
      return
    }
    const split: { author: string; authorEmail: string }[] =
      await queryRunner.query(
        "SELECT DISTINCT author, authorEmail FROM changesets" +
          " WHERE authorEmail IS NOT NULL AND author <> authorEmail"
      )
    for (const { author, authorEmail } of split) {
      await queryRunner.query(
        "UPDATE changesets SET author = ? WHERE author = ? AND authorEmail = ?",
        [`${author} <${authorEmail}>`, author, authorEmail]
      )
    }
    await queryRunner.dropColumn("changesets", "authorEmail")
  }
}
