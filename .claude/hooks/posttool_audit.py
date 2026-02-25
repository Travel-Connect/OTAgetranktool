#!/usr/bin/env python3
import json, sys, os, datetime

data = json.load(sys.stdin)

root = os.environ.get("CLAUDE_PROJECT_DIR", ".")
logdir = os.path.join(root, ".claude", "audit")
os.makedirs(logdir, exist_ok=True)
logpath = os.path.join(logdir, "tool-audit.jsonl")

entry = {
    "ts": datetime.datetime.utcnow().isoformat() + "Z",
    "hook_event": data.get("hook_event_name"),
    "permission_mode": data.get("permission_mode"),
    "tool_name": data.get("tool_name"),
    "tool_input": data.get("tool_input"),
    "cwd": data.get("cwd"),
}

with open(logpath, "a", encoding="utf-8") as f:
    f.write(json.dumps(entry, ensure_ascii=False) + "\n")

sys.exit(0)