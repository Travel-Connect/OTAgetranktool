import type { Project, Hotel, SearchProfile, Preset, Job, JobTask } from "./types";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `API error: ${res.status}`);
  return data;
}

export const projectsApi = {
  list: () => request<Project[]>("/api/projects"),
  create: (name: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (id: string, updates: Partial<Project>) =>
    request<Project>("/api/projects", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    }),
};

export const hotelsApi = {
  list: (projectId: string) =>
    request<Hotel[]>(`/api/hotels?project_id=${projectId}`),
  create: (body: {
    display_name: string;
    memo?: string;
    project_id: string;
    sort_order?: number;
    ota_mappings?: Array<{ ota: string; ota_property_url: string }>;
  }) =>
    request<Hotel>("/api/hotels", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    request<Hotel>("/api/hotels", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    }),
};

export const searchProfilesApi = {
  list: (projectId: string) =>
    request<SearchProfile[]>(`/api/search-profiles?project_id=${projectId}`),
  create: (body: {
    project_id: string;
    ota: string;
    base_url: string;
    variable_mapping_json?: Record<string, unknown>;
    allowlist_params_json?: string[];
    denylist_params_json?: string[];
  }) =>
    request<SearchProfile>("/api/search-profiles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    request<SearchProfile>("/api/search-profiles", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    }),
};

export const presetsApi = {
  list: (projectId: string) =>
    request<Preset[]>(`/api/presets?project_id=${projectId}`),
  create: (body: {
    project_id: string;
    name: string;
    otas_json?: string[];
    nights_int?: number;
    rooms_int?: number;
    adults_per_room_json?: number[];
    date_mode?: string;
    rule_json?: Record<string, unknown>;
    date_list_json?: string[];
  }) =>
    request<Preset>("/api/presets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, updates: Record<string, unknown>) =>
    request<Preset>("/api/presets", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    }),
};

export const jobsApi = {
  list: (projectId: string) =>
    request<Job[]>(`/api/jobs?project_id=${projectId}`),
  create: (body: {
    project_id: string;
    run_date: string;
    tasks: Array<{
      ota: string;
      checkin_date: string;
      nights?: number;
      rooms?: number;
      adults_per_room?: number;
    }>;
  }) =>
    request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  run: (id: string) =>
    request<{ message: string }>(`/api/jobs/${id}/run`, { method: "POST" }),
  results: (id: string) =>
    request<{ job: Job; tasks: JobTask[] }>(`/api/jobs/${id}/results`),
};
