# OTA Get Rank Tool — 実装プラン

## 前提

- **現状**: ソースコード0。仕様書・Claude Code設定のみ存在
- **方針**: 小さく実装 → テストで検証 → 次のフェーズへ（CLAUDE.md準拠）
- **技術スタック**: Next.js (App Router) + TypeScript + Supabase + Playwright + pnpm

---

## Phase 0: プロジェクト基盤（スキャフォールド）

**ゴール**: `pnpm dev` で空のNext.jsアプリが起動する

| # | 作業 | 成果物 |
|---|------|--------|
| 0-1 | pnpm workspace + monorepo初期化 | `pnpm-workspace.yaml`, `package.json` (root) |
| 0-2 | Next.js (App Router) + TypeScript セットアップ | `apps/web/` |
| 0-3 | 共有パッケージ初期化 | `packages/shared/` |
| 0-4 | ESLint + Prettier 設定 | `.eslintrc`, `.prettierrc` |
| 0-5 | `.env.local.example` 作成（接続先テンプレート） | `.env.local.example` |
| 0-6 | `git init` + `.gitignore` | リポジトリ初期化 |

**検証**: `pnpm install && pnpm dev` → localhost:3000 でページ表示

---

## Phase 1: データベーススキーマ

**ゴール**: Supabase上に全テーブルが作成される

| # | 作業 | テーブル |
|---|------|---------|
| 1-1 | マスタ系マイグレーション | `projects`, `hotels`, `project_hotels` |
| 1-2 | OTAマッピング | `hotel_ota_mappings` |
| 1-3 | 検索プロファイル | `ota_search_profiles` |
| 1-4 | プリセット | `project_default_presets` |
| 1-5 | ジョブ系マイグレーション | `jobs`, `job_tasks`, `task_results`, `task_artifacts` |
| 1-6 | Enum定義 + RLS基本ポリシー | `ota_type` enum, RLS |
| 1-7 | Supabaseクライアント初期化 | `packages/shared/src/supabase.ts` |

**検証**: `/migrate` スキル実行 → 全テーブル存在確認（SQL）

---

## Phase 2: コアドメインロジック（純粋関数・テスト可能）

**ゴール**: UI/DB無しで単体テスト通過

| # | 作業 | ファイル |
|---|------|---------|
| 2-1 | 日付生成（平日＋祝日除外） | `packages/shared/src/dates/` |
| 2-2 | 楽天トラベル URL Builder | `packages/shared/src/ota/rakuten.ts` |
| 2-3 | じゃらん URL Builder | `packages/shared/src/ota/jalan.ts` |
| 2-4 | 一休 URL Builder | `packages/shared/src/ota/ikyu.ts` |
| 2-5 | Expedia URL Builder | `packages/shared/src/ota/expedia.ts` |
| 2-6 | Booking.com URL Builder | `packages/shared/src/ota/booking.ts` |
| 2-7 | Agoda URL Builder | `packages/shared/src/ota/agoda.ts` |
| 2-8 | Trip.com URL Builder | `packages/shared/src/ota/tripcom.ts` |
| 2-9 | URL正規化（allowlist/denylist） | `packages/shared/src/ota/url-normalizer.ts` |
| 2-10 | バリデーション | `packages/shared/src/validation.ts` |

**各URL Builderの責務**:
- base_url + 検索条件 → 巡回用URL生成
- variable_mapping_json に基づくパラメータ差し替え
- allowlist/denylist による正規化

**検証**: `pnpm test` → 全OTAのURL生成・正規化テスト通過

---

## Phase 3: Playwrightワーカー（1 OTAずつ段階実装）

**ゴール**: 1タスク（1 OTA × 1日付 × 1条件）の取得が成功する

| # | 作業 | 内容 |
|---|------|------|
| 3-1 | ワーカー基盤 | ブラウザプール管理、並列制御(max 5)、セマフォ |
| 3-2 | UAローテーション | UA/locale/viewport切替ロジック |
| 3-3 | 速度制限 | ドメイン別最小間隔 + ジッター |
| 3-4 | 楽天 抽出ロジック | 一覧パース、広告判定、総件数、施設URL同定 |
| 3-5 | じゃらん 抽出ロジック | 同上 |
| 3-6 | 一休 抽出ロジック | 同上 |
| 3-7 | Expedia 抽出ロジック | 同上 |
| 3-8 | Booking.com 抽出ロジック | 同上 |
| 3-9 | Agoda 抽出ロジック | 同上 |
| 3-10 | Trip.com 抽出ロジック | 同上 |
| 3-11 | 自然順位算出（共通） | isAd除外 → 自然順位カウント → 100位上限 |
| 3-12 | 失敗時証跡保存 | screenshot + HTML → Supabase Storage |
| 3-13 | リトライ（末尾回し） | attempt_count管理、max 3回 |

