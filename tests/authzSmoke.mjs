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
const DJANGO_PORT = PORT + 2
const API = `http://127.0.0.1:${PORT}`
const djangoRequests = []
const django = createServer(async (req, res) => {
  let raw = ""
  for await (const chunk of req) raw += chunk.toString()
  const body = raw ? JSON.parse(raw) : undefined
  djangoRequests.push({ path: req.url, authorization: req.headers.authorization, body })
  res.setHeader("content-type", "application/json")
  if (req.url === "/contrib/data") {
    res.end(JSON.stringify(Object.fromEntries(Object.keys(body).map((key) => [key, []]))))
  } else if (req.url === "/contrib/publish_batch") {
    res.statusCode = 202
    res.end(JSON.stringify({ publication_key: body.key, status: "accepted" }))
  } else {
    res.end(JSON.stringify({ status: "pending" }))
  }
}).listen(DJANGO_PORT)

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
    SUPABASE_JWKS_URL: `http://127.0.0.1:${JWKS_PORT}/jwks.json`,
    VOYAGES_SERVER_URL: `http://127.0.0.1:${DJANGO_PORT}`,
    CONTRIB_SERVICE_TOKEN: "smoke-server-only",
    CONTRIB_MEDIA_BUCKET: "",
    CONTRIB_MEDIA_PREFIX: ""
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
  check("liveness succeeds", (await fetch(API + "/health/live")).ok)
  check("readiness verifies the database", (await fetch(API + "/health/ready")).ok)
  check("data lookup reaches Django", (await fetch(API + "/enumerate/Nationality")).ok)
  check("publication polling reaches Django", (await call("POST", "/publish_poll/fixture_contribution", editor, {})).status === 200)

  const created = await call("POST", "/contributions", alice, draft(990001))
  check("an author may write a contribution", created.status === 201, created)
  const id = created.body?.id
  check(
    "the address comes from the token, lowercased, with the name beside it",
    created.body?.changeSet?.authorEmail === "alice@example.org" &&
      created.body?.changeSet?.author === "Alice Silva",
    created.body?.changeSet
  )

  const upload = async (jwt) => {
    const form = new FormData()
    form.set("name", "private fixture")
    form.set("file", new Blob(["private fixture"], { type: "text/plain" }), "../../fixture.txt")
    return fetch(`${API}/contributions/${id}/upload_media`, {
      method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: form
    })
  }
  check("another contributor cannot attach media", (await upload(bob)).status === 403)
  const uploaded = await upload(alice)
  const uploadedBody = await uploaded.json()
  check("the author uploads private media", uploaded.status === 201, uploadedBody)
  const media = uploadedBody.contribution?.media?.[0]
  check("the storage key ignores the submitted filename", /^[a-f0-9-]+\.txt$/.test(media?.file), media)
  check("anonymous media reads are refused", (await fetch(`${API}/media/${media?.id}`)).status === 401)
  check("another contributor cannot read media", (await call("GET", `/media/${media?.id}`, bob)).status === 403)
  const ownMedia = await fetch(`${API}/media/${media?.id}`, { headers: { Authorization: `Bearer ${alice}` } })
  check("the author receives the private bytes", ownMedia.ok && (await ownMedia.text()) === "private fixture")
  check("private reads cannot be cached publicly", ownMedia.headers.get("cache-control") === "private, no-store")

  const second = await call("POST", "/contributions", alice, draft(990002))
  const secondId = second.body?.id

  const tokenless = await call("POST", "/contributions", noAddress, draft(990003))
  check("a token carrying no address writes nothing", tokenless.status === 403, tokenless)
  const tokenlessWip = await call("GET", "/contributions/wip?limit=5", noAddress)
  check(
    "and is told the same when it asks for its own work",
    tokenlessWip.status === 403 &&
      tokenlessWip.body?.details?.includes("address"),
    tokenlessWip
  )

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
  check("the author still reads media after submission", (await call("GET", `/media/${media?.id}`, alice)).status === 200)
  check("another contributor cannot delete media", (await call("DELETE", `/media/${media?.id}`, bob)).status === 403)
  check("an editor can remove media", (await call("DELETE", `/media/${media?.id}`, editor)).status === 204)
  check("deleted media is no longer readable", (await call("GET", `/media/${media?.id}`, alice)).status === 404)
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

  const publicationRoot = { type: "existing", schema: "Voyage", id: "990004" }
  const publishable = await call("POST", "/contributions", editor, {
    root: publicationRoot,
    changeSet: { title: "publication fixture", comments: "fixture", changes: [{
      type: "update", entityRef: publicationRoot,
      changes: [{ kind: "direct", property: "Voyage_dataset", original: 1, changed: 2 }]
    }] }
  })
  check("the publication fixture is created", publishable.status === 201, publishable)
  const accepted = await call("PATCH", `/contributions/${publishable.body?.id}/change_status`, editor, { status: 2 })
  check("the publication fixture is accepted", accepted.status === 200, accepted)
  const published = await call("POST", "/publish", editor, { id: publishable.body?.id, mode: "contribution" })
  check("publication reaches Django", published.status === 202, published)
  for (const path of ["/contrib/data", "/contrib/publish_batch", "/contrib/publication_status/fixture_contribution"]) {
    const requests = djangoRequests.filter((request) => request.path === path)
    check(`${path} uses the server-only credential`, requests.length > 0 && requests.every((request) => request.authorization === "Bearer smoke-server-only"))
  }
} catch (error) {
  check("the run completed", false, String(error))
} finally {
  server.kill()
  jwks.close()
  django.close()
}

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length > 0) {
  console.log("server log tail:\n" + log.slice(-2000))
  process.exit(1)
}
