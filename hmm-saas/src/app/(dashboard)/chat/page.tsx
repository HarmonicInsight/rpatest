"use client";

import { useState, useRef, useEffect } from "react";
import { getBots, getTickets } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, demoChatMessages } from "@/lib/demo-data";

type Message = { role: "user" | "assistant"; content: string; actions?: ActionButton[] };
type ActionButton = { label: string; query: string };

const quickCommands = [
  { label: "今日の進捗", query: "今日の進捗状況を教えて", icon: "📊" },
  { label: "ブロック確認", query: "ブロック中・リスクのあるボットを教えて", icon: "⚠️" },
  { label: "レビュー催促", query: "レビュー期限超過の担当者に催促して", icon: "📧" },
  { label: "ランク別状況", query: "ランク別の進捗状況を教えて", icon: "📈" },
  { label: "チケット状況", query: "未対応チケットの状況を教えて", icon: "🎫" },
  { label: "週次レポート", query: "週次レポートを生成して", icon: "📋" },
  { label: "担当者負荷", query: "コンサルタント別の負荷状況を教えて", icon: "👥" },
  { label: "次のアクション", query: "今やるべきアクションを教えて", icon: "🎯" },
];

function generateResponse(query: string): { content: string; actions?: ActionButton[] } {
  const bots = getBots();
  const tickets = getTickets();

  // Real data calculations
  const total = bots.length;
  const srcDone = bots.filter((b) => b.srcStatus === "ipo_done").length;
  const dstDone = bots.filter((b) => b.dstStatus === "done").length;
  const testing = bots.filter((b) => b.dstStatus === "testing").length;
  const implementing = bots.filter((b) => b.dstStatus === "implementing").length;
  const designing = bots.filter((b) => b.dstStatus === "designing").length;
  const blocked = bots.filter((b) => b.dstStatus === "blocked").length;
  const reviewPending = bots.filter((b) => b.reviewStatus === "pending" || b.reviewStatus === "in_review");
  const openTickets = tickets.filter((t) => t.status === "open");
  const highTickets = openTickets.filter((t) => t.priority === "high");

  const rankA = bots.filter((b) => b.rank === "A");
  const rankB = bots.filter((b) => b.rank === "B");
  const rankC = bots.filter((b) => b.rank === "C");
  const rankD = bots.filter((b) => b.rank === "D");

  if (query.includes("進捗")) {
    return {
      content: `## 本日の進捗サマリー

**全体状況:** ${total}本中、移行完了 ${dstDone}本（${Math.round((dstDone / total) * 100)}%）

### 移行元分析
- IPO確定: ${srcDone}本
- 機能要件分析中/完了: ${bots.filter((b) => b.srcStatus === "func_analyzing" || b.srcStatus === "func_done").length}本
- 業務要件分析中/完了: ${bots.filter((b) => b.srcStatus === "biz_analyzing" || b.srcStatus === "biz_done").length}本
- 未着手: ${bots.filter((b) => b.srcStatus === "not_started").length}本

### 移行先開発
- 完了: ${dstDone}本 / テスト中: ${testing}本 / 実装中: ${implementing}本 / 設計中: ${designing}本
${blocked > 0 ? `- ⚠️ ブロック中: ${blocked}本` : "- ブロック: なし"}

### 要注意事項
${highTickets.length > 0 ? highTickets.map((t) => `- ⚠️ **${t.botId}** ${t.title}（高優先）`).join("\n") : "- 高優先チケットなし"}
${reviewPending.length > 0 ? `- 📋 レビュー待ち: ${reviewPending.length}件` : ""}`,
      actions: [
        { label: "レビュー待ちの催促", query: "レビュー期限超過の担当者に催促して" },
        { label: "ブロック詳細", query: "ブロック中・リスクのあるボットを教えて" },
      ],
    };
  }

  if (query.includes("ブロック") || query.includes("リスク")) {
    const blockedBots = bots.filter((b) => b.dstStatus === "blocked");
    const riskBots = highTickets.map((t) => {
      const bot = bots.find((b) => b.id === t.botId);
      return bot ? `- **${bot.id}** ${bot.name}（${t.title}）担当: ${bot.consultant}` : "";
    }).filter(Boolean);

    return {
      content: `## リスク・ブロック状況

### ブロック中のボット: ${blockedBots.length}本
${blockedBots.length > 0 ? blockedBots.map((b) => `- **${b.id}** ${b.name} (${b.department}) 担当: ${b.consultant}`).join("\n") : "なし"}

### 高優先チケット（未解決）: ${highTickets.length}件
${riskBots.length > 0 ? riskBots.join("\n") : "なし"}

### レビュー長期未対応: ${reviewPending.filter((b) => b.reviewStatus === "pending").length}件
${reviewPending.filter((b) => b.reviewStatus === "pending").slice(0, 5).map((b) => `- **${b.id}** ${b.name} → ${b.owner}さん確認待ち`).join("\n") || "なし"}

${highTickets.length > 0 ? "高優先チケットの対応を推奨します。" : "現時点で重大なリスクはありません。"}`,
      actions: highTickets.length > 0
        ? [{ label: "担当者に連絡", query: "高優先チケットの担当者にメールを送って" }]
        : undefined,
    };
  }

  if (query.includes("催促") || query.includes("メール")) {
    const pending = reviewPending.filter((b) => b.reviewStatus === "pending");
    const byOwner: Record<string, string[]> = {};
    pending.forEach((b) => {
      if (!byOwner[b.owner]) byOwner[b.owner] = [];
      byOwner[b.owner].push(`${b.id} ${b.name}`);
    });

    return {
      content: `## 催促メール送信（デモ）

以下の担当者にレビュー催促メールを送信しました:

${Object.entries(byOwner).map(([owner, bots]) => `### ${owner}さん（${bots.length}件）
${bots.map((b) => `- ${b}`).join("\n")}

> ${owner}様
> お忙しいところ恐れ入ります。下記ボットのIPOレビューについて、ご確認をお願いいたします。
> ${bots.map((b) => `- ${b}`).join("\n> ")}
> ご不明点がございましたら、チャットからお気軽にご質問ください。`).join("\n\n")}

次回チェック時（30分後）に回答状況を確認します。`,
    };
  }

  if (query.includes("ランク")) {
    return {
      content: `## ランク別進捗

| ランク | 本数 | IPO確定 | 開発完了 | 完了率 |
|--------|------|---------|----------|--------|
| A（単純移行） | ${rankA.length} | ${rankA.filter((b) => b.srcStatus === "ipo_done").length} | ${rankA.filter((b) => b.dstStatus === "done").length} | ${Math.round((rankA.filter((b) => b.dstStatus === "done").length / rankA.length) * 100)}% |
| B（軽微変更） | ${rankB.length} | ${rankB.filter((b) => b.srcStatus === "ipo_done").length} | ${rankB.filter((b) => b.dstStatus === "done").length} | ${Math.round((rankB.filter((b) => b.dstStatus === "done").length / rankB.length) * 100)}% |
| C（中規模改修） | ${rankC.length} | ${rankC.filter((b) => b.srcStatus === "ipo_done").length} | ${rankC.filter((b) => b.dstStatus === "done").length} | ${Math.round((rankC.filter((b) => b.dstStatus === "done").length / rankC.length) * 100)}% |
| D（再構築） | ${rankD.length} | ${rankD.filter((b) => b.srcStatus === "ipo_done").length} | ${rankD.filter((b) => b.dstStatus === "done").length} | ${Math.round((rankD.filter((b) => b.dstStatus === "done").length / rankD.length) * 100)}% |

**推奨:** ランクAを優先的に完了させ、成功体験とテンプレートを蓄積してからB→C→Dの順に進めるのが効率的です。`,
      actions: [
        { label: "ランクAの詳細", query: "ランクAで未完了のボット一覧を教えて" },
      ],
    };
  }

  if (query.includes("チケット")) {
    return {
      content: `## チケット状況

- **オープン:** ${openTickets.length}件
- **対応中:** ${tickets.filter((t) => t.status === "inprogress").length}件
- **解決済:** ${tickets.filter((t) => t.status === "resolved").length}件
- **クローズ:** ${tickets.filter((t) => t.status === "closed").length}件

### 高優先（未解決）
${highTickets.map((t) => `- **${t.id}** ${t.title} (${t.botId}) 担当: ${t.assignee || "未割当"}`).join("\n") || "なし"}

### 未割当チケット
${tickets.filter((t) => !t.assignee && t.status !== "closed").map((t) => `- **${t.id}** ${t.title}`).join("\n") || "なし"}`,
      actions: highTickets.length > 0
        ? [{ label: "高優先の対応催促", query: "高優先チケットの担当者にメールを送って" }]
        : undefined,
    };
  }

  if (query.includes("レポート") || query.includes("週次")) {
    return {
      content: `## 週次レポート（自動生成）

**期間:** 2026-01-27 〜 2026-02-02

### 今週の成果
- 移行完了: +3本（累計 ${dstDone}本）
- IPO確定: +5本（累計 ${srcDone}本）
- チケット解決: 2件

### 来週の予定
- ランクAの残り${rankA.filter((b) => b.srcStatus !== "ipo_done").length}本の分析完了目標
- BOT-091 SAP接続問題の解決
- テスト中${testing}本のUAT完了目標

### KPI
- 分析完了率: ${Math.round((srcDone / total) * 100)}%（目標: 40%）
- 開発完了率: ${Math.round((dstDone / total) * 100)}%（目標: 15%）

レポートをMarkdownでエクスポートしますか？`,
      actions: [{ label: "エクスポート画面へ", query: "エクスポート画面を開いて" }],
    };
  }

  if (query.includes("負荷") || query.includes("コンサルタント")) {
    const consultantNames = [...new Set(bots.map((b) => b.consultant))];
    const consultantStats = consultantNames.map((c) => {
      const cb = bots.filter((b) => b.consultant === c);
      return {
        name: c,
        total: cb.length,
        active: cb.filter((b) => b.dstStatus === "implementing" || b.dstStatus === "designing" || b.dstStatus === "testing").length,
        done: cb.filter((b) => b.dstStatus === "done").length,
      };
    });

    return {
      content: `## コンサルタント別負荷状況

| 担当者 | 総担当 | アクティブ | 完了 | 負荷率 |
|--------|--------|-----------|------|--------|
${consultantStats.map((c) => `| ${c.name} | ${c.total}本 | ${c.active}本 | ${c.done}本 | ${c.active > 10 ? "⚠️高" : c.active > 5 ? "中" : "低"} |`).join("\n")}

${consultantStats.some((c) => c.active > 10) ? "⚠️ 負荷の高い担当者がいます。タスクの再分配を検討してください。" : "現時点で負荷は均等に分散されています。"}`,
    };
  }

  if (query.includes("アクション") || query.includes("やるべき")) {
    const actions: string[] = [];
    if (highTickets.length > 0) actions.push(`1. 高優先チケット${highTickets.length}件の対応（${highTickets.map((t) => t.botId).join(", ")}）`);
    if (reviewPending.length > 0) actions.push(`${actions.length + 1}. レビュー待ち${reviewPending.length}件の催促`);
    const notStarted = bots.filter((b) => b.srcStatus === "not_started");
    if (notStarted.length > 0) actions.push(`${actions.length + 1}. 未着手ボット${notStarted.length}本の分析開始`);
    if (testing > 0) actions.push(`${actions.length + 1}. テスト中${testing}本のUAT実施`);
    actions.push(`${actions.length + 1}. 週次レポートの確認と共有`);

    return {
      content: `## 推奨アクション（優先順）

${actions.join("\n")}

上記の順番で対応することを推奨します。最も影響の大きい項目から順に並べています。`,
      actions: [
        { label: "催促メール送信", query: "レビュー期限超過の担当者に催促して" },
        { label: "チケット確認", query: "未対応チケットの状況を教えて" },
      ],
    };
  }

  // Default
  return {
    content: `ご質問ありがとうございます。以下のコマンドでプロジェクト状況を確認できます:

- **進捗確認**: 「今日の進捗状況を教えて」
- **リスク確認**: 「ブロック中・リスクのあるボットを教えて」
- **催促**: 「レビュー期限超過の担当者に催促して」
- **ランク別**: 「ランク別の進捗状況を教えて」
- **チケット**: 「未対応チケットの状況を教えて」
- **レポート**: 「週次レポートを生成して」
- **負荷確認**: 「コンサルタント別の負荷状況を教えて」
- **推奨**: 「今やるべきアクションを教えて」

本番環境ではClaude Opusが自然言語で全ての質問に対応します。`,
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(demoChatMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isTyping) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const { content, actions } = generateResponse(msg);
      setMessages((prev) => [...prev, { role: "assistant", content, actions }]);
      setIsTyping(false);
    }, 800 + Math.random() * 800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 104px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>AI アシスタント</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>オンライン（デモ）</span>
        </div>
      </div>

      {/* Quick Commands */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {quickCommands.map((cmd) => (
          <button
            key={cmd.query}
            onClick={() => send(cmd.query)}
            disabled={isTyping}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: isTyping ? "default" : "pointer",
              fontSize: 12,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: isTyping ? 0.5 : 1,
            }}
          >
            <span>{cmd.icon}</span> {cmd.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--card)", borderRadius: "8px 8px 0 0", padding: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{ maxWidth: msg.role === "assistant" ? "80%" : "60%" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: msg.role === "user" ? "var(--primary)" : "#f5f5f5",
                  color: msg.role === "user" ? "#fff" : "var(--text)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>AI</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>HMM Assistant</span>
                  </div>
                )}
                {msg.content}
              </div>
              {/* Action Buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {msg.actions.map((action, j) => (
                    <button
                      key={j}
                      onClick={() => send(action.query)}
                      disabled={isTyping}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--purple)",
                        background: "transparent",
                        color: "var(--purple)",
                        cursor: isTyping ? "default" : "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "#f5f5f5", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>AI</span>
              <span>分析中...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, padding: 12, background: "var(--card)", borderTop: "1px solid var(--border)", borderRadius: "0 0 8px 8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="質問やコマンドを入力..."
          style={{ flex: 1, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, outline: "none" }}
        />
        <button
          onClick={() => send()}
          disabled={isTyping || !input.trim()}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: isTyping || !input.trim() ? "#ccc" : "var(--primary)",
            color: "#fff",
            cursor: isTyping || !input.trim() ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}
