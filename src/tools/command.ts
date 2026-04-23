import { Contribution, PublicationBatch } from "../models"
import { AllMappings } from "./allMappings"
import { getCSVHeaders, importCSV } from "./csv"
import readline from "node:readline"
import {
  debugCheckHeaders,
  LookupError,
  TrackedMappingErrors
} from "./importer"
import fs from "node:fs"
import { randomUUID } from "crypto"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const asyncReadline = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

const args = process.argv.slice(2)

const [cmd] = args
if (cmd === "inspect" && args.length >= 2) {
  const [_, schemaName] = args
  const { mapping } = AllMappings[schemaName]
  const headers = debugCheckHeaders(mapping)
  if (args.length >= 3) {
    const csvHeaders = await getCSVHeaders(args[2])
    const csvHeadersSet = new Set<string>(csvHeaders)
    // Determine any headers which are not in the mapping, and vice versa.
    const missingFromImport = csvHeaders.filter((h) => !headers.has(h))
    const missingFromData = [...headers].filter((h) => !csvHeadersSet.has(h))
    if (missingFromImport.length > 0) {
      console.log(
        `WARNING: The following (${missingFromImport.length}) headers are in the CSV but not in the mapping:
        ${missingFromImport.join(", ")}`
      )
    }
    if (missingFromData.length > 0) {
      console.log(
        `WARNING: The following (${missingFromData.length}) headers were not found in the CSV:
        ${missingFromData.join(", ")}`
      )
    }
  } else {
    console.log(JSON.stringify(headers))
  }
  process.exit(0)
} else if (cmd === "import" && args.length >= 4) {
  const maxRows = args.length >= 5 ? parseInt(args[4], 10) : undefined
  const [_, apiUrl, schemaName, filename, contribStatus = "0"] = args
  const errors: TrackedMappingErrors[] = []
  const updates = await importCSV(apiUrl, schemaName, filename, errors, maxRows)
  if (errors.length > 0) {
    // Dump to file.
    errors.sort((a, b) => {
      let cmp = a.error.kind.localeCompare(b.error.kind)
      if (cmp === 0 && a.error.kind === "lookup") {
        const la = a.error as LookupError
        const lb = b.error as LookupError
        cmp = la.schema.localeCompare(lb.schema)
        if (cmp === 0) {
          cmp = la.value.localeCompare(lb.value)
        }
      }
      return cmp
    })
    const MAX_ROWS_ARRAY_LENGTH = 6
    errors.forEach((e) => {
      e.count = e.rowNumbers.length
      if (e.rowNumbers.length > MAX_ROWS_ARRAY_LENGTH) {
        // Limit to first rows and add a note.
        const kept = MAX_ROWS_ARRAY_LENGTH - 1
        const more = e.rowNumbers.length - kept
        e.rowNumbers.splice(kept)
        e.rowNumbers.push(`... and ${more} more`)
      }
    })
    fs.writeFileSync("errors.json", JSON.stringify(errors, null, 2))
    console.error(
      `Found ${errors.length} errors during import. Saved to errors.json.`
    )
    const userRes = await asyncReadline(
      "Do you want to continue with the import? (yes/no) "
    )
    if (userRes.toLowerCase() !== "yes") {
      console.log("Import cancelled by user.")
      rl.close()
      process.exit(0)
    }
  }
  // Create batch if not exists.
  const batchRes = await fetch(`${apiUrl}/create_batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: `Import of ${schemaName} from ${filename}`,
      comments: `Batch created for import of ${schemaName} from CSV file ${filename}`
    })
  })
  let batch: PublicationBatch
  if (batchRes.status === 409) {
    batch = (await batchRes.json()).existing
  } else if (batchRes.status === 201) {
    batch = await batchRes.json()
  } else {
    throw new Error(
      `Failed to create or retrieve publication batch: ${await batchRes.text()}.`
    )
  }
  console.log(`Using batch: ${batch.title}`)
  let pushed = 0
  // Map all errors to row numbers (duplicate errors are common).
  for (const update of updates) {
    // console.dir(update, { depth: null })
    const contrib: Contribution = {
      id: `${schemaName}.${schemaName}.${update.entityRef.id}`,
      root: update.entityRef,
      changeSet: {
        id: randomUUID(),
        author: "CSV importer script",
        changes: [update],
        comments: `Imported from CSV file ${filename} on ${new Date().toISOString()}`,
        title: `Import of ${schemaName} #${update.entityRef.id}`,
        timestamp: Date.now()
      },
      status: parseInt(contribStatus), // ContributionStatus.WorkInProgress,
      reviews: [],
      media: [],
      batch
    }
    const contribRes = await fetch(`${apiUrl}/contributions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contrib)
    })
    if (contribRes.status !== 201) {
      console.error(
        `Failed to submit contribution for ${update.entityRef.id}: ${await contribRes.text()}`
      )
      break
    }
    // TODO: submit as a contribution to the API.
    pushed++
  }
  console.log(
    `Successfully pushed ${pushed}/${updates.length} updates to the API for batch ${batch.title}.`
  )
  process.exit(0)
} else {
  console.error(
    `Usage: npm run tools <command='import'|'inspect'> 
      import <apiUrl> <schemaName> <filename> (<maxRows>) (<contribStatus>)
      inspect <schemaName> (<optional file to extract headers from>)`
  )
}
