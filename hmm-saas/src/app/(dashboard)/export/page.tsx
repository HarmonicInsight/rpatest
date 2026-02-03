"use client";

import { useEffect, useState } from "react";
import { getBots, getTickets, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, REVIEW_STATUS_MAP } from "@/lib/demo-data";

type ExportFormat = "csv" | "json" | "excel";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(["\uFEFF" + content], { type: type + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const tickets = getTickets();
  const [exported, setExported] = useState<string[]>([]);

  const exportBotsCsv = () => {
    const header = "ID,ボット名,部署,業務担当者,ランク,パターン,移行元,移行先,分析ステータス,開発ステータス,レビュー,コンサルタント,見積工数,業務要件,機能要件,IPO Input,IPO Process,IPO Output";
    const rows = bots.map((b) =>
      [b.id, b.name, b.department, b.owner, b.rank, b.pattern, b.srcPlatform, b.dstPlatform,
        SRC_STATUS_MAP[b.srcStatus].label, DST_STATUS_MAP[b.dstStatus].label, REVIEW_STATUS_MAP[b.reviewStatus].label,
        b.consultant, b.estimateHours,
        `"${b.bizReq}"`, `"${b.funcReq}"`, `"${b.ipoInput}"`, `"${b.ipoProcess}"`, `"${b.ipoOutput}"`
      ].join(",")
    );
    downloadFile([header, ...rows].join("\n"), `hmm_bots_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    setExported((prev) => [...prev, "bots-csv"]);
  };

  const exportBotsJson = () => {
    downloadFile(JSON.stringify(bots, null, 2), `hmm_bots_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    setExported((prev) => [...prev, "bots-json"]);
  };

  const exportTicketsCsv = () => {
    const header = "ID,ボットID,タイトル,種別,優先度,ステータス,担当者,報告者,コメント数,作成日,更新日";
    const rows = tickets.map((t) =>
      [t.id, t.botId, `"${t.title}"`, t.type, t.priority, t.status, t.assignee, t.reporter, t.comments.length, t.created, t.updated].join(",")
    );
    downloadFile([header, ...rows].join("\n"), `hmm_tickets_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    setExported((prev) => [...prev, "tickets-csv"]);
  };

  const exportProgressReport = () => {
    const srcDone = bots.filter((b) => b.srcStatus === "ipo_done").length;
    const dstDone = bots.filter((b) => b.dstStatus === "done").length;
    const openTickets = tickets.filter((t) => t.status === "open" || t.status === "inprogress").length;

    const report = `# HMM 移行プロジェクト 進捗レポート
生成日時: ${new Date().toLocaleString("ja-JP")}

## 全体サマリー
- 総ボット数: ${bots.length}
- 分析完了 (入出力確定): ${srcDone} / ${bots.length} (${Math.round((srcDone / bots.length) * 100)}%)
- 移行先開発完了: ${dstDone} / ${bots.length} (${Math.round((dstDone / bots.length) * 100)}%)
- オープンチケット: ${openTickets}件

## ランク別状況
| ランク | 本数 | 分析完了 | 開発完了 |
|--------|------|----------|----------|
${(["A", "B", "C", "D"] as const).map((r) => {
      const rb = bots.filter((b) => b.rank === r);
      return `| ${r} | ${rb.length} | ${rb.filter((b) => b.srcStatus === "ipo_done").length} | ${rb.filter((b) => b.dstStatus === "done").length} |`;
    }).join("\n")}

## 部署別状況
${[...new Set(bots.map((b) => b.department))].map((d) => {
      const db = bots.filter((b) => b.department === d);
      return `- ${d}: ${db.length}本 (完了: ${db.filter((b) => b.dstStatus === "done").length})`;
    }).join("\n")}

## コンサルタント別負荷
${[...new Set(bots.map((b) => b.consultant))].map((c) => {
      const cb = bots.filter((b) => b.consultant === c);
      return `- ${c}: ${cb.length}本担当 (完了: ${cb.filter((b) => b.dstStatus === "done").length}, 実装中: ${cb.filter((b) => b.dstStatus === "implementing").length})`;
    }).join("\n")}
`;
    downloadFile(report, `hmm_progress_report_${new Date().toISOString().slice(0, 10)}.md`, "text/markdown");
    setExported((prev) => [...prev, "report"]);
  };

  const exports = [
    { id: "bots-csv", title: "ボット一覧 (CSV)", desc: "全ボットの情報をCSV形式でエクスポート。Excel等で開けます。", count: `${bots.length}件`, action: exportBotsCsv, icon: "📊" },
    { id: "bots-json", title: "ボット一覧 (JSON)", desc: "全ボットの情報をJSON形式でエクスポート。API連携やデータ移行に。", count: `${bots.length}件`, action: exportBotsJson, icon: "🔧" },
    { id: "tickets-csv", title: "チケット一覧 (CSV)", desc: "全チケットの情報をCSV形式でエクスポート。", count: `${tickets.length}件`, action: exportTicketsCsv, icon: "🎫" },
    { id: "report", title: "進捗レポート (Markdown)", desc: "プロジェクト全体の進捗サマリーをMarkdown形式で生成。", count: "レポート", action: exportProgressReport, icon: "📋" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>エクスポート</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          プロジェクトデータを各種形式でダウンロード
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {exports.map((ex) => (
          <div key={ex.id} style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{ex.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ex.count}</div>
              </div>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{ex.desc}</p>
            <button
              onClick={ex.action}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "none",
                background: exported.includes(ex.id) ? "var(--success)" : "var(--primary)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {exported.includes(ex.id) ? "ダウンロード済み" : "ダウンロード"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
