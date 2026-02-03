// ===== Demo Data for HMM SaaS =====

export type Bot = {
  id: string;
  name: string;
  department: string;
  owner: string;           // 顧客側の業務担当者
  rank: "A" | "B" | "C" | "D";
  pattern: string;
  srcPlatform: string;
  dstPlatform: string;
  srcStatus: SrcStatus;
  dstStatus: DstStatus;
  reviewStatus: ReviewStatus;
  bizReq: string;
  funcReq: string;
  ipoInput: string;
  ipoProcess: string;
  ipoOutput: string;
  srcSystems: string;
  consultant: string;
  estimateHours: number;
  notes: string;
  mods: Modification[];
  created: string;
  updated: string;
};

export type SrcStatus = "not_started" | "biz_analyzing" | "biz_done" | "func_analyzing" | "func_done" | "ipo_done";
export type DstStatus = "pending" | "designing" | "implementing" | "testing" | "done" | "blocked";
export type ReviewStatus = "none" | "pending" | "in_review" | "approved" | "rejected";

export type Modification = {
  date: string;
  type: "fix" | "change" | "add" | "note";
  text: string;
  author: string;
};

export type Ticket = {
  id: string;
  botId: string;
  title: string;
  body: string;
  type: "bug" | "feature" | "question" | "improvement" | "uat";
  priority: "low" | "medium" | "high";
  status: "open" | "inprogress" | "resolved" | "closed";
  assignee: string;
  reporter: string;
  comments: { author: string; date: string; text: string }[];
  created: string;
  updated: string;
};

export type Member = {
  id: string;
  name: string;
  role: "manager" | "consultant" | "customer";
  email: string;
  department: string;
  avatar: string;
};

export const SRC_STATUS_MAP: Record<SrcStatus, { label: string; color: string; order: number; pct: number }> = {
  not_started:    { label: "未着手",         color: "#9e9e9e", order: 0, pct: 0 },
  biz_analyzing:  { label: "業務要件 分析中", color: "#7B1FA2", order: 1, pct: 20 },
  biz_done:       { label: "業務要件 完了",   color: "#512DA8", order: 2, pct: 40 },
  func_analyzing: { label: "機能要件 分析中", color: "#1565C0", order: 3, pct: 50 },
  func_done:      { label: "機能要件 完了",   color: "#0D47A1", order: 4, pct: 75 },
  ipo_done:       { label: "入出力 確定",     color: "#2E7D32", order: 5, pct: 100 },
};

export const DST_STATUS_MAP: Record<DstStatus, { label: string; color: string; order: number; pct: number }> = {
  pending:       { label: "未着手",    color: "#9e9e9e", order: 0, pct: 0 },
  designing:     { label: "設計中",    color: "#1565C0", order: 1, pct: 20 },
  implementing:  { label: "変換中",    color: "#F57C00", order: 2, pct: 50 },
  testing:       { label: "テスト中",  color: "#00838F", order: 3, pct: 75 },
  done:          { label: "完了",      color: "#2E7D32", order: 4, pct: 100 },
  blocked:       { label: "ブロック",  color: "#c62828", order: 5, pct: 0 },
};

export const REVIEW_STATUS_MAP: Record<ReviewStatus, { label: string; color: string }> = {
  none:      { label: "未レビュー", color: "#9e9e9e" },
  pending:   { label: "確認依頼中", color: "#F57C00" },
  in_review: { label: "確認中",     color: "#1976D2" },
  approved:  { label: "承認済",     color: "#2E7D32" },
  rejected:  { label: "差戻し",     color: "#c62828" },
};

