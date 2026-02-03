"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { DST_STATUS_MAP, Bot } from "@/lib/demo-data";

// --- Types ---
type TestCase = {
  id: string;
  name: string;
  inputData: string;       // 入力データの説明
  inputFile: string;       // 入力ファイル名
  expectedOutput: string;  // 期待される出力
  expectedFile: string;    // 期待結果ファイル名
  actualOutput?: string;   // 実際の出力
  result?: "pass" | "fail" | "skip";
  time?: string;
  diffDetail?: string;     // 差分の詳細
};

type BotTestSuite = {
  botId: string;
  botName: string;
  category: string;        // ボットの業務カテゴリ
  status: "idle" | "running" | "done";
  cases: TestCase[];
  startedAt?: string;
  duration?: string;
};

// --- Deterministic random ---
function srand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// --- ボットごとに異なるテストケースを生成 ---
function generateTestSuite(bot: Bot, idx: number): BotTestSuite {
  const r = (offset: number) => srand(idx * 100 + offset);

  // ボットのパターンと対象システムからカテゴリ推定
  const isSAP = bot.srcSystems.includes("SAP") || bot.bizReq.includes("SAP");
  const isExcel = bot.srcSystems.includes("Excel") || bot.bizReq.includes("Excel");
  const isWeb = bot.srcSystems.includes("Web");
  const isOCR = bot.srcSystems.includes("OCR") || bot.bizReq.includes("OCR");
  const isMail = bot.srcSystems.includes("メール") || bot.bizReq.includes("メール");
  const isDB = bot.bizReq.includes("DB") || bot.funcReq.includes("DB");

  const category = isSAP ? "SAP転記" : isOCR ? "OCR読取" : isExcel ? "Excel処理" : isWeb ? "Web操作" : isMail ? "メール送信" : isDB ? "DB処理" : "その他";

  const cases: TestCase[] = [];
  let caseNum = 1;

  // --- 共通: 初期化テスト ---
  cases.push({
    id: `TC-${caseNum++}`,
    name: "接続・初期化テスト",
    inputData: "接続設定ファイル（認証情報含む）",
    inputFile: `${bot.id}_connection.json`,
    expectedOutput: "接続成功ステータス: OK",
    expectedFile: `${bot.id}_init_expected.json`,
  });

  // --- SAP転記系 ---
  if (isSAP) {
    cases.push({
      id: `TC-${caseNum++}`,
      name: "SAP転記 正常系（単一伝票）",
      inputData: `伝票番号: 4500001234, 勘定科目: 600000, 金額: ¥150,000`,
      inputFile: `${bot.id}_sap_single.xlsx`,
      expectedOutput: `転記結果: 伝票番号 5100001234 が生成、ステータス=正常`,
      expectedFile: `${bot.id}_sap_single_expected.csv`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "SAP転記 正常系（複数伝票バッチ）",
      inputData: `10件の伝票データ（合計 ¥3,250,000）`,
      inputFile: `${bot.id}_sap_batch.xlsx`,
      expectedOutput: `10件すべて転記完了、合計金額一致: ¥3,250,000`,
      expectedFile: `${bot.id}_sap_batch_expected.csv`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "SAP転記 金額不一致検知",
      inputData: `伝票金額: ¥100,000 だが元データは ¥100,001（1円差異）`,
      inputFile: `${bot.id}_sap_mismatch.xlsx`,
      expectedOutput: `差異検知: 金額不一致エラー → 転記中断 → エラーログ出力`,
      expectedFile: `${bot.id}_sap_mismatch_expected.csv`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "SAP接続タイムアウト時の挙動",
      inputData: `タイムアウト設定: 30秒（SAP側で遅延シミュレート）`,
      inputFile: `${bot.id}_sap_timeout.json`,
      expectedOutput: `タイムアウト検知 → 3回リトライ → 失敗 → エラー通知`,
      expectedFile: `${bot.id}_sap_timeout_expected.json`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "SAP転記 日付フォーマット変換",
      inputData: `元データ: 2026/02/03 → SAP: 20260203 に変換`,
      inputFile: `${bot.id}_sap_date.xlsx`,
      expectedOutput: `全レコードの日付変換が正しく、転記成功`,
      expectedFile: `${bot.id}_sap_date_expected.csv`,
    });
  }

  // --- Excel処理系 ---
  if (isExcel) {
    cases.push({
      id: `TC-${caseNum++}`,
      name: "Excel出力 フォーマット検証",
      inputData: `処理対象データ ${10 + Math.floor(r(10) * 50)}件`,
      inputFile: `${bot.id}_input_data.csv`,
      expectedOutput: `Excelファイル出力、シート構成・列幅・書式が一致`,
      expectedFile: `${bot.id}_excel_expected.xlsx`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "Excel集計値の正確性",
      inputData: `売上明細 30件（合計: ¥12,456,789）`,
      inputFile: `${bot.id}_sales_detail.csv`,
      expectedOutput: `集計シートの合計値: ¥12,456,789（税込: ¥13,702,467）`,
      expectedFile: `${bot.id}_sales_expected.xlsx`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "空データ・0件時の処理",
      inputData: `データ0件のCSVファイル`,
      inputFile: `${bot.id}_empty.csv`,
      expectedOutput: `「該当データなし」メッセージ出力、エラーにならない`,
      expectedFile: `${bot.id}_empty_expected.xlsx`,
    });
  }

  // --- OCR読取系 ---
  if (isOCR) {
    cases.push({
      id: `TC-${caseNum++}`,
      name: "OCR読取 正常PDF（印字明瞭）",
      inputData: `請求書PDF 1枚（印字、金額: ¥543,210）`,
      inputFile: `${bot.id}_clear.pdf`,
      expectedOutput: `読取結果: 金額=543210, 日付=2026-02-01, 取引先=テスト商事`,
      expectedFile: `${bot.id}_clear_expected.json`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "OCR読取 低品質スキャン",
      inputData: `FAX受信の請求書（300dpi, 一部かすれ）`,
      inputFile: `${bot.id}_fax.pdf`,
      expectedOutput: `読取結果に信頼度スコア付与、低信頼度項目はフラグ`,
      expectedFile: `${bot.id}_fax_expected.json`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "OCR 手書き部分の認識",
      inputData: `手書きの備考欄がある請求書`,
      inputFile: `${bot.id}_handwritten.pdf`,
      expectedOutput: `手書き部分: 信頼度50%以下 → 手動確認フラグ`,
      expectedFile: `${bot.id}_hand_expected.json`,
    });
  }

  // --- Web操作系 ---
  if (isWeb && !isSAP && !isExcel) {
    cases.push({
      id: `TC-${caseNum++}`,
      name: "Web画面ログイン・データ取得",
      inputData: `テスト用認証情報（ID: test_user）`,
      inputFile: `${bot.id}_web_auth.json`,
      expectedOutput: `ログイン成功、データ一覧 ${5 + Math.floor(r(20) * 20)}件取得`,
      expectedFile: `${bot.id}_web_expected.csv`,
    });
    cases.push({
      id: `TC-${caseNum++}`,
      name: "Web画面 要素変更への耐性",
      inputData: `画面のボタン配置変更をシミュレート`,
      inputFile: `${bot.id}_web_layout.json`,
      expectedOutput: `セレクタ変更を検知 → エラーログ → 管理者通知`,
      expectedFile: `${bot.id}_web_change_expected.json`,
    });
  }

  // --- メール送信系 ---
  if (isMail) {
    cases.push({
      id: `TC-${caseNum++}`,
      name: "メール送信 宛先・件名・添付の一致",
      inputData: `送信先: test@example.com, 添付: report.xlsx`,
      inputFile: `${bot.id}_mail_config.json`,
      expectedOutput: `メール送信完了、宛先・件名・添付ファイル名が一致`,
      expectedFile: `${bot.id}_mail_expected.json`,
    });
  }

  // --- 共通: BizRoboとの結果比較（回帰テスト）---
  cases.push({
    id: `TC-${caseNum++}`,
    name: `BizRobo実行結果との比較（回帰テスト）`,
    inputData: `BizRoboで実行した結果ファイル + 同一入力データ`,
    inputFile: `${bot.id}_bizrobo_result.csv`,
    expectedOutput: `aKaBotの出力が BizRoboの出力と一致（差異0件）`,
    expectedFile: `${bot.id}_regression_expected.csv`,
  });

  // --- 共通: パフォーマンステスト ---
  const maxTime = bot.rank === "A" ? "60秒" : bot.rank === "B" ? "120秒" : bot.rank === "C" ? "180秒" : "300秒";
  cases.push({
    id: `TC-${caseNum++}`,
    name: "実行時間・パフォーマンス検証",
    inputData: `本番想定の標準データ量`,
    inputFile: `${bot.id}_perf_input.csv`,
    expectedOutput: `処理時間 ${maxTime}以内で完了`,
    expectedFile: `${bot.id}_perf_expected.json`,
  });

  return {
    botId: bot.id,
    botName: bot.name,
    category,
    status: "idle",
    cases,
  };
}

