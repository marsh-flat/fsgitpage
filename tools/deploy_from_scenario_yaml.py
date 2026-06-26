#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCENARIO = ROOT.parent / "scenario"
OUT_JS = ROOT / "fs-data.js"
PUBLIC_ROOT = "https://marsh-flat.github.io/fsgitpage"
PAGES_URL = f"{PUBLIC_ROOT}/gm.html?room=ark01&fs=A1"
DEPLOY_FILES = [
    ".nojekyll",
    "README.md",
    "app.js",
    "firebase-config.js",
    "fs-data.js",
    "fs-yaml-rūru.md",
    "gm.html",
    "index.html",
    "player.html",
    "styles.css",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync scenario-side FS YAML to fsgitpage, push, and verify GitHub Pages.")
    parser.add_argument("--scenario", type=Path, default=DEFAULT_SCENARIO, help="Scenario directory containing YAML front matter.")
    parser.add_argument("--message", default="Sync FS data from scenario YAML", help="Git commit message.")
    parser.add_argument("--cache-version", default="", help="Cache-busting version for app.js and fs-data.js imports.")
    parser.add_argument("--dry-run", action="store_true", help="Generate and validate without committing or pushing.")
    args = parser.parse_args()

    if yaml is None:
        fail("PyYAML is required. Install it in the current Python environment.")

    scenario_dir = args.scenario.expanduser().resolve()
    if not scenario_dir.exists():
        fail(f"Scenario directory not found: {scenario_dir}")

    print(f"scenario: {scenario_dir}")
    print(f"fsgitpage: {ROOT}")

    records = load_records(scenario_dir)
    if not records:
        fail("No FS YAML records found. Expected front matter with root key 'fs:'.")

    records.sort(key=sort_key)
    output = render_js(records)
    if args.dry_run:
        current = OUT_JS.read_text(encoding="utf-8") if OUT_JS.exists() else ""
        change_note = "would change" if output != current else "no changes"
        print(f"dry run: fs-data.js {change_note} ({len(records)} records)")
        if args.cache_version:
            print(f"dry run: cache version would be {args.cache_version}")
        run(["node", "--check", "app.js"], cwd=ROOT)
        print("Dry run: skipped file write, commit, push, and Pages verification.")
        return 0

    OUT_JS.write_text(output, encoding="utf-8")
    print(f"generated: {OUT_JS.relative_to(ROOT)} ({len(records)} records)")
    if args.cache_version:
        apply_cache_version(args.cache_version)

    run(["node", "--check", "app.js"], cwd=ROOT)

    diff = run_capture(["git", "status", "--short"], cwd=ROOT)
    print(diff or "no local changes")
    if not diff:
        print("No fsgitpage changes to deploy.")
        return 0

    run(["git", "add", *DEPLOY_FILES], cwd=ROOT)
    run(["git", "commit", "-m", args.message], cwd=ROOT)
    run(["git", "push"], cwd=ROOT)

    commit = run_capture(["git", "rev-parse", "HEAD"], cwd=ROOT).strip()
    wait_for_pages(commit, args.cache_version)
    verify_public_url(args.cache_version)
    print("done")
    return 0


def load_records(scenario_dir: Path) -> list[dict]:
    records: list[dict] = []
    for path in sorted(scenario_dir.rglob("*.md")):
        front = read_front_matter(path)
        if not front:
            continue
        record = front.get("fs")
        if not isinstance(record, dict):
            continue
        records.append(normalize_record(record, path))
    return records


def read_front_matter(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---\n", 4)
    if end == -1:
        return None
    return yaml.safe_load(text[4:end]) or {}


def normalize_record(record: dict, path: Path) -> dict:
    record = dict(record)
    record.setdefault("id", path.stem)
    record.setdefault("code", record["id"])
    record.setdefault("scene", infer_scene(path))
    record.setdefault("scene_name", infer_scene_name(path))
    record.setdefault("title", path.stem)
    record.setdefault("end", "")
    record.setdefault("check", "")
    record.setdefault("difficulty", None)
    record.setdefault("max_progress", 30)
    record.setdefault("target_progress", max((item.get("value", 0) for item in record.get("milestones", [])), default=12))
    record.setdefault("exp", 0)
    record.setdefault("pc_participation", {"required": [], "recommended": []})
    record["requires_success"] = normalize_id_list(
        record.get("requires_success") or record.get("requiresSuccess") or record.get("prerequisites") or []
    )
    record.setdefault("summary", "")
    record.setdefault("success", "")
    record.setdefault("failure", "")
    record.setdefault("gm", "")
    record["milestones"] = [normalize_milestone(item) for item in record.get("milestones", [])]
    return record


def normalize_id_list(value: object) -> list[str]:
    if not value:
        return []
    items = value if isinstance(value, list) else [value]
    return [str(item).strip() for item in items if str(item).strip()]


def normalize_milestone(item: dict) -> dict:
    item = dict(item)
    item.setdefault("value", 0)
    item.setdefault("title", "")
    item.setdefault("text", "")
    item.setdefault("mastertxt", "")
    item.setdefault("check", "")
    item.setdefault("difficulty", None)
    item.setdefault("requirement", "")
    item["infos"] = normalize_infos(item.get("infos", []))
    return item


def normalize_infos(value: object) -> list[dict]:
    if not value:
        return []
    items = value if isinstance(value, list) else [value]
    normalized = []
    for index, item in enumerate(items, start=1):
        if isinstance(item, dict):
            title = str(item.get("title") or f"情報{index}")
            text = str(item.get("text") or item.get("body") or "").strip()
        else:
            title = f"情報{index}"
            text = str(item).strip()
        if text:
            normalized.append({"title": title, "text": text})
    return normalized


def infer_scene(path: Path) -> str:
    scene_name = infer_scene_name(path)
    return scene_name.split("_", 1)[0] if scene_name else ""


def infer_scene_name(path: Path) -> str:
    parts = list(path.parts)
    if "シーン" not in parts:
        return ""
    index = parts.index("シーン")
    return parts[index + 1] if index + 1 < len(parts) else ""


def render_js(records: list[dict]) -> str:
    items = []
    for record in records:
        items.append({
            "id": str(record["id"]),
            "scene": str(record.get("scene", "")),
            "sceneName": str(record.get("scene_name", "")),
            "code": str(record.get("code", "")),
            "title": str(record.get("title", "")),
            "end": str(record.get("end", "")),
            "check": str(record.get("check", "")),
            "difficulty": record.get("difficulty"),
            "maxProgress": record.get("max_progress", 30),
            "targetProgress": record.get("target_progress", 12),
            "exp": record.get("exp", 0),
            "pcParticipation": record.get("pc_participation", {"required": [], "recommended": []}),
            "requiresSuccess": record.get("requires_success", []),
            "summary": str(record.get("summary", "")),
            "milestones": [
                {
                    "value": item.get("value"),
                    "title": str(item.get("title", "")),
                    "text": str(item.get("text", "")),
                    "mastertxt": str(item.get("mastertxt", "")),
                    "check": str(item.get("check", "")),
                    "difficulty": item.get("difficulty"),
                    "requirement": str(item.get("requirement", "")),
                    "infos": item.get("infos", []),
                }
                for item in record.get("milestones", [])
            ],
            "success": str(record.get("success", "")),
            "failure": str(record.get("failure", "")),
            "gm": str(record.get("gm", "")),
        })
    return "export const fsData = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"


def sort_key(record: dict) -> tuple[str, str, str]:
    return (str(record.get("scene", "")), str(record.get("code", "")), str(record.get("id", "")))


def apply_cache_version(version: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", version):
        fail(f"Invalid cache version: {version}")

    app_path = ROOT / "app.js"
    app_text = app_path.read_text(encoding="utf-8")
    app_next, app_count = re.subn(r'"\./fs-data\.js(?:\?v=[^"]+)?"', f'"./fs-data.js?v={version}"', app_text, count=1)
    if app_count != 1:
        fail("Could not update fs-data.js import in app.js")
    app_path.write_text(app_next, encoding="utf-8")

    for name in ("gm.html", "player.html"):
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        next_text, count = re.subn(r'"\./app\.js(?:\?v=[^"]+)?"', f'"./app.js?v={version}"', text, count=1)
        if count != 1:
            fail(f"Could not update app.js script URL in {name}")
        path.write_text(next_text, encoding="utf-8")

    print(f"cache version: {version}")


def wait_for_pages(commit: str, cache_version: str = "") -> None:
    print("waiting for GitHub Pages...")
    token = commit[:12]
    for attempt in range(1, 31):
        try:
            html = fetch_text(f"{PUBLIC_ROOT}/gm.html?deploy-check={token}-{attempt}")
            app = fetch_text(f"{PUBLIC_ROOT}/app.js?deploy-check={token}-{attempt}")
        except Exception as error:
            print(f"Pages check {attempt}/30: failed: {error}")
            time.sleep(5)
            continue

        if cache_version:
            html_ok = f"./app.js?v={cache_version}" in html
            app_ok = f"./fs-data.js?v={cache_version}" in app
        else:
            html_ok = "<!doctype html>" in html.lower()
            app_ok = "import { fsData }" in app

        print(f"Pages check {attempt}/30: html={'ok' if html_ok else 'old'} app={'ok' if app_ok else 'old'}")
        if html_ok and app_ok:
            return

        time.sleep(5)

    pages = run_capture(["gh", "api", "repos/marsh-flat/fsgitpage/pages", "--jq", ".status"], cwd=ROOT, timeout=8).strip()
    fail(f"GitHub Pages did not publish the expected cache version. status={pages}")


def verify_public_url(cache_version: str = "") -> None:
    print(f"checking: {PAGES_URL}")
    request = urllib.request.Request(PAGES_URL, method="HEAD")
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            fail(f"Public URL did not return 200: {response.status}")
    if cache_version:
        html = fetch_text(f"{PUBLIC_ROOT}/gm.html?verify={cache_version}")
        if f"./app.js?v={cache_version}" not in html:
            fail(f"Public URL did not contain cache version: {cache_version}")
    print("public URL: 200 OK")


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            fail(f"Public URL did not return 200: {response.status}")
        return response.read().decode("utf-8")


def run(command: list[str], cwd: Path) -> None:
    print("+ " + " ".join(command))
    subprocess.run(command, cwd=cwd, check=True)


def run_capture(command: list[str], cwd: Path, timeout: int | None = None) -> str:
    result = subprocess.run(command, cwd=cwd, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
    return result.stdout.strip()


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


if __name__ == "__main__":
    raise SystemExit(main())
