"use client";

import { useEffect, useState } from "react";
import { getBots, updateBot, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, REVIEW_STATUS_MAP, Bot, members } from "@/lib/demo-data";

const owners = members.filter((m) => m.role === "customer");
const consultants = members.filter((m) => m.role === "consultant" || m.role === "manager");
const depts = ["経理部", "営業部", "人事部", "物流部", "総務部", "情報システム部", "購買部", "品質管理部"];
const ranks = ["A", "B", "C", "D"] as const;

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

export default function BotMasterPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [editing, setEditing] = useState<Bot | null>(null);
  const [editOwner, setEditOwner] = useState("");
  const [editConsultant, setEditConsultant] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRank, setEditRank] = useState<"A" | "B" | "C" | "D">("A");
  const [sortKey, setSortKey] = useState<"id" | "name" | "rank" | "department" | "owner">("id");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = bots.filter((b) => {
    if (deptFilter !== "all" && b.department !== deptFilter) return false;
    if (ownerFilter !== "all" && b.owner !== ownerFilter) return false;
    if (rankFilter !== "all" && b.rank !== rankFilter) return false;
    if (search && !b.name.includes(search) && !b.id.includes(search) && !b.owner.includes(search) && !b.consultant.includes(search)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const startEdit = (bot: Bot) => {
    setEditing(bot);
    setEditOwner(bot.owner);
    setEditConsultant(bot.consultant);
    setEditDept(bot.department);
    setEditRank(bot.rank);
  };

  const saveEdit = () => {
    if (!editing) return;
    updateBot(editing.id, { owner: editOwner, consultant: editConsultant, department: editDept, rank: editRank });
    setEditing(null);
  };

  // Summary
  const ownerList = [...new Set(bots.map((b) => b.owner))];
  const ownerStats = ownerList.map((o) => ({
    name: o,
    total: bots.filter((b) => b.owner === o).length,
    done: bots.filter((b) => b.owner === o && b.dstStatus === "done").length,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>ボットマスタ管理</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            ボットの担当者・部署・ランクの割当と管理
          </p>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          全 {bots.length} 本 / 表示 {filtered.length} 本
        </div>
      </div>

      {/* Owner Summary Cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {ownerStats.map((o) => (
          <div
            key={o.name}
            onClick={() => setOwnerFilter(ownerFilter === o.name ? "all" : o.name)}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              background: "var(--card)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              cursor: "pointer",
              minWidth: 100,
              textAlign: "center",
              border: ownerFilter === o.name ? "2px solid var(--primary)" : "1px solid var(--border)",
              opacity: ownerFilter !== "all" && ownerFilter !== o.name ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{o.name}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{o.total}</div>
            <div style={{ fontSize: 10, color: "var(--success)" }}>完了 {o.done}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="検索 (ID, 名前, 担当者)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, width: 220 }}
        />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
          <option value="all">全部署</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
          <option value="all">全担当者</option>
          {ownerList.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
          <option value="all">全ランク</option>
          {ranks.map((r) => <option key={r} value={r}>ランク{r}</option>)}
        </select>
        {(deptFilter !== "all" || ownerFilter !== "all" || rankFilter !== "all" || search) && (
          <button
            onClick={() => { setDeptFilter("all"); setOwnerFilter("all"); setRankFilter("all"); setSearch(""); }}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 12 }}
          >
            クリア
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: editing ? "1fr 380px" : "1fr", gap: 20 }}>
        {/* Table */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {([
                  { key: "id", label: "ID" },
                  { key: "name", label: "ボット名" },
                  { key: "department", label: "部署" },
                  { key: "owner", label: "業務担当者" },
                  { key: "rank", label: "ランク" },
                ] as { key: typeof sortKey; label: string }[]).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
                  >
                    {col.label} {sortKey === col.key ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                ))}
                <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>コンサルタント</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>分析</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>開発</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr
                  key={b.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: editing?.id === b.id ? "#e3f2fd" : "transparent",
                  }}
                >
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{b.id}</td>
                  <td style={{ padding: "8px 12px" }}>{b.name}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.department}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>{b.owner}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontWeight: 700, color: b.rank === "A" ? "var(--success)" : b.rank === "B" ? "var(--primary)" : b.rank === "C" ? "var(--warning)" : "var(--danger)" }}>
                      {b.rank}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{b.consultant}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <Badge label={SRC_STATUS_MAP[b.srcStatus].label} color={SRC_STATUS_MAP[b.srcStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <Badge label={DST_STATUS_MAP[b.dstStatus].label} color={DST_STATUS_MAP[b.dstStatus].color} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      onClick={() => startEdit(b)}
                      style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 11 }}
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Panel */}
        {editing && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>担当割当の編集</h3>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>

            <div style={{ fontSize: 12, marginBottom: 12, padding: "8px 10px", background: "#f5f5f5", borderRadius: 4 }}>
              <strong>{editing.id}</strong> - {editing.name}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>業務担当者（オーナー）</label>
              <select value={editOwner} onChange={(e) => setEditOwner(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
                {owners.map((o) => <option key={o.id} value={o.name.split(" ")[0]}>{o.name} ({o.department})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>コンサルタント</label>
              <select value={editConsultant} onChange={(e) => setEditConsultant(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
                {consultants.map((c) => <option key={c.id} value={c.name.split(" ")[0]}>{c.name} ({c.role === "manager" ? "HMMリード" : "コンサルタント"})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>部署</label>
              <select value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ランク</label>
              <div style={{ display: "flex", gap: 8 }}>
                {ranks.map((r) => (
                  <button
                    key={r}
                    onClick={() => setEditRank(r)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 6,
                      border: editRank === r ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: editRank === r ? "#e3f2fd" : "var(--card)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      color: r === "A" ? "var(--success)" : r === "B" ? "var(--primary)" : r === "C" ? "var(--warning)" : "var(--danger)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: "8px 20px", borderRadius: 6, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                保存
              </button>
              <button onClick={() => setEditing(null)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 13 }}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
