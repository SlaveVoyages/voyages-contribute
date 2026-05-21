// Node.js file reading
import fs, { createReadStream } from "fs"
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

/**
 * Async, streaming header-only reader. Walks just enough of the file to find
 * the first newline, parses that line as CSV, and returns the lowercase
 * header list. Avoids the previous design's two problems for HTTP callers:
 * a synchronous `readFileSync` blocked the event loop, and the full file
 * (up to the 100MB multer limit) was pulled into RAM only to extract a
 * single line. `parseCSV` below stays sync because its CLI caller doesn't
 * care about either property.
 */
export const getCSVHeaders = async (filename: string): Promise<string[]> => {
  const HEADER_BYTE_LIMIT = 1 * 1024 * 1024 // 1MB cap on a single header line
  const stream = createReadStream(filename, { encoding: "utf8" })
  let buffer = ""
  try {
    for await (const chunk of stream) {
      buffer += chunk
      const newlineIdx = buffer.indexOf("\n")
      if (newlineIdx >= 0) {
        buffer = buffer.slice(0, newlineIdx)
        break
      }
      if (buffer.length > HEADER_BYTE_LIMIT) {
        throw new Error(
          `CSV header line exceeds ${HEADER_BYTE_LIMIT} bytes; the file may not be a valid CSV.`
        )
      }
    }
  } finally {
    stream.destroy()
  }
  // Strip trailing carriage return left over from CRLF line endings.
  if (buffer.endsWith("\r")) {
    buffer = buffer.slice(0, -1)
  }
  const { data } = Papa.parse<string[]>(buffer, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false
  })
  const row = data[0] ?? []
  return row.map((s) => String(s).toLowerCase())
}

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