// --- テスト実行シミュレーション ---
function simulateTestResult(tc: TestCase, botIdx: number, caseIdx: number): TestCase {
  const r = srand(botIdx * 1000 + caseIdx * 7 + 42);
  const passRate = tc.name.includes("正常") ? 0.92 : tc.name.includes("タイムアウト") || tc.name.includes("手書き") ? 0.65 : 0.82;
  const result: "pass" | "fail" | "skip" = r < passRate ? "pass" : r < passRate + 0.05 ? "skip" : "fail";
  const time = `${(80 + srand(botIdx * 100 + caseIdx) * 500).toFixed(0)}ms`;

  let actualOutput = tc.expectedOutput;
  let diffDetail: string | undefined;

  if (result === "fail") {
    if (tc.name.includes("SAP転記") && tc.name.includes("金額")) {
      actualOutput = `転記結果: 金額不一致を検知できず、¥100,001で転記完了`;
      diffDetail = `期待: 差異検知 → 転記中断\n実際: 差異を無視して転記完了\n→ 金額チェックロジックの修正が必要`;
    } else if (tc.name.includes("フォーマット")) {
      actualOutput = `Excel出力: 列幅が異なる（A列: 期待15→実際10）、通貨書式なし`;
      diffDetail = `期待: 列幅=15, 書式=¥#,##0\n実際: 列幅=10, 書式=標準\n→ ExcelWriter の書式設定を確認`;
    } else if (tc.name.includes("OCR") && tc.name.includes("低品質")) {
      actualOutput = `読取結果: 金額=543,21（下1桁欠落）`;
      diffDetail = `期待: 金額=543,210\n実際: 金額=543,21\n→ OCR後処理の桁数バリデーションが必要`;
    } else if (tc.name.includes("比較")) {
      const diffCount = 1 + Math.floor(srand(botIdx + caseIdx + 999) * 5);
      actualOutput = `差異 ${diffCount}件を検出`;
      diffDetail = `BizRobo出力とaKaBot出力で${diffCount}件の不一致:\n- 行${3 + Math.floor(r * 10)}: 金額の丸め処理が異なる\n→ ROUND関数の小数点処理を統一する必要あり`;
    } else if (tc.name.includes("パフォーマンス")) {
      actualOutput = `処理時間: ${tc.expectedOutput.replace(/\d+秒/, (m) => (parseInt(m) * 1.5).toFixed(0) + "秒")}（超過）`;
      diffDetail = `期待: ${tc.expectedOutput}\n実際: 想定の1.5倍の時間\n→ ループ内のDB接続を最適化する必要あり`;
    } else {
      actualOutput = `処理結果が期待と異なる`;
      diffDetail = `出力値が不一致。詳細はログを確認してください。`;
    }
  }

  return { ...tc, result, time, actualOutput, diffDetail };
}

