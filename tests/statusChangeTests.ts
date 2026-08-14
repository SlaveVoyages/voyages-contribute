import { expect, test } from "vitest"
import { decideStatusChange } from "../src/backend/authz"
import { ContributionStatus } from "../src/models/contribution"

/**
 * Who may move a contribution, as a table.
 *
 * The rule reads on four things at once — role, where the contribution is,
 * where it is going, and whether a comment came along — so it is checked the
 * same way, over the whole grid rather than one path at a time. Written as
 * successive guards, the order of the checks silently became part of the rule
 * and leaked what it was meant to protect.
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

const decide = (
  who: "editor" | "author" | "stranger",
  from: ContributionStatus,
  to: ContributionStatus,
  commentSupplied = false
) =>
  decideStatusChange({
    isEditor: who === "editor",
    isAuthor: who === "author",
    from,
    to,
    commentSupplied
  })

test("a stranger learns nothing, whatever they ask", () => {
  // Including where the answer would have been "nothing to do": a refusal
  // that varies with the contribution's state is an oracle over it.
  for (const from of EVERY_STATUS) {
    for (const to of EVERY_STATUS) {
      for (const commentSupplied of [false, true]) {
        expect(decide("stranger", from, to, commentSupplied)).toEqual({
          kind: "refuse",
          status: 403,
          error: "You cannot change contributions made by others"
        })
      }
    }
  }
})

test("an editor decides freely, and a repeat changes nothing", () => {
  for (const from of EVERY_STATUS) {
    for (const to of EVERY_STATUS) {
      const verdict = decide("editor", from, to)
      expect(verdict.kind).toBe(from === to ? "noop" : "apply")
    }
  }
  // A comment on the status it already has is a correction to that comment.
  expect(decide("editor", Accepted, Accepted, true).kind).toBe("apply")
})

test("an author may submit their own draft, and nothing else", () => {
  expect(decide("author", WorkInProgress, Submitted).kind).toBe("apply")

  // Not onwards from a draft to a decision.
  for (const to of [Accepted, Rejected, Published]) {
    expect(decide("author", WorkInProgress, to)).toMatchObject({
      kind: "refuse",
      status: 403,
      details: "Only an editor can accept, reject or publish a contribution."
    })
  }

  // Not backwards out of a decision. A published contribution has already
  // been applied upstream, and a rejected one cannot be edited first, so
  // resubmitting would only return the same content to the queue.
  for (const from of [Submitted, Accepted, Rejected, Published]) {
    const verdict = decide("author", from, Submitted)
    expect(verdict.kind).toBe(from === Submitted ? "noop" : "refuse")
  }

  // And never a decision comment, which records an editor's reasoning.
  expect(decide("author", WorkInProgress, Submitted, true)).toMatchObject({
    kind: "refuse",
    status: 403,
    details: "Only an editor can record decision comments."
  })
})

test("a repeat is answered rather than refused", () => {
  // A client whose response was lost retries the submission that went
  // through; telling it that it lacks permission reports a failure for
  // something that succeeded.
  expect(decide("author", Submitted, Submitted).kind).toBe("noop")
  expect(decide("editor", Published, Published).kind).toBe("noop")
})
