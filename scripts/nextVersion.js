/**
 * Works out the version to publish.
 *
 * `package.json` carries the major and minor and leaves the patch at zero.
 * The patch belongs to the registry: it is one past the highest already
 * published in that series, so every merge to main ships without anyone
 * editing a version, and raising the minor starts the new series at zero.
 *
 * Usage: node scripts/nextVersion.js <series> [publishedJson]
 *   series         the version in package.json, which must be x.y.0
 *   publishedJson  what `npm view <name> versions --json` printed. A package
 *                  with no releases yet prints nothing, which is not an error.
 */

/** Splits x.y.0 into its series, refusing anything that carries a patch. */
export const readSeries = (version) => {
  const match = /^([0-9]+)\.([0-9]+)\.0$/.exec(String(version).trim())
  if (!match) {
    throw new Error(
      `package.json version must be x.y.0 — the registry owns the patch. Found "${version}".`
    )
  }
  return `${match[1]}.${match[2]}`
}

/**
 * Everything already published in this series, as patch numbers. Compared as
 * numbers rather than text, or 0.6.10 would look older than 0.6.9. A version
 * carrying anything beyond digits — a prerelease, say — is not in the series.
 */
const patchesIn = (series, published) => {
  const prefix = `${series}.`
  return published
    .filter((version) => typeof version === "string")
    .filter((version) => version.startsWith(prefix))
    .map((version) => version.slice(prefix.length))
    .filter((patch) => /^[0-9]+$/.test(patch))
    .map(Number)
}

export const nextVersion = (version, publishedJson) => {
  const series = readSeries(version)

  let published = []
  try {
    const parsed = JSON.parse(publishedJson)
    // One published version prints as a bare string rather than an array.
    published = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // No output, or output that is not JSON, means nothing to compare against.
  }

  const patches = patchesIn(series, published)
  return `${series}.${patches.length ? Math.max(...patches) + 1 : 0}`
}

const isMain =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))

if (isMain) {
  try {
    process.stdout.write(nextVersion(process.argv[2], process.argv[3] ?? ""))
  } catch (error) {
    // The reason, not a stack trace: this runs in a workflow log, where the
    // message is the whole diagnosis.
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  }
}
