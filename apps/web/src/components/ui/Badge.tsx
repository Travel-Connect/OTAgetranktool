import { STATUS_COLORS, STATUS_LABELS, OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className = "bg-gray-500", children }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? "bg-gray-400"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function OtaBadge({ ota }: { ota: string }) {
  return (
    <Badge className="bg-indigo-500">
      {OTA_DISPLAY_NAMES[ota as OtaType] ?? ota}
    </Badge>
  );
}
