"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, addTicket, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, REVIEW_STATUS_MAP, DST_STATUS_MAP, Bot } from "@/lib/demo-data";

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function PortalReviewPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [selected, setSelected] = useState<Bot | null>(null);
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqBody, setReqBody] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");

  // Bots that have review status
  const reviewable = bots.filter((b) => b.reviewStatus !== "none");
  const owners = [...new Set(bots.map((b) => b.owner))];

  const filtered = reviewable.filter((b) => {
    if (ownerFilter !== "all" && b.owner !== ownerFilter) return false;
    return true;
  });

  const approve = (bot: Bot) => {
    updateBot(bot.id, { reviewStatus: "approved" });
    if (selected?.id === bot.id) setSelected({ ...bot, reviewStatus: "approved" });
  };

  const reject = (bot: Bot) => {
    updateBot(bot.id, { reviewStatus: "rejected" });
    if (selected?.id === bot.id) setSelected({ ...bot, reviewStatus: "rejected" });
  };

  const submitRequest = () => {
    if (!selected || !reqTitle.trim()) return;
    addTicket({
      botId: selected.id,
      title: reqTitle,
      body: reqBody,
      type: "feature",
      priority: "medium",
      status: "open",
      assignee: selected.consultant,
      reporter: selected.owner,
    });
    setReqTitle("");
    setReqBody("");
    setShowReqForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>顧客ポータル - 仕様確認・要望</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            ボットの分析結果を確認し、承認または差戻しを行えます。新しい業務要件の追加も可能です。
          </p>
        </div>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
          <option value="all">全担当者</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {(["pending", "in_review", "approved", "rejected"] as const).map((s) => {
          const count = filtered.filter((b) => b.reviewStatus === s).length;
          return (
            <div key={s} style={{ padding: "12px 20px", borderRadius: 8, background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 100, borderBottom: `3px solid ${REVIEW_STATUS_MAP[s].color}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: REVIEW_STATUS_MAP[s].color }}>{count}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{REVIEW_STATUS_MAP[s].label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 480px" : "1fr", gap: 20 }}>
        {/* Bot List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => { setSelected(b); setShowReqForm(false); }}
              style={{
                background: "var(--card)",
                borderRadius: 8,
                padding: "14px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                cursor: "pointer",
                border: selected?.id === b.id ? "2px solid var(--primary)" : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{b.id}</span>
                  <StatusBadge label={SRC_STATUS_MAP[b.srcStatus].label} color={SRC_STATUS_MAP[b.srcStatus].color} />
                  <StatusBadge label={REVIEW_STATUS_MAP[b.reviewStatus].label} color={REVIEW_STATUS_MAP[b.reviewStatus].color} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.department}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>担当: {b.owner} / コンサルタント: {b.consultant}</div>
            </div>
          ))}
        </div>

        {/* Detail & Action Panel */}
        {selected && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <StatusBadge label={SRC_STATUS_MAP[selected.srcStatus].label} color={SRC_STATUS_MAP[selected.srcStatus].color} />
              <StatusBadge label={DST_STATUS_MAP[selected.dstStatus].label} color={DST_STATUS_MAP[selected.dstStatus].color} />
              <StatusBadge label={REVIEW_STATUS_MAP[selected.reviewStatus].label} color={REVIEW_STATUS_MAP[selected.reviewStatus].color} />
            </div>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>業務要件</h4>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 10px", background: "#f5f5f5", borderRadius: 4 }}>{selected.bizReq}</p>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>機能要件</h4>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 10px", background: "#f5f5f5", borderRadius: 4 }}>{selected.funcReq}</p>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>IPO定義</h4>
            <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 10px", background: "#e3f2fd", borderRadius: 4 }}><strong>Input:</strong> {selected.ipoInput}</div>
            <div style={{ fontSize: 12, marginBottom: 6, padding: "6px 10px", background: "#fff3e0", borderRadius: 4 }}><strong>Process:</strong> {selected.ipoProcess}</div>
            <div style={{ fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "#e8f5e9", borderRadius: 4 }}><strong>Output:</strong> {selected.ipoOutput}</div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {selected.reviewStatus !== "approved" && (
                <button onClick={() => approve(selected)} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "var(--success)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  承認する
                </button>
              )}
              {selected.reviewStatus !== "rejected" && (
                <button onClick={() => reject(selected)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  差戻し
                </button>
              )}
              <button onClick={() => setShowReqForm(!showReqForm)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--purple)", background: "transparent", color: "var(--purple)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                要望を出す
              </button>
            </div>

            {showReqForm && (
              <div style={{ border: "1px solid var(--purple)", borderRadius: 6, padding: 14, background: "#f3e5f5" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--purple)" }}>新しい要望・要件追加</h4>
                <div style={{ marginBottom: 8 }}>
                  <input value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} placeholder="要望タイトル..." style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <textarea value={reqBody} onChange={(e) => setReqBody(e.target.value)} placeholder="詳細..." rows={3} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={submitRequest} style={{ padding: "6px 16px", borderRadius: 4, border: "none", background: "var(--purple)", color: "#fff", cursor: "pointer", fontSize: 12 }}>送信</button>
                  <button onClick={() => setShowReqForm(false)} style={{ padding: "6px 16px", borderRadius: 4, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 12 }}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
