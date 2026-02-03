"use client";

import { useEffect, useState } from "react";
import { getBots, subscribe } from "@/lib/store";
import { getDemoSourceCode, SRC_STATUS_MAP, Bot } from "@/lib/demo-data";

export default function SourceCodePage() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const bots = getBots();
  const [selected, setSelected] = useState<Bot | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"source" | "ipo" | "mapping">("source");

  const filtered = bots.filter((b) => {
    if (search && !b.name.includes(search) && !b.id.includes(search)) return false;
    return true;
  });

  const sourceCode = selected ? getDemoSourceCode(selected.id) : "";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>ソースコード</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            移行元ボットのソースコード（BizRobo XML）と入出力の対応表
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 180px)" }}>
        {/* Bot List */}
        <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <input
              placeholder="ボットを検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
            />
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelected(b)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  background: selected?.id === b.id ? "#e3f2fd" : "transparent",
                  borderLeft: selected?.id === b.id ? "3px solid var(--primary)" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{b.id}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "#fff", padding: "1px 5px", borderRadius: 6,
                    background: SRC_STATUS_MAP[b.srcStatus].color,
                  }}>
                    {SRC_STATUS_MAP[b.srcStatus].label}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Viewer */}
        {selected ? (
          <div style={{ background: "var(--card)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600 }}>{selected.id} - {selected.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 12 }}>{selected.srcPlatform} → {selected.dstPlatform}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["source", "ipo", "mapping"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border)",
                      background: tab === t ? "var(--primary)" : "transparent",
                      color: tab === t ? "#fff" : "var(--text)",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {t === "source" ? "ソースXML" : t === "ipo" ? "入出力定義" : "変換対応表"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "auto" }}>
              {tab === "source" && (
                <pre style={{
                  margin: 0, padding: 16, fontSize: 12, lineHeight: 1.6,
                  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                  background: "#1e1e1e", color: "#d4d4d4", minHeight: "100%",
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>
                  {sourceCode.split("\n").map((line, i) => (
                    <div key={i} style={{ display: "flex" }}>
                      <span style={{ width: 40, color: "#858585", textAlign: "right", paddingRight: 12, userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
                      <span dangerouslySetInnerHTML={{ __html: highlightXml(line) }} />
                    </div>
                  ))}
                </pre>
              )}

              {tab === "ipo" && (
                <div style={{ padding: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>入出力定義 - {selected.name}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                    <IpoSection title="Input（入力）" content={selected.ipoInput} color="#1565C0" bg="#e3f2fd" />
                    <IpoSection title="Process（処理）" content={selected.ipoProcess} color="#F57C00" bg="#fff3e0" />
                    <IpoSection title="Output（出力）" content={selected.ipoOutput} color="#2E7D32" bg="#e8f5e9" />
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />
                  <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>業務要件</h4>
                  <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{selected.bizReq}</p>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>機能要件</h4>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{selected.funcReq}</p>
                </div>
              )}

              {tab === "mapping" && (
                <div style={{ padding: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>変換対応表 - {selected.name}</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>BizRobo（移行元）</th>
                        <th style={{ textAlign: "center", padding: "10px", width: 40 }}>→</th>
                        <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>aKaBot（移行先）</th>
                        <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>変換ノート</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { src: "OpenBrowser", dst: "Open Browser Activity", note: "URL引数をそのまま移行" },
                        { src: "InputText", dst: "Type Into Activity", note: "セレクタをUiSelector形式に変換" },
                        { src: "Click", dst: "Click Activity", note: "CSS→UiSelectorに変換" },
                        { src: "Wait", dst: "Delay Activity", note: "timeout→Duration" },
                        { src: "OpenExcel", dst: "Excel Application Scope", note: "Workbookパスを指定" },
                        { src: "Loop", dst: "For Each Row", note: "DataTable形式に変換" },
                        { src: "ReadCell / WriteCell", dst: "Read/Write Cell Activity", note: "セル参照形式を変換" },
                        { src: "Condition", dst: "If Activity", note: "式をVB.NET形式に変換" },
                        { src: "SendEmail", dst: "Send SMTP Mail", note: "SMTP設定を追加" },
                        { src: "Log", dst: "Log Message Activity", note: "レベルマッピング" },
                        { src: "Screenshot", dst: "Take Screenshot", note: "パス設定を移行" },
                        { src: "SetVariable", dst: "Assign Activity", note: "型マッピングが必要" },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <code style={{ background: "#fff3e0", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>{row.src}</code>
                          </td>
                          <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>→</td>
                          <td style={{ padding: "8px 12px" }}>
                            <code style={{ background: "#e3f2fd", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>{row.dst}</code>
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-secondary)" }}>{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--card)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&lt;/&gt;</div>
              <div style={{ fontSize: 14 }}>左のリストからボットを選択してください</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IpoSection({ title, content, color, bg }: { title: string; content: string; color: string; bg: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 8, background: bg, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{content}</div>
    </div>
  );
}

function highlightXml(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(&lt;\/?[\w-]+)/g, '<span style="color:#569cd6">$1</span>')
    .replace(/(\w+)=/g, '<span style="color:#9cdcfe">$1</span>=')
    .replace(/"([^"]*)"/g, '"<span style="color:#ce9178">$1</span>"')
    .replace(/(&lt;!--.*?--&gt;)/g, '<span style="color:#6a9955">$1</span>');
}
