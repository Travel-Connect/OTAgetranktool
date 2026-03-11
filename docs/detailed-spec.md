# OTA Get Rank Tool — 詳細仕様書 v1.2

> 最終更新: 2026-03-11

---

## 1. プロジェクト構成

### 1.1 モノレポ構成

```
OTAgetrankTool/
├── apps/web/          Next.js 15 アプリケーション
├── packages/shared/   共有ライブラリ (@ota/shared)
├── supabase/          マイグレーション
├── docs/              ドキュメント
├── pnpm-workspace.yaml
├── package.json       ルートパッケージ (PNPM + Turborepo)
└── vercel.json        Cronスケジュール
```

### 1.2 パッケージ依存関係

```
@ota/web (apps/web)
  ├── @ota/shared (workspace:*)
  ├── @supabase/supabase-js ^2.97.0
  ├── exceljs ^4.4.0
  ├── next ^15.1.0
  ├── playwright ^1.58.2
  ├── playwright-extra ^4.3.6
  ├── puppeteer-extra-plugin-stealth ^2.11.2
  ├── react ^19.0.0
  └── react-dom ^19.0.0

@ota/shared (packages/shared)
  ├── @holiday-jp/holiday_jp ^2.5.1
  └── @supabase/supabase-js ^2.97.0
```

---

## 2. データベース仕様

### 2.1 スキーマ

全テーブルは `ota_getrank` スキーマに格納。

### 2.2 ENUM定義

```sql
CREATE TYPE ota_type AS ENUM (
  'rakuten', 'jalan', 'ikyu', 'expedia', 'booking', 'agoda', 'tripcom', 'yahoo'
);

CREATE TYPE job_status AS ENUM (
  'queued', 'running', 'success', 'partial', 'failed'
);

CREATE TYPE task_status AS ENUM (
  'queued', 'running', 'success', 'failed', 'skipped'
);

CREATE TYPE date_mode AS ENUM ('list', 'rule');
```

### 2.3 テーブル定義

#### projects
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | プロジェクト名（エリア名等） |
| timezone | text | default 'Asia/Tokyo' | タイムゾーン |
| active | boolean | default true | 有効フラグ |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### hotels
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| display_name | text | NOT NULL | ホテル表示名 |
| memo | text | | メモ |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### project_hotels
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| project_id | uuid | FK → projects, NOT NULL | |
| hotel_id | uuid | FK → hotels, NOT NULL | |
| sort_order | int | default 0 | 表示並び順 |
| PK | | (project_id, hotel_id) | 複合主キー |

#### hotel_ota_mappings
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| hotel_id | uuid | FK → hotels, NOT NULL | |
| ota | ota_type | NOT NULL | OTA種別 |
| ota_property_url | text | NOT NULL | OTA上の施設ページURL |
| ota_property_id | text | | OTA上の施設ID（任意） |
| enabled | boolean | default true | 有効フラグ |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |
| UNIQUE | | (ota, ota_property_url) | |

#### ota_search_profiles
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| project_id | uuid | FK → projects, NOT NULL | |
| ota | ota_type | NOT NULL | OTA種別 |
| base_url | text | NOT NULL | 検索ベースURL |
| variable_mapping_json | jsonb | default '{}' | 変数マッピング |
| allowlist_params_json | jsonb | | パラメータ許可リスト |
| area_label | text | | エリアラベル（那覇、北谷等） |
| denylist_params_json | jsonb | | パラメータ拒否リスト |
| enabled | boolean | default true | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### project_default_presets
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| project_id | uuid | FK → projects, NOT NULL | |
| name | text | NOT NULL | プリセット名 |
| otas_json | jsonb | NOT NULL | 対象OTA配列 |
| adults_per_room_json | jsonb | NOT NULL | 人数/室の配列 |
| rooms_int | int | default 1 | 室数 |
| nights_int | int | default 1 | 泊数 |
| date_mode | date_mode | NOT NULL | 日付指定モード |
| date_list_json | jsonb | | 日付リスト（listモード用） |
| rule_json | jsonb | | 日付生成ルール（ruleモード用） |
| enabled | boolean | default true | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

