"use client";

import { useState, useRef, useEffect } from "react";
import { demoChatMessages } from "@/lib/demo-data";

type Message = { role: "user" | "assistant"; content: string };

const demoResponses: Record<string, string> = {
  "ランクAの進捗": `## ランクAボット（単純移行）進捗状況

40本中の状況:
- **IPO確定済:** 18本
- **機能要件完了:** 8本
- **業務要件分析中/完了:** 10本
- **未着手:** 4本

ランクAは移行パターンが確立されているため、順調に進行中です。
残り4本も今週中に分析開始予定です。`,
  "ブロック": `## ブロック中のボット

現在ブロック状態のボットはありません。

ただし、注意が必要なボット:
- **BOT-091** SAP接続タイムアウト（高優先チケット対応中）
- **BOT-115** OCR認識率問題（代替手法検討中）

これらは現在チケットで対応中ですが、解決が遅れるとブロック状態になる可能性があります。`,
  "default": `申し訳ございませんが、デモモードではプリセットの回答のみ対応しています。

以下のトピックをお試しください:
- 「今日の進捗状況を教えて」
- 「ランクAの進捗」
- 「ブロック」
- 「田中さんの分だけ催促して」

本番環境ではClaude Opusが自然言語で全ての質問に回答します。`,
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(demoChatMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const key = Object.keys(demoResponses).find((k) => input.includes(k));
      const response = key ? demoResponses[key] : demoResponses["default"];
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 104px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>AI アシスタント</h2>
        <span style={{ fontSize: 11, padding: "4px 10px", background: "#fff3e0", color: "var(--warning)", borderRadius: 10, fontWeight: 600 }}>
          デモモード（Claude Opus連携は本番版で提供）
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--card)", borderRadius: "8px 8px 0 0", padding: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div
              style={{
                maxWidth: "70%",
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
          </div>
        ))}
        {isTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "#f5f5f5", fontSize: 13 }}>
              <span style={{ display: "inline-block", animation: "pulse 1.2s infinite" }}>入力中...</span>
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
          placeholder="メッセージを入力... (例: 今日の進捗状況を教えて)"
          style={{ flex: 1, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, outline: "none" }}
        />
        <button
          onClick={send}
          disabled={isTyping}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: isTyping ? "#ccc" : "var(--primary)",
            color: "#fff",
            cursor: isTyping ? "default" : "pointer",
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
