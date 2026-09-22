/**
 * Route-level authorization checks against a running server, which the vitest
 * suite cannot reach: it exercises `DatabaseService`, while who may read or
 * change a contribution is decided in `server.ts` from a verified token.
 *
 * Signs its own tokens and serves the matching JWKS, so no Supabase project is
 * needed. Writes to a temporary sqlite database unless CONTRIB_DB_* say
 * otherwise.
 *
 *   npm run build-server
 *   node tests/authzSmoke.mjs
 *
 * Exits non-zero on the first failed check, and prints the server log tail.
 */
import { createServer } from "http"
import { spawn } from "child_process"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { generateKeyPair, exportJWK, SignJWT } from "jose"

const PORT = Number(process.env.SMOKE_PORT ?? 7231)
const JWKS_PORT = PORT + 1
const API = `http://127.0.0.1:${PORT}`

const { publicKey, privateKey } = await generateKeyPair("RS256")
const jwk = {
  ...(await exportJWK(publicKey)),
  kid: "smoke",
  alg: "RS256",
  use: "sig"
}
const jwks = createServer((_req, res) => {
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify({ keys: [jwk] }))
}).listen(JWKS_PORT)

const token = async (claims) =>
  new SignJWT({ aud: "authenticated", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "smoke" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey)

// Alice's address is mixed case, as a token may present it.
const alice = await token({
  sub: "alice-id",
  email: "Alice@Example.org",
  user_metadata: { firstName: "Alice", lastName: "Silva" }
})
const bob = await token({
  sub: "bob-id",
  email: "bob@example.org",
  user_metadata: { firstName: "Bob" }
})
const editor = await token({
  sub: "ed-id",
  email: "ed@example.org",
  app_metadata: { role: "Editor" }
})
const noAddress = await token({
  sub: "no-address-id",
  user_metadata: { firstName: "Tokenless" }
})

const workspace = mkdtempSync(join(tmpdir(), "contrib-smoke-"))
const server = spawn(process.execPath, ["output/server/server.js"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "test",
    DEV_DISABLE_AUTH: "false",
    MIGRATION_MODE: "on-startup",
    CONTRIB_DB_TYPE: process.env.CONTRIB_DB_TYPE ?? "sqlite",
    CONTRIB_DB_PATH: process.env.CONTRIB_DB_PATH ?? join(workspace, "smoke.db"),
    MEDIA_UPLOAD_FOLDER: join(workspace, "uploads"),
    SUPABASE_URL: "",
    SUPABASE_JWKS_URL: `http://127.0.0.1:${JWKS_PORT}/jwks.json`
  },
  stdio: ["ignore", "pipe", "pipe"]
})
let log = ""
server.stdout.on("data", (chunk) => (log += chunk))
server.stderr.on("data", (chunk) => (log += chunk))

const ready = async () => {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if ((await fetch(API + "/")).ok) {
        return
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error("server did not start:\n" + log.slice(-3000))
}

const call = async (method, path, jwt, body) => {
  const response = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) }
  } catch {
    return { status: response.status, body: text }
  }
}

const checks = []
const check = (name, ok, detail) => {
  checks.push({ name, ok })
  const shown = ok ? "" : "  <- " + String(JSON.stringify(detail) ?? detail).slice(0, 300)
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${shown}`)
}

// The body names an author of its own, which the server must ignore.
const draft = (voyageId) => ({
  root: { type: "new", schema: "Voyage", id: String(voyageId) },
  changeSet: {
    title: "smoke",
    comments: "smoke",
    changes: [],
    author: "spoofed <evil@example.org>"
  }
})

try {
  await ready()

  const created = await call("POST", "/contributions", alice, draft(990001))
  check("an author may write a contribution", created.status === 201, created)
  const id = created.body?.id
  check(
    "the address comes from the token, lowercased, with the name beside it",
    created.body?.changeSet?.authorEmail === "alice@example.org" &&
      created.body?.changeSet?.author === "Alice Silva",
    created.body?.changeSet
  )

  const second = await call("POST", "/contributions", alice, draft(990002))
  const secondId = second.body?.id

  const tokenless = await call("POST", "/contributions", noAddress, draft(990003))
  check("a token carrying no address writes nothing", tokenless.status === 403, tokenless)

  const own = await call("GET", "/contributions?author=alice@example.org&limit=5", alice)
  check(
    "an author lists their own work whole",
    own.status === 200 &&
      own.body?.data?.some((c) => c.id === id && c.changeSet?.title === "smoke"),
    own.body?.data?.[0]
  )

  const mixedCase = await call("GET", "/contributions?author=ALICE@example.org&limit=5", alice)
  check(
    "the address filter reads any case",
    mixedCase.status === 200 && mixedCase.body?.total === own.body?.total,
    mixedCase.body?.total
  )

  const blank = await call("GET", "/contributions?author=%20%20&limit=5", editor)
  check("a blank address filter is refused, not dropped", blank.status === 400, blank)

  const asOther = await call("GET", "/contributions?author=alice@example.org&limit=5", bob)
  check("nobody lists another author's work", asOther.status === 403, asOther)

  const shared = await call(
    "GET",
    "/contributions?root_schema=Voyage&root_id=990001&limit=5",
    bob
  )
  const aliceRow = shared.body?.data?.find((c) => c.id === id)
  check(
    "a row someone else wrote is redacted in the shared list",
    shared.status === 200 && aliceRow !== undefined && aliceRow.changeSet === undefined,
    aliceRow
  )

  check(
    "a contribution is not read whole by another contributor",
    (await call("GET", `/contributions/${id}`, bob)).status === 403
  )
  check(
    "its author reads it whole",
    (await call("GET", `/contributions/${id}`, alice)).status === 200
  )
  check(
    "an editor reads it whole",
    (await call("GET", `/contributions/${id}`, editor)).status === 200
  )

  const wip = await call("GET", "/contributions/wip?limit=5", alice)
  check(
    "the WIP list holds the caller's drafts",
    wip.status === 200 && wip.body?.data?.some((c) => c.id === id),
    wip.status
  )

  check(
    "another contributor cannot delete a draft",
    (await call("DELETE", `/contributions/wip/${secondId}`, bob)).status === 403
  )
  check(
    "another contributor cannot replace a contribution",
    (await call("POST", "/contributions", bob, { id, ...draft(990001) })).status === 403
  )

  const submit = await call("PATCH", `/contributions/${id}/change_status`, alice, {
    status: 1
  })
  check("an author submits their own draft", submit.status === 200, submit)
  const accept = await call("PATCH", `/contributions/${id}/change_status`, alice, {
    status: 2
  })
  check("an author does not accept their own contribution", accept.status === 403, accept)

  const ownDelete = await call("DELETE", `/contributions/wip/${secondId}`, alice)
  check("an author deletes their own draft", ownDelete.status === 204, ownDelete)

  const search = await call("GET", "/contributions?search=alice@example.org&limit=5", bob)
  check(
    "a search does not reach another author's address",
    search.status === 200 && !search.body?.data?.some((c) => c.id === id),
    search.body?.total
  )
  const editorSearch = await call(
    "GET",
    "/contributions?search=alice@example.org&limit=5",
    editor
  )
  check(
    "an editor's search finds a contribution by address",
    editorSearch.status === 200 && editorSearch.body?.data?.some((c) => c.id === id),
    editorSearch.body?.total
  )
} catch (error) {
  check("the run completed", false, String(error))
} finally {
  server.kill()
  jwks.close()
}

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length > 0) {
  console.log("server log tail:\n" + log.slice(-2000))
  process.exit(1)
}
