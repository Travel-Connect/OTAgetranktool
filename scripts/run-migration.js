#!/usr/bin/env node
// Run SQL migrations against Supabase via Management API
// Usage: node scripts/run-migration.js [migration_file_or_all]

const fs = require("fs");
const path = require("path");

const PROJECT_REF = "wupufaekvxchpltyvzim";
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// Read access token from OTAlogin's .env.local or environment
function getAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }
  // Fallback: read from the sibling project's env
  const envPath = path.join("C:", "OTAlogin", "apps", "web", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  throw new Error("SUPABASE_ACCESS_TOKEN not found");
}

async function runSQL(sql, label) {
  const token = getAccessToken();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${label}] HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  console.log(`✓ ${label}`);
  return data;
}

async function main() {
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
  const target = process.argv[2];

  let files;
  if (target && target !== "all") {
    files = [target];
  } else {
    files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  }

  console.log(`Running ${files.length} migration(s)...\n`);

  for (const file of files) {
    const filePath = path.isAbsolute(file)
      ? file
      : path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");
    await runSQL(sql, file);
  }

  console.log("\nAll migrations completed.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
