"use client";

import type { JobTask } from "@/lib/types";
import { OtaBadge, StatusBadge } from "@/components/ui/Badge";

interface Props {
  tasks: JobTask[];
}

export function TaskFailureDetail({ tasks }: Props) {
  const failedTasks = tasks.filter((t) => t.status === "failed" || t.status === "skipped");

  if (failedTasks.length === 0) return null;

  return (
    <div>
      <h3 className="text-base font-bold text-gray-800 mb-3">失敗タスク ({failedTasks.length}件)</h3>
      <div className="space-y-2">
        {failedTasks.map((t) => (
          <div key={t.id} className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <OtaBadge ota={t.ota} />
              <StatusBadge status={t.status} />
              <span className="text-xs text-gray-500">
                チェックイン: {t.checkin_date} | 試行: {t.attempt_count}回
              </span>
            </div>
            {t.last_error_code && (
              <p className="text-xs">
                <span className="font-semibold text-red-700">エラー:</span>{" "}
                <code className="bg-red-100 px-1 rounded">{t.last_error_code}</code>
                {t.last_error_message && (
                  <span className="text-red-600 ml-1">{t.last_error_message}</span>
                )}
              </p>
            )}
            {t.executed_url && (
              <p className="text-xs mt-1">
                <span className="font-semibold text-gray-600">URL:</span>{" "}
                <a
                  href={t.executed_url}
                  target="_blank"
                  rel="noopener"
                  className="text-blue-600 hover:underline break-all"
                >
                  {t.executed_url}
                </a>
              </p>
            )}
            {t.task_artifacts?.screenshot_path && (
              <p className="text-xs mt-1">
                <span className="font-semibold text-gray-600">スクリーンショット:</span>{" "}
                <span className="text-gray-500">{t.task_artifacts.screenshot_path}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
