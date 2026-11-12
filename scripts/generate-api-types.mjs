// Generates src/lib/api/schema.ts from the BFB API's OpenAPI document.
//
// Source URL, in order of precedence:
//   1. first CLI argument:     npm run api:types -- https://staging.example.com/openapi.json
//   2. BFB_OPENAPI_URL env var: BFB_OPENAPI_URL=... npm run api:types
//   3. the local API default:  http://127.0.0.1:8000/openapi.json
//
// FastAPI serves the document at the app root, not under /api/v1.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript'

const DEFAULT_OPENAPI_URL = 'http://127.0.0.1:8000/openapi.json'
const source = process.argv[2] ?? process.env.BFB_OPENAPI_URL ?? DEFAULT_OPENAPI_URL
const outputPath = fileURLToPath(new URL('../src/lib/api/schema.ts', import.meta.url))

let ast
try {
  ast = await openapiTS(new URL(source))
} catch (error) {
  console.error(`Could not load the OpenAPI document from ${source}.`)
  console.error('Start the API locally (see README, "API types") or pass another URL.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

await writeFile(outputPath, `${COMMENT_HEADER}${astToString(ast)}`)
console.log(`Wrote ${outputPath} from ${source}`)
