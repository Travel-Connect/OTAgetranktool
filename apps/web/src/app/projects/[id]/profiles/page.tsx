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

export default function ProfilesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
    });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">検索プロファイル</h2>
        <Button onClick={() => setShowForm(true)} size="sm">+ プロファイル追加</Button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState
            message="検索プロファイルがありません"
            action={<Button onClick={() => setShowForm(true)} size="sm">追加する</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <OtaBadge ota={p.ota} />
                  <span className="text-sm text-gray-600 break-all">{p.base_url}</span>
                </div>
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
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="検索プロファイル追加">
        <form onSubmit={handleCreate}>
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
          <div className="flex gap-2 mt-4">
            <Button type="submit">作成</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
