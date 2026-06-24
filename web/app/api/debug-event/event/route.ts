// DEPRECATED: debug route, no longer used. Will be removed on next dev restart.
import { NextResponse } from "next/server"
export async function POST() {
  return NextResponse.json({ ok: false, deprecated: true }, { status: 410 })
}