#### jobs
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| project_id | uuid | FK → projects, NOT NULL | |
| run_date | date | NOT NULL | 実行日 |
| preset_id | uuid | FK → project_default_presets | |
| status | job_status | default 'queued' | |
| started_at | timestamptz | | 実行開始日時 |
| finished_at | timestamptz | | 実行完了日時 |
| created_at | timestamptz | default now() | |

#### job_tasks
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| job_id | uuid | FK → jobs, NOT NULL | |
| ota | ota_type | NOT NULL | OTA種別 |
| checkin_date | date | NOT NULL | チェックイン日 |
| nights | int | default 1 | 泊数 |
| rooms | int | default 1 | 室数 |
| adults_per_room | int | default 2 | 人数/室 |
| attempt_count | int | default 0 | 試行回数 |
| status | task_status | default 'queued' | |
| last_error_code | text | | 最終エラーコード |
| last_error_message | text | | 最終エラーメッセージ |
| executed_url | text | | 実行URL |
| started_at | timestamptz | | |
| finished_at | timestamptz | | |
| created_at | timestamptz | default now() | |

#### task_results
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| task_id | uuid | PK, FK → job_tasks | |
| total_count_int | int | | 検索結果総件数 |
| total_count_raw_text | text | | 総件数の元テキスト |
| ranks_json | jsonb | NOT NULL, default '{}' | 自然順位 {hotel_id: rank\|null} |
| display_ranks_json | jsonb | NOT NULL, default '{}' | 表示順位 {hotel_id: rank\|null} |
| scanned_natural_count | int | | スキャン済み自然順位数 |
| debug_items_sample_json | jsonb | | デバッグ用先頭5件 |
| created_at | timestamptz | default now() | |

#### task_artifacts
| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| task_id | uuid | PK, FK → job_tasks | |
| screenshot_path | text | | スクショのStorageパス |
| html_path | text | | HTMLのStorageパス |
| created_at | timestamptz | default now() | |

### 2.4 RLS（Row Level Security）

| ロール | 権限 |
|--------|------|
| service_role | 全テーブル FULL ACCESS（RLSバイパス） |
| authenticated | 全テーブル SELECT のみ |
| anon | アクセス不可 |

---

## 3. 順位取得エンジン仕様

### 3.1 全体フロー

```
runJob(jobId)
  │
  ├── ジョブ status → "running"
  ├── タスク一覧取得（queued, checkin_date昇順）
  ├── 検索プロファイル・OTAマッピング取得
  │
  ├── ★ interleaveByOta(): タスクをOTA別ラウンドロビンで並べ替え
  ├── タスクキュー処理ループ
  │   ├── ★ 同一OTA連続時はクールダウン待ち (Expedia 30s, Booking 20s 等)
  │   ├── OTA URL Builder でURL生成
  │   ├── ホテルURLマップ構築（OTA固有の正規化）
  │   ├── executeTask(ota, url, hotelUrlMap)
  │   │   ├── ブラウザコンテキスト取得（セマフォ制御）
  │   │   ├── ドメイン速度制限待ち
  │   │   ├── ページナビゲーション (networkidle)
  │   │   ├── CAPTCHA / ブロック検出
  │   │   ├── ページング（最大10ページ）
  │   │   │   └── OTA Extractor でアイテム抽出
  │   │   └── calculateNaturalRanks()
  │   │
  │   ├── 成功 → task_results 保存
  │   └── 失敗 → リトライ or 最終失敗 + 証跡保存
  │
  ├── ブラウザ解放
  └── ジョブ最終ステータス決定
```

### 3.2 ブラウザプール

| 設定 | 値 |
|------|-----|
| 同時実行上限 | 5コンテキスト |
| ブラウザ | Chromium (headless) |
| ステルス | playwright-extra + puppeteer-extra-plugin-stealth |
| 起動引数 | `--disable-blink-features=AutomationControlled` |
| タイムゾーン | Asia/Tokyo |
| Accept-Language | ja,en-US;q=0.9,en;q=0.8 |

### 3.3 UAローテーション

5種類のブラウザプロファイルをラウンドロビンで使用:

| # | UA | ビューポート | ロケール |
|---|-----|------------|---------|
| 1 | Chrome 131 (Windows) | 1920x1080 | ja-JP |
| 2 | Chrome 130 (Windows) | 1366x768 | ja-JP |
| 3 | Edge 131 (Windows) | 1920x1080 | ja-JP |
| 4 | Safari 17.6 (Mac) | 1440x900 | ja |
| 5 | Firefox 132 (Windows) | 1680x1050 | ja-JP |

