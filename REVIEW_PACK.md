# Code Review Pack — OTA Getrank Tool

**Commit**: `cf31669` (2026-03-11)
**Base**: `e3bd0fa` (Phase 6 — Cron scheduling)
**Diff**: `git diff e3bd0fa..cf31669`
**Stats**: 51 files changed, +5,429 / -718 lines

---

## 1. プロジェクト概要

OTA（Online Travel Agency）の検索結果から、登録ホテルの自然順位・表示順位を自動取得するツール。

- **Monorepo**: `apps/web` (Next.js 15) + `packages/shared` (共通型・URL Builder)
- **DB**: Supabase (PostgreSQL, schema: `ota_getrank`)
- **ブラウザ自動化**: Playwright + playwright-extra (StealthPlugin)
- **並列実行**: 5ブラウザ同時 (セマフォ制御)

---

## 2. 今回の変更概要

### 2.1 Yahoo Travel OTA 追加 (8番目のOTA)
**新規ファイル**:
- `packages/shared/src/ota/yahoo.ts` — URL Builder
- `apps/web/src/lib/worker/extractors/yahoo.ts` — Extractor (一休と同一基盤)

一休 (ikyu) と同じ Nuxt.js / Schema.org マークアップを共有。ドメインが `travel.yahoo.co.jp` に変わるだけ。

### 2.2 スマートページネーション
**変更の核心** — 走査速度を27%改善。

| ファイル | 変更内容 |
|---------|---------|
| `task-executor.ts` | `executeSmartPagination()` 新設。ヒントベースのページ走査 + 早期終了 |
| `rank-calculator.ts` | `generatePaginationHints()`, `urlMatch()` export 追加 |
| `extractor-types.ts` | `itemsPerPage`, `isScrollBased`, `getPageUrl` 追加 |
| `job-runner.ts` | ヒント取得 (直近5成功ジョブから) + ヒント保存 |
| 各 extractor | `itemsPerPage`/`isScrollBased`/`getPageUrl` プロパティ追加 |

**動作原理**:
1. 前回実行でホテルが見つかったページ番号を `pagination_hints_json` に保存
2. 次回実行時、そのページから走査を開始 (例: page 2 → page 4 → page 1 → page 3 → ...)
3. 全ホテル発見で早期終了 (200件走査を待たない)

**対象OTA**: ページネーション型 4つ (楽天 30件/p, じゃらん 30件/p, 一休 20件/p, Yahoo 20件/p)
**スクロール型** (Trip.com, Expedia, Agoda, Booking): `scannedCount` のみ保存 (将来の高速スクロール用)

### 2.3 プロジェクト統合Excel
**新規**: `apps/web/src/app/api/projects/[id]/excel/route.ts`

複数エリアのジョブ結果 (那覇 + 北谷) を1つのExcelに統合。同一OTA/日付/大人数のタスク結果をマージ。

### 2.4 ホテル名自動取得
**新規**:
- `apps/web/src/lib/worker/resolve-hotel-name.ts` — OTA施設ページからホテル名をスクレイピング
- `apps/web/src/app/api/hotels/resolve-name/route.ts` — API エンドポイント

### 2.5 全8 Extractor リファクタリング
各OTAのExtractorを大幅改修:
- 改良されたセレクタ・抽出ロジック
- 無限スクロール対応 (Agoda, Booking, Expedia, Trip.com)
- 広告検出の強化
- URL正規化の改善

### 2.6 UI改善
- `HotelForm.tsx`: 名前自動取得ボタン追加
- `profiles/page.tsx`: エリアプリセットから一括登録
- `presets/page.tsx`: UI改善
- `jobs/page.tsx`: 統合Excelボタン追加

### 2.7 DBマイグレーション
| ファイル | 内容 |
|---------|------|
| `007_add_display_ranks_json.sql` | 表示順位カラム追加 |
| `008_allow_duplicate_ota_urls.sql` | OTA URL重複許可 |
| `009_add_yahoo_ota_type.sql` | Yahoo OTA type 追加 |
| `010_add_pagination_hints.sql` | ページネーションヒント保存カラム |

---

## 3. レビュー重点ポイント

### 3.1 セキュリティ
- [ ] `resolve-hotel-name.ts`: ユーザー入力URLでPlaywrightを起動 — SSRF リスク
- [ ] API routes: 認証なし (現在は内部使用のみ、Supabase service_role key)
- [ ] `job-runner.ts`: DB クエリに文字列連結はないか (Supabase JS Client 経由)

