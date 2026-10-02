import { expect, test } from "vitest"
import {
  readDateParam,
  readSearchParam,
  readVoyageIdParam
} from "../src/backend/listQuery"

test("search: a trimmed string, else nothing", () => {
  expect(readSearchParam("  163648 ")).toBe("163648")
  expect(readSearchParam("")).toBeUndefined()
  expect(readSearchParam("   ")).toBeUndefined()
  expect(readSearchParam(["a", "b"])).toBeUndefined()
  expect(readSearchParam(undefined)).toBeUndefined()
})

test("dates: an ISO string as epoch ms, else nothing", () => {
  expect(readDateParam("2026-08-17T00:00:00.000Z")).toBe(Date.UTC(2026, 7, 17))
  expect(readDateParam("not a date")).toBeUndefined()
  expect(readDateParam("")).toBeUndefined()
  expect(readDateParam(["2026-08-17"])).toBeUndefined()
})

test("voyage_id: a whole number, else nothing", () => {
  expect(readVoyageIdParam(" 1234 ")).toBe("1234")
  expect(readVoyageIdParam("12a4")).toBeUndefined()
  expect(readVoyageIdParam("")).toBeUndefined()
  expect(readVoyageIdParam(["1234"])).toBeUndefined()
})