### 3.4 速度制限

| ドメイン | 最小間隔 | ジッター |
|---------|---------|---------|
| search.travel.rakuten.co.jp | 2,000ms | 0〜1,500ms |
| www.jalan.net | 2,000ms | 0〜1,500ms |
| www.ikyu.com | 2,000ms | 0〜1,500ms |
| www.expedia.co.jp | 2,500ms | 0〜1,500ms |
| www.booking.com | 2,500ms | 0〜1,500ms |
| www.agoda.com | 3,000ms | 0〜1,500ms |
| jp.trip.com | 2,500ms | 0〜1,500ms |
| travel.yahoo.co.jp | 2,000ms | 0〜1,500ms |

### 3.5 タイムアウト

| 対象 | 値 |
|------|-----|
| ナビゲーション | 30秒 |
| タスク全体 | 5分 |
| ホテルカード待機（Trip.com） | 10秒 × 3リトライ |

### 3.6 リトライ

- 最大試行回数: 3回
- 方式: 末尾回しキュー（他のタスクを先に処理後にリトライ）
- リトライ対象: タスク実行の全エラー（timeout, navigation, network, parse_error, blocked）

### 3.7 エラー分類

| コード | 条件 |
|--------|------|
| `timeout` | メッセージに "timeout" を含む |
| `navigation` | メッセージに "navigation" を含む |
| `network` | メッセージに "net::" を含む |
| `blocked` | CAPTCHA / ブロック検出 |
| `no_profile` | 対応する検索プロファイルが未登録 |
| `parse_error` | 上記以外の全エラー |

### 3.8 ブロック検出

以下のいずれかを検出した場合、ブロックと判定:

| 検出方法 | セレクタ / パターン |
|---------|-----------------|
| CSSセレクタ | `[class*="captcha"]`, `[id*="captcha"]` |
| CSSセレクタ | `[class*="challenge"]`, `[id*="challenge"]` |
| iframe | `iframe[src*="captcha"]` |
| ページタイトル | `/access denied\|blocked\|security check/i` |

---

## 4. 順位算出仕様

### 4.1 用語定義

| 用語 | 定義 |
|------|------|
| **表示順位 (Display Rank)** | 広告を含む全アイテムの画面表示順。1始まり。 |
| **自然順位 (Natural Rank)** | 広告（`isAd=true`）を除外したアイテムの順位。1始まり。 |
| **圏外** | 自然順位100位以内に見つからない場合。`null` で表現。 |

### 4.2 算出ロジック

```
入力: allItems (ListItem[]), hotelUrlMap (Map<hotelId, urls[]>)

naturalRank = 0
displayRank = 0

for item in allItems:
  displayRank++

  // 表示順位: 全アイテムでURL照合
  for (hotelId, urls) in hotelUrlMap:
    if hotelのdisplayRanksが未確定 AND item.url が urls のいずれかと一致:
      displayRanks[hotelId] = displayRank

  // 自然順位: 広告はスキップ
  if NOT item.isAd:
    naturalRank++
    for (hotelId, urls) in hotelUrlMap:
      if hotelのranksが未確定 AND item.url が urls のいずれかと一致:
        ranks[hotelId] = naturalRank

  // 自然順位100到達で終了
  if naturalRank >= 100: break
```

### 4.3 URL照合（施設同定）

パスベースの正規化比較:
1. URLパース
2. ホスト名 + パス（末尾スラッシュ除去）を小文字化
3. 完全一致で判定

### 4.4 出力データ構造

```typescript
interface RankResult {
  ranks: Record<string, number | null>;           // 自然順位
  displayRanks: Record<string, number | null>;    // 表示順位
  scannedNaturalCount: number;                    // スキャン済み自然順位数（最大100）
  scannedDisplayCount: number;                    // スキャン済み表示アイテム数
  debugItemsSample: Array<{                       // 先頭5件のデバッグ情報
    name?: string;
    url: string;
    naturalRank: number;
    displayRank: number;
    isAd: boolean;
  }>;
}
```

---

## 5. OTA別抽出仕様

### 5.1 Trip.com

