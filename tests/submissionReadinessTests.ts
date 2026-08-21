import { expect, test } from "vitest"
import {
  checkSubmissionReadiness,
  submissionIsChecked
} from "../src/backend/submissionReadiness"
import { Contribution, ContributionStatus } from "../src/models/contribution"
import { sampleContributions } from "./sampleContributions"

/**
 * What a contribution has to say before it can move on, and who has to say it.
 *
 * The check is publication's own fold, moved earlier — but it is answered for
 * at two different moments, because two different people are being held to the
 * work. A contributor is held to what the form lets them reach. An editor
 * accepting the contribution is held to all of it, acceptance being the last
 * moment anyone can still edit.
 *
 * The schema has exactly one mandatory property of each kind reaching the fold,
 * which is what the tests below turn on:
 *
 *   Voyage.Dataset                        Editor-only  — the editor's to fill
 *   Voyage Source Connection.Source       Beginner     — the contributor's
 */

const { WorkInProgress, Submitted, Accepted, Rejected, Published } =
  ContributionStatus
const EVERY_STATUS = [
  WorkInProgress,
  Submitted,
  Accepted,
  Rejected,
  Published
] as const

const complete: Contribution = {
  ...sampleContributions[0],
  status: WorkInProgress
}

/**
 * The same contribution with one property left empty, wherever it appears.
 *
 * Emptied rather than removed. An owned entity decides whether it exists by
 * counting the changes against it, so dropping its only change takes the whole
 * entity with it — and an entity that is not there has no mandatory property to
 * be missing.
 *
 * Walks the whole tree, because the property may sit several owned entities
 * down: a voyage's sources hang off it, not off its top-level change list.
 */
const emptied =
  (property: string) =>
  (c: Contribution): Contribution => {
    const walk = (node: unknown): unknown => {
      if (Array.isArray(node)) {
        return node.map(walk)
      }
      if (node && typeof node === "object") {
        const o = node as Record<string, unknown>
        const next: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(o)) {
          next[k] = walk(v)
        }
        if (o.property === property && "changed" in o) {
          next.changed = null
        }
        return next
      }
      return node
    }
    return walk(c) as Contribution
  }

/** Missing a value only an editor can supply. */
const missingDataset = emptied("Voyage_dataset")(complete)

/** Missing a value the contributor was in a position to supply. */
const missingSource = emptied("Voyage Source Connection_source_id")(complete)

test("the fixtures are what the tests below assume", () => {
  // If a schema change makes the complete sample invalid, or moves either
  // property to the other side of the contributor ceiling, every assertion
  // below still passes while testing nothing.
  expect(checkSubmissionReadiness(complete, Submitted)).toBeNull()
  expect(checkSubmissionReadiness(complete, Accepted)).toBeNull()
  expect(checkSubmissionReadiness(missingDataset, Accepted)).not.toBeNull()
  expect(checkSubmissionReadiness(missingSource, Submitted)).not.toBeNull()
})

test("a contributor is not held to a value the form will not show them", () => {
  // Dataset is mandatory and Editor-only. Refusing the submission for it left
  // the contributor at a form demanding a value it would not render, with
  // nothing they could do about it.
  expect(checkSubmissionReadiness(missingDataset, Submitted)).toBeNull()
})

test("a contributor is still held to their own work", () => {
  const refusal = checkSubmissionReadiness(missingSource, Submitted)!
  const errors = refusal.validation.filter((v) => v.kind === "error")
  expect(errors.length).toBeGreaterThan(0)
  expect(errors.every((e) => e.message.includes("Source"))).toBe(true)
  expect(refusal.details).toContain("still yours to edit")
})

test("accepting answers for the whole contribution", () => {
  // Including the parts no contributor could have filled in. This is the last
  // moment anyone can edit it: once accepted it is read-only, and publication
  // would refuse it with nobody able to act.
  const refusal = checkSubmissionReadiness(missingDataset, Accepted)!
  const errors = refusal.validation.filter((v) => v.kind === "error")
  expect(errors).toHaveLength(1)
  expect(errors[0].message).toContain("Dataset")
  expect(refusal.error).toBe(
    "This contribution has 1 required value still to fill in."
  )
})

test("a refusal says what was refused, not what someone else did", () => {
  // An editor stopped at acceptance did not submit anything, and being told
  // the contribution is "still yours to edit" describes somebody else's record.
  expect(checkSubmissionReadiness(missingDataset, Accepted)!.details).toContain(
    "still open for review"
  )
  expect(checkSubmissionReadiness(missingSource, Submitted)!.details).toContain(
    "still yours to edit"
  )
})

test("every issue names the contribution it came from", () => {
  // The client groups by tag to say which contribution to open. Untagged, the
  // report is a list of entity refs, which is not somewhere anyone can go.
  const refusal = checkSubmissionReadiness(missingDataset, Accepted)!
  for (const entry of refusal.validation) {
    expect(entry.tag).toBe(missingDataset.id)
  }
})

test("reopening an invalid contribution is not blocked by its own invalidity", () => {
  // This is the whole point of the reopen action: an accepted contribution
  // that cannot publish is read-only, so nobody can fix it. Validating the way
  // back would leave it exactly as stuck as before.
  for (const from of [Accepted, Rejected, Published]) {
    expect(
      checkSubmissionReadiness({ ...missingDataset, status: from }, Submitted)
    ).toBeNull()
    expect(
      checkSubmissionReadiness({ ...missingSource, status: from }, Submitted)
    ).toBeNull()
  }
})

test("leaving a draft, and accepting, are the moves that are checked", () => {
  for (const from of EVERY_STATUS) {
    for (const to of EVERY_STATUS) {
      // A status that does not move answers for nothing -- all such a request
      // carries is a decision comment. An editor annotating a contribution
      // accepted long ago is not accepting it again, and holding them to the
      // fold would tell them nothing was accepted when something was.
      const expected =
        from !== to &&
        ((from === WorkInProgress && to === Submitted) || to === Accepted)
      expect(submissionIsChecked(from, to)).toBe(expected)
      if (!expected) {
        // Nothing else folds, so a contribution moves as it always did.
        expect(
          checkSubmissionReadiness({ ...missingDataset, status: from }, to)
        ).toBeNull()
      }
    }
  }
})

test("rejecting is never blocked by what the contribution is missing", () => {
  // Turning something down does not require it to be complete first.
  for (const from of EVERY_STATUS) {
    expect(
      checkSubmissionReadiness({ ...missingDataset, status: from }, Rejected)
    ).toBeNull()
    expect(
      checkSubmissionReadiness({ ...missingSource, status: from }, Rejected)
    ).toBeNull()
  }
})
