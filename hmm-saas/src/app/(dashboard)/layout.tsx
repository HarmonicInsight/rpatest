"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: string; section?: string };

const nav: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊", section: "概要" },
  { href: "/bots", label: "ボットマスタ", icon: "🤖", section: "概要" },
  { href: "/mapping", label: "マッピング", icon: "🔗", section: "移行管理" },
  { href: "/source", label: "移行元分析", icon: "🔍", section: "移行管理" },
  { href: "/source-code", label: "ソースコード", icon: "</>" , section: "移行管理" },
  { href: "/destination", label: "移行先開発", icon: "🛠", section: "移行管理" },
  { href: "/tickets", label: "チケット", icon: "🎫", section: "運用" },
  { href: "/activity", label: "アクティビティ", icon: "📋", section: "運用" },
  { href: "/chat", label: "AIチャット", icon: "💬", section: "運用" },
  { href: "/consultants", label: "メンバー", icon: "👥", section: "管理" },
  { href: "/portal/review", label: "顧客ポータル", icon: "🏢", section: "管理" },
  { href: "/portal/uat", label: "UAT", icon: "✅", section: "管理" },
  { href: "/export", label: "エクスポート", icon: "📥", section: "管理" },
  { href: "/settings", label: "設定", icon: "⚙️", section: "管理" },
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
              <div style={{ fontSize: 11, opacity: 0.6 }}>Migration Management</div>
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
