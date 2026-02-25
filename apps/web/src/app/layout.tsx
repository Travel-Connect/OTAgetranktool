import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OTA Get Rank Tool",
  description: "OTA検索結果の順位・件数を自動収集するツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
