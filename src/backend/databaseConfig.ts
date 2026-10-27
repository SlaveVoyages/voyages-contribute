import fs from "node:fs"
import type { DataSourceOptions } from "typeorm"

export type MysqlConnectionOptions = Extract<DataSourceOptions, { type: "mysql" | "mariadb" }>

export const mysqlConnectionOptions = (
  env: NodeJS.ProcessEnv = process.env
): MysqlConnectionOptions => {
  const port = Number(env.CONTRIB_DB_PORT ?? "3306")
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("CONTRIB_DB_PORT must be an integer in 1..65535")
  }
  let ca: Buffer | undefined
  if (env.CONTRIB_DB_SSL_CA) {
    try {
      ca = fs.readFileSync(env.CONTRIB_DB_SSL_CA)
    } catch {
      throw new Error("Failed to read CONTRIB_DB_SSL_CA")
    }
  }
  return {
    type: "mysql",
    host: env.CONTRIB_DB_HOST || "localhost",
    port,
    username: env.CONTRIB_DB_USER || "root",
    password: env.CONTRIB_DB_PASSWORD || "",
    database: env.CONTRIB_DB_NAME || "voyages_contribute",
    charset: "utf8mb4",
    ssl: ca ? { ca, rejectUnauthorized: true, verifyIdentity: true }
      : env.CONTRIB_DB_SSL !== "false" ? { rejectUnauthorized: true, verifyIdentity: true } : undefined
  }
}

/** Bootstrap uses the same verified TLS connection, without selecting a schema. */
export const mysqlBootstrapOptions = (
  options: MysqlConnectionOptions
): MysqlConnectionOptions => ({
  type: "mysql",
  host: options.host,
  port: options.port,
  username: options.username,
  password: options.password,
  charset: options.charset,
  ssl: options.ssl,
  logging: false
})