| 項目 | 仕様 |
|------|------|
| **ドメイン** | jp.trip.com |
| **レンダリング** | SPA（クライアントサイドレンダリング） |
| **待機戦略** | `networkidle` + `.hotel-card` セレクタ待機 × 3リトライ |
| **未描画対策** | スクロール 300px → 2秒待機 → 上にスクロール → 1秒待機 |
| **抽出方式** | `page.evaluate()` で DOM一括走査（Playwright locator のタイミング問題回避） |
| **ホテルカード** | `.hotel-card` セレクタ |
| **ホテルID** | `card.id` 属性 |
| **ホテル名** | `.hotelName` セレクタの textContent |
| **広告判定** | `.ad-info` セレクタの存在 |
| **総件数** | `[class*="count"]` で `\d+軒` にマッチするテキスト |
| **次ページ** | アイテム数 >= 10 なら次ページあり |
| **ページURL** | `?page={N}` パラメータ |
| **施設URL形式** | `https://jp.trip.com/hotels/hotel-detail-{hotelId}` |
| **URL正規化** | `normalizeTripcomUrl()` — 3パターンを統一形式に変換 |

**Trip.com URL正規化の変換パターン:**

| 入力形式 | 出力 |
|---------|------|
| `/hotels/detail/?hotelId=759848&...` | `/hotels/hotel-detail-759848` |
| `/hotels/naha-hotel-detail-105013347` | `/hotels/hotel-detail-105013347` |
| `/hotels/hotel-detail-704309` | `/hotels/hotel-detail-704309` |

### 5.2 楽天トラベル

| 項目 | 仕様 |
|------|------|
| **ドメイン** | search.travel.rakuten.co.jp |
| **URL Builder パラメータ** | f_nen1, f_tuki1, f_hi1 (CI), f_nen2, f_tuki2, f_hi2 (CO), f_heya_su (室数), f_otona_su (人数/室), f_s1/s2/y1-y4=0 (子供=0) |

### 5.3 じゃらん

| 項目 | 仕様 |
|------|------|
| **ドメイン** | www.jalan.net |

### 5.4 一休

| 項目 | 仕様 |
|------|------|
| **ドメイン** | www.ikyu.com |

### 5.5 Expedia

| 項目 | 仕様 |
|------|------|
| **ドメイン** | www.expedia.co.jp |

### 5.6 Booking.com

| 項目 | 仕様 |
|------|------|
| **ドメイン** | www.booking.com |

### 5.7 Agoda

| 項目 | 仕様 |
|------|------|
| **ドメイン** | www.agoda.com |

### 5.8 Yahooトラベル

| 項目 | 仕様 |
|------|------|
| **ドメイン** | travel.yahoo.co.jp |
| **レンダリング** | SPA (Nuxt.js) — 一休と同一技術基盤 |
| **待機戦略** | `networkidle` |
| **抽出方式** | `page.evaluate()` 一括抽出 |
| **ホテルカード** | `section[itemprop="itemListElement"]` (Schema.org) |
| **ホテルID** | `meta[itemprop="url"]` → 8桁ゼロ埋め |
| **総件数** | `対象施設: N 件` |
| **1ページ件数** | 20 |
| **ページネーション** | パスベース `/pN/` |
| **施設URL形式** | `https://travel.yahoo.co.jp/00912308/` |
| **一休との違い** | 掲載施設が異なる（一休は審査通過施設のみ）、検索順位も独立 |

**URL Builder パラメータ**: 一休と同一 (`cid`, `cod`, `lc`, `rc`, `ppc`)

> 注: 楽天以外のOTAの詳細抽出セレクタは、実際のサイト構造に合わせてExtractorファイルで個別実装済み。Trip.comのみ大幅改修済みのため詳細記載。

---

## 6. URL Builder 仕様 (@ota/shared)

### 6.1 共通インターフェース

```typescript
interface SearchCondition {
  checkinDate: DateString;    // "YYYY-MM-DD"
  nights: number;
  rooms: number;
  adultsPerRoom: number;
}

interface SearchProfile {
  ota: OtaType;
  baseUrl: string;
  variableMappingJson: Record<string, string>;
  allowlistParamsJson?: string[];
  denylistParamsJson?: string[];
}

interface OtaUrlBuilder {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string;
}
```

### 6.2 URL正規化フロー

