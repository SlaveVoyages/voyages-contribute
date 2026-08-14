import { Request, Response, NextFunction } from "express"

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
 * verified and the name is only there to be read. The *last* bracketed group
 * wins, so a display name that contains brackets cannot pass itself off as the
 * address. An author with no brackets is taken whole, which is what the older
 * records hold.
 */
export const authorIdentity = (author: string): string => {
  const match = /<([^<>]*)>[^<>]*$/.exec(author)
  return (match ? match[1] : author).trim().toLowerCase()
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
