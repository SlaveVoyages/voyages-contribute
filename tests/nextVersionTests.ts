import { expect, test } from "vitest"
// @ts-expect-error — a plain ESM script, not part of the typed sources.
import { nextVersion, readSeries } from "../scripts/nextVersion.js"

/**
 * The release version is worked out rather than written down, so this is the
 * one place the scheme is stated in a form that can be checked.
 */

test("the next version continues the series the registry already holds", () => {
  const series = "0.6.0"

  // Nothing published yet — npm prints nothing at all for an unknown package.
  expect(nextVersion(series, "")).toBe("0.6.0")
  expect(nextVersion(series, "[]")).toBe("0.6.0")

  // A single published version prints as a bare string, not an array.
  expect(nextVersion(series, '"0.4.1"')).toBe("0.6.0")

  // A minor that has not shipped yet starts at zero.
  expect(nextVersion(series, '["0.4.0","0.4.1","0.5.0"]')).toBe("0.6.0")

  // One past the highest in the series.
  expect(nextVersion(series, '["0.5.0","0.6.0","0.6.1","0.6.2"]')).toBe("0.6.3")

  // By number, not by text: 0.6.10 is the newest, so 0.6.11 comes next.
  expect(nextVersion(series, '["0.6.9","0.6.10"]')).toBe("0.6.11")

  // Near misses belong to other series, or are not releases of this one.
  expect(
    nextVersion(series, '["0.60.0","10.6.3","0.6.1-beta","0.6"]')
  ).toBe("0.6.0")

  // A raised major starts over.
  expect(nextVersion("1.0.0", '["0.6.0","0.6.3"]')).toBe("1.0.0")

  // Whatever npm printed, if it was not JSON, is not a version list.
  expect(nextVersion(series, "npm ERR! code E404")).toBe("0.6.0")
})

test("a version carrying a patch is refused rather than overwritten", () => {
  // The scheme is load-bearing: a patch committed to package.json would be
  // replaced by the one worked out here, publishing something other than what
  // the file says.
  for (const bad of ["0.6.1", "0.6", "v0.6.0", "0.6.0-rc.1", ""]) {
    expect(() => readSeries(bad)).toThrow(/must be x\.y\.0/)
  }
  expect(readSeries("0.6.0")).toBe("0.6")
  expect(readSeries("12.34.0")).toBe("12.34")
})
