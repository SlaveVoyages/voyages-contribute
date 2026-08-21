import { MigrationInterface, QueryRunner, Table } from "typeorm"

import { RecordDecisionAuthors1786200000000 } from "./1786200000000-RecordDecisionAuthors"
import { PublishedAsEpochMillis1786300000000 } from "./1786300000000-PublishedAsEpochMillis"

/**
 * The schema as it stood when migrations were introduced, reproducing what
 * `synchronize` built until then.
 *
 * Written against the schema-builder API rather than raw SQL because the same
 * migrations run on both sqlite and MySQL, and TypeORM renders the dialect's
 * own DDL from these definitions. Raw `queryRunner.query` would need one set
 * per dialect.
 */
export class InitialSchema1786100000000 implements MigrationInterface {
  name = "InitialSchema1786100000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "changesets",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "author", type: "varchar" },
          { name: "title", type: "varchar" },
          { name: "comments", type: "varchar" },
          { name: "timestamp", type: "bigint" },
          { name: "changes", type: "text" }
        ]
      }),
      true
    )

    await queryRunner.createTable(
      new Table({
        name: "publication_batches",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment"
          },
          { name: "title", type: "varchar", isUnique: true },
          { name: "comments", type: "varchar" },
          { name: "published", type: "varchar", isNullable: true }
        ]
      }),
      true
    )

    await queryRunner.createTable(
      new Table({
        name: "contributions",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "root", type: "text" },
          { name: "status", type: "integer" },
          { name: "decisionComments", type: "varchar", isNullable: true },
          { name: "changeSetId", type: "varchar" },
          { name: "batchId", type: "integer", isNullable: true }
        ],
        foreignKeys: [
          {
            columnNames: ["changeSetId"],
            referencedTableName: "changesets",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "NO ACTION"
          },
          {
            columnNames: ["batchId"],
            referencedTableName: "publication_batches",
            referencedColumnNames: ["id"],
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION"
          }
        ]
      }),
      true
    )

    await queryRunner.createTable(
      new Table({
        name: "reviews",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment"
          },
          { name: "stackOrder", type: "integer" },
          { name: "changeSetId", type: "varchar" },
          { name: "contributionId", type: "varchar", isNullable: true }
        ],
        foreignKeys: [
          {
            columnNames: ["changeSetId"],
            referencedTableName: "changesets",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "NO ACTION"
          },
          {
            columnNames: ["contributionId"],
            referencedTableName: "contributions",
            referencedColumnNames: ["id"],
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION"
          }
        ]
      }),
      true
    )

    await queryRunner.createTable(
      new Table({
        name: "contribution_media",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment"
          },
          { name: "type", type: "varchar" },
          { name: "file", type: "varchar" },
          { name: "name", type: "varchar" },
          { name: "comments", type: "varchar" },
          { name: "contributionId", type: "varchar" }
        ],
        foreignKeys: [
          {
            columnNames: ["contributionId"],
            referencedTableName: "contributions",
            referencedColumnNames: ["id"],
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION"
          }
        ]
      }),
      true
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropped in reverse dependency order so the foreign keys go with them.
    for (const table of [
      "contribution_media",
      "reviews",
      "contributions",
      "publication_batches",
      "changesets"
    ]) {
      await queryRunner.dropTable(table, true)
    }
  }
}

// Referenced by name so the bundler keeps it and the DataSource can list it
// without a filesystem glob, which does not survive bundling.
//
// Run order comes from the class names rather than from this list: TypeORM
// reads the last 13 characters of each one as a timestamp and sorts on that. A
// migration added here runs last only if its name says so.
export const AllMigrations = [
  InitialSchema1786100000000,
  RecordDecisionAuthors1786200000000,
  PublishedAsEpochMillis1786300000000
]
