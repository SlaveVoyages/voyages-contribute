import { expect, test } from "vitest"
import { readMigrationMode } from "../src/backend/schema"

/**
 * The mode decides whether a starting server may write to the schema, so an
 * unrecognized value must not resolve to one of the writing modes. Unset and
 * empty both mean `none`: PowerShell keeps `$env:X = ""` as a defined
 * variable, so an unset mode reaches this as an empty string about as often
 * as it reaches it as undefined.
 */
test("migration mode is read strictly, defaulting to the mode that cannot write", () => {
  expect(readMigrationMode(undefined)).toBe("none")
  expect(readMigrationMode("")).toBe("none")
  expect(readMigrationMode("   ")).toBe("none")

  expect(readMigrationMode("none")).toBe("none")
  expect(readMigrationMode("on-startup")).toBe("on-startup")
  expect(readMigrationMode("job")).toBe("job")
  expect(readMigrationMode(" job ")).toBe("job")

  for (const bad of ["None", "JOB", "on_startup", "onstartup", "true", "1"]) {
    expect(() => readMigrationMode(bad)).toThrow(/MIGRATION_MODE/)
  }
})
