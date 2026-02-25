#!/usr/bin/env python3
import json, sys, re

data = json.load(sys.stdin)
tool = data.get("tool_name", "")
inp = data.get("tool_input", {}) or {}

def deny(reason: str):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason
        }
    }))
    sys.exit(0)

# Bashガード
if tool == "Bash":
    cmd = (inp.get("command") or "").strip()

    # 1) 取り返しがつきにくい系
    kill = [
        r"(?i)\brm\s+-rf\s+/(?:\s|$)",
        r"(?i)\brm\s+-rf\s+~(?:\s|$)",
        r"(?i)\bmkfs\b",
        r"(?i)\bdd\s+if=",
        r"(?i)\bshutdown\b|\breboot\b",
    ]
    for pat in kill:
        if re.search(pat, cmd):
            deny(f"危険コマンドの可能性が高いのでブロックしました: {cmd}")

    # 2) よくある“リモートスクリプト実行”
    if re.search(r"(?i)\b(curl|wget)\b.+\|\s*(bash|sh)\b", cmd):
        deny(f"リモートスクリプトのパイプ実行は危険なのでブロックしました: {cmd}")

    # 3) 露骨な外部送信/リバースシェル系（最低限）
    if re.search(r"(?i)\b(nc|netcat|socat)\b", cmd):
        deny(f"生のソケット系コマンドは原則ブロックします: {cmd}")

# Readガード（追加で守りたいならここで）
if tool == "Read":
    path = (inp.get("file_path") or "")
    if re.search(r"(^|/)\.env(\.|$)", path):
        deny(".env読み取りは禁止（settings.jsonのdenyと二重化）")

sys.exit(0)