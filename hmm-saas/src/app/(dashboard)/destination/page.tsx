"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { DST_STATUS_MAP, SRC_STATUS_MAP, Bot, DstStatus } from "@/lib/demo-data";

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function DestinationPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Bot | null>(null);

  const filtered = bots.filter((b) => {
    if (statusFilter !== "all" && b.dstStatus !== statusFilter) return false;
    if (search && !b.name.includes(search) && !b.id.includes(search) && !b.consultant.includes(search)) return false;
    return true;
  });

  const advanceDst = (bot: Bot) => {
    const order: DstStatus[] = ["pending", "designing", "implementing", "testing", "done"];
    const idx = order.indexOf(bot.dstStatus);
    if (idx < order.length - 1 && idx >= 0) {
      updateBot(bot.id, { dstStatus: order[idx + 1] });
      if (detail?.id === bot.id) setDetail({ ...bot, dstStatus: order[idx + 1] });
    }
  };

  const setBlocked = (bot: Bot) => {
    updateBot(bot.id, { dstStatus: "blocked" });
    if (detail?.id === bot.id) setDetail({ ...bot, dstStatus: "blocked" });
  };

  // Summary stats
  const stats = Object.entries(DST_STATUS_MAP).map(([k, v]) => ({
    key: k,
    ...v,
    count: bots.filter((b) => b.dstStatus === k).length,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>変換結果</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, width: 180 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}
          >
            <option value="all">全ステータス</option>
            {Object.entries(DST_STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, overflowX: "auto" }}>
        {stats.map((s) => (
          <div
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              background: "var(--card)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              cursor: "pointer",
              borderBottom: `3px solid ${s.color}`,
              textAlign: "center",
              minWidth: 100,
              opacity: statusFilter !== "all" && statusFilter !== s.key ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 400px" : "1fr", gap: 20 }}>
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", position: "sticky", top: 0, background: "var(--card)" }}>
                {["ID", "ボット名", "ランク", "移行元", "開発ステータス", "コンサルタント", "工数", "操作"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: detail?.id === b.id ? "#e3f2fd" : "transparent" }}
                  onClick={() => setDetail(b)}
                >
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{b.id}</td>
                  <td style={{ padding: "8px 12px" }}>{b.name}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontWeight: 700, color: b.rank === "A" ? "var(--success)" : b.rank === "B" ? "var(--primary)" : b.rank === "C" ? "var(--warning)" : "var(--danger)" }}>{b.rank}</span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge label={SRC_STATUS_MAP[b.srcStatus].label} color={SRC_STATUS_MAP[b.srcStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge label={DST_STATUS_MAP[b.dstStatus].label} color={DST_STATUS_MAP[b.dstStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.consultant}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.estimateHours}h</td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {b.dstStatus !== "done" && b.dstStatus !== "blocked" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); advanceDst(b); }}
                          style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 11 }}
                        >
                          進める
                        </button>
                      )}
                      {b.dstStatus !== "done" && b.dstStatus !== "blocked" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setBlocked(b); }}
                          style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 11 }}
                        >
                          ブロック
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detail && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{detail.name}</h3>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>ID:</strong> {detail.id}</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>ランク:</strong> {detail.rank} ({detail.pattern})</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>コンサルタント:</strong> {detail.consultant}</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>見積工数:</strong> {detail.estimateHours}h</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>移行元:</strong> {detail.srcPlatform} → <strong>移行先:</strong> {detail.dstPlatform}</div>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>入出力定義（実装仕様）</h4>
            <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 8px", background: "#f5f5f5", borderRadius: 4 }}><strong>Input:</strong> {detail.ipoInput}</div>
            <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 8px", background: "#f5f5f5", borderRadius: 4 }}><strong>Process:</strong> {detail.ipoProcess}</div>
            <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 8px", background: "#f5f5f5", borderRadius: 4 }}><strong>Output:</strong> {detail.ipoOutput}</div>
            {detail.mods.length > 0 && (
              <>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>変更履歴</h4>
                {detail.mods.map((m, i) => (
                  <div key={i} style={{ fontSize: 11, marginBottom: 6, padding: "4px 8px", background: "#f5f5f5", borderRadius: 4 }}>
                    <span style={{ color: "var(--text-muted)" }}>{m.date}</span> [{m.type}] {m.text}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
