import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm"

import { voyageIdSortKey } from "../voyageId"


export class ContributionVoyageIdNum1786800000000 implements MigrationInterface {
  name = "ContributionVoyageIdNum1786800000000"

  private static readonly INDEX = "IDX_contributions_voyageIdNum"
  private static readonly CHUNK = 500

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("contributions", "voyageIdNum"))) {
      await queryRunner.addColumn(
        "contributions",
        new TableColumn({ name: "voyageIdNum", type: "bigint", isNullable: true })
      )
    }

    const parse = (json: unknown): any => {
      if (json == null) return null
      if (typeof json !== "string") return json
      try {
        return JSON.parse(json)
      } catch {
        return null
      }
    }

    for (let offset = 0; ; offset += ContributionVoyageIdNum1786800000000.CHUNK) {
      const rows: { id: string; root: unknown; changes: unknown }[] =
        await queryRunner.query(
          "SELECT c.id AS id, c.root AS root, cs.changes AS changes " +
            "FROM contributions c JOIN changesets cs ON cs.id = c.changeSetId " +
            "ORDER BY c.id LIMIT ? OFFSET ?",
          [ContributionVoyageIdNum1786800000000.CHUNK, offset]
        )
      if (rows.length === 0) {
        break
      }
      const placeholders = rows.map(() => "?").join(", ")
      const reviewRows: {
        contributionId: string
        changes: unknown
      }[] = await queryRunner.query(
        "SELECT r.contributionId AS contributionId, cs.changes AS changes " +
          "FROM reviews r JOIN changesets cs ON cs.id = r.changeSetId " +
          `WHERE r.contributionId IN (${placeholders}) ` +
          "ORDER BY r.contributionId, r.stackOrder",
        rows.map((r) => r.id)
      )
      const reviewsOf = new Map<string, unknown[]>()
      for (const { contributionId, changes } of reviewRows) {
        const list = reviewsOf.get(contributionId) ?? []
        list.push(changes)
        reviewsOf.set(contributionId, list)
      }
      for (const { id, root, changes } of rows) {
        const key = voyageIdSortKey(
          parse(root) ?? undefined,
          [changes, ...(reviewsOf.get(id) ?? [])].map((c) => ({
            changes: parse(c) ?? []
          }))
        )
        await queryRunner.query(
          "UPDATE contributions SET voyageIdNum = ? WHERE id = ?",
          [key, id]
        )
      }
    }

    const table = await queryRunner.getTable("contributions")
    const exists = table?.indices.some(
      (index) =>
        index.name === ContributionVoyageIdNum1786800000000.INDEX ||
        (index.columnNames.length === 1 &&
          index.columnNames[0] === "voyageIdNum")
    )
    if (!exists) {
      await queryRunner.createIndex(
        "contributions",
        new TableIndex({
          name: ContributionVoyageIdNum1786800000000.INDEX,
          columnNames: ["voyageIdNum"]
        })
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("contributions")
    if (
      table?.indices.some(
        (index) => index.name === ContributionVoyageIdNum1786800000000.INDEX
      )
    ) {
      await queryRunner.dropIndex(
        "contributions",
        ContributionVoyageIdNum1786800000000.INDEX
      )
    }
    if (await queryRunner.hasColumn("contributions", "voyageIdNum")) {
      await queryRunner.dropColumn("contributions", "voyageIdNum")
    }
  }
}
