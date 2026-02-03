"use client";

import { useEffect, useState } from "react";
import { getBots, subscribe } from "@/lib/store";
import { Bot } from "@/lib/demo-data";

type BotStatus = "running" | "idle" | "error" | "scheduled" | "stopped";

type RuntimeBot = {
  bot: Bot;
  runtime: BotStatus;
  lastRun: string;
  nextRun: string;
  successRate: number;
  avgDuration: string;
  todayRuns: number;
  todayErrors: number;
  cpu: number;
  memory: number;
};

const RUNTIME_COLORS: Record<BotStatus, { label: string; color: string }> = {
  running: { label: "実行中", color: "#2E7D32" },
  idle: { label: "待機中", color: "#1565C0" },
  scheduled: { label: "スケジュール", color: "#7B1FA2" },
  error: { label: "エラー", color: "#c62828" },
  stopped: { label: "停止", color: "#9e9e9e" },
};

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateRuntimeData(bots: Bot[]): RuntimeBot[] {
  const doneBots = bots.filter((b) => b.dstStatus === "done" || b.dstStatus === "testing");
  return doneBots.map((bot, i) => {
    const r = seededRand(i + 777);
    const statuses: BotStatus[] = ["running", "idle", "scheduled", "idle", "idle", "running", "error", "idle", "scheduled", "idle"];
    const runtime = statuses[i % statuses.length];
    const successRate = 90 + Math.floor(r * 10);
    return {
      bot,
      runtime,
      lastRun: `${String(7 + Math.floor(r * 3)).padStart(2, "0")}:${String(Math.floor(seededRand(i + 888) * 60)).padStart(2, "0")}`,
      nextRun: runtime === "scheduled" ? `${String(10 + Math.floor(r * 8)).padStart(2, "0")}:00` : "-",
      successRate,
      avgDuration: `${(1 + r * 4).toFixed(1)}分`,
      todayRuns: Math.floor(1 + seededRand(i + 999) * 5),
      todayErrors: runtime === "error" ? Math.floor(1 + seededRand(i + 1111) * 3) : 0,
      cpu: Math.floor(5 + seededRand(i + 1200) * (runtime === "running" ? 40 : 10)),
      memory: Math.floor(20 + seededRand(i + 1300) * (runtime === "running" ? 60 : 20)),
    };
  });
}

export default function MonitoringPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const runtimeBots = generateRuntimeData(bots);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<RuntimeBot | null>(null);

  const filtered = runtimeBots.filter((rb) => statusFilter === "all" || rb.runtime === statusFilter);

  const counts: Record<string, number> = {};
  runtimeBots.forEach((rb) => { counts[rb.runtime] = (counts[rb.runtime] || 0) + 1; });

  const totalRuns = runtimeBots.reduce((a, b) => a + b.todayRuns, 0);
  const totalErrors = runtimeBots.reduce((a, b) => a + b.todayErrors, 0);
  const avgSuccess = runtimeBots.length > 0 ? Math.round(runtimeBots.reduce((a, b) => a + b.successRate, 0) / runtimeBots.length) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>稼働モニタリング</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            デプロイ済みボットの稼働状況・実行履歴・リソース使用量
          </p>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          デプロイ済み: {runtimeBots.length}本 / 全{bots.length}本
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: "4px solid var(--primary)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>デプロイ済み</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{runtimeBots.length}</div>
        </div>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: "4px solid var(--success)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>本日の実行数</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success)" }}>{totalRuns}</div>
        </div>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: "4px solid var(--danger)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>本日のエラー</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalErrors > 0 ? "var(--danger)" : "var(--text)" }}>{totalErrors}</div>
        </div>
        <div style={{ background: "var(--card)", borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: "4px solid var(--teal)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>平均成功率</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: avgSuccess >= 95 ? "var(--success)" : "var(--warning)" }}>{avgSuccess}%</div>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setStatusFilter("all")}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: statusFilter === "all" ? "var(--text)" : "var(--card)", color: statusFilter === "all" ? "#fff" : "var(--text)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          全て ({runtimeBots.length})
        </button>
        {Object.entries(RUNTIME_COLORS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${val.color}`, background: statusFilter === key ? val.color : "var(--card)", color: statusFilter === key ? "#fff" : val.color, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            {val.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {runtimeBots.length === 0 ? (
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 40, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            デプロイ済みのボットはまだありません。<br />
            移行・テスト完了後にここに表示されます。
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 380px" : "1fr", gap: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["ステータス", "ID", "ボット名", "最終実行", "次回予定", "成功率", "本日実行", "CPU", "メモリ"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 10px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rb) => {
                  const rc = RUNTIME_COLORS[rb.runtime];
                  return (
                    <tr
                      key={rb.bot.id}
                      onClick={() => setDetail(rb)}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: detail?.bot.id === rb.bot.id ? "#f5f5f5" : "transparent" }}
                    >
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: rc.color, display: "inline-block", animation: rb.runtime === "running" ? "pulse 2s infinite" : "none" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: rc.color }}>{rc.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{rb.bot.id}</td>
                      <td style={{ padding: "8px 10px" }}>{rb.bot.name}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12 }}>{rb.lastRun}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12 }}>{rb.nextRun}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e0e0e0", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 2, background: rb.successRate >= 95 ? "var(--success)" : "var(--warning)", width: `${rb.successRate}%` }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{rb.successRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 12 }}>
                        {rb.todayRuns}回
                        {rb.todayErrors > 0 && <span style={{ color: "var(--danger)", fontWeight: 600, marginLeft: 4 }}>({rb.todayErrors}err)</span>}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 11 }}>{rb.cpu}%</td>
                      <td style={{ padding: "8px 10px", fontSize: 11 }}>{rb.memory}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detail && (
            <div style={{ background: "var(--card)", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{detail.bot.name}</h3>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: RUNTIME_COLORS[detail.runtime].color }}>{RUNTIME_COLORS[detail.runtime].label}</span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>ID:</strong> {detail.bot.id}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>部署:</strong> {detail.bot.department}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>担当者:</strong> {detail.bot.owner}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>プラットフォーム:</strong> {detail.bot.dstPlatform}</div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>稼働統計</h4>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>最終実行:</strong> {detail.lastRun}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>平均処理時間:</strong> {detail.avgDuration}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>成功率:</strong> {detail.successRate}%</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><strong>本日実行:</strong> {detail.todayRuns}回（エラー: {detail.todayErrors}回）</div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>リソース</h4>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                  <span>CPU</span><span>{detail.cpu}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#e0e0e0", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: detail.cpu > 60 ? "var(--danger)" : detail.cpu > 30 ? "var(--warning)" : "var(--success)", width: `${detail.cpu}%` }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                  <span>メモリ</span><span>{detail.memory}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#e0e0e0", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: detail.memory > 70 ? "var(--danger)" : detail.memory > 40 ? "var(--warning)" : "var(--success)", width: `${detail.memory}%` }} />
                </div>
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>処理内容（入出力）</h4>
              <div style={{ fontSize: 11, marginBottom: 4, padding: "4px 8px", background: "#e3f2fd", borderRadius: 4 }}><strong>Input:</strong> {detail.bot.ipoInput}</div>
              <div style={{ fontSize: 11, marginBottom: 4, padding: "4px 8px", background: "#fff3e0", borderRadius: 4 }}><strong>Process:</strong> {detail.bot.ipoProcess}</div>
              <div style={{ fontSize: 11, padding: "4px 8px", background: "#e8f5e9", borderRadius: 4 }}><strong>Output:</strong> {detail.bot.ipoOutput}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
