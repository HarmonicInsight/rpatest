"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [projectName, setProjectName] = useState("HMM移行プロジェクト（デモ）");
  const [aiInterval, setAiInterval] = useState("30");
  const [emailNotify, setEmailNotify] = useState(true);
  const [slackNotify, setSlackNotify] = useState(false);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [reviewDeadline, setReviewDeadline] = useState("3");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>設定</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          プロジェクト設定・AI Agent設定・通知設定
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Project Settings */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>プロジェクト設定</h3>
          <FieldInput label="プロジェクト名" value={projectName} onChange={setProjectName} />
          <FieldSelect label="移行元プラットフォーム" value="BizRobo!" options={["BizRobo!", "UiPath", "WinActor", "BluePrism"]} onChange={() => {}} />
          <FieldSelect label="移行先プラットフォーム" value="aKaBot" options={["aKaBot", "UiPath", "Power Automate", "Automation Anywhere"]} onChange={() => {}} />
          <FieldInput label="レビュー期限（日数）" value={reviewDeadline} onChange={setReviewDeadline} type="number" />
        </div>

        {/* AI Agent Settings */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>AI Agent設定</h3>
          <FieldSelect label="チェック間隔（分）" value={aiInterval} options={["15", "30", "60", "120"]} onChange={setAiInterval} />
          <FieldSelect label="AIモデル" value="Claude Opus" options={["Claude Opus", "Claude Sonnet", "Claude Haiku"]} onChange={() => {}} />
          <FieldToggle label="異常検知時の自動エスカレーション" value={autoEscalate} onChange={setAutoEscalate} />
          <FieldToggle label="レビュー期限超過時の自動催促" value={true} onChange={() => {}} />
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#fff3e0", borderRadius: 6, fontSize: 11, color: "var(--warning)" }}>
            デモモード: AI Agent機能は本番環境で有効になります
          </div>
        </div>

        {/* Notification Settings */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>通知設定</h3>
          <FieldToggle label="メール通知" value={emailNotify} onChange={setEmailNotify} />
          <FieldToggle label="Slack通知" value={slackNotify} onChange={setSlackNotify} />
          <FieldInput label="通知先メールアドレス" value="suzuki@harmonic.jp" onChange={() => {}} />
          <FieldInput label="Slack Webhook URL" value="" onChange={() => {}} placeholder="https://hooks.slack.com/..." />
        </div>

        {/* Billing (SaaS) */}
        <div style={{ background: "var(--card)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>課金情報</h3>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>プラン</span>
            <span style={{ fontWeight: 600 }}>ボット従量課金</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>単価</span>
            <span style={{ fontWeight: 600 }}>¥10,000 / ボット / 月</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>管理ボット数</span>
            <span style={{ fontWeight: 600 }}>120本</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>月額合計</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--primary)" }}>¥1,200,000</span>
          </div>
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#e8f5e9", borderRadius: 6, fontSize: 11, color: "var(--success)" }}>
            次回請求日: 2026-03-01
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button
          onClick={save}
          style={{
            padding: "10px 32px",
            borderRadius: 6,
            border: "none",
            background: saved ? "var(--success)" : "var(--primary)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          {saved ? "保存しました" : "設定を保存"}
        </button>
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }} />
    </div>
  );
}

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FieldToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none",
          background: value ? "var(--primary)" : "#ccc",
          cursor: "pointer", position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3,
          left: value ? 23 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}
