import { NextRequest, NextResponse } from "next/server";
import { runTestCase, isMockMode, type TestResult } from "@/lib/akabot-client";

/**
 * POST /api/test/run
 *
 * ボットのテストケースを一括実行する統合エンドポイント。
 *
 * Body:
 * {
 *   botId: string,
 *   processKey: string,
 *   cases: [
 *     {
 *       caseId: string,
 *       inputData: Record<string, unknown>,
 *       expectedOutput: string
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   mock: boolean,
 *   botId: string,
 *   summary: { total, pass, fail, error },
 *   results: TestResult[]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botId, processKey, cases } = body;

    if (!botId || !processKey || !Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { ok: false, error: "botId, processKey, and cases[] are required" },
        { status: 400 }
      );
    }

    const results: TestResult[] = [];

    // テストケースを順次実行（並列にすると Orchestrator に負荷がかかるため）
    for (const tc of cases) {
      const result = await runTestCase({
        botId,
        caseId: tc.caseId,
        processKey,
        inputData: tc.inputData ?? {},
        expectedOutput: tc.expectedOutput ?? "",
      });
      results.push(result);
    }

    const summary = {
      total: results.length,
      pass: results.filter((r) => r.status === "pass").length,
      fail: results.filter((r) => r.status === "fail").length,
      error: results.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({
      ok: true,
      mock: isMockMode(),
      botId,
      summary,
      results,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
