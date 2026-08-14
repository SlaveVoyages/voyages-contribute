import { expect, test } from "vitest"
import * as fs from "fs"
import { combineContributionChanges } from "../src/models/contribution"
import { sampleContributions } from "./sampleContributions"
import {
  CombinedChangeSet,
  foldCombinedChanges
} from "../src/models/changeSets"

test("combine contributions", () => {
  const contributions = sampleContributions
  const { deletions, updates, conflicts } = foldCombinedChanges(
    contributions.map(
      (c) =>
        ({ ...combineContributionChanges(c), label: c.id }) as CombinedChangeSet
    )
  )
  expect(deletions.length).toBe(0)
  expect(conflicts.length).toBe(0)
  expect(updates.length).toBeGreaterThan(100)
  // Dumped for reading, not asserted on. `output/` is not in the repository,
  // so it exists only where a build has already run — which is why this passed
  // on developer machines and failed on a clean checkout.
  fs.mkdirSync("output", { recursive: true })
  fs.writeFileSync(
    "output/combined.json",
    JSON.stringify({ deletions, updates, conflicts }, null, 2)
  )
})

test("foldCombinedChanges merges identical property overlaps and unions distinct ones", () => {
  const ref = { type: "existing" as const, schema: "TestSchema", id: 1 }
  const a = {
    deletions: [],
    updates: [
      {
        type: "update" as const,
        entityRef: ref,
        changes: [
          { kind: "direct" as const, property: "propA", changed: 1 },
          { kind: "direct" as const, property: "propB", changed: "x" }
        ]
      }
    ]
  }
  const b = {
    deletions: [],
    updates: [
      {
        type: "update" as const,
        entityRef: ref,
        changes: [
          { kind: "direct" as const, property: "propB", changed: "x" }, // identical overlap
          { kind: "direct" as const, property: "propC", changed: true }
        ]
      }
    ]
  }
  const result = foldCombinedChanges([a, b])
  expect(result.conflicts.length).toBe(0)
  expect(result.deletions.length).toBe(0)
  expect(result.updates.length).toBe(1)
  const merged = result.updates[0]
  const props = merged.changes.map((c) => c.property)
  expect(props.length).toBe(3)
  expect(props).toContain("propA")
  expect(props).toContain("propB")
  expect(props).toContain("propC")
  const propBValues = merged.changes.filter((c) => c.property === "propB")
  expect(propBValues.length).toBe(1) // deduped identical overlapping change
})

test("foldCombinedChanges reports conflict on divergent overlapping property change", () => {
  const ref = { type: "existing" as const, schema: "TestSchema", id: 2 }
  const a = {
    deletions: [],
    updates: [
      {
        type: "update" as const,
        entityRef: ref,
        changes: [{ kind: "direct" as const, property: "propX", changed: 10 }]
      }
    ]
  }
  const b = {
    deletions: [],
    updates: [
      {
        type: "update" as const,
        entityRef: ref,
        changes: [
          { kind: "direct" as const, property: "propX", changed: 20 } // conflicting value
        ]
      }
    ]
  }
  const result = foldCombinedChanges([a, b])
  expect(result.updates.length).toBe(1)
  expect(result.conflicts.length).toBe(1)
  const conflict = result.conflicts[0]
  expect(conflict.entityRef).toEqual(ref)
  expect(conflict.incompatible.length).toBe(1)
  expect(conflict.incompatible[0].property).toBe("propX")
  // incompatible array contains the version from the first set (value 10)
  expect(conflict.incompatible[0].changed).toBe(10)
})
