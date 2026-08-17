import {
  foldCombinedChanges,
  UpdateConflict,
  ValidationResult
} from "../models/changeSets"
import {
  combineContributionChanges,
  Contribution,
  ContributionStatus
} from "../models/contribution"

/**
 * Whether a contribution is fit to leave the draft state.
 *
 * The check itself is publication's — `foldCombinedChanges` reports a mandatory
 * property with no non-null change against it. It ran only at publication,
 * which is far too late to act on: by then the contribution has been Accepted
 * and is read-only, so a batch held back by a missing required value has nobody
 * who can fix it. Running the same fold here reports it while the contributor
 * still owns an editable draft, and reports the same thing, because it is the
 * same fold rather than a second opinion about what publication will take.
 */

export interface SubmissionRefusal {
  conflicts: UpdateConflict[]
  validation: ValidationResult[]
  error: string
  details: string
}

/**
 * Which status changes are checked.
 *
 * Only leaving WorkInProgress. Submitting asserts the work is ready to be
 * reviewed, so that is the claim worth testing. An editor reopening a decided
 * contribution also moves it to Submitted, and that move exists precisely to
 * get an invalid contribution back to where it can be repaired — checking it
 * would shut the door it opens. Nothing else changes what the contribution
 * says, so nothing else is worth folding.
 */
export const submissionIsChecked = (
  from: ContributionStatus,
  to: ContributionStatus
): boolean =>
  to === ContributionStatus.Submitted &&
  from === ContributionStatus.WorkInProgress

const countOf = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`

/**
 * `null` when the move may proceed — either because it is not one that is
 * checked, or because the contribution passes.
 */
export const checkSubmissionReadiness = (
  contribution: Contribution,
  to: ContributionStatus
): SubmissionRefusal | null => {
  if (!submissionIsChecked(contribution.status, to)) {
    return null
  }
  const { conflicts, validation } = foldCombinedChanges([
    {
      ...combineContributionChanges(contribution),
      // Tags every issue with the contribution it came from, which is how the
      // client groups them. There is only one here, but the client then reads
      // the same shape publication gives it.
      label: String(contribution.id)
    }
  ])
  const errors = validation.filter((v) => v.kind === "error")
  if (errors.length === 0 && conflicts.length === 0) {
    return null
  }
  const parts = [
    errors.length > 0 &&
      `${countOf(errors.length, "required value", "required values")} still to fill in`,
    conflicts.length > 0 &&
      countOf(conflicts.length, "conflicting value", "conflicting values")
  ].filter(Boolean)
  return {
    conflicts,
    validation,
    error: `This contribution has ${parts.join(" and ")}.`,
    details:
      "Fill these in and submit again. Nothing was submitted, so the contribution is still yours to edit."
  }
}
