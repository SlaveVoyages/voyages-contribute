import { DataSource } from "typeorm"
import { AppDataSource } from "../backend/db"

/**
 * Schema management for the contributions database.
 *
 * The server never builds a schema of its own — `synchronize` is off — so a
 * database only ever gets one by running these, and what runs in development
 * is what runs everywhere else.
 */

const migrationsTable = "migrations"

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

/**
 * MySQL will not connect to a database that does not exist, and TypeORM does
 * not create one. Connects without selecting a database to issue the CREATE,
 * then hands back so the caller can connect normally. A no-op for sqlite,
 * whose driver creates the file on connect.
 */
const createDatabaseIfMissing = async (): Promise<void> => {
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

export const runMigrateCommand = async (args: string[]): Promise<number> => {
  const wants = (flag: string) => args.includes(flag)

  if (wants("--create-database")) {
    await createDatabaseIfMissing()
  }

  await AppDataSource.initialize()
  try {
    const known = AppDataSource.migrations.map((m) => m.name ?? "<unnamed>")
    const applied = await appliedNames(AppDataSource)
    const pending = known.filter((name) => !applied.has(name))

    if (wants("--status") || wants("--check")) {
      for (const name of known) {
        console.log(`  ${applied.has(name) ? "applied" : "PENDING"}  ${name}`)
      }
      console.log(`${applied.size} applied, ${pending.length} pending`)
      // --check is for CI: a schema behind the code is a failure, not a prompt.
      return wants("--check") && pending.length > 0 ? 1 : 0
    }

    if (pending.length === 0) {
      console.log("Schema is up to date; nothing to apply.")
      return 0
    }

    const ran = await AppDataSource.runMigrations({ transaction: "all" })
    for (const migration of ran) {
      console.log(`  applied  ${migration.name}`)
    }
    console.log(`Applied ${ran.length} migration(s).`)
    return 0
  } finally {
    await AppDataSource.destroy()
  }
}
