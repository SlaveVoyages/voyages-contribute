import { expect, test } from "vitest"
import { voyageMapping } from "../src/tools/voyageMapping"
import { voyageTemplateColumnOrder } from "../src/tools/voyageTemplateOrder"
import { debugCheckHeaders } from "../src/tools/importer"

/**
 * The template order is a hand-kept list, so nothing but a test stops it from
 * drifting away from the mapping it is supposed to order. A column added to
 * the mapping and not to the order would silently sink to the end of every
 * downloaded template; a column removed from the mapping would leave a name
 * here that no longer imports.
 */

const mappingHeaders = () => debugCheckHeaders(voyageMapping)

test("the template order names every column the mapping produces", () => {
  const missing = [...mappingHeaders()].filter(
    (h) => !voyageTemplateColumnOrder.includes(h)
  )
  expect(
    missing,
    "these mapping columns have no place in voyageTemplateOrder.ts, so they " +
      `would land at the end of the template: ${missing.join(", ")}`
  ).toEqual([])
})

test("the template order names nothing the mapping does not produce", () => {
  const headers = mappingHeaders()
  const extra = voyageTemplateColumnOrder.filter((h) => !headers.has(h))
  expect(
    extra,
    `these columns are ordered but no longer in the mapping: ${extra.join(", ")}`
  ).toEqual([])
})

test("the template order lists each column once", () => {
  const seen = new Set<string>()
  const duplicates = voyageTemplateColumnOrder.filter((h) => {
    if (seen.has(h)) {
      return true
    }
    seen.add(h)
    return false
  })
  expect(duplicates).toEqual([])
})

test("cargo sits where Daniel's list puts it, between the owners and fate", () => {
  const at = (h: string) => voyageTemplateColumnOrder.indexOf(h)
  expect(at("ownerr")).toBeLessThan(at("cargotypea"))
  expect(at("cargocountj")).toBeLessThan(at("fate"))
  // The ten slots stay contiguous and in slot order. Three columns per slot,
  // not four: Daniel's plain `CARGO` heads the group rather than holding a
  // value, so it has no column of its own.
  const slots = "abcdefghij"
    .split("")
    .flatMap((s) => [`cargotype${s}`, `cargounit${s}`, `cargocount${s}`])
  const start = at("cargotypea")
  expect(voyageTemplateColumnOrder.slice(start, start + slots.length)).toEqual(
    slots
  )
})