```
baseUrl (ユーザー登録)
  → mergeUrlParams(baseUrl, overrides)    // OTA固有パラメータを上書き
  → normalizeUrl(merged, allowlist, denylist)  // パラメータフィルタリング
  → 最終URL
```

### 6.3 日付生成ルール

```typescript
interface DateRule {
  offsetMonths: number;        // 基準日からNヶ月後
  weekdays: number[];          // 対象曜日 (0=日, 1=月, ..., 6=土)
  excludeJpHolidays: boolean;  // 日本の祝日を除外
  generateCount: number;       // 生成する日付数
}
```

`generateDates(runDate, rule)` の動作:
1. `runDate` に `offsetMonths` を加算した月の1日を基準とする
2. その月の日付を走査
3. `weekdays` に含まれる曜日のみ抽出
4. `excludeJpHolidays=true` なら祝日を除外
5. `generateCount` 件に達するまで収集
6. 月末を超えたら翌月に続行

---

## 7. Excel出力仕様

### 7.1 ファイル構成

- 1ファイル = 1ジョブ
- ファイル名: `OTA_Rank_{projectName}_{runDate}.xlsx`

### 7.2 シート構成

OTAごとに1シート。シート名はOTA日本語表示名:

| OTA | シート名 |
|-----|---------|
| rakuten | 楽天トラベル |
| jalan | じゃらん |
| ikyu | 一休 |
| expedia | Expedia |
| booking | Booking.com |
| agoda | Agoda |
| tripcom | Trip.com |
| yahoo | Yahooトラベル |

### 7.3 シートレイアウト

```
行1: 集計日    | {run_date}
行2: エリア    | {project_name}
行3: 泊数      | {nights}
行4: 室数      | {rooms}
行5: 圏外閾値  | 100
行6: (空行)

--- 人数ごとのセクション（例: 2名/室） ---

行7: "2名/室 — 表示順位（広告含む）"          [太字]
行8: ホテル     | 2026-04-01 | 2026-04-02 | ...  [太字]
行9: ホテルA    | 3          | 5          | ...
行10: ホテルB   | -          | 12         | ...

行N: "2名/室 — 自然順位（広告除外）"          [太字]
行N+1: ホテル   | 2026-04-01 | 2026-04-02 | ... [太字]
行N+2: ホテルA  | 2          | 4          | ...
行N+3: ホテルB  | -          | 10         | ...

行M: 総件数     | 401        | 398        | ...
行M+1: (空行)
```

### 7.4 セル表記

| 値 | 表記 |
|----|------|
| 順位が取得できた場合 | 数値（例: 6） |
| 圏外 (null) | `-` |
| 未取得 (undefined) | `-` |

### 7.5 カラム幅

| カラム | 幅 |
|--------|-----|
| ホテル名列 | 20 |
| 日付列 | 14 |

---

## 8. Cron仕様

### 8.1 スケジュール

| ジョブ | Cron式 | JST時刻 | 説明 |
|--------|--------|---------|------|
| daily | `0 1 * * *` | 毎日 10:00 | 日次順位取得 |
| cleanup | `0 3 * * 0` | 毎週日曜 12:00 | 古いデータ削除 |

### 8.2 Daily ジョブ生成ロジック

```
1. 全アクティブプロジェクト取得 (active=true)
2. 各プロジェクトの有効プリセット取得 (enabled=true)
3. 各プリセットについて:
   a. date_mode="rule" → generateDates(today, rule_json) でチェックイン日生成
   b. date_mode="list" → date_list_json をそのまま使用
   c. otas_json × adults_per_room_json の組み合わせでタスク生成
4. ジョブ作成 → タスク作成 → runJob() でバックグラウンド実行
```

### 8.3 Cleanup ロジック

- 3ヶ月以上前の `jobs` とその関連データを削除
- 対象: jobs → job_tasks → task_results → task_artifacts
- Supabase Storage の証跡ファイルも削除

### 8.4 認証

- `Authorization: Bearer {CRON_SECRET}` ヘッダーで認証
- Vercel Cronは自動的にこのヘッダーを付与

---

## 9. ファイル一覧と責務

### 9.1 Worker モジュール

