/**
 * One-shot generator for tests/data/contributeFormLevels.json.
 *
 * Joins the Contribute Form Levels workbook to the schema so the test suite
 * carries the spec's expectations without needing the workbook or the Django
 * repo at test time. Two join paths, because only some Django verbose_names
 * carry the dataset mnemonic:
 *   - by mnemonic, via voyages-api models.py  (itinerary, dates, numbers)
 *   - by label                                (ship, crew, outcome)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs"
import { AllSchemas } from "../src/models/entities"

const [API, XL] = process.argv.slice(2)
if (!API || !XL) {
  console.error(
    [
      "usage: npx vite-node scripts/genContributeFormLevels.ts <api-dir> <workbook-dir>",
      "  <api-dir>       a voyages-api checkout's src/api, read for the dataset",
      "                  mnemonics in the model verbose_names",
      "  <workbook-dir>  Contribute Form_Levels.xlsx unzipped, with its two",
      "                  sheets converted to sheet1.tsv and sheet2.tsv"
    ].join("\n")
  )
  process.exit(1)
}

// mnemonic -> django field name
const FIELD_RE = /^\s+(\w+)\s*=\s*(?:\(\s*)?models\.(\w+)\(/
const mnem = new Map<string, string>()
for (const app of readdirSync(API)) {
  let src: string
  try {
    src = readFileSync(`${API}/${app}/models.py`, "utf8").replace(/=\s*\(\s*\r?\n\s*/g, "= (")
  } catch { continue }
  const lines = src.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const f = lines[i].match(FIELD_RE)
    if (!f) continue
    let end = i + 1
    while (end < lines.length && end < i + 10 && !FIELD_RE.test(lines[end]) && !/^class\s/.test(lines[end])) end++
    for (const p of lines.slice(i, end).join(" ").matchAll(/\(([A-Z][A-Z0-9_]*(?:\s*,\s*[A-Z0-9_*]+)*)\)/g)) {
      const toks = p[1].split(/\s*,\s*/)
      const all = [toks[0], ...toks.slice(1).map((t) => (t.length <= 2 && t !== "*" ? toks[0].slice(0, -t.length) + t : t))]
      for (const m of all) if (m !== "*" && /^[A-Z]/.test(m) && !mnem.has(m)) mnem.set(m, f[1])
    }
  }
}

const sheet = (n: number) =>
  readFileSync(`${XL}/sheet${n}.tsv`, "utf8").split("\n").map((r) => r.split("\t"))
interface Row { section: string | null; label: string; alts: string[]; grid: boolean }
const parse = (rows: string[][]): Row[] => {
  const out: Row[] = []
  let section: string | null = null
  for (const r of rows) {
    const a = (r[0] ?? "").trim()
    if (!a) continue
    if (a === "Enslaved (characteristics)") { section = a; continue }
    if (!a.endsWith(":") && !(r[1] ?? "").trim()) { section = a; continue }
    if (!a.endsWith(":")) { out.push({ section, label: a, alts: [], grid: true }); continue }
    // column C holds sparse-date components and wins over column B's legacy code
    const alts = [...(r[2] ?? "").split(/\s*-\s*/), (r[1] ?? "").trim()].map((x) => x.trim()).filter(Boolean)
    out.push({ section, label: a.replace(/:$/, ""), alts, grid: false })
  }
  return out
}
const long = parse(sheet(1))
const shortKeys = new Set(parse(sheet(2)).map((r) => r.alts.join("|") || r.label))

const propsByField = new Map<string, { schema: string; label: string; accessLevel: number | null }>()
const propsByLabel = new Map<string, { schema: string; backingField: string; accessLevel: number | null }>()
// The label join must not reach the read-only lookup schemas: "Rig of vessel"
// is both a VoyageShip property and the RigOfVessel schema's own name field.
const OWNED = new Set([
  "Voyage", "VoyageShip", "VoyageCrew", "VoyageOutcome",
  "VoyageItinerary", "VoyageDates", "VoyageSlaveNumbers"
])
for (const s of AllSchemas)
  for (const p of s.properties as any[]) {
    if (!p.backingField || p.kind === "table") continue
    const k = p.backingField.replace(/_id$/, "")
    if (!propsByField.has(k)) propsByField.set(k, { schema: s.name, label: p.label, accessLevel: p.accessLevel ?? null })
    if (OWNED.has(s.name) && !propsByLabel.has(p.label))
      propsByLabel.set(p.label, { schema: s.name, backingField: p.backingField, accessLevel: p.accessLevel ?? null })
  }

const entries: any[] = []
const unresolved: string[] = []
for (const r of long) {
  if (r.grid) continue
  const level = shortKeys.has(r.alts.join("|") || r.label) ? 0 : 2
  let hit: { schema: string; backingField: string } | null = null
  for (const m of r.alts) {
    const field = mnem.get(m)
    const p = field && propsByField.get(field)
    if (p) { hit = { schema: p.schema, backingField: field }; break }
  }
  if (!hit) {
    const p = propsByLabel.get(r.label)
    if (p) hit = { schema: p.schema, backingField: p.backingField.replace(/_id$/, "") }
  }
  if (!hit) { unresolved.push(`${r.section}: ${r.label}`); continue }
  entries.push({ section: r.section, label: r.label, schema: hit.schema, backingField: hit.backingField, level })
}

// Sheet order is part of the spec, so entries stay in the order the workbook
// lists them rather than being sorted.
mkdirSync("tests/data", { recursive: true })
writeFileSync("tests/data/contributeFormLevels.json", JSON.stringify({ entries }, null, 2) + "\n")
console.log(`  wrote ${entries.length} entries`)
console.log("  unresolved (expected — no property exists for these):")
unresolved.forEach((u) => console.log(`    ${u}`))
