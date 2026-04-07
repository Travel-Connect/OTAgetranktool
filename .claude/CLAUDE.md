# Global Working Rules

## Core
- Claude Code may implement code directly.
- Use Codex (via claude-delegator) selectively for: architecture, plan review, security review, second opinions, or when stuck.

## Safety / Autonomy
- Prefer: Auto-accept edits + allowlisted commands + sandbox.
- Only use dangerously-skip-permissions inside an isolated environment with strict network controls.
- **ファイル/フォルダの作成・編集は `C:\OTAgetrankTool` 配下のみ**。プロジェクトルート外への書き込みは禁止。

## Supabase
- スキーマは分けない（`public` スキーマを使用）。
- Supabase CLI (`supabase db push` 等) やSupabase JS Client経由での直接SQL実行OK。
- マイグレーションファイルも引き続き `supabase/migrations/` に生成・管理する。
- Management API用トークン: `SUPABASE_ACCESS_TOKEN` (`.env.local`に保存済み)

## OTA Extractor 作業ルール
- OTA検索ロジック（Extractor）の構築・修正後は、必ず **詳細仕様書を作成・更新** する。
- 仕様書の保存先: `C:\Users\tckam\.claude\projects\c--OTAgetrankTool\memory\ota-extractors-spec.md`
- 仕様書に含める内容: DOM セレクタ、抽出ロジック、URL正規化の入出力例、ページネーション方式、既知の注意点、E2Eテスト結果
- 索引ファイル (`MEMORY.md`) も合わせて更新する。

## CAPTCHA / ボット検出対策
- **国内OTA** (楽天/じゃらん/一休/Yahoo): CAPTCHA検出緩い → 並列実行可
- **海外OTA** (Expedia/Booking/Agoda/Trip.com): 逐次実行 + クールダウン + ブロックバックオフ
- **DataDome (Expedia)**: IPベース検出。TLSフィンガープリント変更(Firefox切替)では回避不可。バックオフ(2分→5分エスカレーション)が最善のゼロコスト対策
- **Booking.com**: IPベースのソート順操作 (ブロックではなく順位が変わる)。warmUp + persistent context で緩和
- **ブラウザエンジン**: デフォルト Chromium + StealthPlugin。Firefox 対応コードあり (`browser-pool.ts` の `BROWSER_ENGINE` 切替)
- 詳細: 仕様書 §10.3 (バックオフ) / §10.7 (実験記録) 参照

## Workflow default
1) Clarify goal & acceptance criteria
2) Implement
3) Verify (uv + tests + Playwright if relevant)
4) PR with account checks