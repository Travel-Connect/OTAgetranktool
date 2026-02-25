"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jobsApi } from "@/lib/api-client";
import type { Job } from "@/lib/types";
import { OTA_LIST, OTA_DISPLAY_NAMES, STATUS_LABELS } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField, inputClass } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

export default function JobsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await jobsApi.list(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // 実行中ジョブがあれば10秒ごとにポーリング
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "running" || j.status === "queued");
    if (!hasRunning) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [jobs, load]);

  async function handleRun(jobId: string) {
    setRunningId(jobId);
    try {
      await jobsApi.run(jobId);
      setTimeout(load, 2000);
    } finally {
      setRunningId(null);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const checkedOtas = OTA_LIST.filter((ota) => fd.get(`job_ota_${ota}`) === "on");
    const checkinDate = fd.get("checkin_date") as string;
    const tasks = checkedOtas.map((ota) => ({
      ota,
      checkin_date: checkinDate,
      nights: Number(fd.get("nights")) || 1,
      rooms: Number(fd.get("rooms")) || 1,
      adults_per_room: Number(fd.get("adults")) || 2,
    }));
    await jobsApi.create({
      project_id: projectId,
      run_date: new Date().toISOString().slice(0, 10),
      tasks,
    });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ジョブ一覧</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}>更新</Button>
          <Button onClick={() => setShowForm(true)} size="sm">+ 新規ジョブ</Button>
        </div>
      </div>

      {loading && jobs.length === 0 ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : jobs.length === 0 ? (
        <Card>
          <EmptyState
            message="ジョブがありません"
            action={<Button onClick={() => setShowForm(true)} size="sm">ジョブを作成</Button>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">ID</th>
                <th className="pb-2 font-medium">実行日</th>
                <th className="pb-2 font-medium">ステータス</th>
                <th className="pb-2 font-medium">タスク数</th>
                <th className="pb-2 font-medium">作成日時</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 font-mono text-xs text-gray-500">{j.id.slice(0, 8)}</td>
                  <td className="py-3">{j.run_date}</td>
                  <td className="py-3"><StatusBadge status={j.status} /></td>
                  <td className="py-3 text-gray-600">{j.job_tasks?.[0]?.count ?? "?"}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(j.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5 justify-end">
                      {j.status === "queued" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={runningId === j.id}
                          onClick={() => handleRun(j.id)}
                        >
                          実行
                        </Button>
                      )}
                      <Link href={`/projects/${projectId}/jobs/${j.id}`}>
                        <Button size="sm" variant="ghost">結果</Button>
                      </Link>
                      <a href={`/api/jobs/${j.id}/excel`} download>
                        <Button size="sm" variant="ghost">Excel</Button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="新規ジョブ作成">
        <form onSubmit={handleCreate}>
          <FormField label="チェックイン日" required>
            <input
              name="checkin_date"
              type="date"
              required
              defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
              className={inputClass}
            />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="泊数">
              <input name="nights" type="number" defaultValue={1} min={1} className={inputClass} />
            </FormField>
            <FormField label="室数">
              <input name="rooms" type="number" defaultValue={1} min={1} className={inputClass} />
            </FormField>
            <FormField label="大人/室">
              <input name="adults" type="number" defaultValue={2} min={1} className={inputClass} />
            </FormField>
          </div>

          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-gray-700 mb-2">対象OTA</legend>
            <div className="grid grid-cols-2 gap-1">
              {OTA_LIST.map((ota) => (
                <label key={ota} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`job_ota_${ota}`} defaultChecked={ota === "rakuten"} />
                  {OTA_DISPLAY_NAMES[ota as OtaType]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-2 mt-4">
            <Button type="submit">作成</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
