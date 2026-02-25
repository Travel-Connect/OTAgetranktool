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
  /** ページから一覧を抽出 */
  extractPage(page: Page): Promise<PageExtraction>;
  /** 次ページへ遷移する URL を生成（ページング） */
  getNextPageUrl(currentUrl: string, currentPage: number): string;
}
