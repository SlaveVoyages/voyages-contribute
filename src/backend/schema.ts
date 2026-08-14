import { DataSource } from "typeorm"
import { AppDataSource } from "./db"

/**
 * Schema management for the contributions database, shared by the server and
 * the `migrate` tool.
 *
 * `synchronize` is off, so a database only ever gets a schema by applying
 * these migrations, and the one the server runs against is the one they
 * produce.
 */

const migrationsTable = "migrations"

/**
 * What a starting server does about a schema that is behind the code.
 *
 * - `none` refuses to serve. Nothing writes to the schema, so it is the mode
 *   to run a live service under.
 * - `on-startup` applies what is pending and then serves.
 * - `job` applies what is pending and exits without serving, so the same
 *   image can migrate as a one-shot container.
 */
export type MigrationMode = "none" | "on-startup" | "job"

const MIGRATION_MODES: MigrationMode[] = ["none", "on-startup", "job"]

/**
 * Deliberately not derived from `NODE_ENV`: how a deployment gets its schema
 * is a separate decision from what it is called, and tying the two is what
 * left production with no schema at all.
 *
 * An empty value counts as unset — PowerShell keeps `$env:X = ""` as a
 * defined variable — and unset means `none`, the mode that cannot write.
 */
export const readMigrationMode = (raw: string | undefined): MigrationMode => {
  if (raw === undefined || raw.trim() === "") {
    return "none"
  }
  const mode = MIGRATION_MODES.find((candidate) => candidate === raw.trim())
  if (!mode) {
    throw new Error(
      `MIGRATION_MODE must be one of ${MIGRATION_MODES.join(" | ")}; got "${raw}".`
    )
  }
  return mode
}

export interface MigrationStatus {
  known: string[]
  applied: Set<string>
  pending: string[]
}

const appliedNames = async (dataSource: DataSource): Promise<Set<string>> => {
  const queryRunner = dataSource.createQueryRunner()
  try {
    const exists = await queryRunner.hasTable(migrationsTable)
    if (!exists) {
      return new Set()
    }
    const rows: { name: string }[] = await queryRunner.query(
      `SELECT name FROM "${migrationsTable}"`.replace(
        /"/g,
        dataSource.options.type === "mysql" ? "`" : "\""
      )
    )
    return new Set(rows.map((r) => r.name))
  } finally {
    await queryRunner.release()
  }
}

export const migrationStatus = async (
  dataSource: DataSource = AppDataSource
): Promise<MigrationStatus> => {
  const known = dataSource.migrations.map((m) => m.name ?? "<unnamed>")
  const applied = await appliedNames(dataSource)
  return { known, applied, pending: known.filter((name) => !applied.has(name)) }
}

export const applyPendingMigrations = async (
  dataSource: DataSource = AppDataSource
): Promise<string[]> => {
  const ran = await dataSource.runMigrations({ transaction: "all" })
  for (const migration of ran) {
    console.log(`  applied  ${migration.name}`)
  }
  console.log(`Applied ${ran.length} migration(s).`)
  return ran.map((m) => m.name)
}

/**
 * MySQL will not connect to a database that does not exist, and TypeORM does
 * not create one. Connects without selecting a database to issue the CREATE,
 * then hands back so the caller can connect normally. A no-op for sqlite,
 * whose driver creates the file on connect.
 */
export const createDatabaseIfMissing = async (): Promise<void> => {
  const options = AppDataSource.options
  if (options.type !== "mysql") {
    console.log("create-database: nothing to do for", options.type)
    return
  }
  const { host, port, username, password, database } = options as {
    host?: string
    port?: number
    username?: string
    password?: string
    database?: string
  }
  if (!database) {
    throw new Error("CONTRIB_DB_NAME is not set; nothing to create.")
  }
  const bootstrap = new DataSource({
    type: "mysql",
    host,
    port,
    username,
    password,
    charset: "utf8mb4",
    logging: false
  })
  await bootstrap.initialize()
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`
    )
    console.log(`create-database: ensured \`${database}\` exists`)
  } finally {
    await bootstrap.destroy()
  }
}

/**
 * Settles the schema for a starting server, on an already-connected data
 * source. Returns whether the caller should go on to serve.
 */
export const prepareSchema = async (
  mode: MigrationMode,
  dataSource: DataSource = AppDataSource
): Promise<"serve" | "done"> => {
  const { pending } = await migrationStatus(dataSource)

  if (mode === "none") {
    if (pending.length > 0) {
      throw new Error(
        `Schema is behind the code: ${pending.length} migration(s) pending ` +
          `(${pending.join(", ")}). Apply them with a MIGRATION_MODE=job ` +
          "container or `npm run tools -- migrate`, then start the server."
      )
    }
    console.log(`Schema is up to date (MIGRATION_MODE=${mode}).`)
    return "serve"
  }

  if (pending.length === 0) {
    console.log("Schema is up to date; nothing to apply.")
  } else {
    await applyPendingMigrations(dataSource)
  }
  return mode === "job" ? "done" : "serve"
}
