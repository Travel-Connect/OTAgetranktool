"use client";

import { useState, useEffect, useCallback } from "react";

/* ──────────── 型 ──────────── */
interface Project {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  project_hotels?: { hotel_id: string; sort_order: number }[];
}
interface Hotel {
  id: string;
  display_name: string;
  memo: string | null;
  hotel_ota_mappings?: OtaMapping[];
}
interface OtaMapping {
  id: string;
  ota: string;
  ota_property_url: string;
  ota_property_id: string | null;
  enabled: boolean;
}
interface SearchProfile {
  id: string;
  ota: string;
  base_url: string;
  enabled: boolean;
}
interface Preset {
  id: string;
  name: string;
  otas_json: string[];
  nights_int: number;
  rooms_int: number;
  adults_per_room_json: number[];
  date_mode: string;
  rule_json: any;
  enabled: boolean;
}
interface Job {
  id: string;
  run_date: string;
  status: string;
  created_at: string;
  job_tasks?: { count: number }[];
}
interface Task {
  id: string;
  ota: string;
  checkin_date: string;
  nights: number;
  rooms: number;
  adults_per_room: number;
  status: string;
  last_error_message: string | null;
  executed_url: string | null;
  task_results: any;
}

const OTA_LIST = ["rakuten", "jalan", "ikyu", "expedia", "booking", "agoda", "tripcom"] as const;

/* ──────────── Helpers ──────────── */
async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: color,
        marginLeft: 6,
      }}
    >
      {children}
    </span>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "queued": return "#888";
    case "running": return "#e67e22";
    case "success": return "#27ae60";
    case "failed": return "#e74c3c";
    case "partial_success": return "#f39c12";
    default: return "#888";
  }
}