// Members (Master data)
export const members: Member[] = [
  { id: "m1", name: "鈴木 太郎", role: "manager", email: "suzuki@harmonic.jp", department: "HMM統括", avatar: "鈴" },
  { id: "m2", name: "山本 一郎", role: "consultant", email: "yamamoto@fpt.jp", department: "移行チーム", avatar: "山" },
  { id: "m3", name: "李 明", role: "consultant", email: "li@fpt.jp", department: "移行チーム", avatar: "李" },
  { id: "m4", name: "グエン・ヴァン", role: "consultant", email: "nguyen@fpt.jp", department: "移行チーム", avatar: "グ" },
  { id: "m5", name: "佐々木 花子", role: "consultant", email: "sasaki@fpt.jp", department: "移行チーム", avatar: "佐" },
  { id: "m6", name: "田中 太郎", role: "customer", email: "tanaka@customer.co.jp", department: "経理部", avatar: "田" },
  { id: "m7", name: "佐藤 次郎", role: "customer", email: "sato@customer.co.jp", department: "営業部", avatar: "佐" },
  { id: "m8", name: "山田 花子", role: "customer", email: "yamada@customer.co.jp", department: "物流部", avatar: "山" },
  { id: "m9", name: "高橋 健一", role: "customer", email: "takahashi@customer.co.jp", department: "人事部", avatar: "高" },
  { id: "m10", name: "中村 美咲", role: "customer", email: "nakamura@customer.co.jp", department: "総務部", avatar: "中" },
];

const botNames = [
  "売上日報生成","請求書照合","在庫アラート通知","勤怠データ集計","見積書作成",
  "経費精算自動化","受注データ転記","出荷通知メール","仕入先マスタ更新","月次決算集計",
  "給与明細配信","交通費精算","契約書PDF生成","顧客データ同期","入金消込処理",
  "与信チェック","発注書作成","納品書照合","売掛金管理","固定資産台帳更新",
  "有給残日数通知","採用応募者管理","社内報配信","検品結果登録","入出庫管理",
  "クレーム管理転記","会議室予約集計","出張旅費精算","稟議書ステータス確認","予算実績比較",
];

const depts = ["経理部","営業部","人事部","物流部","総務部","情報システム部","購買部","品質管理部"];
const owners = ["田中","鈴木","佐藤","山田","高橋","中村","小林","加藤","吉田","渡辺"];
const consultants = ["山本","李","グエン","佐々木"];
const patterns = ["抽出型","変換型","転記型","照合型","通知型","複合型"];
const systems = ["Excel","Web","SAP","Oracle","Windows","メール","OCR","PDF"];

