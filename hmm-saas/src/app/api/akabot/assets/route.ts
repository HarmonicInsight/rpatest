import { NextRequest, NextResponse } from "next/server";
import { setAsset, getAsset, isMockMode } from "@/lib/akabot-client";

/**
 * GET /api/akabot/assets?name=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const asset = await getAsset(name);
    if (!asset) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, mock: isMockMode(), asset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/akabot/assets
 * Body: { name, type, value }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, value } = body;

    if (!name || !value) {
      return NextResponse.json({ ok: false, error: "name and value are required" }, { status: 400 });
    }

    await setAsset({ name, type: type ?? "Text", value });
    return NextResponse.json({ ok: true, mock: isMockMode() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
