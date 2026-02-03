"use client";

import { useEffect, useState } from "react";
import { getBots, getTickets, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, Bot } from "@/lib/demo-data";

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ items, map }: { items: Record<string, number>; map: Record<string, { label: string; color: string }> }) {
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div>
      <div style={{ display: "flex", height: 24, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        {Object.entries(items).map(([key, count]) =>
          count > 0 ? (
            <div
              key={key}
              style={{
                width: `${(count / total) * 100}%`,
                background: map[key]?.color || "#ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#fff",
                fontWeight: 600,
              }}
              title={`${map[key]?.label}: ${count}`}
            >
              {count}
            </div>
          ) : null
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
        {Object.entries(items).map(([key, count]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: map[key]?.color || "#ccc", display: "inline-block" }} />
            {map[key]?.label}: {count}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const tickets = getTickets();

  const srcCounts: Record<string, number> = {};
  const dstCounts: Record<string, number> = {};
  const rankCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  bots.forEach((b) => {
    srcCounts[b.srcStatus] = (srcCounts[b.srcStatus] || 0) + 1;
    dstCounts[b.dstStatus] = (dstCounts[b.dstStatus] || 0) + 1;
    rankCounts[b.rank]++;
  });

  const done = bots.filter((b) => b.dstStatus === "done").length;
  const pctComplete = Math.round((done / bots.length) * 100);
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "inprogress").length;
  const reviewPending = bots.filter((b) => b.reviewStatus === "pending" || b.reviewStatus === "in_review").length;

  const recentBots = [...bots].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 8);

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>ダッシュボード</h2>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="総ボット数" value={bots.length} color="var(--primary)" sub={`A: ${rankCounts.A} / B: ${rankCounts.B} / C: ${rankCounts.C} / D: ${rankCounts.D}`} />
        <StatCard label="移行完了" value={`${done}本`} color="var(--success)" sub={`全体の${pctComplete}%`} />
        <StatCard label="オープンチケット" value={openTickets} color="var(--warning)" sub={`全${tickets.length}件中`} />
        <StatCard label="レビュー待ち" value={reviewPending} color="var(--purple)" sub="顧客確認待ち" />
      </div>

      {/* Progress Bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>移行元 分析状況</h3>
          <ProgressBar items={srcCounts} map={SRC_STATUS_MAP} />
        </div>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>移行先 開発状況</h3>
          <ProgressBar items={dstCounts} map={DST_STATUS_MAP} />
        </div>
      </div>

      {/* Rank Distribution */}
      <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>ランク別分布</h3>
        <div style={{ display: "flex", gap: 16 }}>
          {(["A", "B", "C", "D"] as const).map((rank) => {
            const colors = { A: "var(--success)", B: "var(--primary)", C: "var(--warning)", D: "var(--danger)" };
            const descriptions = { A: "単純移行", B: "軽微変更", C: "中規模改修", D: "再構築" };
            const pct = Math.round((rankCounts[rank] / bots.length) * 100);
            return (
              <div key={rank} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>ランク{rank} ({descriptions[rank]})</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors[rank] }}>{rankCounts[rank]}</div>
                <div style={{ height: 6, borderRadius: 3, background: "#e0e0e0", marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 3, background: colors[rank], width: `${pct}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>最近の更新</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>ID</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>ボット名</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>分析</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>開発</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>担当</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>更新日</th>
            </tr>
          </thead>
          <tbody>
            {recentBots.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{b.id}</td>
                <td style={{ padding: "8px 12px" }}>{b.name}</td>
                <td style={{ padding: "8px 12px" }}>
                  <StatusBadge label={SRC_STATUS_MAP[b.srcStatus].label} color={SRC_STATUS_MAP[b.srcStatus].color} />
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <StatusBadge label={DST_STATUS_MAP[b.dstStatus].label} color={DST_STATUS_MAP[b.dstStatus].color} />
                </td>
                <td style={{ padding: "8px 12px" }}>{b.consultant}</td>
                <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 }}>{b.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: color,
      }}
    >
      {label}
    </span>
  );
}
