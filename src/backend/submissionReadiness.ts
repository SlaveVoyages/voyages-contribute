import {
  foldCombinedChanges,
  UpdateConflict,
  ValidationResult
} from "../models/changeSets"
import { PropertyAccessLevel } from "../models/properties"
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
 * Which status changes are checked, and how much of the fold each one answers
 * for.
 *
 * Two moments, because two different people are being held to the work.
 *
 * Submitting asserts a contributor has finished what is theirs to finish, so it
 * is checked — but only against the properties they could actually reach. A
 * mandatory property marked Editor-only is not one a contributor can supply;
 * holding their submission to it leaves them at a form demanding a value it
 * will not show them, with no way forward.
 *
 * Accepting is the editor saying the contribution is fit to publish, and by
 * then every property has somebody who can reach it. So that is where the whole
 * fold is answered for — and it has to be, because acceptance is the last point
 * at which anyone can still edit it. Publication is too late: an accepted
 * contribution is read-only.
 *
 * An editor reopening a decided contribution moves it to Submitted, and that
 * move exists precisely to get an invalid contribution back to where it can be
 * repaired — checking it would shut the door it opens.
 *
 * A request that leaves the status where it already is answers for nothing: all
 * it carries is a decision comment. Holding one to the fold refuses an editor
 * annotating a contribution accepted long ago, and tells them nothing was
 * accepted when something was.
 */
export const submissionIsChecked = (
  from: ContributionStatus,
  to: ContributionStatus
): boolean =>
  from !== to &&
  ((to === ContributionStatus.Submitted &&
    from === ContributionStatus.WorkInProgress) ||
    to === ContributionStatus.Accepted)

/**
 * The highest access level a contributor can choose on the form. Anything above
 * it is not theirs to fill in.
 */
const CONTRIBUTOR_CEILING = PropertyAccessLevel.AdvancedContributor

/** Only acceptance answers for properties the contributor could not reach. */
const answersForEveryProperty = (to: ContributionStatus): boolean =>
  to === ContributionStatus.Accepted

const isContributorReachable = (v: ValidationResult): boolean =>
  v.accessLevel === undefined || v.accessLevel <= CONTRIBUTOR_CEILING

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
  // What this move answers for. A submission is held to the contributor's own
  // work; an acceptance is held to all of it.
  const answerable = answersForEveryProperty(to)
    ? validation
    : validation.filter(isContributorReachable)
  const errors = answerable.filter((v) => v.kind === "error")
  if (errors.length === 0 && conflicts.length === 0) {
    return null
  }
  const parts = [
    errors.length > 0 &&
      `${countOf(errors.length, "required value", "required values")} still to fill in`,
    conflicts.length > 0 &&
      countOf(conflicts.length, "conflicting value", "conflicting values")
  ].filter(Boolean)
  // Said in terms of what the person in front of it just tried to do. An
  // editor refused at acceptance did not submit anything, and telling them the
  // contribution is "still yours to edit" describes somebody else's record.
  const details = answersForEveryProperty(to)
    ? "Fill these in on the contribution, then accept it again. Nothing was accepted, so it is still open for review."
    : "Fill these in and submit again. Nothing was submitted, so the contribution is still yours to edit."
  return {
    conflicts,
    validation: answerable,
    error: `This contribution has ${parts.join(" and ")}.`,
    details
  }
}
