import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm"

/**
 * Two changes that together stop the editorial list from scanning the whole
 * `contributions` table on every load:
 *
 * 1. Denormalises the root entity's schema and id onto `rootSchema` / `rootId`,
 *    plus the id again as a number on `rootIdNum` for ordering by voyage id.
 *    They live inside the `root` JSON, which the list could only filter with a
 *    leading-wildcard LIKE (`root LIKE '%"schema":"Voyage"%'`) -- unindexable,
 *    so `?root_schema=Voyage` forced a full table scan, and ordering by voyage
 *    id extracted it from the JSON on every row. On real columns the filter is
 *    an index lookup and the sort is index-backed and numeric. Backfilled here
 *    from each row's `root` so existing rows match new ones.
 *
 * 2. Adds indexes on the columns the list filters and orders by -- `status`
 *    (the selective filter on every editorial query), `shipName`,
 *    `nationality` and `rootIdNum` (sort columns) -- plus the new root columns.
 *    The FK columns (`changeSetId`, `batchId`) are already indexed by their
 *    foreign keys, so they are not repeated here.
 *
 * Guarded throughout so a re-run is a no-op, matching the other migrations. The
 * same migration runs on both sqlite and MySQL; `createIndex` renders each
 * dialect's own DDL.
 */
export class ContributionRootColumnsAndIndexes1786600000000
  implements MigrationInterface
{
  name = "ContributionRootColumnsAndIndexes1786600000000"

  private static readonly INDEXES: { name: string; column: string }[] = [
    { name: "IDX_contributions_status", column: "status" },
    { name: "IDX_contributions_shipName", column: "shipName" },
    { name: "IDX_contributions_nationality", column: "nationality" },
    { name: "IDX_contributions_rootSchema", column: "rootSchema" },
    { name: "IDX_contributions_rootId", column: "rootId" },
    { name: "IDX_contributions_rootIdNum", column: "rootIdNum" }
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newColumns: { name: string; type: string }[] = [
      { name: "rootSchema", type: "varchar" },
      { name: "rootId", type: "varchar" },
      { name: "rootIdNum", type: "bigint" }
    ]
    for (const { name, type } of newColumns) {
      if (!(await queryRunner.hasColumn("contributions", name))) {
        await queryRunner.addColumn(
          "contributions",
          new TableColumn({ name, type, isNullable: true })
        )
      }
    }

    // Backfill the new columns from each row's `root`, stored as JSON text.
    const rows: { id: string; root: string | null }[] = await queryRunner.query(
      "SELECT id, root FROM contributions"
    )
    for (const { id, root } of rows) {
      let parsed: any = null
      try {
        parsed = root ? (typeof root === "string" ? JSON.parse(root) : root) : null
      } catch {
        parsed = null
      }
      const rootSchema = parsed?.schema != null ? String(parsed.schema) : null
      const rootId = parsed?.id != null ? String(parsed.id) : null
      // Numeric id only when the id is a whole number, matching the entity hook.
      const rootIdNum =
        rootId !== null && /^-?\d+$/.test(rootId) ? rootId : null
      if (rootSchema !== null || rootId !== null) {
        await queryRunner.query(
          "UPDATE contributions SET rootSchema = ?, rootId = ?, rootIdNum = ? WHERE id = ?",
          [rootSchema, rootId, rootIdNum, id]
        )
      }
    }

    const table = await queryRunner.getTable("contributions")
    for (const { name, column } of ContributionRootColumnsAndIndexes1786600000000.INDEXES) {
      const exists = table?.indices.some(
        (index) =>
          index.name === name ||
          (index.columnNames.length === 1 && index.columnNames[0] === column)
      )
      if (!exists) {
        await queryRunner.createIndex(
          "contributions",
          new TableIndex({ name, columnNames: [column] })
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("contributions")
    for (const { name } of ContributionRootColumnsAndIndexes1786600000000.INDEXES) {
      if (table?.indices.some((index) => index.name === name)) {
        await queryRunner.dropIndex("contributions", name)
      }
    }
    for (const column of ["rootSchema", "rootId", "rootIdNum"]) {
      if (await queryRunner.hasColumn("contributions", column)) {
        await queryRunner.dropColumn("contributions", column)
      }
    }
  }
}
