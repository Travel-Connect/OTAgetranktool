export interface Project {
  id: string;
  name: string;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  project_hotels?: { hotel_id: string; sort_order: number }[];
}

export interface Hotel {
  id: string;
  display_name: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
  hotel_ota_mappings?: OtaMapping[];
  project_hotels?: { project_id: string; sort_order: number }[];
}

export interface OtaMapping {
  id: string;
  hotel_id: string;
  ota: string;
  ota_property_url: string;
  ota_property_id: string | null;
  enabled: boolean;
}

export interface SearchProfile {
  id: string;
  project_id: string;
  ota: string;
  base_url: string;
  variable_mapping_json: Record<string, unknown>;
  allowlist_params_json: string[] | null;
  denylist_params_json: string[] | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Preset {
  id: string;
  project_id: string;
  name: string;
  otas_json: string[];
  nights_int: number;
  rooms_int: number;
  adults_per_room_json: number[];
  date_mode: "list" | "rule";
  date_list_json: string[] | null;
  rule_json: {
    offsets?: number[];
    offset_months?: number;
    weekdays?: number[];
    exclude_jp_holidays?: boolean;
    generate_count?: number;
  } | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  run_date: string;
  preset_id: string | null;
  status: "queued" | "running" | "success" | "partial" | "failed";
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  job_tasks?: { count: number }[];
}

export interface JobTask {
  id: string;
  job_id: string;
  ota: string;
  checkin_date: string;
  nights: number;
  rooms: number;
  adults_per_room: number;
  attempt_count: number;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  last_error_code: string | null;
  last_error_message: string | null;
  executed_url: string | null;
  started_at: string | null;
  finished_at: string | null;
  task_results: TaskResult | null;
  task_artifacts: TaskArtifact | null;
}

export interface TaskResult {
  task_id: string;
  total_count_int: number | null;
  total_count_raw_text: string | null;
  ranks_json: Record<string, number | null>;
  scanned_natural_count: number;
}

export interface TaskArtifact {
  task_id: string;
  screenshot_path: string | null;
  html_path: string | null;
}
