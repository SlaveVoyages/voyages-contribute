import { expect, test, vi } from "vitest"
import { reconcilePublicationResponse } from "../src/backend/publicationResponse"

test("only a successful matching completion can update local publication state", async () => {
  const recordPublication = vi.fn().mockResolvedValue({ updated: 1, stamped: false })
  const base = {
    publicationKey: "fixture_contribution", phase: "poll" as const,
    publishedBy: "editor@example.org", recordPublication
  }
  for (const body of [{ status: "pending" }, { status: "failed" }]) {
    expect(await reconcilePublicationResponse({ ...base, status: 200, body })).toEqual({ status: 200, body })
  }
  const receipt = { status: "completed", publication_key: base.publicationKey, contribution_ids: ["fixture"] }
  expect(await reconcilePublicationResponse({ ...base, status: 503, body: receipt })).toEqual({ status: 503, body: receipt })
  for (const body of [
    { ...receipt, publication_key: "other_contribution" },
    { ...receipt, contribution_ids: [] },
    { ...receipt, contribution_ids: [1] }
  ]) {
    expect((await reconcilePublicationResponse({ ...base, status: 200, body })).status).toBe(502)
  }
  expect(recordPublication).not.toHaveBeenCalled()
  expect(await reconcilePublicationResponse({ ...base, status: 200, body: receipt })).toEqual({ status: 200, body: receipt })
  expect(recordPublication).toHaveBeenCalledWith(["fixture"], null, "editor@example.org")
})
