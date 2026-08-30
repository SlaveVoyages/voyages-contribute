import { combineChanges, EntityChange, EntityRef } from "./changeSets"
import { EntitySchema } from "./entities"
import { MaterializedEntity } from "./materialization"

export interface ChangeSet {
  id: string
  author: string
  title: string
  comments: string
  timestamp: number
  changes: EntityChange[]
}

export interface PublicationBatch {
  id: number
  title: string
  comments: string
  /**
   * The timestamp of the publication batch, if it has been published.
   */
  published: number | null
  /**
   * Who published the batch. Set alongside `published`, and like it, written
   * once — a re-publish must not rewrite who did it the first time.
   */
  publishedBy?: string | null
}

export enum ContributionStatus {
  WorkInProgress = 0,
  Submitted = 1,
  Accepted = 2,
  Rejected = 3,
  Published = 4
}

/**
 * A batch as the listing endpoints (`/batches/:filter`) send it: the row, plus
 * how many contributions it holds and how they are spread across statuses.
 */
export interface BatchWithCounts extends PublicationBatch {
  contributionCount: number
  statusCounts: Partial<Record<ContributionStatus, number>>
}

export interface Review {
  changeSet: ChangeSet
  stackOrder: number
}

export interface ContributionMedia {
  type: "audio" | "image" | "document"
  file: string
  name: string
  comments: string
}

/** 
 * Represents a contribution and the subsequent editorial reviews.
 */
export interface Contribution {
  /**
   * The id for this Contribution in the database.
   */
  id: string
  /**
   * The root entity being modified/updated/deleted.
   */
  root: EntityRef
  /**
   * The original contribution change set.
   */
  changeSet: ChangeSet
  /**
   * The current status of this contribution. Note: only WIP contributions
   * can be deleted. Once a contribution is submitted, it can be rejected,
   * but will remain in the database.
   */
  status: ContributionStatus
  /**
   * The linear sequence of editorial reviews applied to this contribution.
   */
  reviews: Review[]
  /**
   * Media files attached to this contribution, e.g. images, audio, documents.
   */
  media: ContributionMedia[]
  /** Publication batch this contribution is assigned to (null if cleared). */
  batch?: PublicationBatch | null
  /**
   * Comments by the editor regarding the final decision on this Contribution.
   */
  decisionComments?: string
  /**
   * Who last decided this contribution's status, and when.
   *
   * `changeSet.author` records who *wrote* the contribution and each review,
   * which is a different question from who accepted or rejected it — an editor
   * can decide without leaving a review. Without these the UI has no honest
   * answer for a "Reviewer" column.
   *
   * Belongs to the decision, not the row: cleared alongside `decisionComments`
   * whenever the status moves again, so it always names the current status's
   * decider rather than a previous one's.
   */
  decidedBy?: string | null
  /** Epoch milliseconds. */
  decidedAt?: number | null
}

/**
 * The view model of a Contribution, which maps to the UI (View).
 */
export interface ContributionViewModel {
  schema: EntitySchema
  entity: MaterializedEntity
  contribution: Contribution
}

/**
 * Combine all the changes of a contribution, starting with the original and
 * applying all editorial review changes on top in the correct order.
 */
export const combineContributionChanges = (contrib: Contribution) => {
  const sorted = [...contrib.reviews]
  sorted.sort((a, b) => a.stackOrder - b.stackOrder)
  return combineChanges([
    ...contrib.changeSet.changes,
    ...sorted.map((r) => r.changeSet.changes).flat()
  ])
}