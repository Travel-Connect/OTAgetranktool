"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "@/components/ui/FormField";
import { OTA_LIST, OTA_DISPLAY_NAMES } from "@/lib/constants";
import { hotelsApi } from "@/lib/api-client";

interface Props {
  projectId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function HotelForm({ projectId, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const mappings: Array<{ ota: string; ota_property_url: string }> = [];
    for (const ota of OTA_LIST) {
      const url = (fd.get(`ota_${ota}`) as string)?.trim();
      if (url) mappings.push({ ota, ota_property_url: url });
    }
    setSaving(true);
    setError("");
    try {
      await hotelsApi.create({
        display_name: fd.get("display_name") as string,
        memo: (fd.get("memo") as string) || undefined,
        project_id: projectId,
        sort_order: Number(fd.get("sort_order")) || 0,
        ota_mappings: mappings.length > 0 ? mappings : undefined,
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
        <input name="display_name" required className={inputClass} placeholder="例: ホテルABC東京" />
      </FormField>
      <FormField label="メモ">
        <input name="memo" className={inputClass} placeholder="任意" />
      </FormField>
      <FormField label="並び順">
        <input name="sort_order" type="number" defaultValue={0} className={inputClass} />
      </FormField>

      <p className="text-sm font-medium text-gray-700 mt-4 mb-2">OTAマッピング (施設URL)</p>
      {OTA_LIST.map((ota) => (
        <FormField key={ota} label={OTA_DISPLAY_NAMES[ota]}>
          <input name={`ota_${ota}`} className={inputClass} placeholder={`${ota} の施設URL`} />
        </FormField>
      ))}

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <Button type="submit" loading={saving}>作成</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  );
}
