"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { presetsApi } from "@/lib/api-client";
import type { Preset } from "@/lib/types";
import { OTA_LIST, OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OtaBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField, inputClass } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PresetsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setPresets(await presetsApi.list(projectId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function toggleEnabled(p: Preset) {
    await presetsApi.update(p.id, { enabled: !p.enabled });
    load();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const checkedOtas = OTA_LIST.filter((ota) => fd.get(`ota_${ota}`) === "on");
    const offsets = (fd.get("offsets") as string)
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    await presetsApi.create({
      project_id: projectId,
      name: fd.get("name") as string,
      otas_json: checkedOtas,
      nights_int: Number(fd.get("nights")) || 1,
      rooms_int: Number(fd.get("rooms")) || 1,
      adults_per_room_json: [Number(fd.get("adults")) || 2],
      date_mode: "rule",
      rule_json: { offsets },
    });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">プリセット</h2>
        <Button onClick={() => setShowForm(true)} size="sm">+ プリセット追加</Button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : presets.length === 0 ? (
        <Card>
          <EmptyState
            message="プリセットがありません"
            action={<Button onClick={() => setShowForm(true)} size="sm">追加する</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {presets.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.otas_json?.map((ota) => <OtaBadge key={ota} ota={ota} />)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {p.nights_int}泊 / {p.rooms_int}室 / 大人{p.adults_per_room_json?.[0] ?? 2}名
                    {p.rule_json?.offsets && (
                      <> / オフセット: {p.rule_json.offsets.join(", ")}日</>
                    )}
                  </p>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="プリセット追加">
        <form onSubmit={handleCreate}>
          <FormField label="プリセット名" required>
            <input name="name" required className={inputClass} placeholder="例: 毎日_2名_1泊" />
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

          <FormField label="日数オフセット (カンマ区切り)">
            <input name="offsets" defaultValue="0, 7, 14, 30" className={inputClass} />
          </FormField>

          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-gray-700 mb-2">対象OTA</legend>
            <div className="grid grid-cols-2 gap-1">
              {OTA_LIST.map((ota) => (
                <label key={ota} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`ota_${ota}`} defaultChecked />
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
