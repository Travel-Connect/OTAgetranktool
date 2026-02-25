#!/usr/bin/env python3
import json, sys, re

data = json.load(sys.stdin)
prompt = data.get("prompt", "")

# ありがちな“貼ってはいけない”っぽいパターン（必要に応じて追加）
patterns = [
    (r"ghp_[A-Za-z0-9]{20,}", "GitHub classic tokenっぽい文字列"),
    (r"github_pat_[A-Za-z0-9_]{20,}", "GitHub fine-grained tokenっぽい文字列"),
    (r"sk-[A-Za-z0-9]{20,}", "APIキーっぽい文字列"),
    (r"(?i)\b(password|secret|token|api[_-]?key)\b\s*[:=]", "パスワード/秘密情報を含む可能性"),
]

for pat, msg in patterns:
    if re.search(pat, prompt):
        print(json.dumps({
            "decision": "block",
            "reason": f"セキュリティ保護：{msg} が含まれていそうなので送信を止めました。秘密情報は貼らずに、参照方法（どの変数名か等）だけ教えてください。"
        }))
        sys.exit(0)

sys.exit(0)