// --- Badge ---
function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>{label}</span>;
}

// ============ Main Component ============
export default function TestingPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const testable = bots.filter((b) => b.dstStatus === "implementing" || b.dstStatus === "testing");
  const [suites, setSuites] = useState<BotTestSuite[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [viewBot, setViewBot] = useState<BotTestSuite | null>(null);
  const [viewCase, setViewCase] = useState<TestCase | null>(null);

  // Generate test suites for testable bots
  useEffect(() => {
    const newSuites = testable.map((b, i) => generateTestSuite(b, i));
    setSuites(newSuites);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testable.length]);

  const toggleSelect = (id: string) => {
    setSelectedBots((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // --- テスト実行 ---
  const runTests = () => {
    if (selectedBots.length === 0 || running) return;
    setRunning(true);
    setViewCase(null);

    let botIdx = 0;
    const updatedSuites = [...suites];

    const processBot = () => {
      if (botIdx >= selectedBots.length) {
        setRunning(false);
        return;
      }
      const botId = selectedBots[botIdx];
      const suiteIdx = updatedSuites.findIndex((s) => s.botId === botId);
      if (suiteIdx < 0) { botIdx++; processBot(); return; }

      const suite: BotTestSuite = { ...updatedSuites[suiteIdx], status: "running", startedAt: new Date().toLocaleTimeString("ja-JP"), cases: [...updatedSuites[suiteIdx].cases] };
      updatedSuites[suiteIdx] = suite;
      setSuites([...updatedSuites]);

      let caseIdx = 0;
      const runNextCase = () => {
        if (caseIdx >= suite.cases.length) {
          const hasFail = suite.cases.some((c) => c.result === "fail");
          suite.status = "done";
          suite.duration = `${(1.5 + srand(botIdx + 77) * 4).toFixed(1)}s`;
          if (!hasFail) updateBot(botId, { dstStatus: "testing" });
          updatedSuites[suiteIdx] = { ...suite };
          setSuites([...updatedSuites]);
          botIdx++;
          setTimeout(processBot, 200);
          return;
        }

        suite.cases[caseIdx] = simulateTestResult(suite.cases[caseIdx], suiteIdx, caseIdx);
        updatedSuites[suiteIdx] = { ...suite, cases: [...suite.cases] };
        setSuites([...updatedSuites]);
        setViewBot({ ...suite, cases: [...suite.cases] });
        caseIdx++;
        setTimeout(runNextCase, 200 + srand(botIdx * 10 + caseIdx) * 300);
      };

      setViewBot(suite);
      setTimeout(runNextCase, 400);
    };

    processBot();
  };

  // --- KPI ---
  const doneSuites = suites.filter((s) => s.status === "done");
  const passCount = doneSuites.filter((s) => s.cases.every((c) => c.result !== "fail")).length;
  const failCount = doneSuites.filter((s) => s.cases.some((c) => c.result === "fail")).length;
  const totalCases = doneSuites.reduce((a, s) => a + s.cases.length, 0);
  const passedCases = doneSuites.reduce((a, s) => a + s.cases.filter((c) => c.result === "pass").length, 0);
  const failedCases = doneSuites.reduce((a, s) => a + s.cases.filter((c) => c.result === "fail").length, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>テスト実行</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            入力データと期待結果を照合し、BizRoboと同じ出力が得られるかを検証
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={selectedBots.length === 0 || running}
          style={{
            padding: "8px 20px", borderRadius: 6, border: "none",
            background: selectedBots.length > 0 && !running ? "var(--teal)" : "#ccc",
            color: "#fff", cursor: selectedBots.length > 0 && !running ? "pointer" : "default",
            fontSize: 13, fontWeight: 600,
          }}
        >
          {running ? "テスト実行中..." : `テスト実行（${selectedBots.length}本）`}
        </button>
      </div>

      {/* KPI */}
      {doneSuites.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <KPICard label="ボット合格" value={passCount} color="var(--success)" />
          <KPICard label="ボット不合格" value={failCount} color="var(--danger)" />
          <KPICard label="テストケース合計" value={totalCases} color="var(--primary)" />
          <KPICard label="PASS" value={passedCases} color="var(--success)" />
          <KPICard label="FAIL" value={failedCases} color="var(--danger)" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: viewBot ? "280px 1fr 380px" : "280px 1fr", gap: 16 }}>
        {/* Left: Bot selection */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>テスト対象ボット</h3>
          </div>
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            {testable.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>テスト可能なボットはありません</div>
            ) : (
              testable.map((b) => {
                const suite = suites.find((s) => s.botId === b.id);
                const hasFail = suite?.status === "done" && suite.cases.some((c) => c.result === "fail");
                const allPass = suite?.status === "done" && suite.cases.every((c) => c.result !== "fail");
                return (
                  <div
                    key={b.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      background: viewBot?.botId === b.id ? "#e3f2fd" : selectedBots.includes(b.id) ? "#e0f7fa" : "transparent",
                      borderLeft: allPass ? "3px solid var(--success)" : hasFail ? "3px solid var(--danger)" : "3px solid transparent",
                    }}
                    onClick={() => {
                      if (!running) toggleSelect(b.id);
                      const s = suites.find((s) => s.botId === b.id);
                      if (s) { setViewBot(s); setViewCase(null); }
                    }}
                  >
                    <input type="checkbox" checked={selectedBots.includes(b.id)} readOnly style={{ accentColor: "var(--teal)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{b.id}</div>
                      <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                    </div>
                    {suite?.status === "done" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: allPass ? "var(--success)" : "var(--danger)" }}>
                        {allPass ? "✓" : "✗"}
                      </span>
                    )}
                    {suite?.status === "running" && (
                      <span style={{ fontSize: 10, color: "var(--warning)" }}>⏳</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center: Test cases for selected bot */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
              {viewBot ? `${viewBot.botId} ${viewBot.botName}` : "テストケース一覧"}
            </h3>
            {viewBot && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge label={viewBot.category} color="var(--primary)" />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{viewBot.cases.length}ケース</span>
              </div>
            )}
          </div>
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            {!viewBot ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                左のリストからボットを選択してください
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", background: "#fafafa" }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)", width: 50 }}>結果</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)" }}>テスト名</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)" }}>入力データ</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)" }}>期待結果</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "var(--text-secondary)", width: 50 }}>時間</th>
                  </tr>
                </thead>
                <tbody>
                  {viewBot.cases.map((tc) => {
                    const isSelected = viewCase?.id === tc.id;
                    return (
                      <tr
                        key={tc.id}
                        onClick={() => setViewCase(tc)}
                        style={{
                          borderBottom: "1px solid var(--border)", cursor: "pointer",
                          background: isSelected ? "#e3f2fd" : tc.result === "fail" ? "#fff5f5" : "transparent",
                        }}
                      >
                        <td style={{ padding: "8px 10px" }}>
                          {tc.result === "pass" && <span style={{ color: "var(--success)", fontWeight: 700 }}>✓ PASS</span>}
                          {tc.result === "fail" && <span style={{ color: "var(--danger)", fontWeight: 700 }}>✗ FAIL</span>}
                          {tc.result === "skip" && <span style={{ color: "#9e9e9e", fontWeight: 600 }}>– SKIP</span>}
                          {!tc.result && <span style={{ color: "#ccc" }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 500 }}>{tc.name}</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.inputData}</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.expectedOutput}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-muted)" }}>{tc.time || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Test case detail */}
        {viewBot && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            {viewCase ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>{viewCase.id}: {viewCase.name}</h3>
                  <button onClick={() => setViewCase(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}>×</button>
                </div>

                {viewCase.result && (
                  <div style={{ marginBottom: 12 }}>
                    <Badge
                      label={viewCase.result === "pass" ? "PASS" : viewCase.result === "fail" ? "FAIL" : "SKIP"}
                      color={viewCase.result === "pass" ? "var(--success)" : viewCase.result === "fail" ? "var(--danger)" : "#9e9e9e"}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{viewCase.time}</span>
                  </div>
                )}

                {/* 入力 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", marginBottom: 4 }}>入力データ</div>
                  <div style={{ fontSize: 12, padding: "8px 10px", background: "#e3f2fd", borderRadius: 4, marginBottom: 4 }}>{viewCase.inputData}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>📄 {viewCase.inputFile}</div>
                </div>

                {/* 期待結果 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", marginBottom: 4 }}>期待結果</div>
                  <div style={{ fontSize: 12, padding: "8px 10px", background: "#e8f5e9", borderRadius: 4, marginBottom: 4 }}>{viewCase.expectedOutput}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>📄 {viewCase.expectedFile}</div>
                </div>

                {/* 実行結果 */}
                {viewCase.actualOutput && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: viewCase.result === "pass" ? "var(--success)" : "var(--danger)", marginBottom: 4 }}>実行結果</div>
                    <div style={{
                      fontSize: 12, padding: "8px 10px", borderRadius: 4, marginBottom: 4,
                      background: viewCase.result === "pass" ? "#e8f5e9" : "#fff5f5",
                      border: viewCase.result === "fail" ? "1px solid #ffcdd2" : "none",
                    }}>
                      {viewCase.actualOutput}
                    </div>
                  </div>
                )}

                {/* 差分詳細 */}
                {viewCase.diffDetail && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>差分詳細</div>
                    <div style={{
                      fontSize: 11, padding: "8px 10px", background: "#263238", color: "#e0e0e0",
                      borderRadius: 4, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.6,
                    }}>
                      {viewCase.diffDetail}
                    </div>
                  </div>
                )}

                {/* 一致判定 */}
                {viewCase.result && (
                  <div style={{
                    padding: "10px 12px", borderRadius: 6, textAlign: "center", fontWeight: 600,
                    background: viewCase.result === "pass" ? "#c8e6c9" : viewCase.result === "fail" ? "#ffcdd2" : "#f5f5f5",
                    color: viewCase.result === "pass" ? "#2E7D32" : viewCase.result === "fail" ? "#c62828" : "#757575",
                    fontSize: 13,
                  }}>
                    {viewCase.result === "pass" ? "✓ 期待結果と一致" : viewCase.result === "fail" ? "✗ 期待結果と不一致" : "— スキップ"}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>
                テストケースをクリックすると詳細を表示
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: "10px 16px", borderRadius: 8, background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 70, borderBottom: `3px solid ${color}` }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
