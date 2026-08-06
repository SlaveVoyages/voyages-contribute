/**
 * Python/SPSS semantics that the transpiled impute code depends on.
 *
 * Hand-written rather than generated: these are the few places where a direct
 * transliteration of the source would be wrong, so they are worth reading
 * closely. Everything else in `generated/` is a mechanical rewrite.
 */

/** An impute value: Python numbers are floats, and `None` is pervasive. */
export type PyNum = number | null

/** An input field that stood for a Django model instance carrying a code. */
export interface CodedValue {
  value: PyNum
}

/**
 * Python truthiness. `0` and `None` are both falsy, so `x != null` is not a
 * substitute. Total and idempotent over booleans so the transpiler can wrap
 * every operand of `not`/`and`/`or` unconditionally, with no judgement.
 */
export const pyTruthy = (x: unknown): boolean => {
  if (x === null || x === undefined || x === false) {
    return false
  }
  if (typeof x === "number") {
    return x !== 0
  }
  if (typeof x === "string") {
    return x.length > 0
  }
  if (Array.isArray(x)) {
    return x.length > 0
  }
  return true
}

/**
 * Ordering with `None` below every number, emulating Python 2 comparisons.
 * `safeGe(null, null)` is true; the other three derive from this one.
 */
export const safeGe = (a: PyNum, b: PyNum): boolean => {
  if (a === null) {
    return b === null
  }
  return b === null || a >= b
}

export const safeLe = (a: PyNum, b: PyNum): boolean => safeGe(b, a)

export const safeLt = (a: PyNum, b: PyNum): boolean => !safeGe(a, b)

export const safeGt = (a: PyNum, b: PyNum): boolean => safeLt(b, a)

/**
 * SPSS equality. A comparison involving a missing value is itself false, so a
 * statement guarded by one never executes — which is why the SPSS source needs
 * no null guards. Python's `None == None` is instead True, and `None != 2` is
 * True, so a direct transliteration fires where the original would not (and can
 * reach arithmetic with a missing operand). These restore the original meaning.
 */
export const eq = (a: PyNum, b: PyNum): boolean =>
  a !== null && b !== null && a === b

export const ne = (a: PyNum, b: PyNum): boolean =>
  a !== null && b !== null && a !== b

/** Python `%`: the result takes the sign of the divisor. */
export const pyMod = (a: number, b: number): number => ((a % b) + b) % b

/** Python `//`: floor division, not truncation. */
export const floorDiv = (a: number, b: number): number => Math.floor(a / b)

/**
 * Python 3 `round`: half-to-even, so `round(0.5) === 0` and `round(2.5) === 2`.
 * `Math.round` rounds half away from zero and would differ on every .5.
 */
export const pyRound = (x: number): number => {
  const floor = Math.floor(x)
  const frac = x - floor
  if (frac > 0.5) {
    return floor + 1
  }
  if (frac < 0.5) {
    return floor
  }
  return pyMod(floor, 2) === 0 ? floor : floor + 1
}

/** Python `int()` on a value that may not be numeric; throws as Python does. */
export const pyInt = (x: unknown): number => {
  if (typeof x === "number") {
    return Math.trunc(x)
  }
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x)
    if (!Number.isNaN(n)) {
      return Math.trunc(n)
    }
  }
  throw new TypeError(`int() argument is not numeric: ${JSON.stringify(x)}`)
}

export const pyRange = (start: number, stop: number): number[] => {
  const out: number[] = []
  for (let i = start; i < stop; ++i) {
    out.push(i)
  }
  return out
}

export const clearMod = (x: PyNum, mod: number): PyNum =>
  x !== null ? x - pyMod(x, mod) : null

export const regionValue = (x: PyNum): PyNum => clearMod(x, 100)

export const broadValue = (x: PyNum): PyNum =>
  safeLe(x, 80000) ? clearMod(x, 10000) : 80000

/**
 * Recode groups of values. Kept as ordered pairs rather than an object because
 * JS object keys that look like integers iterate in ascending numeric order,
 * which would silently reorder the groups.
 */
export const recodeVar = (
  groups: [number, number[]][],
  value: PyNum
): PyNum => {
  for (const [key, list] of groups) {
    if (value !== null && list.includes(value)) {
      return key
    }
  }
  return null
}

export const threshold = (value: PyNum, min: PyNum): PyNum =>
  value !== null && safeLt(value, min) ? null : value

export const yearMod = (theYear: PyNum, mod: number, start: number): PyNum =>
  theYear === null ? null : 1 + floorDiv(theYear - start - 1, mod)

export const firstValid = (list: PyNum[]): PyNum => {
  for (const x of list) {
    if (x !== null) {
      return x
    }
  }
  return null
}

export const getObjValue = (obj: CodedValue | null | undefined): PyNum =>
  obj ? obj.value : null

/**
 * A date held as the `"MM,DD,YYYY"` string the interim voyage used. The
 * impute code's date handling is defined on this shape, so the adapter that reads a
 * materialized entity is responsible for producing it.
 */
export type CsvDate = string | null | undefined

export const extractYear = (csvDate: CsvDate): PyNum => {
  if (!pyTruthy(csvDate)) {
    return null
  }
  const split = (csvDate as string).split(",")
  if (split.length !== 3 || split[2].length !== 4) {
    return null
  }
  return pyInt(split[2])
}

/** Epoch day, so that a difference is an exact whole number of days. */
const extractEpochDay = (csvDate: CsvDate): number | null => {
  if (!pyTruthy(csvDate)) {
    return null
  }
  const split = (csvDate as string).split(",")
  if (
    split.length !== 3 ||
    split[2].length !== 4 ||
    split[1].length === 0 ||
    split[0].length === 0
  ) {
    return null
  }
  const year = pyInt(split[2])
  const month = pyInt(split[0])
  const day = pyInt(split[1])
  // Python's datetime() rejects out-of-range components rather than rolling
  // over, and the impute code has no handler for that.
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`invalid date: ${csvDate}`)
  }
  const utc = Date.UTC(year, month - 1, day)
  if (new Date(utc).getUTCDate() !== day) {
    throw new RangeError(`day is out of range for month: ${csvDate}`)
  }
  return utc / 86400000
}

export const dateDiff = (one: CsvDate, two: CsvDate): PyNum => {
  const first = extractEpochDay(one)
  const second = extractEpochDay(two)
  if (first === null || second === null) {
    return null
  }
  return first - second
}

/**
 * If any of the named entries is truthy, replace the falsy ones with zero;
 * otherwise clear them all. Mutates, as the original does.
 */
export const allOrNothing = (
  varNames: string[],
  values: Record<string, PyNum>
) => {
  const anyTruthy = varNames.some((k) => pyTruthy(values[k]))
  for (const k of varNames) {
    if (anyTruthy) {
      if (!pyTruthy(values[k])) {
        values[k] = 0
      }
    } else {
      values[k] = null
    }
  }
}

/** Python `dict.get(key, default)`. */
export const dictGet = <T>(
  d: { get(key: string): T | undefined } | Record<string, T>,
  key: string,
  fallback: T | null = null
): T | null => {
  const v =
    typeof (d as { get?: unknown }).get === "function"
      ? (d as { get(k: string): T | undefined }).get(key)
      : (d as Record<string, T>)[key]
  return v === undefined ? fallback : v
}

export const listRemove = <T>(list: T[], item: T) => {
  const i = list.indexOf(item)
  if (i < 0) {
    throw new Error(`list.remove(x): x not in list: ${String(item)}`)
  }
  list.splice(i, 1)
}
