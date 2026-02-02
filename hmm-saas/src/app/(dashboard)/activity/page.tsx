"use client";

import { useEffect, useState } from "react";
import { getBots, getTickets, subscribe } from "@/lib/store";

type ActivityItem = {
  id: string;
  time: string;
  type: "analysis" | "development" | "review" | "ticket" | "system" | "ai";
  actor: string;
  message: string;
  botId?: string;
};

const TYPE_COLORS: Record<string, { label: string; color: string }> = {
  analysis: { label: "分析", color: "#7B1FA2" },
  development: { label: "開発", color: "#1565C0" },
  review: { label: "レビュー", color: "#F57C00" },
  ticket: { label: "チケット", color: "#c62828" },
  system: { label: "システム", color: "#9e9e9e" },
  ai: { label: "AI", color: "#00838F" },
};

function generateActivity(): ActivityItem[] {
  const items: ActivityItem[] = [
    { id: "a1", time: "2026-02-02 09:30", type: "ai", actor: "AI Agent", message: "定期チェック実行: 120本のボットステータスを確認しました。異常なし。", botId: undefined },
    { id: "a2", time: "2026-02-02 09:15", type: "analysis", actor: "山本", message: "BOT-042 の業務要件分析を完了しました。", botId: "BOT-042" },
    { id: "a3", time: "2026-02-02 09:00", type: "ai", actor: "AI Agent", message: "30分間隔チェック: レビュー待ち5件を検出。田中様・佐藤様に催促メールを送信。" },
    { id: "a4", time: "2026-02-02 08:45", type: "review", actor: "田中", message: "BOT-006 経費精算自動化のIPOレビューを承認しました。", botId: "BOT-006" },
    { id: "a5", time: "2026-02-02 08:30", type: "development", actor: "李", message: "BOT-005 見積書作成のExcel出力フォーマット修正を完了。テスト中。", botId: "BOT-005" },
    { id: "a6", time: "2026-02-02 08:15", type: "ticket", actor: "山田", message: "ISSUE-006 出荷通知の宛先エラーについてコメントを追加。", botId: "BOT-008" },
    { id: "a7", time: "2026-02-02 08:00", type: "ai", actor: "AI Agent", message: "定期チェック実行: BOT-091のSAP接続タイムアウトが継続中。エスカレーション推奨。" },
    { id: "a8", time: "2026-02-01 18:00", type: "system", actor: "システム", message: "日次サマリーレポートを生成しました。移行完了率: 10%。" },
    { id: "a9", time: "2026-02-01 17:30", type: "development", actor: "グエン", message: "BOT-008 出荷通知メールの配信リスト修正を実装中。", botId: "BOT-008" },
    { id: "a10", time: "2026-02-01 17:00", type: "analysis", actor: "佐々木", message: "BOT-003 在庫アラート通知の機能要件を確定。IPO定義作成中。", botId: "BOT-003" },
    { id: "a11", time: "2026-02-01 16:30", type: "review", actor: "佐藤", message: "BOT-014 顧客データ同期のIPOレビューを差戻し。出力先の確認を依頼。", botId: "BOT-014" },
    { id: "a12", time: "2026-02-01 16:00", type: "ai", actor: "AI Agent", message: "BOT-115 OCR認識率80%以下を検出。高優先チケットを自動作成しました。", botId: "BOT-115" },
    { id: "a13", time: "2026-02-01 15:30", type: "ticket", actor: "高橋", message: "新規チケット: 月次レポートに前年比カラム追加要望（BOT-010）", botId: "BOT-010" },
    { id: "a14", time: "2026-02-01 15:00", type: "development", actor: "山本", message: "BOT-010 月次決算集計のIPO定義にYoY計算を追加。レビュー依頼済み。", botId: "BOT-010" },
    { id: "a15", time: "2026-02-01 14:30", type: "analysis", actor: "李", message: "BOT-056〜BOT-060の5本を一括で業務要件分析を開始。", botId: "BOT-056" },
    { id: "a16", time: "2026-02-01 14:00", type: "system", actor: "システム", message: "新規ボットBOT-121〜BOT-125を登録しました（一括インポート）。" },
    { id: "a17", time: "2026-02-01 13:30", type: "ai", actor: "AI Agent", message: "週次分析: ランクAボットの分析完了率が80%に到達。来週中に全完了見込み。" },
    { id: "a18", time: "2026-02-01 12:00", type: "review", actor: "中村", message: "BOT-020 決算処理のUATフィードバックを送信。分割払い照合の問題を報告。", botId: "BOT-020" },
    { id: "a19", time: "2026-02-01 11:00", type: "development", actor: "佐々木", message: "BOT-029 稟議書ステータス確認を実装完了。テスト環境にデプロイ。", botId: "BOT-029" },
    { id: "a20", time: "2026-02-01 10:00", type: "ai", actor: "AI Agent", message: "30分間隔チェック: 全ステータス正常。ブロック中のボット0本。" },
  ];
  return items;
}

export default function ActivityPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const activities = generateActivity();
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = activities.filter((a) => typeFilter === "all" || a.type === typeFilter);

  // Count by type
  const counts: Record<string, number> = {};
  activities.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>アクティビティログ</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            プロジェクト全体の操作履歴・AI Agentの活動記録
          </p>
        </div>
      </div>

      {/* Type Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setTypeFilter("all")}
          style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)",
            background: typeFilter === "all" ? "var(--text)" : "var(--card)",
            color: typeFilter === "all" ? "#fff" : "var(--text)",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}
        >
          全て ({activities.length})
        </button>
        {Object.entries(TYPE_COLORS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
            style={{
              padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${val.color}`,
              background: typeFilter === key ? val.color : "var(--card)",
              color: typeFilter === key ? "#fff" : val.color,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            {val.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "var(--border)" }} />
        {filtered.map((a) => {
          const tc = TYPE_COLORS[a.type];
          return (
            <div key={a.id} style={{ display: "flex", gap: 16, marginBottom: 4, position: "relative" }}>
              {/* Dot */}
              <div style={{
                width: 40, flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 16, zIndex: 1,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: tc.color, border: "2px solid var(--bg)" }} />
              </div>
              {/* Card */}
              <div style={{
                flex: 1, background: "var(--card)", borderRadius: 8, padding: "12px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: `3px solid ${tc.color}`,
                marginBottom: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, color: "#fff", background: tc.color }}>
                      {tc.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{a.actor}</span>
                    {a.botId && (
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--primary)", background: "#e3f2fd", padding: "1px 6px", borderRadius: 4 }}>
                        {a.botId}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.time}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.message}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
