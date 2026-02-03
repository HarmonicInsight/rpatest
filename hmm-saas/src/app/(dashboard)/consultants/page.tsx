"use client";

import { useEffect, useState } from "react";
import { getBots, subscribe } from "@/lib/store";
import { members, SRC_STATUS_MAP, DST_STATUS_MAP } from "@/lib/demo-data";

export default function ConsultantsPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [tab, setTab] = useState<"consultant" | "customer">("consultant");

  const filtered = members.filter((m) =>
    tab === "consultant" ? m.role === "manager" || m.role === "consultant" : m.role === "customer"
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>メンバー管理</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {(["consultant", "customer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: tab === t ? "var(--primary)" : "var(--card)",
                color: tab === t ? "#fff" : "var(--text)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t === "consultant" ? "移行チーム" : "顧客側担当者"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map((m) => {
          const assigned = bots.filter((b) =>
            tab === "consultant" ? b.consultant === m.name.split(" ")[0] || b.consultant === m.name : b.owner === m.name.split(" ")[0] || b.owner === m.name
          );
          const doneCount = assigned.filter((b) => b.dstStatus === "done").length;
          const ipoCount = assigned.filter((b) => b.srcStatus === "ipo_done").length;

          return (
            <div key={m.id} style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: m.role === "manager" ? "var(--danger)" : m.role === "consultant" ? "var(--primary)" : "var(--teal)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {m.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {m.role === "manager" ? "HMMリード" : m.role === "consultant" ? "移行コンサルタント" : "業務担当者"}
                    {" / "}{m.department}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.email}</div>
                </div>
              </div>

              {assigned.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    担当ボット: {assigned.length}本 （完了: {doneCount} / 入出力確定: {ipoCount}）
                  </div>
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8, background: "#e0e0e0" }}>
                    {doneCount > 0 && (
                      <div style={{ width: `${(doneCount / assigned.length) * 100}%`, background: "var(--success)" }} />
                    )}
                    {ipoCount - doneCount > 0 && (
                      <div style={{ width: `${((ipoCount - doneCount) / assigned.length) * 100}%`, background: "var(--primary)" }} />
                    )}
                  </div>
                  <div style={{ maxHeight: 200, overflow: "auto" }}>
                    {assigned.slice(0, 10).map((b) => (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12, borderBottom: "1px solid #f5f5f5" }}>
                        <div>
                          <span style={{ fontFamily: "monospace", color: "var(--text-muted)", marginRight: 8 }}>{b.id}</span>
                          {b.name}
                        </div>
                        <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, color: "#fff", background: DST_STATUS_MAP[b.dstStatus].color }}>
                          {DST_STATUS_MAP[b.dstStatus].label}
                        </span>
                      </div>
                    ))}
                    {assigned.length > 10 && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>...他 {assigned.length - 10}本</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>担当ボットなし</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
