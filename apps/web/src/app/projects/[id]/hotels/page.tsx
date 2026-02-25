"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { hotelsApi } from "@/lib/api-client";
import type { Hotel } from "@/lib/types";
import { OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OtaBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { HotelForm } from "@/components/forms/HotelForm";

export default function HotelsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setHotels(await hotelsApi.list(projectId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">ホテル一覧</h2>
        <Button onClick={() => setShowForm(true)} size="sm">+ ホテル追加</Button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : hotels.length === 0 ? (
        <Card>
          <EmptyState
            message="ホテルがまだ登録されていません"
            action={<Button onClick={() => setShowForm(true)} size="sm">ホテルを追加</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {hotels.map((h) => (
            <Card key={h.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{h.display_name}</h3>
                  {h.memo && <p className="text-xs text-gray-500 mt-0.5">{h.memo}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{h.id.slice(0, 8)}</p>
                </div>
              </div>
              {h.hotel_ota_mappings && h.hotel_ota_mappings.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {h.hotel_ota_mappings.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <OtaBadge ota={m.ota} />
                      <span className="text-gray-500 break-all">{m.ota_property_url}</span>
                      {!m.enabled && (
                        <span className="text-orange-500 text-xs">(無効)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(!h.hotel_ota_mappings || h.hotel_ota_mappings.length === 0) && (
                <p className="text-xs text-gray-400 mt-2">OTAマッピングなし</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="ホテル追加">
        <HotelForm
          projectId={projectId}
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
