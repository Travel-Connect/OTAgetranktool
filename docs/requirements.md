# OTA Get Rank Tool — 要件定義書 v1.2

> 最終更新: 2026-03-11

---

## 1. プロダクト概要

### 1.1 目的

ホテル・宿泊施設が複数のOTA（Online Travel Agency）検索結果において何位に表示されるかを自動的に取得・記録し、Excel形式で出力するツール。

### 1.2 解決する課題

- 各OTAの検索結果順位を手動で確認する作業コストの削減
- 日次・定期的な順位変動の追跡と可視化
- 広告枠と自然検索の順位を区別した正確な分析

### 1.3 スコープ

| 項目 | v1.0 スコープ |
|------|-------------|
| 対応OTA | 楽天トラベル, じゃらん, 一休, Expedia, Booking.com, Agoda, Trip.com, Yahooトラベル |
| 順位種別 | 自然順位（広告除外）+ 表示順位（広告含む） |
| ソート | 各OTAデフォルト（おすすめ順） |
| 子供 | 0固定（UIにも出さない） |
| 圏外閾値 | 自然順位100位まで探索 |
| 出力形式 | Excel（.xlsx） |
| 実行方式 | 手動（管理UI）+ 日次Cron自動実行 |

---

## 2. ユーザー要件

### 2.1 主要機能

#### F-01: プロジェクト管理
- エリア（那覇市等）単位でプロジェクトを作成
- プロジェクトごとに対象ホテル・検索条件・OTA設定を管理
- プロジェクトの有効/無効切り替え

#### F-02: ホテル管理
- ホテル名・メモの登録
- OTAごとの施設ページURL（マッピング）登録（最大8 OTA）
- プロジェクトへの紐付け（並び順指定可能）

#### F-03: 検索プロファイル管理
- OTAごとの検索ベースURL登録
- エリアラベルによるプロファイルのグループ化（那覇、北谷等）
- パラメータのホワイトリスト/ブラックリストによるURL正規化
- プロファイルの有効/無効切り替え

#### F-04: プリセット（条件セット）管理
- チェックイン日の指定方法:
  - **リストモード**: 日付を直接リスト指定
  - **ルールモード**: 「Nヶ月後の平日」等のルールで自動生成
- 対象OTA選択（複数選択可）
- 泊数・室数・人数/室の指定
- プリセットの有効/無効切り替え

#### F-05: ジョブ実行
- 手動ジョブ作成・実行
- ジョブ＝1回の取得実行単位（複数タスクを含む）
- タスク＝1つのOTA × 1つのチェックイン日 × 条件の取得単位
- 失敗タスクの自動リトライ（最大3回、末尾回し方式）

#### F-06: 順位結果の表示
- OTAタブ別の結果表示
- ホテル × 日付のマトリクス形式
- 表示順位（広告含む）と自然順位（広告除外）の2セクション
- 圏外は「-」表示

#### F-07: Excel出力
- 1ファイル = 1ジョブ
- 1シート = 1 OTA
- 各シートに表示順位テーブル + 自然順位テーブル + 総件数

#### F-08: 日次自動実行（Cron）
- 毎日 10:00 JST に全アクティブプロジェクトを対象に実行
- プリセットのルールに基づいてチェックイン日を自動生成
- 古いデータの自動クリーンアップ（3ヶ月超）

---

### 2.2 非機能要件

#### NF-01: ボット検出回避
- playwright-extra + puppeteer-extra-plugin-stealth によるステルスモード
- UA（User-Agent）ローテーション（5プロファイル）
- ドメイン別速度制限（2.0〜3.0秒 + ランダムジッター 0〜1.5秒）
- `navigator.webdriver` 隠蔽、HeadlessChrome UA修正
- OTAインターリーブ実行（同一OTA連続回避のラウンドロビン並べ替え）
- OTA別クールダウン（Expedia 30s, Booking 20s, Agoda 15s, Trip.com 10s, 他5s）

#### NF-02: 同時実行制御
- グローバル同時実行上限: 5コンテキスト
- セマフォ方式のキュー管理

#### NF-03: エラーハンドリング
- CAPTCHA / ブロック検出（セレクタ・タイトルベース）
- タスク全体タイムアウト: 5分
- ナビゲーションタイムアウト: 30秒
- 失敗時のスクリーンショット・HTML保存

#### NF-04: データ保持
- Supabase（PostgreSQL）にデータ永続化
- 3ヶ月超の古いデータは自動削除
- 失敗証跡はSupabase Storageに保存

---

### 2.3 決定済みの仕様判断

| 質問 | 決定 |
|------|------|
| Q9. 「平日」の定義 | B) 月〜金、日本の祝日は除外 |
| Q10. 並び順 | A) 各OTAデフォルト（おすすめ順） |
| Q11. 子供対応 | A) v1.0は子供=0固定 |
| Q12. 日次実行の対象 | A) 全プロジェクトを毎日 |
| Q13. ブロック対策 | B+C) UA自動回避 + 速度制限の併用 |

