import { expect, test } from "vitest"
import express from "express"
import fs from "fs/promises"
import os from "os"
import path from "path"
import type { AddressInfo } from "net"
import { voyageMapping } from "../src/tools/voyageMapping"
import { voyageTemplateColumnOrder } from "../src/tools/voyageTemplateOrder"
import { debugCheckHeaders } from "../src/tools/importer"
import { createBulkImportRouter } from "../src/backend/bulkImport"

/**
 * The template order is a hand-kept list, so nothing but a test stops it from
 * drifting away from the mapping it is supposed to order. A column added to
 * the mapping and not to the order would silently sink to the end of every
 * downloaded template; a column removed from the mapping would leave a name
 * here that no longer imports.
 *
 * The list only matters if something applies it, so the last test drives the
 * endpoint the template is built from and checks the order comes out the far
 * end.
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

test("the endpoint the template is built from returns that order", async () => {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "voyage-template-"))
  const app = express()
  app.use(
    createBulkImportRouter({
      authenticateJWT: (req, _res, next) => {
        // The route is editor-only, so the stub stands in for a verified
        // token carrying that role.
        ;(req as unknown as { user: unknown }).user = {
          app_metadata: { role: "Editor" }
        }
        next()
      },
      getAuthorFromRequest: () => "tester",
      dbService: undefined as never,
      resolver: undefined as never,
      uploadDir
    })
  )
  const server = app.listen(0)
  try {
    const { port } = server.address() as AddressInfo
    // What the frontend sends: a CSV with no columns at all, so that every
    // column the mapping knows comes back as one the file is missing, and the
    // answer is the whole template.
    const form = new FormData()
    form.append("file", new Blob([""], { type: "text/csv" }), "empty.csv")
    const response = await fetch(
      `http://127.0.0.1:${port}/inspect-batched-contributions/Voyage`,
      { method: "POST", body: form }
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mappingHeadersNotInCsv).toEqual(voyageTemplateColumnOrder)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await fs.rm(uploadDir, { recursive: true, force: true })
  }
})
