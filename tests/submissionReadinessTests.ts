import { expect, test } from "vitest"
import {
  checkSubmissionReadiness,
  submissionIsChecked
} from "../src/backend/submissionReadiness"
import { Contribution, ContributionStatus } from "../src/models/contribution"
import { sampleContributions } from "./sampleContributions"

/**
 * What a contribution has to say before it can leave the draft state.
 *
 * The check is publication's own fold, moved earlier. Two things matter here
 * and neither is about the fold: that a contribution which cannot publish is
 * stopped while its author can still fix it, and that reopening a decided one
 * is not stopped by the very thing it exists to let someone repair.
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

/** The same contribution with one mandatory property never set. */
const missingDataset: Contribution = {
  ...complete,
  changeSet: {
    ...complete.changeSet,
    changes: complete.changeSet.changes.map((change) =>
      change.type === "update"
        ? {
            ...change,
            changes: change.changes.filter(
              (c) => (c as any).property !== "Voyage_dataset"
            )
          }
        : change
    )
  }
}

test("the fixtures are what the tests below assume", () => {
  // If a schema change makes the complete sample invalid, or makes Dataset
  // optional, every assertion below still passes while testing nothing.
  expect(checkSubmissionReadiness(complete, Submitted)).toBeNull()
  expect(checkSubmissionReadiness(missingDataset, Submitted)).not.toBeNull()
})

test("a draft missing a required value cannot be submitted", () => {
  const refusal = checkSubmissionReadiness(missingDataset, Submitted)!
  expect(refusal.validation.filter((v) => v.kind === "error")).toHaveLength(1)
  expect(refusal.validation[0].message).toContain("Dataset")
  expect(refusal.error).toBe(
    "This contribution has 1 required value still to fill in."
  )
})

test("every issue names the contribution it came from", () => {
  // The client groups by tag to say which contribution to open. Untagged, the
  // report is a list of entity refs, which is not somewhere anyone can go.
  const refusal = checkSubmissionReadiness(missingDataset, Submitted)!
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
  }
})

test("only leaving a draft for the submitted queue is checked", () => {
  for (const from of EVERY_STATUS) {
    for (const to of EVERY_STATUS) {
      expect(submissionIsChecked(from, to)).toBe(
        from === WorkInProgress && to === Submitted
      )
      // Nothing else folds, so an invalid contribution moves as it always did.
      // An editor accepting one is refused at publication, as before.
      if (!(from === WorkInProgress && to === Submitted)) {
        expect(
          checkSubmissionReadiness({ ...missingDataset, status: from }, to)
        ).toBeNull()
      }
    }
  }
})

test("saving a draft is untouched, so partial work still stores", () => {
  expect(checkSubmissionReadiness(missingDataset, WorkInProgress)).toBeNull()
})
