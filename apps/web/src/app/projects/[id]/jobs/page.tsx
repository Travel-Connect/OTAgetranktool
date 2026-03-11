"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jobsApi, presetsApi, hotelsApi } from "@/lib/api-client";
import type { Job, Preset, Hotel } from "@/lib/types";
import { OTA_DISPLAY_NAMES, STATUS_LABELS } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OtaBadge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField, selectClass } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

export default function JobsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, p, h] = await Promise.all([
        jobsApi.list(projectId),
        presetsApi.list(projectId),
        hotelsApi.list(projectId),
      ]);
      setJobs(j);
      setPresets(p.filter((pr) => pr.enabled));
      setHotels(h);
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

  // プリセットからジョブ作成
  async function handleCreateFromPreset() {
    if (!selectedPresetId) return;
    setCreating(true);
    try {
      const job = await jobsApi.create({
        project_id: projectId,
        run_date: new Date().toISOString().slice(0, 10),
        preset_id: selectedPresetId,
      });
      setShowForm(false);
      setSelectedPresetId("");
      await load();
      // 自動実行
      if (job?.id) {
        handleRun(job.id);
      }
    } finally {
      setCreating(false);
    }
  }

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  // プリセットからタスクプレビュー生成
  function previewTasks(preset: Preset) {
    const runDate = new Date();
    const offsets = preset.rule_json?.offsets ?? [];
    const dates = preset.date_mode === "list" && preset.date_list_json?.length
      ? preset.date_list_json
      : offsets.map((o) => {
          const d = new Date(runDate);
          d.setDate(d.getDate() + o);
          return d.toISOString().slice(0, 10);
        });
    return { otas: preset.otas_json ?? [], dates, total: (preset.otas_json?.length ?? 0) * dates.length };
  }

  function hotelName(id: string) {
    return hotels.find((h) => h.id === id)?.display_name ?? id.slice(0, 8);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ジョブ一覧</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}>更新</Button>
          {jobs.length > 0 && (
            <a href={`/api/projects/${projectId}/excel`} download>
              <Button variant="secondary" size="sm">統合Excel</Button>
            </a>
          )}
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

      {/* プリセットからジョブ作成モーダル */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setSelectedPresetId(""); }} title="新規ジョブ作成">
        {presets.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">有効なプリセットがありません</p>
            <p className="text-xs text-gray-400">
              先にプリセットタブでプリセットを作成してください
            </p>
          </div>
        ) : (
          <>
            <FormField label="プリセット選択" required>
              <select
                className={selectClass}
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
              >
                <option value="">選択してください</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>

            {selectedPreset && (() => {
              const preview = previewTasks(selectedPreset);
              return (
                <div className="mt-3 space-y-2">
                  {/* プリセット概要 */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {/* ホテル */}
                    {selectedPreset.hotel_ids?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">対象ホテル:</span>
                        <p className="text-sm text-gray-800">
                          {selectedPreset.hotel_ids.map(hotelName).join("、")}
                        </p>
                      </div>
                    )}
                    {/* エリア */}
                    {selectedPreset.area_label && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-500">検索エリア:</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {selectedPreset.area_label}
                        </span>
                      </div>
                    )}
                    {/* 条件 */}
                    <p className="text-xs text-gray-600">
                      {selectedPreset.nights_int}泊 / {selectedPreset.rooms_int}室 / 大人{selectedPreset.adults_per_room_json?.[0] ?? 2}名
                    </p>
                  </div>

                  {/* タスクプレビュー */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      生成されるタスク: {preview.total}件
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {preview.otas.map((ota) => (
                          <OtaBadge key={ota} ota={ota} />
                        ))}
                      </div>
                      <div className="text-xs text-gray-600">
                        チェックイン日: {preview.dates.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleCreateFromPreset}
                loading={creating}
                disabled={!selectedPresetId}
              >
                作成して実行
              </Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setSelectedPresetId(""); }}>
                キャンセル
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
