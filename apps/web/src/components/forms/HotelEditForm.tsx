"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "@/components/ui/FormField";
import { OTA_LIST, OTA_DISPLAY_NAMES } from "@/lib/constants";
import { hotelsApi } from "@/lib/api-client";
import type { Hotel } from "@/lib/types";

interface Props {
  hotel: Hotel;
  onSaved: () => void;
  onCancel: () => void;
}

export function HotelEditForm({ hotel, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 既存マッピングをOTAキーで引ける形に変換
  const existingByOta: Record<string, string> = {};
  for (const m of hotel.hotel_ota_mappings ?? []) {
    existingByOta[m.ota] = m.ota_property_url;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const displayName = (fd.get("display_name") as string)?.trim();
    if (!displayName) {
      setError("ホテル名は必須です");
      return;
    }

    const mappings: Array<{ ota: string; ota_property_url: string }> = [];
    for (const ota of OTA_LIST) {
      const url = (fd.get(`ota_${ota}`) as string)?.trim();
      if (url) mappings.push({ ota, ota_property_url: url });
    }

    setSaving(true);
    setError("");
    try {
      await hotelsApi.update(hotel.id, {
        display_name: displayName,
        memo: (fd.get("memo") as string)?.trim() || null,
        ota_mappings: mappings,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="ホテル名" required>
        <input
          name="display_name"
          required
          defaultValue={hotel.display_name}
          className={inputClass}
        />
      </FormField>
      <FormField label="メモ">
        <input
          name="memo"
          defaultValue={hotel.memo ?? ""}
          className={inputClass}
        />
      </FormField>

      <p className="text-sm font-medium text-gray-700 mt-4 mb-2">
        OTAマッピング (施設URL)
      </p>
      {OTA_LIST.map((ota) => (
        <FormField key={ota} label={OTA_DISPLAY_NAMES[ota]}>
          <input
            name={`ota_${ota}`}
            defaultValue={existingByOta[ota] ?? ""}
            className={inputClass}
            placeholder={`${ota} の施設URL`}
          />
        </FormField>
      ))}

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <Button type="submit" loading={saving}>
          更新
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
