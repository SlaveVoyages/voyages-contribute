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
 * Gives the author's address a column of its own, `authorEmail`, and indexes it
 * and `changesets.timestamp`.
 *
 * `author` keeps the display name. Existing values are split: an address
 * recorded alone, or closing a `Name <address>` value, moves to `authorEmail`
 * lowercased; a value holding no address leaves it null.
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

    // An address on its own is the whole value, and is lowercased into both
    // columns: an address arrives lowercased where a token is read, and is
    // compared in that form. One statement, over rows that are wide to read.
    await queryRunner.query(
      "UPDATE changesets SET author = LOWER(TRIM(author)), authorEmail = LOWER(TRIM(author))" +
        " WHERE authorEmail IS NULL AND author LIKE '%@%'" +
        " AND author NOT LIKE '%<%' AND TRIM(author) NOT LIKE '% %'"
    )

    // `Name <address>`: split in JavaScript, because sqlite and MySQL share no
    // regex. One UPDATE per distinct author value rather than per row.
    const bracketed: { author: string }[] = await queryRunner.query(
      "SELECT DISTINCT author FROM changesets WHERE authorEmail IS NULL AND author LIKE '%<%>'"
    )
    for (const { author } of bracketed) {
      const match = /^(.*?)\s*<([^<>]*)>$/.exec(author)
      const email = match?.[2]?.trim().toLowerCase()
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
