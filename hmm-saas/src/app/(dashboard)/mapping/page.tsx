"use client";

import { useEffect, useState } from "react";
import { getBots, subscribe } from "@/lib/store";
import { SRC_STATUS_MAP, DST_STATUS_MAP, Bot } from "@/lib/demo-data";

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: color }}>
      {label}
    </span>
  );
}

function MappingCard({ bot, onSelect }: { bot: Bot; onSelect: (b: Bot) => void }) {
  const srcInfo = SRC_STATUS_MAP[bot.srcStatus];
  const dstInfo = DST_STATUS_MAP[bot.dstStatus];
  return (
    <div
      onClick={() => onSelect(bot)}
      style={{
        background: "var(--card)",
        borderRadius: 8,
        padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "pointer",
        border: "1px solid var(--border)",
        transition: "box-shadow 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{bot.id}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: bot.rank === "A" ? "var(--success)" : bot.rank === "B" ? "var(--primary)" : bot.rank === "C" ? "var(--warning)" : "var(--danger)" }}>
          ランク{bot.rank}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{bot.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>移行元 ({bot.srcPlatform})</div>
          <StatusBadge label={srcInfo.label} color={srcInfo.color} />
          <div style={{ height: 4, borderRadius: 2, background: "#e0e0e0", marginTop: 6 }}>
            <div style={{ height: "100%", borderRadius: 2, background: srcInfo.color, width: `${srcInfo.pct}%` }} />
          </div>
        </div>
        <div style={{ fontSize: 18, color: "var(--text-muted)" }}>→</div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>移行先 ({bot.dstPlatform})</div>
          <StatusBadge label={dstInfo.label} color={dstInfo.color} />
          <div style={{ height: 4, borderRadius: 2, background: "#e0e0e0", marginTop: 6 }}>
            <div style={{ height: "100%", borderRadius: 2, background: dstInfo.color, width: `${dstInfo.pct}%` }} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{bot.department} / {bot.owner} / {bot.consultant}</div>
    </div>
  );
}

export default function MappingPage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Bot | null>(null);

  const filtered = bots.filter((b) => {
    if (filter !== "all" && b.rank !== filter) return false;
    if (search && !b.name.includes(search) && !b.id.includes(search) && !b.department.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>入出力 対応表</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, width: 200 }}
          />
          {["all", "A", "B", "C", "D"].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: filter === r ? "var(--primary)" : "var(--card)",
                color: filter === r ? "#fff" : "var(--text)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {r === "all" ? "全て" : `ランク${r}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 400px" : "1fr", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, alignContent: "start" }}>
          {filtered.map((b) => (
            <MappingCard key={b.id} bot={b} onSelect={setSelected} />
          ))}
        </div>

        {selected && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
            </div>
            <DetailRow label="ID" value={selected.id} />
            <DetailRow label="部署" value={selected.department} />
            <DetailRow label="業務担当者" value={selected.owner} />
            <DetailRow label="コンサルタント" value={selected.consultant} />
            <DetailRow label="ランク" value={selected.rank} />
            <DetailRow label="パターン" value={selected.pattern} />
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>業務要件</h4>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{selected.bizReq}</p>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>機能要件</h4>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{selected.funcReq}</p>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>入出力定義</h4>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Input:</strong> {selected.ipoInput}</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Process:</strong> {selected.ipoProcess}</div>
            <div style={{ fontSize: 12, marginBottom: 6 }}><strong>Output:</strong> {selected.ipoOutput}</div>
            <DetailRow label="対象システム" value={selected.srcSystems} />
            <DetailRow label="見積工数" value={`${selected.estimateHours}h`} />
            {selected.mods.length > 0 && (
              <>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>変更履歴</h4>
                {selected.mods.map((m, i) => (
                  <div key={i} style={{ fontSize: 11, marginBottom: 6, padding: "4px 8px", background: "#f5f5f5", borderRadius: 4 }}>
                    <span style={{ color: "var(--text-muted)" }}>{m.date}</span> [{m.type}] {m.text} <span style={{ color: "var(--text-muted)" }}>by {m.author}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", fontSize: 12, marginBottom: 6 }}>
      <span style={{ width: 100, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
