"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, Bot, DstStatus } from "@/lib/demo-data";

type MigrationLog = { time: string; message: string; type: "info" | "success" | "warning" | "error" };

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>{label}</span>;
}

export default function MigrationPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  // Only show bots with IPO done (ready for migration)
  const ready = bots.filter((b) => b.srcStatus === "ipo_done" && b.reviewStatus === "approved" && b.dstStatus === "pending");
  const inProgress = bots.filter((b) => b.dstStatus === "designing" || b.dstStatus === "implementing");
  const done = bots.filter((b) => b.dstStatus === "testing" || b.dstStatus === "done");

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === ready.length) setSelected([]);
    else setSelected(ready.map((b) => b.id));
  };

  const runMigration = () => {
    if (selected.length === 0 || running) return;
    setRunning(true);
    setLogs([]);
    setProgress(0);
    setCompleted([]);

    const total = selected.length;
    let current = 0;

    const processNext = () => {
      if (current >= total) {
        setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `全${total}本の変換処理が完了しました`, type: "success" }]);
        setRunning(false);
        return;
      }

      const botId = selected[current];
      const bot = bots.find((b) => b.id === botId);
      if (!bot) { current++; processNext(); return; }

      // Step 1: Analyze
      setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] ${bot.name} - ソースコード解析中...`, type: "info" }]);

      setTimeout(() => {
        setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] 入出力定義を読込: I=${bot.ipoInput.slice(0, 20)}...`, type: "info" }]);

        setTimeout(() => {
          // Step 2: Convert
          setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] BizRobo→aKaBot AI変換実行中（Claude Opus）...`, type: "info" }]);

          setTimeout(() => {
            const steps = Math.floor(3 + Math.random() * 5);
            setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] ${steps}ステップの変換を完了`, type: "success" }]);

            // Step 3: Generate
            setTimeout(() => {
              setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] aKaBotプロジェクトファイルを生成中...`, type: "info" }]);

              setTimeout(() => {
                if (Math.random() < 0.1) {
                  setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] ⚠️ 一部アクションの自動変換に失敗（手動確認が必要）`, type: "warning" }]);
                }
                updateBot(botId, { dstStatus: "implementing" });
                setCompleted((prev) => [...prev, botId]);
                current++;
                setProgress(Math.round((current / total) * 100));
                setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString("ja-JP"), message: `[${bot.id}] 変換完了 ✓ (${current}/${total})`, type: "success" }]);

                setTimeout(processNext, 300);
              }, 400 + Math.random() * 400);
            }, 300 + Math.random() * 300);
          }, 500 + Math.random() * 500);
        }, 300 + Math.random() * 300);
      }, 200 + Math.random() * 300);
    };

    setLogs([{ time: new Date().toLocaleTimeString("ja-JP"), message: `${total}本のボットの変換を開始します...`, type: "info" }]);
    setTimeout(processNext, 500);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>AI変換 実行</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            入出力確定・レビュー承認済みのボットをAI（Claude Opus）で一括変換
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <span style={{ color: "var(--success)" }}>変換可能: {ready.length}本</span>
          <span style={{ color: "var(--warning)" }}>変換中: {inProgress.length}本</span>
          <span style={{ color: "var(--primary)" }}>完了: {done.length}本</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Pipeline Diagram */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>変換パイプライン</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { label: "ソース解析", desc: "BizRobo XML読込", color: "#7B1FA2" },
              { label: "入出力抽出", desc: "I/P/O抽出", color: "#1565C0" },
              { label: "AI変換", desc: "Claude Opus", color: "#F57C00" },
              { label: "コード生成", desc: "aKaBot出力", color: "#00838F" },
              { label: "検証", desc: "構文チェック", color: "#2E7D32" },
            ].map((step, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ flex: 1, height: 4, background: running && progress > (i * 20) ? step.color : "#e0e0e0", borderRadius: 2, transition: "background 0.3s" }} />
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: running && progress > (i * 20) ? step.color : "#e0e0e0",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.3s",
                  }}>{i + 1}</div>
                  {i < 4 && <div style={{ flex: 1, height: 4, background: running && progress > ((i + 1) * 20) ? step.color : "#e0e0e0", borderRadius: 2, transition: "background 0.3s" }} />}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>{step.label}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>実行状況</h3>
          {running ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>処理中...</span>
                <span style={{ fontWeight: 700 }}>{progress}%</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: "#e0e0e0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(90deg, var(--primary), var(--success))", width: `${progress}%`, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                完了: {completed.length} / {selected.length}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: selected.length > 0 ? "var(--primary)" : "var(--text-muted)" }}>
                {selected.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>本 選択中</div>
              <button
                onClick={runMigration}
                disabled={selected.length === 0}
                style={{
                  marginTop: 12, padding: "10px 32px", borderRadius: 8, border: "none",
                  background: selected.length > 0 ? "linear-gradient(135deg, var(--primary), #7B1FA2)" : "#ccc",
                  color: "#fff", cursor: selected.length > 0 ? "pointer" : "default",
                  fontSize: 14, fontWeight: 700,
                }}
              >
                AI変換を実行
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Bot Selection */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>変換可能ボット（入出力確定・承認済）</h3>
            <button onClick={selectAll} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 11 }}>
              {selected.length === ready.length ? "全解除" : "全選択"}
            </button>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {ready.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                変換可能なボットはありません。<br />入出力の確定とレビュー承認が必要です。
              </div>
            ) : (
              ready.map((b) => (
                <div
                  key={b.id}
                  onClick={() => !running && toggleSelect(b.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                    borderBottom: "1px solid var(--border)", cursor: running ? "default" : "pointer",
                    background: selected.includes(b.id) ? "#e3f2fd" : "transparent",
                    opacity: running ? 0.6 : 1,
                  }}
                >
                  <input type="checkbox" checked={selected.includes(b.id)} readOnly style={{ accentColor: "var(--primary)" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", width: 60 }}>{b.id}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{b.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.rank === "A" ? "var(--success)" : b.rank === "B" ? "var(--primary)" : "var(--warning)" }}>{b.rank}</span>
                  {completed.includes(b.id) && <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 12 }}>✓</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Execution Log */}
        <div style={{ background: "#1e1e1e", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#d4d4d4" }}>実行ログ</h3>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #555", background: "transparent", color: "#888", cursor: "pointer", fontSize: 10 }}>
                クリア
              </button>
            )}
          </div>
          <div style={{ flex: 1, maxHeight: 400, overflow: "auto", padding: "8px 16px", fontFamily: "'Consolas', monospace", fontSize: 12, lineHeight: 1.8 }}>
            {logs.length === 0 ? (
              <div style={{ color: "#555", padding: 20, textAlign: "center" }}>ボットを選択して「AI変換を実行」をクリック</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ color: log.type === "success" ? "#4ec9b0" : log.type === "warning" ? "#dcdcaa" : log.type === "error" ? "#f44747" : "#d4d4d4" }}>
                  <span style={{ color: "#555" }}>[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
