"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectsApi } from "@/lib/api-client";
import type { Project } from "@/lib/types";

export function Sidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await projectsApi.create(newName.trim());
      setNewName("");
      setCreating(false);
      const list = await projectsApi.list();
      setProjects(list);
    } catch {}
  }

  const currentProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1];

  return (
    <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col h-screen shrink-0">
      <Link href="/projects" className="block px-4 py-4 border-b border-gray-700">
        <h1 className="text-sm font-bold tracking-wide">OTA順位チェックツール</h1>
      </Link>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1 text-xs text-gray-500 uppercase tracking-wider">
          プロジェクト
        </div>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}/hotels`}
            className={`flex items-center gap-2 px-3 py-2 mx-1 rounded text-sm transition-colors ${
              currentProjectId === p.id
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                p.active ? "bg-green-400" : "bg-gray-500"
              }`}
            />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-gray-700">
        <Link
          href="/settings"
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          }`}
        >
          設定・Cron
        </Link>
      </div>

      <div className="p-3 border-t border-gray-700">
        {creating ? (
          <form onSubmit={handleCreate} className="flex gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="プロジェクト名"
              autoFocus
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button type="submit" className="px-2 py-1 bg-blue-600 rounded text-xs font-semibold hover:bg-blue-700">
              追加
            </button>
            <button type="button" onClick={() => setCreating(false)} className="px-2 py-1 text-gray-400 hover:text-white text-xs">
              &times;
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors text-left"
          >
            + 新規プロジェクト
          </button>
        )}
      </div>
    </aside>
  );
}
