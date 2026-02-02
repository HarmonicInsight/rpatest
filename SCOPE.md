# InsightMigration 知的財産境界定義書

**Copyright (c) 2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.**

本文書は、InsightMigration（マイグレーション自動化ツール）と aKaBot（対象RPAプラットフォーム）の間における知的財産の境界を明確に定義するものである。

---

## 1. InsightMigration の知的財産範囲

以下の全モジュールおよびソースコードは、HarmonicInsight / FPT Consulting Japan が開発・所有する独自の知的財産である。

### Phase 1: 解析エンジン（Analysis Engine）

- **構造解析** — BizRobo ロボットファイル (.robot) の解析およびAST（抽象構文木）構築
- **複雑度スコアリング** — 各ロボットの移行難易度を定量評価するスコアリングアルゴリズム
- **依存関係マッピング** — ロボット間・リソース間の依存関係グラフ生成
- **難易度分類** — スコアに基づく自動分類ロジック（Low / Medium / High / Critical）

### Phase 2: 変換パイプライン（Conversion Pipeline）

- **AST変換** — BizRobo AST から aKaBot 対応形式への変換ロジック
- **マッピングエンジン** — BizRobo コマンド・アクティビティと aKaBot アクティビティの対応表および変換規則
- **XAML生成** — aKaBot Studio 互換の XAML ワークフロー自動生成

### Phase 3: 検証フレームワーク（Validation Framework）

- **構文チェック** — 生成された XAML の構文妥当性検証
- **命名規則** — aKaBot ベストプラクティスに準拠した命名規則の自動適用・検証
- **ベストプラクティス検証** — aKaBot 推奨パターンへの準拠度チェック
- **差分検出** — 変換前後のロジック差分検出および報告

### Phase 4: テスト自動化（Test Automation）

- **テストケース生成** — ロボットの入出力仕様に基づく自動テストケース生成
- **並列実行** — 複数ロボットのテスト並列実行エンジン
- **結果比較** — BizRobo 実行結果と aKaBot 実行結果の自動比較
- **レポート生成** — テスト結果のサマリーレポートおよび詳細レポート自動生成

### Phase 5: デプロイ支援（Deployment Support）

- **パッケージング** — aKaBot 配布形式（.nupkg）の自動ビルド
- **配布オーケストレーション** — 複数環境への段階的デプロイ制御
- **ヘルスチェック** — デプロイ後のロボット稼働状態監視

### 標準化レイヤー（Standardization Layer）

- **コンポーネントライブラリ** — 共通処理パターンの再利用可能なコンポーネント群
- **テンプレートエンジン** — ロボット生成テンプレートの管理・適用エンジン
- **重複検出** — ロボット間の重複ロジック検出および統合提案

### GUIダッシュボード（GUI Dashboard）

- **Streamlit 管理画面** — マイグレーション進捗の可視化・管理用Webインタフェース

### データモデル・設定管理（Data Model and Configuration）

- マイグレーション設定スキーマ
- マッピング定義ファイル
- テンプレート定義ファイル

### マイグレーションDB・進捗追跡（Migration Database and Progress Tracking）

- マイグレーション状態管理データベース
- ロボット単位の進捗追跡
- 監査ログ

---

## 2. aKaBot / 第三者プラットフォームの範囲

以下は aKaBot（FPT Software 提供）および第三者が所有する知的財産であり、InsightMigration の知的財産には **含まれない**。

| コンポーネント | 説明 | 所有者 |
|---|---|---|
| **Orchestrator API** | ロボット管理・スケジューリング・監視を提供するサーバーサイドAPI | aKaBot / FPT Software |
| **Robot Agent**（端末エージェント） | エンドポイント上でロボットを実行するランタイムエージェント | aKaBot / FPT Software |
| **Studio**（ロボット開発IDE） | ロボットワークフローの設計・開発用統合開発環境 | aKaBot / FPT Software |
| **.nupkg パッケージ仕様** | ロボット配布パッケージのフォーマット仕様 | aKaBot / FPT Software |
| **アクティビティパッケージ** | UiPath.Activities 等の標準アクティビティライブラリ | 各提供元ベンダー |

---

## 3. 連携境界（Integration Boundary）

InsightMigration と aKaBot プラットフォームの間には、以下の明確な境界が存在する。

### 3.1 公開API経由の連携のみ

InsightMigration は、aKaBot が公開する REST API およびドキュメント化されたインタフェースを通じてのみ連携する。内部APIやドキュメント化されていないエンドポイントへの依存は行わない。

### 3.2 aKaBot 内部コードの非包含

InsightMigration のソースコードおよび配布物には、aKaBot の内部コード、ライブラリ、またはプロプライエタリなコンポーネントを一切含まない。

### 3.3 Orchestrator REST API の利用

InsightMigration は Orchestrator REST API を呼び出してロボットのデプロイ・管理を行うが、当該 API 自体は aKaBot / FPT Software の知的財産である。InsightMigration が所有するのは API を呼び出すクライアントコード（連携モジュール）のみである。

### 連携の概念図

```
┌─────────────────────────────┐          ┌─────────────────────────────┐
│      InsightMigration       │          │        aKaBot Platform      │
│  (HarmonicInsight 知的財産)  │          │  (FPT Software 知的財産)     │
│                             │          │                             │
│  解析エンジン                │          │  Orchestrator               │
│  変換パイプライン            │  REST    │  Robot Agent                │
│  検証フレームワーク          │  API     │  Studio                     │
│  テスト自動化               ├─────────►│  アクティビティパッケージ     │
│  デプロイ支援               │  (公開    │  .nupkg 仕様                │
│  標準化レイヤー             │   APIの   │                             │
│  GUIダッシュボード          │   み)    │                             │
│  データモデル・設定管理      │          │                             │
│  マイグレーションDB          │          │                             │
└─────────────────────────────┘          └─────────────────────────────┘
```

---

## 改訂履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-02-02 | 1.0 | 初版作成 |

---

*本文書に関するお問い合わせは HarmonicInsight / FPT Consulting Japan までご連絡ください。*
