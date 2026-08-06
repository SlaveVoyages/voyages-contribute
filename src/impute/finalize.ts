import {
  ALL_OR_NOTHING_GROUPS,
  NO_ZERO_VARS,
  ImputeEnv
} from "./generated/impute"
import { allOrNothing, pyTruthy } from "./spssRuntime"

/**
 * The recodes the original applies to its locals once the calculation is done,
 * before any value is read out.
 *
 * Hand-written because the original does this by reflecting over `locals()`,
 * which has no faithful mechanical translation. The group membership is still
 * generated, so only the ordering of the two passes is asserted here.
 *
 * Mutates and returns `env`.
 */
export const finalizeEnv = (env: ImputeEnv): ImputeEnv => {
  for (const group of ALL_OR_NOTHING_GROUPS) {
    allOrNothing([...group], env)
  }
  for (const name of NO_ZERO_VARS) {
    if (!pyTruthy(env[name])) {
      env[name] = null
    }
  }
  return env
}
