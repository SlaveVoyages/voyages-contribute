import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"

// Set up __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a require function
const require = createRequire(import.meta.url)

// Read the original package.json
const pkg = require("../package.json")

// Create a minimal version for distribution
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: "./index.js",
  types: "./index.d.ts",
  author: pkg.author,
  license: pkg.license,
  repository: pkg.repository,
  keywords: pkg.keywords,
  dependencies: pkg.libDependencies,
  // Carried onto the artifact so it names the registry it belongs to, rather
  // than depending on whichever npmrc happens to be in scope where it is
  // published from.
  publishConfig: pkg.publishConfig
}

// Make sure the destination directory exists
const distDir = path.join(__dirname, "../output/frontend")
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// Write the minimal package.json to the dist directory
fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify(distPkg, null, 2)
)

console.log("Generated minimal package.json in output/frontend")
