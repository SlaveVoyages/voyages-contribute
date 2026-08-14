import { Request, Response, NextFunction } from "express"
import { ContributionStatus } from "../models/contribution"

/**
 * Authorization helpers for routes that require elevated privileges.
 *
 * `requireEditor` runs AFTER `authenticateJWT` and checks that the verified
 * Supabase token carries an "Editor" role in `app_metadata`. We deliberately
 * do not consult `user_metadata` — it is self-editable by the end user and
 * therefore not a trust boundary.
 */

const EDITOR_ROLE = "Editor"

interface SupabaseAppMetadata {
  role?: unknown
  roles?: unknown
}

export const hasEditorRole = (
  appMetadata: SupabaseAppMetadata | undefined | null
): boolean => {
  if (!appMetadata) {
    return false
  }
  if (appMetadata.role === EDITOR_ROLE) {
    return true
  }
  if (
    Array.isArray(appMetadata.roles) &&
    appMetadata.roles.includes(EDITOR_ROLE)
  ) {
    return true
  }
  return false
}

/**
 * The identity inside a recorded author, which is what authorization compares.
 *
 * An author reads `Name <address>`, where the address is the part a token
 * verified and the name is only there to be read. It has to close the string,
 * so a display name containing brackets cannot pass itself off as the address
 * — and so this agrees with the SQL that filters on the same rule, which can
 * only anchor at the end. An account with no name to show records the bare
 * address, which is taken whole.
 *
 * What is recorded is taken as it stands, never case-folded. An address is
 * lowered once, where the token is read, so every author this code writes
 * already holds the form it will be compared against, and this comparison and
 * the SQL one agree on all of them.
 *
 * They would not agree on an address stored in some other case: SQL folds by
 * collation — sqlite's LIKE is ASCII-insensitive, MySQL's depends on the
 * column — and JavaScript folds by Unicode, so no spelling of this reconciles
 * them for every input. Nothing writes such a row today. Making that
 * structural rather than incidental means an identity column of its own,
 * which is also what the queries want in order to be indexable.
 */
export const AUTHOR_IDENTITY_PATTERN = /<([^<>]*)>$/

export const authorIdentity = (author: string): string => {
  const match = AUTHOR_IDENTITY_PATTERN.exec(author)
  return (match ? match[1] : author).trim()
}

export type StatusChangeVerdict =
  | { kind: "apply" }
  | { kind: "noop" }
  | { kind: "refuse"; status: number; error: string; details?: string }

/**
 * Whether a request may move a contribution from one status to another.
 *
 * Stated in one place because the parts interact: who is asking, where the
 * contribution stands, where it is going, and whether a comment came with it.
 * As a sequence of guards their order silently becomes part of the rule —
 * checking status before authorship tells a stranger whether a contribution
 * has been decided, and answering a repeat before either tells them what it
 * contains.
 */
export const decideStatusChange = ({
  isEditor,
  isAuthor,
  from,
  to,
  commentSupplied
}: {
  isEditor: boolean
  isAuthor: boolean
  from: ContributionStatus
  to: ContributionStatus
  commentSupplied: boolean
}): StatusChangeVerdict => {
  // Entitlement comes first, so nothing about a contribution is reported to
  // someone with no claim on it — not even that a request would have changed
  // nothing.
  if (!isEditor && !isAuthor) {
    return {
      kind: "refuse",
      status: 403,
      error: "You cannot change contributions made by others"
    }
  }

  // The comment records an editor's reasoning for a decision.
  if (!isEditor && commentSupplied) {
    return {
      kind: "refuse",
      status: 403,
      error: "Editor role required",
      details: "Only an editor can record decision comments."
    }
  }

  // Asking for the status it already has, with nothing else to say. A client
  // whose response was lost retries and is answered rather than refused.
  if (from === to && !commentSupplied) {
    return { kind: "noop" }
  }

  if (isEditor) {
    return { kind: "apply" }
  }

  // An author may submit their own draft, and nothing else. A decided
  // contribution is not a draft — a published one has already been applied
  // upstream, and a rejected one can no longer be edited, so resubmitting it
  // could only return the same content to the queue.
  if (to !== ContributionStatus.Submitted) {
    return {
      kind: "refuse",
      status: 403,
      error: "Editor role required",
      details: "Only an editor can accept, reject or publish a contribution."
    }
  }
  if (from !== ContributionStatus.WorkInProgress) {
    return {
      kind: "refuse",
      status: 403,
      error: "Editor role required",
      details:
        "Only an editor can change the status of a contribution that has already been decided."
    }
  }
  return { kind: "apply" }
}

export const requireEditor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as any).user
  if (!user || !hasEditorRole(user.app_metadata)) {
    res.status(403).json({ error: "Editor role required" })
    return
  }
  next()
}
