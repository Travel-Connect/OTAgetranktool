"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { searchProfilesApi } from "@/lib/api-client";
import type { SearchProfile } from "@/lib/types";
import { OTA_LIST, OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OtaBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField, inputClass, selectClass } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { AREA_PRESETS, AREA_LIST } from "@/lib/area-presets";

export default function ProfilesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SearchProfile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkArea, setBulkArea] = useState(AREA_LIST[0]);
  const [bulkCreating, setBulkCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setProfiles(await searchProfilesApi.list(projectId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function toggleEnabled(p: SearchProfile) {
    await searchProfilesApi.update(p.id, { enabled: !p.enabled });
    load();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await searchProfilesApi.create({
      project_id: projectId,
      ota: fd.get("ota") as string,
      base_url: fd.get("base_url") as string,
      area_label: (fd.get("area_label") as string) || "",
    });
    setShowForm(false);
    load();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProfile) return;
    const fd = new FormData(e.currentTarget);
    await searchProfilesApi.update(editingProfile.id, {
      base_url: fd.get("base_url") as string,
      area_label: (fd.get("area_label") as string) || "",
    });
    setEditingProfile(null);
    load();
  }

  async function handleBulkCreate() {
    const preset = AREA_PRESETS[bulkArea];
    if (!preset) return;

    setBulkCreating(true);
    try {
      // 同じエリアの既存OTAを取得して重複を避ける
      const existingOtasForArea = new Set(
        profiles.filter((p) => p.area_label === preset.label).map((p) => p.ota),
      );
      const toCreate = OTA_LIST.filter(
        (ota) => !existingOtasForArea.has(ota) && preset.urls[ota],
      );

      for (const ota of toCreate) {
        await searchProfilesApi.create({
          project_id: projectId,
          ota,
          base_url: preset.urls[ota],
          area_label: preset.label,
        });
      }
      setShowBulk(false);
      load();
    } finally {
      setBulkCreating(false);
    }
  }

  // エリアごとにグループ化
  const areaLabels = [...new Set(profiles.map((p) => p.area_label || "(未分類)"))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">検索プロファイル</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulk(true)} size="sm" variant="secondary">
            エリア一括登録
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm">
            + 個別追加
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState
            message="検索プロファイルがありません"
            action={
              <div className="flex gap-2">
                <Button onClick={() => setShowBulk(true)} size="sm" variant="secondary">
                  エリア一括登録
                </Button>
                <Button onClick={() => setShowForm(true)} size="sm">
                  個別追加
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {areaLabels.map((area) => {
            const areaProfiles = profiles.filter(
              (p) => (p.area_label || "(未分類)") === area,
            );
            return (
              <div key={area}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {area}
                  </span>
                  <span className="text-xs text-gray-400">{areaProfiles.length} OTA</span>
                </h3>
                <div className="space-y-1.5">
                  {areaProfiles.map((p) => (
                    <Card key={p.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <OtaBadge ota={p.ota} />
                          <span className="text-sm text-gray-600 break-all truncate">
                            {p.base_url}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleEnabled(p)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                              p.enabled
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {p.enabled ? "有効" : "無効"}
                          </button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingProfile(p)}>
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={deleting === p.id}
                            onClick={async () => {
                              if (!confirm(`${OTA_DISPLAY_NAMES[p.ota as OtaType]}のプロファイルを削除しますか？`)) return;
                              setDeleting(p.id);
                              try {
                                await searchProfilesApi.delete(p.id);
                                load();
                              } finally {
                                setDeleting(null);
                              }
                            }}
                          >
                            <span className="text-red-500">削除</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 個別追加モーダル */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="検索プロファイル追加">
        <form onSubmit={handleCreate}>
          <FormField label="エリア名" required>
            <input name="area_label" required className={inputClass} placeholder="例: 那覇、北谷" />
          </FormField>
          <FormField label="OTA" required>
            <select name="ota" required className={selectClass}>
              {OTA_LIST.map((o) => (
                <option key={o} value={o}>{OTA_DISPLAY_NAMES[o as OtaType]}</option>
              ))}
            </select>
          </FormField>
          <FormField label="検索ベースURL" required>
            <input name="base_url" required className={inputClass} placeholder="https://..." />
          </FormField>
          <p className="text-xs text-gray-400 mb-3">
            各OTAの検索結果ページURLを入力。日付・人数はジョブ実行時に自動設定されます。
          </p>
          <div className="flex gap-2 mt-4">
            <Button type="submit">作成</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
          </div>
        </form>
      </Modal>

      {/* 編集モーダル */}
      <Modal open={!!editingProfile} onClose={() => setEditingProfile(null)} title="プロファイル編集">
        {editingProfile && (
          <form onSubmit={handleUpdate}>
            <FormField label="エリア名">
              <input
                name="area_label"
                defaultValue={editingProfile.area_label}
                className={inputClass}
              />
            </FormField>
            <FormField label="OTA">
              <div className="flex items-center gap-2 py-2">
                <OtaBadge ota={editingProfile.ota} />
                <span className="text-sm">{OTA_DISPLAY_NAMES[editingProfile.ota as OtaType]}</span>
              </div>
            </FormField>
            <FormField label="検索ベースURL" required>
              <input
                name="base_url"
                required
                defaultValue={editingProfile.base_url}
                className={inputClass}
              />
            </FormField>
            <div className="flex gap-2 mt-4">
              <Button type="submit">更新</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingProfile(null)}>キャンセル</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* エリア一括登録モーダル */}
      <Modal open={showBulk} onClose={() => setShowBulk(false)} title="エリア一括登録">
        <FormField label="エリア選択">
          <select
            className={selectClass}
            value={bulkArea}
            onChange={(e) => setBulkArea(e.target.value)}
          >
            {AREA_LIST.map((key) => (
              <option key={key} value={key}>{AREA_PRESETS[key].label}</option>
            ))}
          </select>
        </FormField>

        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-700">登録されるプロファイル:</p>
          {OTA_LIST.map((ota) => {
            const url = AREA_PRESETS[bulkArea]?.urls[ota];
            const exists = profiles.some(
              (p) => p.ota === ota && p.area_label === AREA_PRESETS[bulkArea]?.label,
            );
            return (
              <div key={ota} className="flex items-center gap-2 text-xs">
                <OtaBadge ota={ota} />
                {exists ? (
                  <span className="text-gray-400">登録済み（スキップ）</span>
                ) : url ? (
                  <span className="text-gray-600 truncate">{url.substring(0, 60)}...</span>
                ) : (
                  <span className="text-gray-400">テンプレートなし</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleBulkCreate} loading={bulkCreating}>
            一括登録
          </Button>
          <Button variant="secondary" onClick={() => setShowBulk(false)}>
            キャンセル
          </Button>
        </div>
      </Modal>
    </div>
  );
}
