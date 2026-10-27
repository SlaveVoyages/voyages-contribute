import { expect, test } from "vitest"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { mysqlBootstrapOptions, mysqlConnectionOptions } from "../src/backend/databaseConfig"
import { serviceAuthorization, validateServingConfig } from "../src/backend/runtimeConfig"

test("the schema bootstrap retains the application's CA and peer verification", () => {
  const directory = mkdtempSync(join(tmpdir(), "contrib-tls-"))
  try {
    const ca = join(directory, "ca.pem")
    writeFileSync(ca, "test CA")
    const options = mysqlConnectionOptions({
      CONTRIB_DB_HOST: "candidate.example.test",
      CONTRIB_DB_PORT: "3307",
      CONTRIB_DB_USER: "migrator",
      CONTRIB_DB_PASSWORD: "fixture-password",
      CONTRIB_DB_NAME: "candidate_contribute",
      CONTRIB_DB_SSL_CA: ca
    })
    const bootstrap = mysqlBootstrapOptions(options)
    expect(bootstrap).toMatchObject({
      host: "candidate.example.test", port: 3307, username: "migrator",
      password: "fixture-password", ssl: { ca: Buffer.from("test CA"), rejectUnauthorized: true }
    })
    expect(bootstrap.database).toBeUndefined()
    expect(bootstrap.ssl).toBe(options.ssl)
    expect(mysqlConnectionOptions({}).ssl).toEqual({ rejectUnauthorized: true })
    expect(() => mysqlConnectionOptions({ CONTRIB_DB_SSL_CA: join(directory, "absent") })).toThrow("CONTRIB_DB_SSL_CA")
    expect(() => mysqlConnectionOptions({ CONTRIB_DB_PORT: "NaN" })).toThrow("CONTRIB_DB_PORT")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("production refuses missing or unsafe auth configuration without printing secrets", () => {
  const valid = {
    NODE_ENV: "production",
    SUPABASE_URL: "https://candidate-auth.example.test",
    VOYAGES_SERVER_URL: "http://voyages-api-a:8000",
    CONTRIB_SERVICE_TOKEN: "server-only-fixture"
  }
  expect(() => validateServingConfig(valid)).not.toThrow()
  expect(() => validateServingConfig({ ...valid, CONTRIB_SERVICE_TOKEN: undefined })).toThrow("CONTRIB_SERVICE_TOKEN")
  expect(() => validateServingConfig({ ...valid, SUPABASE_URL: "" })).toThrow("SUPABASE_URL")
  expect(() => validateServingConfig({ ...valid, SUPABASE_JWKS_URL: "http://auth.test/jwks" })).toThrow("HTTPS")
  expect(() => validateServingConfig({ ...valid, VOYAGES_SERVER_URL: "http://secret:password@api.test" })).toThrow("without credentials")
  expect(() => serviceAuthorization("secret\r\nInjected: yes")).toThrow("raw bearer token")
  expect(serviceAuthorization(valid.CONTRIB_SERVICE_TOKEN)).toBe("Bearer server-only-fixture")
})