**検証**: 楽天トラベルに対して1条件で実行 → 順位・総件数がDBに保存される

---

## Phase 4: API Routes

**ゴール**: フロントから全操作が可能

| # | 作業 | エンドポイント |
|---|------|---------------|
| 4-1 | プロジェクト CRUD | `POST/GET/PUT /api/projects` |
| 4-2 | ホテル CRUD + OTAマッピング | `POST/GET/PUT /api/hotels` |
| 4-3 | 検索プロファイル CRUD | `POST/GET/PUT /api/search-profiles` |
| 4-4 | プリセット CRUD | `POST/GET/PUT /api/presets` |
| 4-5 | ジョブ作成・実行 | `POST /api/jobs`, `POST /api/jobs/[id]/run` |
| 4-6 | 結果取得 | `GET /api/jobs/[id]/results` |
| 4-7 | タスク詳細・証跡 | `GET /api/tasks/[id]` |
| 4-8 | 日次Cronエンドポイント | `POST /api/cron/daily` |
| 4-9 | クリーンアップ | `POST /api/cron/cleanup` |
| 4-10 | Excel出力 | `GET /api/jobs/[id]/excel` |

**検証**: curl / httpie で各APIを叩いてレスポンス確認

---

## Phase 5: 管理画面UI

**ゴール**: ブラウザからジョブ実行・結果閲覧が可能

| # | 作業 | 画面 |
|---|------|------|
| 5-1 | レイアウト + Supabase Auth | ログイン/ロール(admin/viewer) |
| 5-2 | プロジェクト管理 | 一覧/作成/編集 |
| 5-3 | ホテル管理 + OTAマッピング | 一覧/登録/URL入力 |
| 5-4 | 検索プロファイル管理 | OTA別base_url登録 |
| 5-5 | プリセット管理 | 条件セット作成/編集 |
| 5-6 | ジョブ実行画面 | 手動実行/進捗表示 |
| 5-7 | 結果ダッシュボード | OTA×人数×日付マトリクス |
| 5-8 | 実行履歴 | 失敗タスク一覧/スクショ/HTML閲覧 |
| 5-9 | Excel DL | ジョブ別ダウンロード |

**検証**: Playwright E2Eテスト（ログイン → ジョブ実行 → 結果表示）

---

## Phase 6: 定期実行 & データライフサイクル

**ゴール**: 毎日自動実行 + 3ヶ月超データ自動削除

| # | 作業 |
|---|------|
| 6-1 | `/api/cron/daily` 完成（全プロジェクト×デフォルトプリセット → ジョブ自動作成・実行） |
| 6-2 | `/api/cron/cleanup` 完成（3ヶ月超 DB削除 → Storage削除） |
| 6-3 | Vercel Cron設定 or 外部スケジューラ連携 |

**検証**: 手動でcronエンドポイント叩き → ジョブ完走 + 古いデータ削除確認

---

## Phase 7: Chrome拡張（後回し可）

**ゴール**: OTA検索結果ページからURL/セレクタを抽出してコピー

| # | 作業 |
|---|------|
| 7-1 | Manifest V3 セットアップ | `apps/extension/` |
| 7-2 | URL抽出 + コピー機能 |
| 7-3 | DOM検査ヘルパー（inspect-spaスキル連携） |

---

## 実装順序と安全チェックポイント

```
Phase 0 (基盤)
  └─ ✅ pnpm dev 起動確認
Phase 1 (DB)
  └─ ✅ マイグレーション成功 + テーブル確認
Phase 2 (ドメインロジック) ← ★ここが最重要。テスト駆動で。
  └─ ✅ pnpm test 全通過
Phase 3 (ワーカー) ← ★1 OTAずつ、実際のサイトで動作確認
  └─ ✅ 楽天1件で順位取得成功
  └─ ✅ 7 OTA全て成功
Phase 4 (API)
  └─ ✅ curl で全エンドポイント動作確認
Phase 5 (UI)
  └─ ✅ Playwright E2Eテスト通過
Phase 6 (Cron + Cleanup)
  └─ ✅ 自動実行 → 結果保存 → 古いデータ削除
```

## リスク & 対策

| リスク | 対策 |
|--------|------|
| OTAのDOM構造変更 | セレクタを定数化(`packages/shared/src/constants/channels.ts`)、変更時に1箇所修正 |
| CAPTCHA/ブロック | UA/速度制限で回避。突破はしない。失敗→証跡保存 |
| Supabase接続障害 | リトライ + エラーログ。ジョブは完走する設計 |
| 仕様の推定パラメータ | allowlist運用で不要パラメータ排除。実測で都度調整 |

## 今回のスコープ提案

**Phase 0 → 1 → 2 をまず実装** することを提案します。
- 外部サイトへのアクセスなし（安全）
- 純粋関数中心でテスト容易
- 基盤が固まれば Phase 3 以降を安心して積み上げられる
