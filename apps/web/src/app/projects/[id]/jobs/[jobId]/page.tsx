"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jobsApi, hotelsApi } from "@/lib/api-client";
import type { Job, JobTask, Hotel } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ResultsMatrix } from "@/components/data/ResultsMatrix";
import { TaskFailureDetail } from "@/components/data/TaskFailureDetail";

export default function JobDetailPage() {
  const { id: projectId, jobId } = useParams<{ id: string; jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [results, hotelList] = await Promise.all([
        jobsApi.results(jobId),
        hotelsApi.list(projectId),
      ]);
      setJob(results.job);
      setTasks(results.tasks);
      setHotels(hotelList);
    } finally {
      setLoading(false);
    }
  }, [jobId, projectId]);

  useEffect(() => { load(); }, [load]);

  // 実行中なら自動更新
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "queued")) return;
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [job, load]);

  if (loading && !job) {
    return <p className="text-gray-400 text-sm">読み込み中...</p>;
  }

  if (!job) {
    return <p className="text-red-500 text-sm">ジョブが見つかりません</p>;
  }

  const successCount = tasks.filter((t) => t.status === "success").length;
  const failedCount = tasks.filter((t) => t.status === "failed" || t.status === "skipped").length;

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/jobs`}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← ジョブ一覧
            </Link>
          </div>
          <h2 className="text-lg font-bold mt-1">
            ジョブ {job.id.slice(0, 8)}
            <StatusBadge status={job.status} />
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}>更新</Button>
          <a href={`/api/jobs/${jobId}/excel`} download>
            <Button size="sm">Excel ダウンロード</Button>
          </a>
        </div>
      </div>

      {/* サマリ */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">実行日</span>
            <p className="font-medium">{job.run_date}</p>
          </div>
          <div>
            <span className="text-gray-500">タスク</span>
            <p className="font-medium">
              成功 {successCount} / 失敗 {failedCount} / 合計 {tasks.length}
            </p>
          </div>
          <div>
            <span className="text-gray-500">開始</span>
            <p className="font-medium text-xs">
              {job.started_at ? new Date(job.started_at).toLocaleString("ja-JP") : "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">完了</span>
            <p className="font-medium text-xs">
              {job.finished_at ? new Date(job.finished_at).toLocaleString("ja-JP") : "-"}
            </p>
          </div>
        </div>
      </Card>

      {/* 結果マトリクス */}
      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">ランキング結果</h3>
        <ResultsMatrix tasks={tasks} hotels={hotels} />
      </Card>

      {/* 失敗タスク */}
      {failedCount > 0 && (
        <Card>
          <TaskFailureDetail tasks={tasks} />
        </Card>
      )}
    </div>
  );
}
