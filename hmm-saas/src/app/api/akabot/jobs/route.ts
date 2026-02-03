import { NextRequest, NextResponse } from "next/server";
import { startJob, getJobStatus, listJobs, isMockMode } from "@/lib/akabot-client";

/**
 * GET /api/akabot/jobs
 *   ?jobId=xxx  → 単一ジョブ取得
 *   ?processKey=xxx&status=xxx → 一覧取得
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = await getJobStatus(jobId);
      return NextResponse.json({ ok: true, mock: isMockMode(), job });
    }

    const processKey = searchParams.get("processKey") ?? undefined;
    const status = searchParams.get("status") as
      | "Pending" | "Running" | "Successful" | "Faulted" | "Stopped"
      | undefined;

    const jobs = await listJobs({ processKey, status });
    return NextResponse.json({ ok: true, mock: isMockMode(), jobs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/akabot/jobs
 * Body: { processKey, robotName?, inputArguments? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { processKey, robotName, inputArguments } = body;

    if (!processKey) {
      return NextResponse.json({ ok: false, error: "processKey is required" }, { status: 400 });
    }

    const job = await startJob({ processKey, robotName, inputArguments });
    return NextResponse.json({ ok: true, mock: isMockMode(), job });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
