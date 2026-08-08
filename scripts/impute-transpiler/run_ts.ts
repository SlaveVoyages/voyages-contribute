/**
 * Run an impute corpus through the transpiled TypeScript and write the results
 * for diffing against the original Python.
 *
 *   npx vite-node scripts/impute-transpiler/run_ts.ts -- <corpus.json> <actual.json>
 */
import { readFileSync, writeFileSync } from "fs"
import {
  runImpute,
  ImputeInput,
  SlaveNumberVar
} from "../../src/impute/generated/impute"
import { finalizeEnv } from "../../src/impute/finalize"

interface CorpusRecord {
  __id__: string
  __is_iam__: boolean
  __published__: Record<string, number | null>
  slave_numbers: Record<string, number>
  [field: string]: unknown
}

const toInput = (rec: CorpusRecord): ImputeInput => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rec)) {
    if (key.startsWith("__")) {
      continue
    }
    out[key] =
      key === "slave_numbers"
        ? new Map<SlaveNumberVar, number>(
            Object.entries(value as Record<string, number>) as [
              SlaveNumberVar,
              number
            ][]
          )
        : value
  }
  return out as unknown as ImputeInput
}

const [corpusPath, outPath] = process.argv.slice(-2)
const corpus: CorpusRecord[] = JSON.parse(readFileSync(corpusPath, "utf-8"))

const results = corpus.map((rec) => {
  try {
    return {
      id: rec.__id__,
      env: finalizeEnv(runImpute(toInput(rec), rec.__is_iam__))
    }
  } catch (e) {
    return { id: rec.__id__, error: `${(e as Error).name}: ${(e as Error).message}` }
  }
})

writeFileSync(outPath, JSON.stringify(results, null, 1))
const failed = results.filter((r) => "error" in r)
console.log(`records   : ${results.length}`)
console.log(`failures  : ${failed.length}`)
for (const f of failed.slice(0, 10)) {
  console.log(`   id=${f.id}  ${(f as { error: string }).error}`)
}
console.log(`wrote ${outPath}`)
