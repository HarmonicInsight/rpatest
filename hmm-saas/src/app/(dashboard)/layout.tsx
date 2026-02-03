"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: string; section?: string };

const nav: NavItem[] = [
  // --- 概要 ---
  { href: "/dashboard", label: "ダッシュボード", icon: "📊", section: "概要" },
  { href: "/bots", label: "ボット一覧", icon: "🤖", section: "概要" },
  { href: "/consultants", label: "メンバー管理", icon: "👥", section: "概要" },
  // --- Step 1: 分析 ---
  { href: "/source", label: "移行元分析", icon: "🔍", section: "① 分析" },
  { href: "/source-code", label: "ソースコード", icon: "</>", section: "① 分析" },
  { href: "/mapping", label: "入出力 対応表", icon: "🔗", section: "① 分析" },
  // --- Step 2: レビュー ---
  { href: "/portal/review", label: "顧客レビュー", icon: "📝", section: "② レビュー" },
  // --- Step 3: AI変換 ---
  { href: "/migration", label: "AI変換 実行", icon: "🚀", section: "③ AI変換" },
  { href: "/destination", label: "変換結果", icon: "🛠", section: "③ AI変換" },
  // --- Step 4: テスト ---
  { href: "/testing", label: "テスト実行", icon: "🧪", section: "④ テスト" },
  { href: "/portal/uat", label: "受入テスト", icon: "✅", section: "④ テスト" },
  // --- Step 5: 運用 ---
  { href: "/monitoring", label: "稼働モニタ", icon: "📡", section: "⑤ 運用" },
  { href: "/tickets", label: "問い合わせ", icon: "🎫", section: "⑤ 運用" },
  { href: "/activity", label: "操作履歴", icon: "📋", section: "⑤ 運用" },
  // --- ツール ---
  { href: "/chat", label: "AIアシスタント", icon: "💬", section: "ツール" },
  { href: "/export", label: "エクスポート", icon: "📥", section: "ツール" },
  { href: "/settings", label: "設定", icon: "⚙️", section: "ツール" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 60 : 240,
          background: "var(--sidebar)",
          color: "#fff",
          transition: "width 0.2s",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: collapsed ? "16px 8px" : "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>HMM Tracker</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>ボット移行管理</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
              padding: 4,
            }}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {nav.map((item, i) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const showSection = !collapsed && item.section && (i === 0 || nav[i - 1].section !== item.section);
            return (
              <div key={item.href}>
                {showSection && (
                  <div style={{ padding: "12px 20px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.3)" }}>
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: collapsed ? "10px 0" : "8px 20px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    background: active ? "rgba(25,118,210,0.3)" : "transparent",
                    borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                    textDecoration: "none",
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
        {!collapsed && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, opacity: 0.5 }}>
            HMM SaaS v0.1 Demo
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <header
          style={{
            height: 56,
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label || "HMM"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>デモモード</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              鈴
            </div>
          </div>
        </header>
        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}
