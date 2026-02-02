"use client";

import { useEffect, useState } from "react";
import { getTickets, getBots, addTicket, updateTicket, addTicketComment, subscribe } from "@/lib/store";
import { Ticket } from "@/lib/demo-data";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  bug: { label: "バグ", color: "#c62828" },
  feature: { label: "機能追加", color: "#1565C0" },
  question: { label: "質問", color: "#00838F" },
  improvement: { label: "改善", color: "#7B1FA2" },
  uat: { label: "UAT", color: "#F57C00" },
};
const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "#c62828" },
  medium: { label: "中", color: "#F57C00" },
  low: { label: "低", color: "#9e9e9e" },
};
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "オープン", color: "#1976D2" },
  inprogress: { label: "対応中", color: "#F57C00" },
  resolved: { label: "解決済", color: "#2E7D32" },
  closed: { label: "クローズ", color: "#9e9e9e" },
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function TicketsPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const tickets = getTickets();
  const bots = getBots();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [filter, setFilter] = useState<string>("all");

  // New ticket form state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newBot, setNewBot] = useState("");
  const [newType, setNewType] = useState<"bug" | "feature" | "question" | "improvement" | "uat">("bug");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const filtered = tickets.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const submitTicket = () => {
    if (!newTitle.trim()) return;
    addTicket({
      botId: newBot || "BOT-001",
      title: newTitle,
      body: newBody,
      type: newType,
      priority: newPriority,
      status: "open",
      assignee: "",
      reporter: "鈴木",
    });
    setNewTitle("");
    setNewBody("");
    setNewBot("");
    setShowNew(false);
  };

  const submitComment = () => {
    if (!selected || !commentText.trim()) return;
    addTicketComment(selected.id, "鈴木", commentText);
    setCommentText("");
    // refresh selected
    const updated = getTickets().find((t) => t.id === selected.id);
    if (updated) setSelected(updated);
  };

  const changeStatus = (ticket: Ticket, status: "open" | "inprogress" | "resolved" | "closed") => {
    updateTicket(ticket.id, { status });
    if (selected?.id === ticket.id) {
      setSelected({ ...ticket, status });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>チケット管理</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
            <option value="all">全て</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNew(!showNew)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            + 新規チケット
          </button>
        </div>
      </div>

      {/* New Ticket Form */}
      {showNew && (
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 20, border: "2px solid var(--primary)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>新規チケット作成</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>対象ボット</label>
              <select value={newBot} onChange={(e) => setNewBot(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}>
                <option value="">選択...</option>
                {bots.slice(0, 30).map((b) => (
                  <option key={b.id} value={b.id}>{b.id} - {b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>種別</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}>
                {Object.entries(TYPE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>優先度</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as typeof newPriority)} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}>
                {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>タイトル</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="チケットタイトル..." style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>説明</label>
            <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={3} placeholder="詳細を記入..." style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitTicket} style={{ padding: "6px 20px", borderRadius: 4, border: "none", background: "var(--success)", color: "#fff", cursor: "pointer", fontSize: 13 }}>作成</button>
            <button onClick={() => setShowNew(false)} style={{ padding: "6px 20px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 13 }}>キャンセル</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20 }}>
        {/* Ticket List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => { setSelected(t); setCommentText(""); }}
              style={{
                background: "var(--card)",
                borderRadius: 8,
                padding: "14px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                cursor: "pointer",
                borderLeft: `4px solid ${PRIORITY_MAP[t.priority]?.color || "#ccc"}`,
                border: selected?.id === t.id ? "2px solid var(--primary)" : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{t.id}</span>
                  <Badge label={TYPE_MAP[t.type]?.label || t.type} color={TYPE_MAP[t.type]?.color || "#999"} />
                  <Badge label={STATUS_MAP[t.status]?.label || t.status} color={STATUS_MAP[t.status]?.color || "#999"} />
                </div>
                <Badge label={PRIORITY_MAP[t.priority]?.label || t.priority} color={PRIORITY_MAP[t.priority]?.color || "#999"} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {t.botId} | 報告: {t.reporter} | 担当: {t.assignee || "未割当"} | {t.comments.length}件のコメント | {t.updated}
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{selected.title}</h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge label={TYPE_MAP[selected.type]?.label || selected.type} color={TYPE_MAP[selected.type]?.color || "#999"} />
              <Badge label={STATUS_MAP[selected.status]?.label || selected.status} color={STATUS_MAP[selected.status]?.color || "#999"} />
              <Badge label={`優先: ${PRIORITY_MAP[selected.priority]?.label}`} color={PRIORITY_MAP[selected.priority]?.color || "#999"} />
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{selected.body}</p>
            <div style={{ fontSize: 12, marginBottom: 4 }}><strong>対象ボット:</strong> {selected.botId}</div>
            <div style={{ fontSize: 12, marginBottom: 4 }}><strong>報告者:</strong> {selected.reporter}</div>
            <div style={{ fontSize: 12, marginBottom: 12 }}><strong>担当者:</strong> {selected.assignee || "未割当"}</div>

            {/* Status Change */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
              {(["open", "inprogress", "resolved", "closed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(selected, s)}
                  disabled={selected.status === s}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: `1px solid ${STATUS_MAP[s].color}`,
                    background: selected.status === s ? STATUS_MAP[s].color : "transparent",
                    color: selected.status === s ? "#fff" : STATUS_MAP[s].color,
                    cursor: selected.status === s ? "default" : "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {STATUS_MAP[s].label}
                </button>
              ))}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

            {/* Comments */}
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>コメント ({selected.comments.length})</h4>
            {selected.comments.map((c, i) => (
              <div key={i} style={{ padding: "8px 10px", background: "#f5f5f5", borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong>{c.author}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.date}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="コメントを入力..."
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}
              />
              <button
                onClick={submitComment}
                style={{ padding: "6px 14px", borderRadius: 4, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 12 }}
              >
                送信
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
