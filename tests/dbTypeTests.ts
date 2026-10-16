import { expect, test } from "vitest"

/**
 * Sqlite creates whatever file it is pointed at, so a type that reaches it by
 * accident yields a healthy server serving an empty database rather than an
 * error. Anything short of a deliberate choice is therefore refused, including
 * the empty string, which is how an unset variable arrives from PowerShell.
 */

process.env.CONTRIB_DB_TYPE = "sqlite"

const { readDbType } = await import("../src/backend/db")

test("the database type is required, and read strictly", () => {
  expect(readDbType("sqlite")).toBe("sqlite")
  expect(readDbType("mysql")).toBe("mysql")
  expect(readDbType(" mysql ")).toBe("mysql")

  for (const unset of [undefined, "", "   "]) {
    expect(() => readDbType(unset)).toThrow(/CONTRIB_DB_TYPE/)
  }

  for (const bad of ["SQLite", "MySQL", "postgres", "sqlite3", "true", "1"]) {
    expect(() => readDbType(bad)).toThrow(/CONTRIB_DB_TYPE/)
  }
})
