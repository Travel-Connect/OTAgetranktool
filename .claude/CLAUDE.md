# Global Working Rules

## Core
- Claude Code may implement code directly.
- Use Codex (via claude-delegator) selectively for: architecture, plan review, security review, second opinions, or when stuck.

## Safety / Autonomy
- Prefer: Auto-accept edits + allowlisted commands + sandbox.
- Only use dangerously-skip-permissions inside an isolated environment with strict network controls.
- **ファイル/フォルダの作成・編集は `C:\OTAgetrankTool` 配下のみ**。プロジェクトルート外への書き込みは禁止。

## Supabase
- スキーマで分ける設計（`public` 以外のカスタムスキーマを使用）。スキーマ作成時はユーザーに確認すること。
- **`supabase init` / `supabase link` / `supabase db push` 等の Supabase CLI による既存プロジェクトへの直接操作は禁止**。他プロジェクトに影響するリスクがある。
- DB変更は **SQLマイグレーションファイルを生成** し、ユーザーが Dashboard SQL Editor で実行する方式とする。
- スキーマ名: `ota_getrank`

## Workflow default
1) Clarify goal & acceptance criteria
2) Implement
3) Verify (uv + tests + Playwright if relevant)
4) PR with account checks