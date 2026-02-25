"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProjectTabs } from "@/components/layout/ProjectTabs";
import { projectsApi } from "@/lib/api-client";
import type { Project } from "@/lib/types";

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProject(list.find((p) => p.id === id) ?? null);
    });
  }, [id]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {project?.name ?? "読み込み中..."}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{id}</p>
      </div>
      <ProjectTabs projectId={id} />
      {children}
    </div>
  );
}
