// =============================================
// TEMP DEBUG ROUTE — Will be deleted after debug session
// Receives instrumentation events from the browser
// and appends them to a single NDJSON file.
// DO NOT USE IN PRODUCTION.
// =============================================

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const SESSION_ID = "breed-combobox-empty"
const LOG_FILE = path.join(
  process.cwd(),
  "..",
  ".dbg",
  `trae-debug-log-${SESSION_ID}.ndjson`
)

export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (typeof body.ts !== "number") body.ts = Date.now()
  body.sessionId = SESSION_ID
  if (!body.runId) body.runId = "pre"

  const line = JSON.stringify(body) + "\n"
  try {
    await fs.appendFile(LOG_FILE, line, "utf8")
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `fs error: ${(e as Error).message}` },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
