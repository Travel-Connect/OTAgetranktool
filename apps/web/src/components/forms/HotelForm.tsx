"use client";

import { useState, useRef } from "react";
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
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveMsg, setResolveMsg] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /** OTA URLからホテル名を自動取得 */
  async function handleResolveName(ota: string) {
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    const url = (fd.get(`ota_${ota}`) as string)?.trim();
    if (!url) {
      setResolveMsg("URLを入力してください");
      return;
    }

    setResolving(ota);
    setResolveMsg("");
    setError("");

    try {
      const result = await hotelsApi.resolveName(ota, url);
      if (nameInputRef.current) {
        nameInputRef.current.value = result.name;
      }
      setResolveMsg(`${OTA_DISPLAY_NAMES[ota as keyof typeof OTA_DISPLAY_NAMES]}から取得: ${result.name}`);
    } catch (err: any) {
      setResolveMsg(`取得失敗: ${err.message}`);
    } finally {
      setResolving(null);
    }
  }

  /** 入力済みの全OTA URLから一括で名前取得を試行 */
  async function handleResolveAll() {
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);

    // 入力済みOTA URLがあるか確認
    const filledOtas = OTA_LIST.filter(
      (ota) => (fd.get(`ota_${ota}`) as string)?.trim(),
    );
    if (filledOtas.length === 0) {
      setResolveMsg("先にOTA施設URLを1つ以上入力してください");
      return;
    }

    setResolving("all");
    setResolveMsg("ホテル名を取得中...");
    setError("");

    for (const ota of filledOtas) {
      const url = (fd.get(`ota_${ota}`) as string)!.trim();
      try {
        const result = await hotelsApi.resolveName(ota, url);
        if (nameInputRef.current) {
          nameInputRef.current.value = result.name;
        }
        setResolveMsg(`${OTA_DISPLAY_NAMES[ota]}から取得: ${result.name}`);
        setResolving(null);
        return;
      } catch {
        // 次のOTAを試す
      }
    }

    setResolveMsg("ホテル名を取得できませんでした。URLを確認してください");
    setResolving(null);
  }

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
    <form ref={formRef} onSubmit={handleSubmit}>
      <FormField label="ホテル名" required>
        <div className="flex gap-2">
          <input
            ref={nameInputRef}
            name="display_name"
            required
            className={inputClass}
            placeholder="例: ホテルABC東京"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={resolving === "all"}
            onClick={handleResolveAll}
          >
            自動取得
          </Button>
        </div>
        {resolveMsg && (
          <p className={`text-xs mt-1 ${resolveMsg.includes("失敗") || resolveMsg.includes("できません") || resolveMsg.includes("先に") ? "text-red-500" : "text-green-600"}`}>
            {resolveMsg}
          </p>
        )}
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
          <div className="flex gap-1">
            <input name={`ota_${ota}`} className={inputClass} placeholder={`${ota} の施設URL`} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={resolving === ota}
              onClick={() => handleResolveName(ota)}
              title="このURLからホテル名を取得"
            >
              名前取得
            </Button>
          </div>
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
