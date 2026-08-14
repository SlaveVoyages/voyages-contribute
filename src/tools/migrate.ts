import { AppDataSource } from "../backend/db"
import {
  applyPendingMigrations,
  createDatabaseIfMissing,
  migrationStatus
} from "../backend/schema"

/**
 * The `migrate` command: the same schema operations the server performs on
 * startup, driven by hand for a checkout or a CI step.
 */

export const runMigrateCommand = async (args: string[]): Promise<number> => {
  const wants = (flag: string) => args.includes(flag)

  if (wants("--create-database")) {
    await createDatabaseIfMissing()
  }

  await AppDataSource.initialize()
  try {
    const { known, applied, pending } = await migrationStatus()

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

    await applyPendingMigrations()
    return 0
  } finally {
    await AppDataSource.destroy()
  }
}
