import type { DatabaseService } from "./db"

interface PublicationResponse {
  status: number
  body: Record<string, unknown>
}

/** Django commits canonical data first; completion also reconciles our record. */
export const reconcilePublicationResponse = async ({
  status,
  body,
  publicationKey,
  phase,
  publishedBy,
  recordPublication
}: {
  status: number
  body: Record<string, unknown>
  publicationKey: string
  phase: "publish" | "poll"
  publishedBy: string | null
  recordPublication: DatabaseService["recordPublication"]
}): Promise<PublicationResponse> => {
  if (status < 200 || status >= 300 || body.status !== "completed") {
    return { status, body }
  }
  if (
    body.publication_key !== publicationKey ||
    !Array.isArray(body.contribution_ids) ||
    body.contribution_ids.length === 0 ||
    body.contribution_ids.some((id) => typeof id !== "string" || id.length === 0)
  ) {
    return { status: 502, body: { error: "Invalid completed publication receipt" } }
  }
  const batchMatch = /^([1-9][0-9]*)_batch$/.exec(publicationKey)
  const batchId = batchMatch ? Number(batchMatch[1]) : null
  if (batchId !== null && !Number.isSafeInteger(batchId)) {
    return { status: 502, body: { error: "Invalid publication batch ID" } }
  }
  try {
    // The transaction is idempotent, including the original batch date and
    // publisher. A retry after either service restarts must reconcile here,
    // whether completion was observed by submission or by polling.
    await recordPublication(body.contribution_ids, batchId, publishedBy)
    return { status, body }
  } catch {
    // The canonical write already committed; never claim it rolled back or
    // report completion while our records still offer the work to publish.
    // Initial submission must hand the client its durable polling key. Later
    // polls can retry a transient failure without discarding that key.
    const message = "Publication committed; local status reconciliation is pending. Retry polling this publication."
    return phase === "publish"
      ? { status: 202, body: { status: "accepted", publication_key: publicationKey, message } }
      : { status: 503, body: { status: "pending", publication_key: publicationKey, error: message } }
  }
}
