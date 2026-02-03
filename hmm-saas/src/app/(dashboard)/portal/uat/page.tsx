"use client";

import { useEffect, useState } from "react";
import { getBots, addTicket, subscribe } from "@/lib/store";
import { DST_STATUS_MAP, Bot } from "@/lib/demo-data";

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function UATPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const uatBots = bots.filter((b) => b.dstStatus === "testing");
  const [selected, setSelected] = useState<Bot | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"bug" | "improvement" | "uat">("uat");
  const [submitted, setSubmitted] = useState<string[]>([]);

  const submitFeedback = () => {
    if (!selected || !feedback.trim()) return;
    addTicket({
      botId: selected.id,
      title: `[UAT] ${selected.name} - ${feedbackType === "bug" ? "不具合報告" : feedbackType === "improvement" ? "改善要望" : "UATフィードバック"}`,
      body: feedback,
      type: feedbackType,
      priority: feedbackType === "bug" ? "high" : "medium",
      status: "open",
      assignee: selected.consultant,
      reporter: selected.owner,
    });
    setSubmitted((prev) => [...prev, selected.id]);
    setFeedback("");
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>受入テスト（UAT）</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          テスト中のボットに対してフィードバックや不具合報告を送信できます。
        </p>
      </div>

      {uatBots.length === 0 ? (
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 40, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>-</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>現在テスト中のボットはありません</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 450px" : "1fr", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, alignContent: "start" }}>
            {uatBots.map((b) => (
              <div
                key={b.id}
                onClick={() => { setSelected(b); setFeedback(""); }}
                style={{
                  background: "var(--card)",
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  border: selected?.id === b.id ? "2px solid var(--teal)" : "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{b.id}</span>
                  {submitted.includes(b.id) && (
                    <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>送信済</span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{b.bizReq}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{b.department} / {b.owner}</span>
                  <StatusBadge label={DST_STATUS_MAP[b.dstStatus].label} color={DST_STATUS_MAP[b.dstStatus].color} />
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{selected.name}</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
              </div>

              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>実装仕様（入出力）</h4>
              <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 10px", background: "#e3f2fd", borderRadius: 4 }}><strong>Input:</strong> {selected.ipoInput}</div>
              <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 10px", background: "#fff3e0", borderRadius: 4 }}><strong>Process:</strong> {selected.ipoProcess}</div>
              <div style={{ fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "#e8f5e9", borderRadius: 4 }}><strong>Output:</strong> {selected.ipoOutput}</div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>フィードバック送信</h4>
              <div style={{ marginBottom: 8 }}>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as typeof feedbackType)}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}
                >
                  <option value="uat">UATフィードバック</option>
                  <option value="bug">不具合報告</option>
                  <option value="improvement">改善要望</option>
                </select>
              </div>
              <div style={{ marginBottom: 8 }}>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  placeholder="テスト結果やフィードバックを入力..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
              <button
                onClick={submitFeedback}
                style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: "var(--teal)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%" }}
              >
                フィードバックを送信
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
