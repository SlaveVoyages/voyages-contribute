/**
 * Free-text search from a list query. Empty or repeated (array) values are
 * ignored rather than refused: an empty box just means "no search".
 */
export const readSearchParam = (raw: unknown): string | undefined =>
  typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined

/**
 * A date bound from a list query, as epoch ms. ISO strings from the panel,
 * parsed defensively so a bad value is ignored.
 */
export const readDateParam = (raw: unknown): number | undefined => {
  if (typeof raw !== "string" || raw.length === 0) {
    return undefined
  }
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : undefined
}