const bizReqs = [
  "毎朝SAP売上データをExcel集計して部門長に配信",
  "仕入先請求書とPO情報を照合し差異レポート出力",
  "在庫が閾値以下の商品を検知し担当者にメール通知",
  "勤怠システムから月次データを抽出し給与計算用に変換",
  "営業見積テンプレートに顧客情報と商品データを自動転記",
  "社員の経費申請をチェックし承認ワークフローに送信",
  "ECサイト受注データをERPに自動転記",
  "出荷確定時に顧客へ追跡番号付き通知メール送信",
  "仕入先マスタの更新情報をERPに反映",
  "月次決算の各勘定科目データを集計しレポート生成",
];
const funcReqs = [
  "SAP RFC接続、Excel書式設定、メール送信",
  "PDF OCR、データベース照合、差異計算、帳票出力",
  "DB監視クエリ、閾値判定、SMTP送信",
  "Web API、CSV変換、バリデーション",
  "テンプレート操作、データベース参照、PDF生成",
  "画面操作、ルール判定、API連携",
  "Web scraping、DB INSERT、エラーハンドリング",
  "DB監視、テンプレートメール、SMTP",
  "CSV取込、マスタ更新、ログ出力",
  "DB集計クエリ、Excel出力、配信",
];
const ipoInputs = [
  "SAP売上テーブル（日次）",
  "PDF請求書 + ERPのPOデータ",
  "在庫管理DB（リアルタイム）",
  "勤怠管理Webシステム",
  "CRMの顧客・商品マスタ",
  "経費申請Web画面",
  "ECサイト管理画面",
  "出荷管理DBテーブル",
  "CSV仕入先情報ファイル",
  "会計システムDBテーブル",
];
const ipoProcesses = [
  "部門別集計、前日比算出、ソート",
  "OCR解析 → PO照合 → 差異抽出",
  "閾値チェック → 該当商品抽出",
  "月次データ抽出 → フォーマット変換",
  "マスタ参照 → テンプレート埋込",
  "ルール判定 → 承認ルート決定",
  "データ変換 → バリデーション → INSERT",
  "配送情報取得 → メール本文生成",
  "差分検出 → マスタUPDATE",
  "勘定科目集計 → レポートフォーマット",
];
const ipoOutputs = [
  "Excel売上日報（部門別シート）→ メール配信",
  "差異レポート（Excel）→ 経理担当に配信",
  "アラートメール → 購買担当",
  "CSV勤怠サマリー → 給与システム連携",
  "PDF見積書 → 営業担当に配信",
  "承認依頼メール → 上長",
  "ERPへの受注データ登録",
  "追跡番号付きメール → 顧客",
  "マスタ更新ログ → 管理者",
  "Excel月次レポート → 経営層に配信",
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateBots(): Bot[] {
  const list: Bot[] = [];
  const srcStatuses: SrcStatus[] = ["not_started","biz_analyzing","biz_done","func_analyzing","func_done","ipo_done"];
  const modTypes: ("fix"|"change"|"add"|"note")[] = ["fix","change","add","note"];
  const modTexts = [
    "セレクタ修正（画面変更対応）","Excel出力フォーマット変更","エラーハンドリング追加",
    "条件分岐ロジック修正","API接続方式に変更","テストデータ追加","タイムアウト値調整",
    "顧客要望により出力項目追加","SAP接続パラメータ修正","OCR認識率改善のため前処理追加"
  ];

  for (let i = 0; i < 120; i++) {
    const r = seededRandom(i + 42);
    const rank = i < 40 ? "A" : i < 90 ? "B" : i < 110 ? "C" : "D";
    const name = i < 30 ? botNames[i % botNames.length] : botNames[i % botNames.length] + "_" + (Math.floor(i/30)+1);

    let srcIdx: number;
    if (rank === "A") srcIdx = Math.min(Math.floor(r * 7), 5);
    else if (rank === "B") srcIdx = Math.min(Math.floor(r * 6), 5);
    else if (rank === "C") srcIdx = Math.min(Math.floor(r * 5), 4);
    else srcIdx = Math.min(Math.floor(r * 4), 3);
    const srcStatus = srcStatuses[srcIdx];

    let dstStatus: DstStatus = "pending";
    const dp = seededRandom(i + 100);
    if (srcStatus === "ipo_done") {
      if (dp < 0.15) dstStatus = "done";
      else if (dp < 0.35) dstStatus = "testing";
      else if (dp < 0.6) dstStatus = "implementing";
      else if (dp < 0.85) dstStatus = "designing";
    } else if (srcStatus === "func_done") {
      dstStatus = dp < 0.3 ? "designing" : "pending";
    }

    let reviewStatus: ReviewStatus = "none";
    if (srcStatus === "ipo_done") reviewStatus = "approved";
    else if (srcStatus === "func_done") reviewStatus = dp < 0.5 ? "in_review" : "pending";
    else if (srcStatus === "biz_done") reviewStatus = dp < 0.3 ? "pending" : "none";

    const mods: Modification[] = [];
    if (dstStatus !== "pending") {
      const mc = Math.floor(seededRandom(i+200) * 3);
      for (let m = 0; m < mc; m++) {
        mods.push({
          date: `2026-0${1+Math.floor(seededRandom(i+300+m)*2)}-${String(1+Math.floor(seededRandom(i+400+m)*28)).padStart(2,"0")}`,
          type: modTypes[Math.floor(seededRandom(i+500+m)*4)],
          text: modTexts[Math.floor(seededRandom(i+600+m)*modTexts.length)],
          author: consultants[i % consultants.length],
        });
      }
    }

    const est = rank==="A" ? 3+Math.floor(r*3) : rank==="B" ? 6+Math.floor(r*5) : rank==="C" ? 13+Math.floor(r*10) : 25+Math.floor(r*20);

    list.push({
      id: "BOT-" + String(i+1).padStart(3,"0"),
      name, department: depts[i % depts.length],
      owner: owners[i % owners.length],
      rank, pattern: patterns[Math.floor(seededRandom(i+700)*patterns.length)],
      srcPlatform: "BizRobo!", dstPlatform: "aKaBot",
      srcStatus, dstStatus, reviewStatus,
      bizReq: bizReqs[i % bizReqs.length],
      funcReq: funcReqs[i % funcReqs.length],
      ipoInput: ipoInputs[i % ipoInputs.length],
      ipoProcess: ipoProcesses[i % ipoProcesses.length],
      ipoOutput: ipoOutputs[i % ipoOutputs.length],
      srcSystems: [systems[Math.floor(seededRandom(i+800)*systems.length)], systems[Math.floor(seededRandom(i+900)*systems.length)]].filter((v,j,a)=>a.indexOf(v)===j).join(", "),
      consultant: consultants[i % consultants.length],
      estimateHours: est, notes: "", mods,
      created: "2026-01-15",
      updated: "2026-02-02",
    });
  }
  return list;
}

export function generateTickets(bots: Bot[]): Ticket[] {
  const samples = [
    { title:"SAP接続でタイムアウトが頻発", bot:"BOT-091", type:"bug" as const, priority:"high" as const, status:"open" as const, assignee:"山本",
      body:"CランクのSAP連携ボットでRFC接続が30秒でタイムアウトする。", comments:[{author:"山本",date:"2026-02-01",text:"SAP側の接続プールを確認中。"}]},
    { title:"Excel出力のフォーマットが崩れる", bot:"BOT-005", type:"bug" as const, priority:"medium" as const, status:"inprogress" as const, assignee:"李",
      body:"見積書作成ボットの出力Excelで通貨フォーマットが反映されない。", comments:[{author:"李",date:"2026-01-30",text:"number_formatの設定を修正。再テスト中。"}]},
    { title:"OCR認識率が80%以下", bot:"BOT-115", type:"bug" as const, priority:"high" as const, status:"open" as const, assignee:"山本",
      body:"請求書OCRの認識率が低い。手書き部分と印影部分で誤認識。", comments:[]},
    { title:"月次レポートに前年比カラムを追加", bot:"BOT-010", type:"feature" as const, priority:"low" as const, status:"open" as const, assignee:"グエン",
      body:"顧客より前年同月比のカラム追加要望。IPO定義変更が必要。", comments:[{author:"グエン",date:"2026-02-01",text:"IPO定義にYoY計算を追加。レビュー依頼済み。"}]},
    { title:"在庫アラートの閾値を変更可能にしたい", bot:"BOT-003", type:"feature" as const, priority:"medium" as const, status:"resolved" as const, assignee:"佐々木",
      body:"物流部より閾値をロボット設定から変更できるようにしたいとの要望。", comments:[{author:"佐々木",date:"2026-01-28",text:"設定ファイルから閾値を読み込む形に変更。"}]},
    { title:"UATで出荷通知の宛先が間違っている", bot:"BOT-008", type:"uat" as const, priority:"high" as const, status:"inprogress" as const, assignee:"グエン",
      body:"物流部のUATフィードバック: CC宛先が旧部署のメーリングリストのまま。", comments:[{author:"グエン",date:"2026-02-02",text:"配信リストをマスタテーブルから取得するように変更。"}]},
    { title:"入金消込の照合ロジックに例外パターン", bot:"BOT-015", type:"uat" as const, priority:"high" as const, status:"open" as const, assignee:"山本",
      body:"分割払いの入金で照合が失敗する。1対Nの照合パターンに対応が必要。", comments:[]},
    { title:"承認フローにメール通知を追加", bot:"BOT-029", type:"improvement" as const, priority:"low" as const, status:"open" as const, assignee:"",
      body:"稟議書ボットに承認完了時のメール通知機能を追加してほしい。", comments:[]},
  ];

  return samples.map((s, i) => ({
    id: "ISSUE-" + String(i+1).padStart(3,"0"),
    botId: s.bot, title: s.title, body: s.body,
    type: s.type, priority: s.priority, status: s.status,
    assignee: s.assignee,
    reporter: ["田中","佐藤","山田","高橋","中村"][i%5],
    comments: s.comments, created: "2026-01-" + String(20+i).padStart(2,"0"),
    updated: "2026-02-02",
  }));
}

// Demo source code (BizRobo XML)
export function getDemoSourceCode(botId: string): string {
  const botNum = parseInt(botId.replace("BOT-", ""));
  const names = [
    "請求書処理","注文管理","在庫確認","出荷通知","入金消込",
    "経費精算","勤怠集計","給与計算","社員登録","退職処理",
  ];
  const botName = names[(botNum - 1) % names.length];
  return `<?xml version="1.0" encoding="UTF-8"?>
<robot name="${botName}" version="10.4" type="Standard">
  <variables>
    <variable name="inputFile" type="String" default=""/>
    <variable name="outputPath" type="String" default=""/>
    <variable name="resultStatus" type="String" default=""/>
    <variable name="errorMessage" type="String" default=""/>
    <variable name="rowCount" type="Integer" default="0"/>
    <variable name="processedCount" type="Integer" default="0"/>
  </variables>

  <steps>
    <!-- Step 1: 初期化 -->
    <step name="初期化" type="Initialize">
      <action type="Log" message="ロボット開始: ${botName}"/>
      <action type="SetVariable" name="resultStatus" value="RUNNING"/>
    </step>

    <!-- Step 2: データ取得 -->
    <step name="データ取得" type="DataAccess">
      <action type="OpenBrowser" url="https://system.example.com/login"/>
      <action type="Wait" timeout="5000"/>
      <action type="InputText" selector="#username" value="\${credentials.user}"/>
      <action type="InputText" selector="#password" value="\${credentials.pass}"/>
      <action type="Click" selector="#loginBtn"/>
      <action type="Wait" timeout="3000"/>
      <action type="Navigate" url="https://system.example.com/data/export"/>
      <action type="Click" selector="#exportBtn"/>
      <action type="Download" path="\${inputFile}"/>
    </step>

    <!-- Step 3: データ処理 -->
    <step name="データ処理" type="Process">
      <action type="OpenExcel" path="\${inputFile}"/>
      <action type="Loop" target="Sheet1" startRow="2">
        <action type="ReadCell" column="A" variable="itemCode"/>
        <action type="ReadCell" column="B" variable="itemName"/>
        <action type="ReadCell" column="C" variable="amount"/>
        <action type="Condition" expression="\${amount} > 0">
          <action type="Transform" variable="processedAmount"
                  expression="ROUND(\${amount} * 1.1, 0)"/>
          <action type="WriteCell" column="D" value="\${processedAmount}"/>
          <action type="Increment" variable="processedCount"/>
        </action>
      </action>
      <action type="SaveExcel" path="\${outputPath}"/>
    </step>

    <!-- Step 4: 結果出力 -->
    <step name="結果出力" type="Output">
      <action type="SendEmail"
              to="tanaka@example.com"
              subject="${botName}完了通知"
              body="処理件数: \${processedCount}件\\n出力先: \${outputPath}"
              attachment="\${outputPath}"/>
      <action type="SetVariable" name="resultStatus" value="SUCCESS"/>
      <action type="Log" message="ロボット完了: 処理\${processedCount}件"/>
    </step>

    <!-- エラーハンドリング -->
    <errorHandler>
      <action type="Screenshot" path="error_\${timestamp}.png"/>
      <action type="SetVariable" name="resultStatus" value="ERROR"/>
      <action type="SetVariable" name="errorMessage" value="\${lastError}"/>
      <action type="SendEmail"
              to="admin@example.com"
              subject="[ERROR] ${botName}"
              body="エラー発生: \${errorMessage}"/>
      <action type="Log" level="ERROR" message="\${errorMessage}"/>
    </errorHandler>
  </steps>
</robot>`;
}

// Chat demo messages
export const demoChatMessages = [
  { role: "user" as const, content: "今日の進捗状況を教えて" },
  { role: "assistant" as const, content: `## 本日の進捗サマリー

**全体状況:** 120本中、移行完了 12本（10%）

### 移行元分析
- IPO確定: 38本
- 機能要件分析中/完了: 24本
- 業務要件分析中/完了: 32本
- 未着手: 26本

### 移行先開発
- 完了: 12本
- テスト中: 8本
- 実装中: 10本
- 設計中: 8本

### 要注意事項
- ⚠️ **BOT-091** SAP接続タイムアウト（高優先度チケット未解決）
- ⚠️ **BOT-115** OCR認識率が低い（対応策検討中）
- 📋 レビュー待ち: 5件（田中さん2件、佐藤さん3件）

次のアクションとして、レビュー待ちの5件について担当者に催促メールを送りますか？` },
  { role: "user" as const, content: "田中さんの分だけ催促して" },
  { role: "assistant" as const, content: `田中さんへ催促メールを送信しました。

**送信内容:**
> 田中様
>
> お忙しいところ恐れ入ります。
> 下記2件のIPOレビューについて、ご確認をお願いいたします。
>
> - BOT-006 経費精算自動化（レビュー依頼日: 1/28）
> - BOT-014 顧客データ同期（レビュー依頼日: 1/30）
>
> ご不明点がございましたら、チャットからお気軽にご質問ください。

次回チェック時（30分後）に回答状況を確認します。` },
];