/* ──────────── メインページ ──────────── */
export default function TestDashboard() {
  /* --- state --- */
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobTasks, setJobTasks] = useState<Task[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  /* --- load projects on mount --- */
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const data = await api<Project[]>("/api/projects");
    setProjects(Array.isArray(data) ? data : []);
    addLog(`プロジェクト一覧取得: ${Array.isArray(data) ? data.length : 0}件`);
  }

  async function selectProject(p: Project) {
    setSelectedProject(p);
    setSelectedJob(null);
    setJobTasks([]);
    // 並列で子データを取得
    const [h, sp, pr, j] = await Promise.all([
      api<Hotel[]>(`/api/hotels?project_id=${p.id}`),
      api<SearchProfile[]>(`/api/search-profiles?project_id=${p.id}`),
      api<Preset[]>(`/api/presets?project_id=${p.id}`),
      api<Job[]>(`/api/jobs?project_id=${p.id}`),
    ]);
    setHotels(Array.isArray(h) ? h : []);
    setProfiles(Array.isArray(sp) ? sp : []);
    setPresets(Array.isArray(pr) ? pr : []);
    setJobs(Array.isArray(j) ? j : []);
    addLog(`プロジェクト「${p.name}」を選択 — ホテル${(h as any[]).length ?? 0}, プロファイル${(sp as any[]).length ?? 0}, プリセット${(pr as any[]).length ?? 0}, ジョブ${(j as any[]).length ?? 0}`);
  }

  /* ━━━ プロジェクト作成 ━━━ */
  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    if (!name) return;
    const data = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (data.id) {
      addLog(`プロジェクト作成: ${data.name} (${data.id.slice(0, 8)})`);
      await loadProjects();
      e.currentTarget.reset();
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ━━━ ホテル作成 ━━━ */
  async function createHotel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject) return;
    const fd = new FormData(e.currentTarget);
    const mappings: any[] = [];
    for (const ota of OTA_LIST) {
      const url = fd.get(`ota_${ota}`) as string;
      if (url) mappings.push({ ota, ota_property_url: url });
    }
    const data = await api("/api/hotels", {
      method: "POST",
      body: JSON.stringify({
        display_name: fd.get("display_name"),
        memo: fd.get("memo") || null,
        project_id: selectedProject.id,
        sort_order: Number(fd.get("sort_order")) || 0,
        ota_mappings: mappings.length > 0 ? mappings : undefined,
      }),
    });
    if (data.id) {
      addLog(`ホテル作成: ${data.display_name} (${data.id.slice(0, 8)})`);
      selectProject(selectedProject);
      e.currentTarget.reset();
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ━━━ 検索プロファイル作成 ━━━ */
  async function createProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject) return;
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/search-profiles", {
      method: "POST",
      body: JSON.stringify({
        project_id: selectedProject.id,
        ota: fd.get("ota"),
        base_url: fd.get("base_url"),
      }),
    });
    if (data.id) {
      addLog(`検索プロファイル作成: ${data.ota} (${data.id.slice(0, 8)})`);
      selectProject(selectedProject);
      e.currentTarget.reset();
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ━━━ プリセット作成 ━━━ */
  async function createPreset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject) return;
    const fd = new FormData(e.currentTarget);
    const checkedOtas = OTA_LIST.filter((ota) => fd.get(`preset_ota_${ota}`) === "on");
    const data = await api("/api/presets", {
      method: "POST",
      body: JSON.stringify({
        project_id: selectedProject.id,
        name: fd.get("preset_name"),
        otas_json: checkedOtas,
        nights_int: Number(fd.get("nights")) || 1,
        rooms_int: Number(fd.get("rooms")) || 1,
        adults_per_room_json: [Number(fd.get("adults")) || 2],
        date_mode: "rule",
        rule_json: {
          offsets: (fd.get("offsets") as string)
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n)),
        },
      }),
    });
    if (data.id) {
      addLog(`プリセット作成: ${data.name} (${data.id.slice(0, 8)})`);
      selectProject(selectedProject);
      e.currentTarget.reset();
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ━━━ ジョブ作成 ━━━ */
  async function createJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject) return;
    const fd = new FormData(e.currentTarget);
    const checkedOtas = OTA_LIST.filter((ota) => fd.get(`job_ota_${ota}`) === "on");
    const checkinDate = fd.get("checkin_date") as string;
    const tasks = checkedOtas.map((ota) => ({
      ota,
      checkin_date: checkinDate,
      nights: Number(fd.get("job_nights")) || 1,
      rooms: Number(fd.get("job_rooms")) || 1,
      adults_per_room: Number(fd.get("job_adults")) || 2,
    }));
    const data = await api("/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        project_id: selectedProject.id,
        run_date: new Date().toISOString().slice(0, 10),
        tasks,
      }),
    });
    if (data.id) {
      addLog(`ジョブ作成: ${data.id.slice(0, 8)} (タスク${tasks.length}件)`);
      selectProject(selectedProject);
      e.currentTarget.reset();
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ━━━ ジョブ実行 ━━━ */
  async function runJob(jobId: string) {
    addLog(`ジョブ実行開始: ${jobId.slice(0, 8)}...`);
    const data = await api(`/api/jobs/${jobId}/run`, { method: "POST" });
    addLog(`実行レスポンス: ${JSON.stringify(data)}`);
  }

  /* ━━━ ジョブ結果 ━━━ */
  async function loadJobResults(job: Job) {
    setSelectedJob(job);
    const data = await api<{ job: Job; tasks: Task[] }>(`/api/jobs/${job.id}/results`);
    if (data.tasks) {
      setJobTasks(data.tasks);
      setSelectedJob(data.job as any);
      addLog(`ジョブ結果取得: ${data.tasks.length}タスク`);
    } else {
      addLog(`エラー: ${JSON.stringify(data)}`);
    }
  }

  /* ──────────── Render ──────────── */
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ borderBottom: "3px solid #2563eb", paddingBottom: 8 }}>
        OTA Get Rank Tool — API テストダッシュボード
      </h1>

      {/* ===== ログ ===== */}
      <details open style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#666" }}>
          操作ログ ({log.length})
        </summary>
        <div
          style={{
            maxHeight: 120,
            overflow: "auto",
            background: "#1a1a2e",
            color: "#0f0",
            padding: 8,
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "monospace",
            marginTop: 4,
          }}
        >
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {log.length === 0 && <div style={{ color: "#666" }}>ログなし</div>}
        </div>
      </details>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* ===== 左: プロジェクト一覧 ===== */}
        <div>
          <Section title="プロジェクト">
            <form onSubmit={createProject} style={{ marginBottom: 12 }}>
              <input name="name" placeholder="プロジェクト名" required style={inputStyle} />
              <button type="submit" style={btnPrimary}>
                作成
              </button>
            </form>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => selectProject(p)}
                style={{
                  padding: "8px 10px",
                  marginBottom: 4,
                  borderRadius: 4,
                  cursor: "pointer",
                  background: selectedProject?.id === p.id ? "#dbeafe" : "#f9fafb",
                  border: selectedProject?.id === p.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
                }}
              >
                <strong>{p.name}</strong>
                <br />
                <span style={{ fontSize: 11, color: "#888" }}>
                  {p.id.slice(0, 8)} | ホテル{p.project_hotels?.length ?? 0}件
                </span>
              </div>
            ))}
            {projects.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>プロジェクトなし</p>}
          </Section>
        </div>

        {/* ===== 右: プロジェクト詳細 ===== */}
        <div>
          {!selectedProject ? (
            <p style={{ color: "#999", padding: 40, textAlign: "center" }}>
              左のプロジェクトを選択してください
            </p>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>
                {selectedProject.name}
                <span style={{ fontSize: 13, color: "#888", marginLeft: 8 }}>
                  {selectedProject.id.slice(0, 8)}
                </span>
              </h2>

              {/* ---- ホテル ---- */}
              <Section title="ホテル" collapsible>
                <div style={{ marginBottom: 8 }}>
                  {hotels.map((h) => (
                    <div key={h.id} style={cardStyle}>
                      <strong>{h.display_name}</strong>
                      <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>
                        {h.id.slice(0, 8)}
                      </span>
                      {h.hotel_ota_mappings && h.hotel_ota_mappings.length > 0 && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {h.hotel_ota_mappings.map((m) => (
                            <div key={m.id}>
                              <Badge color="#6366f1">{m.ota}</Badge>{" "}
                              <span style={{ color: "#555", wordBreak: "break-all" }}>
                                {m.ota_property_url}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {hotels.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>ホテルなし</p>}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                    + ホテル追加
                  </summary>
                  <form onSubmit={createHotel} style={{ marginTop: 8, background: "#f9fafb", padding: 12, borderRadius: 6 }}>
                    <Row>
                      <input name="display_name" placeholder="ホテル名" required style={inputStyle} />
                      <input name="sort_order" type="number" placeholder="並び順" defaultValue={0} style={{ ...inputStyle, width: 80 }} />
                    </Row>
                    <input name="memo" placeholder="メモ (任意)" style={{ ...inputStyle, width: "100%" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "8px 0 4px" }}>OTAマッピング (URL)</p>
                    {OTA_LIST.map((ota) => (
                      <Row key={ota}>
                        <label style={{ width: 70, fontSize: 12, fontWeight: 500 }}>{ota}</label>
                        <input name={`ota_${ota}`} placeholder={`${ota} URL`} style={{ ...inputStyle, flex: 1 }} />
                      </Row>
                    ))}
                    <button type="submit" style={btnPrimary}>ホテル作成</button>
                  </form>
                </details>
              </Section>

              {/* ---- 検索プロファイル ---- */}
              <Section title="検索プロファイル" collapsible>
                <div style={{ marginBottom: 8 }}>
                  {profiles.map((p) => (
                    <div key={p.id} style={cardStyle}>
                      <Badge color="#6366f1">{p.ota}</Badge>{" "}
                      <span style={{ fontSize: 12, wordBreak: "break-all" }}>{p.base_url}</span>
                    </div>
                  ))}
                  {profiles.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>プロファイルなし</p>}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                    + プロファイル追加
                  </summary>
                  <form onSubmit={createProfile} style={{ marginTop: 8, background: "#f9fafb", padding: 12, borderRadius: 6 }}>
                    <Row>
                      <select name="ota" required style={inputStyle}>
                        {OTA_LIST.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      <input name="base_url" placeholder="検索ベースURL" required style={{ ...inputStyle, flex: 1 }} />
                    </Row>
                    <button type="submit" style={btnPrimary}>プロファイル作成</button>
                  </form>
                </details>
              </Section>

              {/* ---- プリセット ---- */}
              <Section title="プリセット" collapsible>
                <div style={{ marginBottom: 8 }}>
                  {presets.map((p) => (
                    <div key={p.id} style={cardStyle}>
                      <strong>{p.name}</strong>
                      <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>
                        {p.otas_json?.join(", ")} | {p.nights_int}泊 {p.rooms_int}室 大人{p.adults_per_room_json?.[0]}
                      </span>
                    </div>
                  ))}
                  {presets.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>プリセットなし</p>}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                    + プリセット追加
                  </summary>
                  <form onSubmit={createPreset} style={{ marginTop: 8, background: "#f9fafb", padding: 12, borderRadius: 6 }}>
                    <input name="preset_name" placeholder="プリセット名" required style={inputStyle} />
                    <Row>
                      <label style={{ fontSize: 12, width: 50 }}>泊数</label>
                      <input name="nights" type="number" defaultValue={1} min={1} style={{ ...inputStyle, width: 60 }} />
                      <label style={{ fontSize: 12, width: 50, marginLeft: 8 }}>室数</label>
                      <input name="rooms" type="number" defaultValue={1} min={1} style={{ ...inputStyle, width: 60 }} />
                      <label style={{ fontSize: 12, width: 60, marginLeft: 8 }}>大人/室</label>
                      <input name="adults" type="number" defaultValue={2} min={1} style={{ ...inputStyle, width: 60 }} />
                    </Row>
                    <input name="offsets" placeholder="日数オフセット (例: 0, 7, 14, 30)" defaultValue="0, 7, 14, 30" style={{ ...inputStyle, width: "100%" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "6px 0 4px" }}>対象OTA</p>
                    <Row style={{ flexWrap: "wrap" }}>
                      {OTA_LIST.map((ota) => (
                        <label key={ota} style={{ fontSize: 12, marginRight: 12 }}>
                          <input type="checkbox" name={`preset_ota_${ota}`} defaultChecked /> {ota}
                        </label>
                      ))}
                    </Row>
                    <button type="submit" style={btnPrimary}>プリセット作成</button>
                  </form>
                </details>
              </Section>

              {/* ---- ジョブ ---- */}
              <Section title="ジョブ">
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                    + 新規ジョブ作成
                  </summary>
                  <form onSubmit={createJob} style={{ marginTop: 8, background: "#f9fafb", padding: 12, borderRadius: 6 }}>
                    <Row>
                      <label style={{ fontSize: 12, width: 100 }}>チェックイン日</label>
                      <input
                        name="checkin_date"
                        type="date"
                        required
                        defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
                        style={inputStyle}
                      />
                    </Row>
                    <Row>
                      <label style={{ fontSize: 12, width: 50 }}>泊数</label>
                      <input name="job_nights" type="number" defaultValue={1} min={1} style={{ ...inputStyle, width: 60 }} />
                      <label style={{ fontSize: 12, width: 50, marginLeft: 8 }}>室数</label>
                      <input name="job_rooms" type="number" defaultValue={1} min={1} style={{ ...inputStyle, width: 60 }} />
                      <label style={{ fontSize: 12, width: 60, marginLeft: 8 }}>大人/室</label>
                      <input name="job_adults" type="number" defaultValue={2} min={1} style={{ ...inputStyle, width: 60 }} />
                    </Row>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "6px 0 4px" }}>対象OTA</p>
                    <Row style={{ flexWrap: "wrap" }}>
                      {OTA_LIST.map((ota) => (
                        <label key={ota} style={{ fontSize: 12, marginRight: 12 }}>
                          <input type="checkbox" name={`job_ota_${ota}`} defaultChecked={ota === "rakuten"} /> {ota}
                        </label>
                      ))}
                    </Row>
                    <button type="submit" style={btnPrimary}>ジョブ作成</button>
                  </form>
                </details>

                {jobs.map((j) => (
                  <div key={j.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 13 }}>{j.id.slice(0, 8)}</span>
                      <Badge color={statusColor(j.status)}>{j.status}</Badge>
                      <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>
                        {j.run_date} | タスク{j.job_tasks?.[0]?.count ?? "?"}件
                      </span>
                    </div>
                    <button
                      onClick={() => runJob(j.id)}
                      disabled={j.status !== "queued"}
                      style={{
                        ...btnSmall,
                        background: j.status === "queued" ? "#e67e22" : "#ccc",
                        cursor: j.status === "queued" ? "pointer" : "not-allowed",
                      }}
                    >
                      実行
                    </button>
                    <button onClick={() => loadJobResults(j)} style={{ ...btnSmall, background: "#2563eb" }}>
                      結果
                    </button>
                    <a
                      href={`/api/jobs/${j.id}/excel`}
                      download
                      style={{ ...btnSmall, background: "#059669", textDecoration: "none", textAlign: "center" }}
                    >
                      Excel
                    </a>
                  </div>
                ))}
                {jobs.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>ジョブなし</p>}
              </Section>

              {/* ---- ジョブ結果 ---- */}
              {selectedJob && (
                <Section title={`ジョブ結果 — ${selectedJob.id.slice(0, 8)}`}>
                  <div style={{ marginBottom: 8 }}>
                    <Badge color={statusColor(selectedJob.status)}>{selectedJob.status}</Badge>
                    <span style={{ fontSize: 12, marginLeft: 8 }}>
                      run_date: {selectedJob.run_date}
                    </span>
                    <button
                      onClick={() => loadJobResults(selectedJob)}
                      style={{ ...btnSmall, background: "#2563eb", marginLeft: 12 }}
                    >
                      更新
                    </button>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        <th style={th}>OTA</th>
                        <th style={th}>チェックイン</th>
                        <th style={th}>泊/室/人</th>
                        <th style={th}>ステータス</th>
                        <th style={th}>結果</th>
                        <th style={th}>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobTasks.map((t) => (
                        <tr key={t.id}>
                          <td style={td}><Badge color="#6366f1">{t.ota}</Badge></td>
                          <td style={td}>{t.checkin_date}</td>
                          <td style={td}>{t.nights}/{t.rooms}/{t.adults_per_room}</td>
                          <td style={td}><Badge color={statusColor(t.status)}>{t.status}</Badge></td>
                          <td style={td}>
                            {t.task_results ? (
                              <span style={{ fontSize: 11 }}>
                                {t.task_results.ranks_json
                                  ? Object.entries(t.task_results.ranks_json as Record<string, number | null>)
                                      .map(([hid, rank]) => `${hid.slice(0, 6)}:${rank ?? "圏外"}`)
                                      .join(", ")
                                  : `件数:${t.task_results.total_count ?? "-"}`}
                              </span>
                            ) : (
                              <span style={{ color: "#999" }}>-</span>
                            )}
                          </td>
                          <td style={td}>
                            {t.executed_url ? (
                              <a
                                href={t.executed_url}
                                target="_blank"
                                rel="noopener"
                                style={{ fontSize: 11, wordBreak: "break-all" }}
                              >
                                開く
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {jobTasks.length === 0 && <p style={{ color: "#999" }}>タスクなし</p>}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────── UIパーツ ──────────── */
function Section({
  title,
  collapsible,
  children,
}: {
  title: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
      {!collapsible && (
        <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#374151" }}>{title}</h3>
      )}
      {children}
    </div>
  );
  if (collapsible) {
    return (
      <details open style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, color: "#374151", marginBottom: 4 }}>
          {title}
        </summary>
        {inner}
      </details>
    );
  }
  return inner;
}

function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, ...style }}>{children}</div>;
}

/* ──────────── スタイル定数 ──────────── */
const inputStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 4,
  fontSize: 13,
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  marginTop: 4,
};
const btnSmall: React.CSSProperties = {
  padding: "3px 10px",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};
const th: React.CSSProperties = { padding: "6px 8px", textAlign: "left", borderBottom: "2px solid #d1d5db" };
const td: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #e5e7eb" };
