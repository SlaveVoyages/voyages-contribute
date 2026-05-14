// Node.js file reading
import fs from "fs"
import Papa, { ParseConfig } from "papaparse"
import {
  EntityLookUp,
  MapDataSourceToChangeSets,
  TrackedMappingErrors
} from "./importer"
import { createApiLookup } from "./lookup"
import { AllMappings } from "./allMappings"
import { EntityUpdate } from "../models"

const defaultParseOptions: Partial<ParseConfig<Record<string, string>>> = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  transformHeader: (header) => header.toLowerCase()
}

export const parseCSV = (
  filename: string,
  options?: Partial<ParseConfig<Record<string, string>>>
) => {
  const csvContent = fs.readFileSync(filename, "utf8")
  return Papa.parse<Record<string, string>>(csvContent, {
    ...defaultParseOptions,
    ...options
  })
}

export const parseCSVBuffer = (
  buffer: Buffer,
  options?: Partial<ParseConfig<Record<string, string>>>
) =>
  Papa.parse<Record<string, string>>(buffer.toString("utf8"), {
    ...defaultParseOptions,
    ...options
  })

export const getCSVHeaders = async (filename: string) =>
  new Promise<string[]>((resolve) => {
    parseCSV(filename, {
      step: (results, parser) => {
        const headers = Object.keys(results.data || {})
        parser.abort() // Stop parsing after the first row
        resolve(headers.map((s) => s.toLowerCase()))
      }
    })
  })

export const getCSVHeadersFromBuffer = (buffer: Buffer): string[] => {
  let headers: string[] = []
  parseCSVBuffer(buffer, {
    step: (results, parser) => {
      headers = Object.keys(results.data || {}).map((s) => s.toLowerCase())
      parser.abort()
    }
  })
  return headers
}

const resolveMapping = (schemaName: string) => {
  const match = AllMappings[schemaName]
  if (match === undefined) {
    throw new Error(`No mapping found for schema: ${schemaName}`)
  }
  return match
}

export const importCSV = (
  apiUrl: string,
  schemaName: string,
  filename: string,
  errors: TrackedMappingErrors[],
  maxRows?: number
) => {
  const { data } = parseCSV(filename)
  const { mapping, schema } = resolveMapping(schemaName)
  const lookup = createApiLookup(apiUrl)
  return MapDataSourceToChangeSets(
    data,
    mapping,
    schema,
    lookup,
    errors,
    maxRows
  )
}

/**
 * In-process variant of `importCSV` for callers that already have a CSV buffer
 * and want to inject their own `EntityLookUp` (e.g. the server, which uses an
 * in-process resolver instead of going back through HTTP).
 *
 * Returns the produced updates alongside `rowCount`, the number of CSV rows
 * the importer actually looked at (capped by `maxRows` if supplied). Callers
 * use this to drive progress accounting that reflects the input CSV rather
 * than the post-mapping update count, which excludes rows that errored.
 */
export const importCSVFromBuffer = async (
  buffer: Buffer,
  schemaName: string,
  lookup: EntityLookUp,
  errors: TrackedMappingErrors[],
  maxRows?: number
): Promise<{ updates: EntityUpdate[]; rowCount: number }> => {
  const { data } = parseCSVBuffer(buffer)
  const { mapping, schema } = resolveMapping(schemaName)
  const rowCount =
    maxRows !== undefined ? Math.min(data.length, maxRows) : data.length
  const updates = await MapDataSourceToChangeSets(
    data,
    mapping,
    schema,
    lookup,
    errors,
    maxRows
  )
  return { updates, rowCount }
}
