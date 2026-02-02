"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { DST_STATUS_MAP, Bot } from "@/lib/demo-data";

type TestResult = {
  botId: string;
  botName: string;
  status: "pass" | "fail" | "running" | "pending";
  tests: { name: string; result: "pass" | "fail" | "skip"; time: string; detail?: string }[];
  startedAt?: string;
  duration?: string;
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>{label}</span>;
}

const TEST_NAMES = [
  "初期化チェック",
  "入力データ読込テスト",
  "データ変換ロジック検証",
  "出力フォーマット検証",
  "エラーハンドリングテスト",
  "境界値テスト",
  "パフォーマンステスト",
  "回帰テスト（移行元比較）",
];

export default function TestingPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const testable = bots.filter((b) => b.dstStatus === "implementing" || b.dstStatus === "testing");
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<TestResult | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const runTests = () => {
    if (selected.length === 0 || running) return;
    setRunning(true);
    setDetail(null);

    let current = 0;
    const newResults: TestResult[] = [];

    const processBot = () => {
      if (current >= selected.length) {
        setRunning(false);
        return;
      }

      const botId = selected[current];
      const bot = bots.find((b) => b.id === botId);
      if (!bot) { current++; processBot(); return; }

      const result: TestResult = {
        botId, botName: bot.name, status: "running", tests: [],
        startedAt: new Date().toLocaleTimeString("ja-JP"),
      };
      newResults.push(result);
      setResults([...newResults]);

      // Run each test with delay
      let testIdx = 0;
      const runNextTest = () => {
        if (testIdx >= TEST_NAMES.length) {
          const hasFail = result.tests.some((t) => t.result === "fail");
          result.status = hasFail ? "fail" : "pass";
          result.duration = `${(1.2 + Math.random() * 3).toFixed(1)}s`;

          if (!hasFail) {
            updateBot(botId, { dstStatus: "testing" });
          }

          setResults([...newResults]);
          current++;
          setTimeout(processBot, 200);
          return;
        }

        const testName = TEST_NAMES[testIdx];
        const rand = Math.random();
        const testResult: "pass" | "fail" | "skip" = rand < 0.85 ? "pass" : rand < 0.95 ? "fail" : "skip";

        result.tests.push({
          name: testName,
          result: testResult,
          time: `${(50 + Math.random() * 200).toFixed(0)}ms`,
          detail: testResult === "fail"
            ? `期待値と実際の出力が不一致: expected "OK" but got "ERROR_${Math.floor(Math.random() * 100)}"`
            : undefined,
        });
        setResults([...newResults]);
        testIdx++;
        setTimeout(runNextTest, 150 + Math.random() * 200);
      };

      setTimeout(runNextTest, 300);
    };

    processBot();
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const runningCount = results.filter((r) => r.status === "running").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>テスト実行</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            移行後ボットの自動テスト実行・結果確認（移行元との比較検証含む）
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={runTests}
            disabled={selected.length === 0 || running}
            style={{
              padding: "8px 20px", borderRadius: 6, border: "none",
              background: selected.length > 0 && !running ? "var(--teal)" : "#ccc",
              color: "#fff", cursor: selected.length > 0 && !running ? "pointer" : "default",
              fontSize: 13, fontWeight: 600,
            }}
          >
            {running ? `テスト実行中...` : `テスト実行（${selected.length}本）`}
          </button>
        </div>
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: "10px 20px", borderRadius: 8, background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 80, borderBottom: "3px solid var(--success)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success)" }}>{passCount}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>PASS</div>
          </div>
          <div style={{ padding: "10px 20px", borderRadius: 8, background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 80, borderBottom: "3px solid var(--danger)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--danger)" }}>{failCount}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>FAIL</div>
          </div>
          {runningCount > 0 && (
            <div style={{ padding: "10px 20px", borderRadius: 8, background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 80, borderBottom: "3px solid var(--warning)" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--warning)" }}>{runningCount}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>実行中</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 1fr 400px" : "1fr 1fr", gap: 16 }}>
        {/* Bot Selection */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>テスト対象（実装中・テスト中）</h3>
          </div>
          <div style={{ maxHeight: 500, overflow: "auto" }}>
            {testable.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>テスト可能なボットはありません</div>
            ) : (
              testable.map((b) => (
                <div
                  key={b.id}
                  onClick={() => !running && toggleSelect(b.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                    borderBottom: "1px solid var(--border)", cursor: running ? "default" : "pointer",
                    background: selected.includes(b.id) ? "#e0f7fa" : "transparent",
                  }}
                >
                  <input type="checkbox" checked={selected.includes(b.id)} readOnly style={{ accentColor: "var(--teal)" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", width: 60 }}>{b.id}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{b.name}</span>
                  <Badge label={DST_STATUS_MAP[b.dstStatus].label} color={DST_STATUS_MAP[b.dstStatus].color} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>テスト結果</h3>
          </div>
          <div style={{ maxHeight: 500, overflow: "auto" }}>
            {results.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>ボットを選択してテストを実行してください</div>
            ) : (
              results.map((r) => {
                const pass = r.tests.filter((t) => t.result === "pass").length;
                const fail = r.tests.filter((t) => t.result === "fail").length;
                return (
                  <div
                    key={r.botId}
                    onClick={() => setDetail(r)}
                    style={{
                      padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                      borderLeft: `4px solid ${r.status === "pass" ? "var(--success)" : r.status === "fail" ? "var(--danger)" : "var(--warning)"}`,
                      background: detail?.botId === r.botId ? "#f5f5f5" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.botId} - {r.botName}</span>
                      <Badge
                        label={r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "実行中"}
                        color={r.status === "pass" ? "var(--success)" : r.status === "fail" ? "var(--danger)" : "var(--warning)"}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--success)" }}>{pass} pass</span>
                      <span style={{ color: "var(--danger)" }}>{fail} fail</span>
                      {r.duration && <span>{r.duration}</span>}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ display: "flex", height: 3, borderRadius: 2, marginTop: 6, overflow: "hidden", background: "#e0e0e0" }}>
                      {r.tests.map((t, i) => (
                        <div key={i} style={{ flex: 1, background: t.result === "pass" ? "var(--success)" : t.result === "fail" ? "var(--danger)" : "#e0e0e0" }} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail */}
        {detail && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>{detail.botId} テスト詳細</h3>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>
            <div style={{ fontSize: 12, marginBottom: 8, color: "var(--text-muted)" }}>
              開始: {detail.startedAt} / 所要: {detail.duration || "-"}
            </div>
            {detail.tests.map((t, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#fff",
                      background: t.result === "pass" ? "var(--success)" : t.result === "fail" ? "var(--danger)" : "#ccc",
                    }}>
                      {t.result === "pass" ? "✓" : t.result === "fail" ? "✗" : "-"}
                    </span>
                    <span style={{ fontSize: 12 }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.time}</span>
                </div>
                {t.detail && (
                  <div style={{ marginTop: 4, marginLeft: 22, fontSize: 11, color: "var(--danger)", fontFamily: "monospace", background: "#fff5f5", padding: "4px 8px", borderRadius: 4 }}>
                    {t.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