---

## 3. システム構成

### 3.1 アーキテクチャ

```
[ブラウザ/管理UI]
      ↓ HTTP
[Next.js 15 (App Router)]
  ├── API Routes (REST)
  ├── Playwright Worker (ブラウザ自動操作)
  └── Excel Builder
      ↓ SQL
[Supabase (PostgreSQL + Storage)]
```

### 3.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| バックエンド | Next.js API Routes (Server-side) |
| ブラウザ自動化 | Playwright + playwright-extra + StealthPlugin |
| DB | Supabase (PostgreSQL), `ota_getrank` スキーマ |
| ストレージ | Supabase Storage (`ota-getrank-artifacts` バケット) |
| Excel出力 | ExcelJS |
| 共有パッケージ | @ota/shared (URL Builder, 日付ユーティリティ, バリデーション) |
| モノレポ | PNPM Workspaces + Turborepo |
| デプロイ | Vercel (Cron対応) |

### 3.3 対応OTA一覧

| OTA | ドメイン | 速度制限 | タスク間クールダウン |
|-----|---------|---------|-----------------|
| 楽天トラベル | search.travel.rakuten.co.jp | 2.0秒 | 5秒 |
| じゃらん | www.jalan.net | 2.0秒 | 5秒 |
| 一休 | www.ikyu.com | 2.0秒 | 5秒 |
| Expedia | www.expedia.co.jp | 2.5秒 | 30秒 |
| Booking.com | www.booking.com | 2.5秒 | 20秒 |
| Agoda | www.agoda.com | 3.0秒 | 15秒 |
| Trip.com | jp.trip.com | 2.5秒 | 10秒 |
| Yahooトラベル | travel.yahoo.co.jp | 2.0秒 | 5秒 |

---

## 4. データモデル概要

### 4.1 ER図（論理）

```
projects 1──N project_hotels N──1 hotels
    │                                │
    │                                │
    ├── ota_search_profiles          ├── hotel_ota_mappings
    │                                │
    ├── project_default_presets       │
    │                                │
    └── jobs                         │
         │                           │
         └── job_tasks               │
              │                      │
              ├── task_results       │
              └── task_artifacts     │
```

### 4.2 主要テーブル

| テーブル | 概要 |
|---------|------|
| projects | エリア（プロジェクト）単位の管理 |
| hotels | ホテルマスタ |
| project_hotels | プロジェクト × ホテルの中間テーブル |
| hotel_ota_mappings | ホテル × OTA の施設URL対応 |
| ota_search_profiles | OTA検索ベースURL設定 |
| project_default_presets | 検索条件プリセット |
| jobs | ジョブ（1回の実行単位） |
| job_tasks | タスク（OTA × 日付 × 条件） |
| task_results | 順位結果（自然順位 + 表示順位） |
| task_artifacts | 失敗時の証跡（スクショ・HTML） |

---

## 5. 画面一覧

| パス | 画面名 | 概要 |
|-----|--------|------|
| /projects | プロジェクト一覧 | 全プロジェクトの一覧・作成・有効切替 |
| /projects/[id]/hotels | ホテル管理 | ホテルの追加・編集・OTAマッピング |
| /projects/[id]/profiles | 検索プロファイル | OTA別の検索URL設定 |
| /projects/[id]/presets | プリセット | 検索条件セットの管理 |
| /projects/[id]/jobs | ジョブ一覧 | ジョブの作成・実行・状態確認 |
| /projects/[id]/jobs/[jobId] | ジョブ結果 | 順位マトリクス・Excel DL |
| /settings | 設定 | Cronテスト実行 |
| /test | テストダッシュボード | API動作確認用 |

---

## 6. API一覧

| メソッド | パス | 概要 |
|---------|------|------|
| GET | /api/projects | プロジェクト一覧取得 |
| POST | /api/projects | プロジェクト作成 |
| PUT | /api/projects | プロジェクト更新 |
| GET | /api/hotels?project_id= | ホテル一覧取得 |
| POST | /api/hotels | ホテル作成（+マッピング） |
| PUT | /api/hotels | ホテル更新 |
| GET | /api/search-profiles?project_id= | 検索プロファイル一覧 |
| POST | /api/search-profiles | 検索プロファイル作成 |
| PUT | /api/search-profiles | 検索プロファイル更新 |
| GET | /api/presets?project_id= | プリセット一覧 |
| POST | /api/presets | プリセット作成 |
| PUT | /api/presets | プリセット更新 |
| GET | /api/jobs?project_id= | ジョブ一覧 |
| POST | /api/jobs | ジョブ作成（+タスク） |
| POST | /api/jobs/[id]/run | ジョブ実行 |
| GET | /api/jobs/[id]/results | ジョブ結果取得 |
| GET | /api/jobs/[id]/excel | Excel出力 |
| POST | /api/cron/daily | 日次自動ジョブ生成・実行 |
| POST | /api/cron/cleanup | 古いデータの削除 |
