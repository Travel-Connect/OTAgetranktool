import type { Page } from "playwright";
import type { OtaType } from "@ota/shared";

/** 一覧上の1アイテム */
export interface ListItem {
  /** 施設ページURL（正規化済み） */
  propertyUrl: string;
  /** 施設ID（取得できた場合） */
  propertyId?: string;
  /** 施設名（デバッグ用） */
  name?: string;
  /** 広告かどうか */
  isAd: boolean;
}

/** 1ページの抽出結果 */
export interface PageExtraction {
  /** 総件数（取得できた場合） */
  totalCount: number | null;
  /** 総件数の原文テキスト */
  totalCountRawText: string | null;
  /** 一覧アイテム */
  items: ListItem[];
  /** 次ページがあるか */
  hasNextPage: boolean;
}

/** OTA別の抽出インターフェース */
export interface OtaExtractor {
  ota: OtaType;
  /** ナビゲーション時の待機戦略（デフォルト: networkidle） */
  waitUntil?: "domcontentloaded" | "load" | "networkidle";
  /** ページネーションOTA: 1ページあたりの件数 */
  itemsPerPage?: number;
  /** 無限スクロール型OTAかどうか */
  isScrollBased?: boolean;
  /** 検索ページナビゲーション前のウォームアップ (クッキー取得等) */
  warmUp?(page: Page): Promise<void>;
  /** ページから一覧を抽出 */
  extractPage(page: Page, options?: ExtractOptions): Promise<PageExtraction>;
  /** 次ページへ遷移する URL を生成（ページング） */
  getNextPageUrl(currentUrl: string, currentPage: number): string;
  /** 任意のページ番号のURLを生成（スマートページネーション用） */
  getPageUrl?(baseUrl: string, pageNumber: number): string;
}

/** extractPage に渡すオプション */
export interface ExtractOptions {
  /** スクロール型OTA: 高速スクロールの目標アイテム数 */
  fastScrollUntil?: number;
}
