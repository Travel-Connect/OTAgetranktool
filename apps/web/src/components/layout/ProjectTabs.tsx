"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "ホテル", segment: "hotels" },
  { label: "検索プロファイル", segment: "profiles" },
  { label: "プリセット", segment: "presets" },
  { label: "ジョブ", segment: "jobs" },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-4">
      {TABS.map((tab) => {
        const href = `/projects/${projectId}/${tab.segment}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
