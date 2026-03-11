---
name: playwright-automation
description: Web UI高速自動化実装（Playwright優先）。OTAサイトの偵察・スクレイピング・フォーム操作を安定かつ高速に自動化する。
---

Web UIの自動化（フォーム入力、スクレイピング、検索、DOM偵察など）を Playwright 優先で実装するスキル。

## トリガー条件

- OTAサイトのDOM偵察・スクレイピング改善
- Webフォームの自動入力・操作
- Playwright スクリプトの新規作成・改善
- ブラウザ自動化のパフォーマンス最適化

---

## 依頼を受けたときの振る舞い

1. 対象画面の操作手順を整理
2. UI依存か API化可能かを判断
3. 最小更新回数になる入力順を設計
4. 3パターン比較（後述）→ 最適な案を採用
5. そのまま動かしやすい完成コードを出す
6. 速度改善余地をコメントする

### 実装時の出力順序

1. 処理方針の要約
2. 速度最適化ポイント
3. 安定性リスク
4. 実装コード
5. 置き換えが必要なセレクタ一覧
6. 速度改善の次の候補

---

## 設計パターン比較（毎回3案を比較）

### パターンA: 標準（安定性重視）
- Playwright のみで実装
- 順番に入力 → 最後に1回更新 → 結果検証

### パターンB: 高速（速度と安定性のバランス）
- DOM で複数値を一括セット + 必要イベント発火
- 更新ボタンのみ Playwright → 結果検証

### パターンC: 最速候補（内部通信が明確な場合）
- 画面通信を解析 → API / form submit 化
- UI操作最小化 → 結果検証

**判断基準:**
- 迷ったら → パターンA で動作基準を作り、その後 B/C へ最適化
- 安定性重視 → A
- 速度と安定性のバランス → B
- 内部通信が明確で再現可能 → C

---

## 最優先ルール

### 1. Playwright 標準操作を第一候補にする

```typescript
// 優先する API
locator()
getByRole()
getByLabel()
getByTestId()
click()
fill()
selectOption()
check()
```

### 2. DOM直接操作は補助手段に限定

`evaluate()` による直接DOM書き換えは、Playwright標準操作で **遅い・不安定・実装困難** な箇所のみ。

DOM操作を使う場合の必須チェック:
- 単なる `value` 書き換えだけで済むか
- `input` / `change` / `blur` イベントが必要か
- hidden input や state 管理と連動しているか
- React/Vue の内部状態が更新されるか
- 画面上の表示と送信値が一致しているか

DOM一括変更を検討する条件（全て満たす場合のみ）:
- UI構造が比較的固定
- 対象がネイティブなフォーム要素中心
- Playwright標準操作より体感で明確に遅い
- 値変更後のイベント発火仕様を確認できる
- 最終的な更新結果を必ず検証できる

### 3. 固定秒待機を極力使わない

`waitForTimeout()` の多用は禁止。待機は状態ベースで:
- 要素の表示・活性化
- 選択肢ロード完了
- 通信完了 (`waitForResponse`, `waitForLoadState`)
- 成功メッセージ表示
- カード数の増加

```typescript
// NG
await page.waitForTimeout(5000);

// OK: 状態ベース待機
await page.waitForSelector('[data-testid="property-card"]', { timeout: 20000 });
await page.waitForLoadState("networkidle");
await page.waitForResponse(resp => resp.url().includes("/api/search"));

// OK: ポーリング（スクロール読み込み等、他に手段がない場合）
let prevCount = 0;
for (let i = 0; i < 30; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500); // スクロール間隔のみ許容
  const count = await page.locator(CARD_SELECTOR).count();
  if (count === prevCount && i > 0) break;
  prevCount = count;
}
```

### 4. 1ページ内の無理な並列化を避ける

- 同一ページの複数UI要素は直列で最短化
- 並列化は独立単位で行う:
  - ページ単位 / タブ単位 / コンテキスト単位
  - 日付単位 / 施設単位

### 5. 更新回数を減らす

