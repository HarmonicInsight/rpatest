"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, REVIEW_STATUS_MAP, Bot, SrcStatus, ReviewStatus } from "@/lib/demo-data";

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function SourcePage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Bot | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ bizReq: "", funcReq: "", ipoInput: "", ipoProcess: "", ipoOutput: "" });

  const filtered = bots.filter((b) => {
    if (statusFilter !== "all" && b.srcStatus !== statusFilter) return false;
    if (search && !b.name.includes(search) && !b.id.includes(search) && !b.owner.includes(search)) return false;
    return true;
  });

  const openDetail = (bot: Bot) => {
    setDetail(bot);
    setEditMode(false);
    setEditData({ bizReq: bot.bizReq, funcReq: bot.funcReq, ipoInput: bot.ipoInput, ipoProcess: bot.ipoProcess, ipoOutput: bot.ipoOutput });
  };

  const saveEdit = () => {
    if (!detail) return;
    updateBot(detail.id, editData);
    setDetail({ ...detail, ...editData });
    setEditMode(false);
  };

  const advanceStatus = (bot: Bot) => {
    const order: SrcStatus[] = ["not_started", "biz_analyzing", "biz_done", "func_analyzing", "func_done", "ipo_done"];
    const idx = order.indexOf(bot.srcStatus);
    if (idx < order.length - 1) {
      updateBot(bot.id, { srcStatus: order[idx + 1] });
      if (detail?.id === bot.id) setDetail({ ...bot, srcStatus: order[idx + 1] });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>移行元分析</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            {Object.entries(SRC_STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 450px" : "1fr", gap: 20 }}>
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", position: "sticky", top: 0, background: "var(--card)" }}>
                {["ID", "ボット名", "部署", "担当者", "ランク", "分析ステータス", "レビュー", "操作"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: detail?.id === b.id ? "#e3f2fd" : "transparent" }}
                  onClick={() => openDetail(b)}
                >
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{b.id}</td>
                  <td style={{ padding: "8px 12px" }}>{b.name}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.department}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.owner}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontWeight: 700, color: b.rank === "A" ? "var(--success)" : b.rank === "B" ? "var(--primary)" : b.rank === "C" ? "var(--warning)" : "var(--danger)" }}>{b.rank}</span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge label={SRC_STATUS_MAP[b.srcStatus].label} color={SRC_STATUS_MAP[b.srcStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge label={REVIEW_STATUS_MAP[b.reviewStatus].label} color={REVIEW_STATUS_MAP[b.reviewStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {b.srcStatus !== "ipo_done" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); advanceStatus(b); }}
                        style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 11 }}
                      >
                        進める
                      </button>
                    )}
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
              <div style={{ display: "flex", gap: 8 }}>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 12 }}>
                    編集
                  </button>
                )}
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
              </div>
            </div>

            {editMode ? (
              <div>
                <FieldEditor label="業務要件" value={editData.bizReq} onChange={(v) => setEditData({ ...editData, bizReq: v })} />
                <FieldEditor label="機能要件" value={editData.funcReq} onChange={(v) => setEditData({ ...editData, funcReq: v })} />
                <FieldEditor label="IPO Input" value={editData.ipoInput} onChange={(v) => setEditData({ ...editData, ipoInput: v })} />
                <FieldEditor label="IPO Process" value={editData.ipoProcess} onChange={(v) => setEditData({ ...editData, ipoProcess: v })} />
                <FieldEditor label="IPO Output" value={editData.ipoOutput} onChange={(v) => setEditData({ ...editData, ipoOutput: v })} />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={saveEdit} style={{ padding: "6px 16px", borderRadius: 4, border: "none", background: "var(--success)", color: "#fff", cursor: "pointer", fontSize: 13 }}>保存</button>
                  <button onClick={() => setEditMode(false)} style={{ padding: "6px 16px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 13 }}>キャンセル</button>
                </div>
              </div>
            ) : (
              <div>
                <Section title="業務要件" text={detail.bizReq} />
                <Section title="機能要件" text={detail.funcReq} />
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>IPO定義</h4>
                <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Input:</strong> {detail.ipoInput}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Process:</strong> {detail.ipoProcess}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Output:</strong> {detail.ipoOutput}</div>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
                <div style={{ fontSize: 12, marginBottom: 4 }}><strong>パターン:</strong> {detail.pattern}</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}><strong>対象システム:</strong> {detail.srcSystems}</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}><strong>見積工数:</strong> {detail.estimateHours}h</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{title}</h4>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function FieldEditor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
      />
    </div>
  );
}
