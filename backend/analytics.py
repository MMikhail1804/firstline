"""Simple file-based analytics. Logs each API call with timestamp."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

LOG_FILE = Path(os.getenv("ANALYTICS_LOG", "analytics.jsonl"))


def log_event(event: str, data: dict):
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **data,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def get_stats() -> dict:
    if not LOG_FILE.exists():
        return {"total_insights": 0, "total_generates": 0, "events": []}

    insights = 0
    generates = 0
    profiles = set()
    roles = {}
    goals = {}
    recent = []

    for line in LOG_FILE.read_text().splitlines():
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue

        if e["event"] == "insights":
            insights += 1
        elif e["event"] == "generate":
            generates += 1

        name = e.get("profile", "")
        if name:
            profiles.add(name)

        role = e.get("role", "")
        if role:
            roles[role] = roles.get(role, 0) + 1

        goal = e.get("goal", "")
        if goal:
            goals[goal] = goals.get(goal, 0) + 1

        recent.append(e)

    return {
        "total_insights": insights,
        "total_generates": generates,
        "unique_profiles": len(profiles),
        "by_role": roles,
        "by_goal": goals,
        "recent_10": recent[-10:],
    }