### 3.2 パフォーマンス / リソース
- [ ] `task-executor.ts`: `Promise.race` でタイムアウト制御 — タイムアウト時のブラウザリーク防止
- [ ] `browser-pool.ts`: セマフォで5並列制限 — エラー時の release 漏れ
- [ ] `job-runner.ts`: ヒント取得クエリが各タスクで実行 — N+1問題の可能性

### 3.3 ロジック正確性
- [ ] `executeSmartPagination()`: ページ番号タグ付きアイテム収集 → `reconstructOrderedItems()` で正しい順序復元
- [ ] `buildSmartPageOrder()`: targets → 前後展開 → 残り — ページ抜けがないか
- [ ] `allHotelsFound()`: `urlMatch()` の normalize がOTA間で一貫しているか
- [ ] `generatePaginationHints()`: `displayRank` ベースのページ計算が `itemsPerPage` と整合するか
- [ ] `rank-calculator.ts`: 自然順位 vs 表示順位のカウントが正しいか (広告除外ロジック)

### 3.4 エラーハンドリング
- [ ] Extractor内の `page.evaluate()`: DOM要素が見つからない場合の null チェック
- [ ] 無限スクロール: 無限ループ防止 (MAX回数制限あり?)
- [ ] CAPTCHA/ブロック検出後の適切なエラー伝播

### 3.5 コード品質
- [ ] 各Extractorの重複コード — 共通化の余地
- [ ] `job-runner.ts` の肥大化 (421行変更) — 責務分割の検討
- [ ] TypeScript の `as` キャスト使用箇所 — 型安全性

---

## 4. アーキテクチャ図

```
┌─────────────────────────────────────────────────────────┐
│ Next.js API Routes                                       │
│  POST /api/jobs          → runJob()                      │
│  GET  /api/projects/[id]/excel → 統合Excel生成            │
│  POST /api/hotels/resolve-name → ホテル名取得             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ job-runner.ts                                            │
│  ├─ タスク取得 + OTA別インターリーブ                        │
│  ├─ hotelUrlMap構築 (normalize関数適用)                    │
│  ├─ ★ paginationHint取得 (直近成功ジョブから)              │
│  ├─ Semaphore(5) で並列実行                               │
│  ├─ OTA別クールダウン (5s~30s)                            │
│  └─ 結果保存 (ranks_json, pagination_hints_json)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ task-executor.ts                                         │
│  ├─ acquireWorkerContext() → Stealth Playwright           │
│  ├─ extractor.warmUp?() → OTA固有初期化                   │
│  ├─ ★ Smart or Default pagination                        │
│  │    Smart: hint→ターゲットページ→前後展開→早期終了        │
│  │    Default: page1→page2→...→200件or全発見で停止         │
│  └─ calculateNaturalRanks() + generatePaginationHints()   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ extractors/{ota}.ts (8 OTA)                              │
│  ├─ ページネーション型: rakuten(30/p), jalan(30/p),        │
│  │                      ikyu(20/p), yahoo(20/p)           │
│  └─ スクロール型: tripcom, expedia, agoda, booking         │
│     (無限スクロール + ボタンクリック)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 主要ファイルクイックリファレンス

| ファイル | 行数 | 主な責務 |
|---------|------|---------|
| `job-runner.ts` | ~500 | ジョブ実行、タスク並列化、ヒント管理 |
| `task-executor.ts` | ~416 | ブラウザ操作、走査モード切替、タイムアウト |
| `rank-calculator.ts` | ~128 | 自然順位/表示順位算出、ヒント生成 |
| `extractors/booking.ts` | ~350 | Booking.com抽出 (最も複雑: warmUp+スクロール+ボタン) |
| `extractors/agoda.ts` | ~350 | Agoda抽出 (ハイブリッド: スクロール+ページボタン) |
| `extractors/expedia.ts` | ~350 | Expedia抽出 (Show moreボタン, DataDome対策) |
| `extractors/tripcom.ts` | ~300 | Trip.com抽出 (ABテスト両対応, 境界検出) |
| `projects/[id]/excel/route.ts` | ~157 | プロジェクト統合Excel |

---

## 6. テスト実績

- 72タスク (8 OTA × 2エリア × 複数日付) を5並列で実行: **全成功** (~5分)
- スマートページネーション: ヒントあり vs なしで **27%速度改善** を確認
- 各OTAの順位取得精度: E2Eテストで手動ブラウザ結果と照合済み
  - ※ Booking.com のみIPベースボット検出による順位オフセットあり (既知の制約)