| ファイル | 責務 |
|---------|------|
| `worker/browser-pool.ts` | ブラウザインスタンス管理、コンテキストプール、セマフォ |
| `worker/task-executor.ts` | タスク実行、ページング、CAPTCHA検出、タイムアウト制御 |
| `worker/rank-calculator.ts` | 自然順位・表示順位の算出 |
| `worker/rate-limiter.ts` | ドメイン別速度制限 |
| `worker/ua-rotation.ts` | UAプロファイルのラウンドロビン |
| `worker/extractor-types.ts` | 抽出インターフェース定義 |
| `worker/extractors/*.ts` | OTA別のページ抽出実装 |
| `worker/index.ts` | バレルエクスポート |

### 9.2 ジョブ実行モジュール

| ファイル | 責務 |
|---------|------|
| `lib/job-runner.ts` | ジョブオーケストレーション、リトライ制御、結果保存 |
| `lib/excel-builder.ts` | Excel出力（ExcelJS） |
| `lib/db/server.ts` | Supabaseクライアント生成（service_role） |
| `lib/api-helpers.ts` | APIレスポンスヘルパー、Cron認証 |

### 9.3 共有パッケージ (@ota/shared)

| ファイル | 責務 |
|---------|------|
| `ota/types.ts` | SearchCondition, SearchProfile, OtaUrlBuilder |
| `ota/*.ts` | OTA別URL Builder (8種) |
| `ota/url-normalizer.ts` | URL正規化、パラメータマージ |
| `dates/index.ts` | 日付ユーティリティ、祝日判定、ルールベース日付生成 |
| `validation.ts` | 検索条件バリデーション |
| `supabase/client.ts` | Supabaseクライアントファクトリ |

---

## 10. 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase プロジェクトURL | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名キー | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase サービスロールキー | Yes |
| SUPABASE_ACCESS_TOKEN | Supabase Management API トークン | No |
| CRON_SECRET | Cron認証シークレット | Yes |

---

## 11. 今回の修正サマリ（v1.0 → v1.1）

### 11.1 表示順位の追加

**変更ファイル:**
- `rank-calculator.ts` — `displayRanks` フィールド追加、算出ロジック追加
- `job-runner.ts` — `display_ranks_json` のDB保存追加
- `excel-builder.ts` — 表示順位セクション追加（広告含む / 広告除外の2テーブル構成）
- `007_add_display_ranks_json.sql` — `task_results` テーブルにカラム追加

**変更理由:** 広告枠に表示されるホテルが自然順位では圏外と表示される問題。広告を含む画面表示順位も別途追跡することで正確な分析が可能に。

### 11.2 ボット検出回避（Stealth Plugin）

**変更ファイル:**
- `browser-pool.ts` — `playwright` → `playwright-extra` + `StealthPlugin` に変更
- `next.config.ts` — `serverExternalPackages` に3パッケージ追加
- `package.json` — `playwright-extra`, `puppeteer-extra-plugin-stealth` 追加

**変更理由:** Trip.comがホテル詳細ページで `navigator.webdriver` を検出し、サインインページにリダイレクトする問題。playwright-extra + StealthPlugin で webdriver フラグの隠蔽、HeadlessChrome UA修正等を自動適用。

### 11.3 Trip.com Extractor改修

**変更ファイル:**
- `extractors/tripcom.ts` — 抽出ロジック全面改修

**変更内容:**
- Playwright locator → `page.evaluate()` による DOM一括走査に変更（SPAのタイミング問題回避）
- ホテルカード待機のリトライ＋スクロール対策追加
- `normalizeTripcomUrl()` を export し、job-runner.ts から利用可能に
- 広告判定: `.ad-info` セレクタ
- 施設URL生成: `card.id` からの直接構築

### 11.4 タスク実行の安定化

**変更ファイル:**
- `task-executor.ts`

**変更内容:**
- `waitUntil` を `domcontentloaded` → `networkidle` に変更（SPA対応）
- `MAX_PAGES` を 5 → 10 に拡大（12件/ページ × 10 = 最大120件）
- タスク全体タイムアウト（5分）の追加（`Promise.race` 方式）

### 11.5 ホテルURLマップの正規化

**変更ファイル:**
- `job-runner.ts`

**変更内容:**
- Trip.comのOTAマッピングURLに `normalizeTripcomUrl()` を適用
- DBに登録された各種URL形式を統一形式に正規化してからURL照合
