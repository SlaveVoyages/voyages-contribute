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

test("an editor decides freely, but does not publish by hand", () => {
  for (const from of EVERY_STATUS) {
    for (const to of EVERY_STATUS) {
      // Published is the one status no role can move a contribution into:
      // publishing is what puts it there, and saying so directly would assert
      // a publication that never happened.
      const expected =
        from === to ? "noop" : to === Published ? "refuse" : "apply"
      expect(decide("editor", from, to).kind).toBe(expected)
    }
  }
  // A comment on the status it already has is a correction to that comment,
  // and that holds for a published contribution as much as an accepted one.
  expect(decide("editor", Accepted, Accepted, true).kind).toBe("apply")
  expect(decide("editor", Published, Published, true).kind).toBe("apply")
})

test("an author may submit their own draft, and nothing else", () => {
  expect(decide("author", WorkInProgress, Submitted).kind).toBe("apply")

  // Not onwards from a draft to a decision.
  for (const to of [Accepted, Rejected]) {
    expect(decide("author", WorkInProgress, to)).toMatchObject({
      kind: "refuse",
      status: 403,
      details: "Only an editor can accept or reject a contribution."
    })
  }
  // Publication is refused ahead of the role, because no role has it.
  expect(decide("author", WorkInProgress, Published)).toMatchObject({
    kind: "refuse",
    status: 400,
    error: "A contribution cannot be moved to Published"
  })

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
