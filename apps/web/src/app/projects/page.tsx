"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api-client";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setProjects(await projectsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Project) {
    await projectsApi.update(p.id, { active: !p.active });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">プロジェクト一覧</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState message="プロジェクトがありません。左サイドバーから作成してください。" />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">プロジェクト名</th>
                <th className="pb-2 font-medium">ホテル数</th>
                <th className="pb-2 font-medium">ステータス</th>
                <th className="pb-2 font-medium">作成日</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3">
                    <Link
                      href={`/projects/${p.id}/hotels`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-600">
                    {p.project_hotels?.length ?? 0}件
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                        p.active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? "bg-green-500" : "bg-gray-400"}`} />
                      {p.active ? "有効" : "無効"}
                    </button>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/projects/${p.id}/hotels`}>
                      <Button variant="ghost" size="sm">開く →</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
