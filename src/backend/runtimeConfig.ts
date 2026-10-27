/** The Django credential is server-only and is never a browser API token. */
export const serviceAuthorization = (token: string | undefined): string => {
  if (!token) return ""
  if (!/^[A-Za-z0-9._~+/-]+=*$/.test(token)) {
    throw new Error("CONTRIB_SERVICE_TOKEN must be a raw bearer token")
  }
  return `Bearer ${token}`
}

const absoluteUrl = (value: string, name: string, httpsOnly = false): void => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute URL`)
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (httpsOnly && url.protocol !== "https:") ||
    url.username || url.password
  ) {
    throw new Error(`${name} must be an ${httpsOnly ? "HTTPS" : "HTTP(S)"} URL without credentials`)
  }
}

export const validateServingConfig = (env: NodeJS.ProcessEnv): void => {
  const production = env.NODE_ENV === "production"
  const supabase = env.SUPABASE_URL || ""
  const jwks = env.SUPABASE_JWKS_URL ||
    (supabase ? `${supabase}/auth/v1/.well-known/jwks.json` : "")
  if (production && (!supabase || !jwks || !env.CONTRIB_SERVICE_TOKEN)) {
    throw new Error("Production serving requires SUPABASE_URL and CONTRIB_SERVICE_TOKEN")
  }
  if (supabase) absoluteUrl(supabase, "SUPABASE_URL", production)
  if (jwks) absoluteUrl(jwks, "SUPABASE_JWKS_URL", production)
  absoluteUrl(env.VOYAGES_SERVER_URL || "http://127.0.0.1:8000", "VOYAGES_SERVER_URL")
  serviceAuthorization(env.CONTRIB_SERVICE_TOKEN)
}