- プルダウンや入力項目は可能ならまとめて設定
- 最後に更新・検索・保存を1回だけ実行
- 項目変更ごとに毎回再描画や通信を発生させない

---

## 要素特定の優先順位

1. `getByTestId()` — 最も安定
2. `getByRole()` — セマンティック
3. `getByLabel()` — フォーム要素
4. 安定した `name` / `id` 属性
5. 最小限のCSSセレクタ
6. XPath — 最後の手段

**禁止:**
- 長く脆いCSSセレクタ
- 見た目依存・階層依存の強いセレクタ
- React CSS-in-JS の動的クラス (`css-xxxxx`)

---

## 速度最適化チェックリスト

- [ ] 不要な画面遷移を減らす
- [ ] 不要な再検索・再描画を減らす
- [ ] 不要なスクロールを減らす
- [ ] 不要なクリックを減らす
- [ ] 不要な待機を減らす
- [ ] 依存関係のない入力項目は先に全部埋める
- [ ] 最後に検索/更新/保存を1回
- [ ] 並列化は独立処理単位で検討

---

## ログとデバッグ（実装時に必ず含める）

- ステップ単位のログ (`console.log`)
- 入力前後の値ログ
- 送信前のパラメータ確認
- エラー時のスクリーンショット
- 必要に応じてHTML保存
- 通信失敗時のレスポンス確認
- リトライ条件の明確化

---

## OTA偵察スクリプトのテンプレート

OTAサイトの DOM偵察を行う場合、以下の構造で `.cjs` ファイルを `apps/web/` に作成する:

```typescript
const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
chromium.use(StealthPlugin());

// CAPTCHA自動待機（ポーリング）
async function waitForCaptchaResolution(page, maxMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const hasChallenge = await page.evaluate(() => {
      return !!(document.querySelector("#challenge-container") ||
                document.querySelector("iframe[src*='recaptcha']") ||
                document.querySelector(".g-recaptcha"));
    });
    if (!hasChallenge) return true;
    console.log("  ... CAPTCHA待機中 (ブラウザで対応してください)");
    await page.waitForTimeout(5000);
  }
  return false;
}

// モーダル/ポップアップ自動閉じ
async function dismissModal(page, selector) {
  await page.evaluate((sel) => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, selector);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 1. ページ読み込み + CAPTCHA対応
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  // CAPTCHA検出 → ユーザーがブラウザで手動対応 → 自動検知して続行

  // 2. 初期カード数・総件数取得

  // 3. スクロール / ボタンクリック / ページネーション

  // 4. カード構造サンプル抽出

  // 5. ターゲットホテル検索

  // 6. 結果出力

  console.log("=== 偵察完了 ===");
  await page.waitForTimeout(60000); // ブラウザを60秒開いたまま
  await browser.close();
})();
```

**重要:**
- スクリプトは `apps/web/` 配下に `.cjs` 形式で作成（ESM解決問題を回避）
- `headless: false` で実行（ユーザーがCAPTCHA対応できるよう）
- `waitForEnter()` は使わない（ターミナルがユーザー環境で開かないため）
- 代わりにポーリングでCAPTCHA解除を自動検知
- 最後に `waitForTimeout(60000)` でブラウザを開いたまま保持

---

## コード実装ポリシー

- TypeScript を優先
- Playwright を優先
- `async/await` ベースで可読性を保つ
- 関数を小さく分ける (`dismissModal`, `scrollToBottom`, `clickLoadMore`, `extractCards`, `verifyResult`)
- セレクタは定数化する
- ベタ書きの待機秒数は避ける（スクロール間隔など最小限のみ許容）

---

## 禁止事項

- 最初から無理にDOM直書きに寄せること
- `waitForTimeout()` だらけの実装
- 長すぎる脆いCSSセレクタ
- 依存関係のあるUIの無理な並列操作
- 成功検証なしの送信処理
- ログなしのブラックボックス実装
- `readline` / `waitForEnter` の使用（ターミナルがユーザー側で開かない）
