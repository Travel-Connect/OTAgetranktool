"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface CronResult {
  message?: string;
  jobs?: string[];
  deleted?: { jobs?: number; tasks?: number; artifacts?: number };
  error?: string;
}

export default function SettingsPage() {
  const [dailyResult, setDailyResult] = useState<CronResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CronResult | null>(null);
  const [runningDaily, setRunningDaily] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);

  async function runDaily() {
    setRunningDaily(true);
    setDailyResult(null);
    try {
      const res = await fetch("/api/cron/test-daily", { method: "POST" });
      setDailyResult(await res.json());
    } catch (err: any) {
      setDailyResult({ error: err.message });
    } finally {
      setRunningDaily(false);
    }
  }

  async function runCleanup() {
    setRunningCleanup(true);
    setCleanupResult(null);
    try {
      const res = await fetch("/api/cron/test-cleanup", { method: "POST" });
      setCleanupResult(await res.json());
    } catch (err: any) {
      setCleanupResult({ error: err.message });
    } finally {
      setRunningCleanup(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">設定・Cronジョブ</h1>

      {/* Cron Daily */}
      <Card title="Daily Cron — 自動ジョブ生成" className="mb-4">
        <p className="text-sm text-gray-600 mb-3">
          有効なプリセットからジョブとタスクを自動生成して実行します。
          本番環境では毎日 AM 10:00 (JST) に自動実行されます。
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={runDaily} loading={runningDaily}>
            テスト実行
          </Button>
          <span className="text-xs text-gray-400">POST /api/cron/daily</span>
        </div>
        {dailyResult && (
          <pre className="mt-3 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
            {JSON.stringify(dailyResult, null, 2)}
          </pre>
        )}
      </Card>

      {/* Cron Cleanup */}
      <Card title="Cleanup Cron — 古いデータ削除" className="mb-4">
        <p className="text-sm text-gray-600 mb-3">
          3ヶ月以上前のジョブ・タスク・証跡を削除します。
          本番環境では毎週日曜 AM 12:00 (JST) に自動実行されます。
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={runCleanup} loading={runningCleanup} variant="danger">
            テスト実行
          </Button>
          <span className="text-xs text-gray-400">POST /api/cron/cleanup</span>
        </div>
        {cleanupResult && (
          <pre className="mt-3 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
            {JSON.stringify(cleanupResult, null, 2)}
          </pre>
        )}
      </Card>

      {/* Cronスケジュール */}
      <Card title="Cronスケジュール（Vercel）">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">ジョブ</th>
              <th className="pb-2 font-medium">スケジュール</th>
              <th className="pb-2 font-medium">実行時間 (JST)</th>
              <th className="pb-2 font-medium">パス</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 font-medium">Daily</td>
              <td className="py-2 font-mono text-xs">0 1 * * *</td>
              <td className="py-2">毎日 10:00</td>
              <td className="py-2 text-gray-500 text-xs">/api/cron/daily</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Cleanup</td>
              <td className="py-2 font-mono text-xs">0 3 * * 0</td>
              <td className="py-2">毎週日曜 12:00</td>
              <td className="py-2 text-gray-500 text-xs">/api/cron/cleanup</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
