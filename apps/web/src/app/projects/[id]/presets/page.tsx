"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { presetsApi, hotelsApi, searchProfilesApi } from "@/lib/api-client";
import type { Preset, Hotel, SearchProfile } from "@/lib/types";
import { OTA_LIST, OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OtaBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField, inputClass, selectClass } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PresetsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, h, sp] = await Promise.all([
        presetsApi.list(projectId),
        hotelsApi.list(projectId),
        searchProfilesApi.list(projectId),
      ]);
      setPresets(p);
      setHotels(h);
      setProfiles(sp);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  // エリアラベル一覧（プロファイルから取得）
  const areaLabels = [...new Set(profiles.map((p) => p.area_label).filter(Boolean))].sort();

  // ホテル名をIDから取得
  function hotelName(id: string) {
    return hotels.find((h) => h.id === id)?.display_name ?? id.slice(0, 8);
  }

  async function toggleEnabled(p: Preset) {
    await presetsApi.update(p.id, { enabled: !p.enabled });
    load();
  }

  function parseFormData(fd: FormData) {
    const checkedOtas = OTA_LIST.filter((ota) => fd.get(`ota_${ota}`) === "on");
    const offsets = (fd.get("offsets") as string)
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    // 選択されたホテル
    const selectedHotels = hotels
      .map((h) => h.id)
      .filter((id) => fd.get(`hotel_${id}`) === "on");

    // 選択された人数（複数可）
    const adultsPerRoom = [1, 2, 3, 4, 5, 6].filter((n) => fd.get(`adults_${n}`) === "on");
    if (adultsPerRoom.length === 0) adultsPerRoom.push(2); // デフォルト

    return {
      name: fd.get("name") as string,
      hotel_ids: selectedHotels,
      area_label: fd.get("area_label") as string,
      otas_json: checkedOtas,
      nights_int: Number(fd.get("nights")) || 1,
      rooms_int: Number(fd.get("rooms")) || 1,
      adults_per_room_json: adultsPerRoom,
      date_mode: "rule" as const,
      rule_json: { offsets },
    };
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = parseFormData(new FormData(e.currentTarget));
    await presetsApi.create({ project_id: projectId, ...data });
    setShowForm(false);
    load();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPreset) return;
    const data = parseFormData(new FormData(e.currentTarget));
    await presetsApi.update(editingPreset.id, data);
    setEditingPreset(null);
    load();
  }

  function PresetFormFields({ preset }: { preset?: Preset }) {
    return (
      <>
        <FormField label="プリセット名" required>
          <input
            name="name"
            required
            defaultValue={preset?.name ?? ""}
            className={inputClass}
            placeholder="例: 刻の宿×那覇_1泊2名"
          />
        </FormField>

        <fieldset className="mt-3">
          <legend className="text-sm font-medium text-gray-700 mb-2">対象ホテル</legend>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {hotels.map((h) => (
              <label key={h.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`hotel_${h.id}`}
                  defaultChecked={preset ? preset.hotel_ids?.includes(h.id) : true}
                />
                <span className="truncate">{h.display_name}</span>
              </label>
            ))}
          </div>
          {hotels.length === 0 && (
            <p className="text-xs text-gray-400">ホテルが登録されていません</p>
          )}
        </fieldset>

        <FormField label="検索エリア" required>
          <select
            name="area_label"
            required
            defaultValue={preset?.area_label ?? areaLabels[0] ?? ""}
            className={selectClass}
          >
            {areaLabels.length === 0 && <option value="">エリア未登録</option>}
            {areaLabels.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {areaLabels.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              先に検索プロファイルを登録してエリアを設定してください
            </p>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="泊数">
            <input name="nights" type="number" defaultValue={preset?.nights_int ?? 1} min={1} className={inputClass} />
          </FormField>
          <FormField label="室数">
            <input name="rooms" type="number" defaultValue={preset?.rooms_int ?? 1} min={1} className={inputClass} />
          </FormField>
        </div>

        <fieldset className="mt-3">
          <legend className="text-sm font-medium text-gray-700 mb-2">大人/室（複数選択可）</legend>
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <label key={n} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name={`adults_${n}`}
                  defaultChecked={preset ? preset.adults_per_room_json?.includes(n) : n === 2}
                />
                {n}名
              </label>
            ))}
          </div>
        </fieldset>

        <FormField label="日数オフセット (カンマ区切り)">
          <input
            name="offsets"
            defaultValue={preset?.rule_json?.offsets?.join(", ") ?? "7, 14, 30"}
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">
            実行日から何日後のチェックイン日で検索するか（例: 7 = 1週間後）
          </p>
        </FormField>

        <fieldset className="mt-3">
          <legend className="text-sm font-medium text-gray-700 mb-2">対象OTA</legend>
          <div className="grid grid-cols-2 gap-1">
            {OTA_LIST.map((ota) => (
              <label key={ota} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`ota_${ota}`}
                  defaultChecked={preset ? preset.otas_json?.includes(ota) : true}
                />
                {OTA_DISPLAY_NAMES[ota as OtaType]}
              </label>
            ))}
          </div>
        </fieldset>
      </>
    );
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
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {/* ホテル */}
                  {p.hotel_ids && p.hotel_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {p.hotel_ids.map(hotelName).join("、")}
                    </p>
                  )}
                  {/* エリア + OTA */}
                  <div className="flex items-center gap-2 mt-1.5">
                    {p.area_label && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                        {p.area_label}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {p.otas_json?.map((ota) => <OtaBadge key={ota} ota={ota} />)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {p.nights_int}泊 / {p.rooms_int}室 / 大人{p.adults_per_room_json?.join("・") ?? "2"}名
                    {p.rule_json?.offsets && (
                      <> / オフセット: {p.rule_json.offsets.join(", ")}日</>
                    )}
                  </p>
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
                  <Button size="sm" variant="secondary" onClick={() => setEditingPreset(p)}>
                    編集
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deleting === p.id}
                    onClick={async () => {
                      if (!confirm(`「${p.name}」を削除しますか？`)) return;
                      setDeleting(p.id);
                      try {
                        await presetsApi.delete(p.id);
                        load();
                      } finally {
                        setDeleting(null);
                      }
                    }}
                  >
                    削除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 新規作成モーダル */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="プリセット追加">
        <form onSubmit={handleCreate}>
          <PresetFormFields />
          <div className="flex gap-2 mt-4">
            <Button type="submit">作成</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
          </div>
        </form>
      </Modal>

      {/* 編集モーダル */}
      <Modal open={!!editingPreset} onClose={() => setEditingPreset(null)} title="プリセット編集">
        {editingPreset && (
          <form onSubmit={handleUpdate}>
            <PresetFormFields preset={editingPreset} />
            <div className="flex gap-2 mt-4">
              <Button type="submit">更新</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingPreset(null)}>キャンセル</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
