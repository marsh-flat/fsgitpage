#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FSGITPAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_DIR="$(cd "${FSGITPAGE_DIR}/.." && pwd)"
SCENARIO_DIR="${SCENARIO_DIR:-${WORKSPACE_DIR}/scenario}"
SCENARIO_MESSAGE="${SCENARIO_MESSAGE:-Update scenario FS source}"
FSGITPAGE_MESSAGE="${FSGITPAGE_MESSAGE:-Deploy FS data from scenario YAML}"
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage:
  tools/deploy_fs.sh [--dry-run] [--scenario-message MSG] [--fsgitpage-message MSG]

Runs the full FS publish flow:
  1. Fast-forward scenario and fsgitpage from origin/main.
  2. Commit and push scenario/シナリオ/ソース changes if any.
  3. Generate fsgitpage/fs-data.js from scenario-side FS YAML.
  4. Set cache-busting URLs from the current scenario git commit.
  5. Commit, push, and verify GitHub Pages for fsgitpage.

Environment:
  SCENARIO_DIR       Override the scenario repo path.
  SCENARIO_MESSAGE   Commit message for scenario changes.
  FSGITPAGE_MESSAGE  Commit message for fsgitpage deployment.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --scenario-message)
      SCENARIO_MESSAGE="${2:?missing scenario commit message}"
      shift 2
      ;;
    --fsgitpage-message)
      FSGITPAGE_MESSAGE="${2:?missing fsgitpage commit message}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

require_repo() {
  local repo_dir="$1"
  if [[ ! -d "${repo_dir}/.git" ]]; then
    echo "ERROR: not a git repository: ${repo_dir}" >&2
    exit 1
  fi
}

sync_repo() {
  local repo_dir="$1"
  local label="$2"
  echo "== ${label}: sync origin/main"
  git -C "${repo_dir}" fetch origin
  local counts
  counts="$(git -C "${repo_dir}" rev-list --left-right --count HEAD...origin/main)"
  local ahead behind
  read -r ahead behind <<<"${counts}"
  if [[ "${ahead}" != "0" && "${behind}" != "0" ]]; then
    echo "ERROR: ${label} has diverged from origin/main (${ahead} ahead, ${behind} behind)." >&2
    exit 1
  fi
  if [[ "${behind}" != "0" ]]; then
    git -C "${repo_dir}" pull --ff-only
  fi
}

commit_scenario_if_needed() {
  echo "== scenario: stage source changes"
  git -C "${SCENARIO_DIR}" add -A -- "シナリオ/ソース"
  if git -C "${SCENARIO_DIR}" diff --cached --quiet; then
    echo "scenario: no source changes to commit"
    return
  fi

  echo "scenario: staged changes"
  git -C "${SCENARIO_DIR}" diff --cached --stat
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "dry run: skipped scenario commit and push"
    git -C "${SCENARIO_DIR}" restore --staged -- "シナリオ/ソース"
    return
  fi

  git -C "${SCENARIO_DIR}" commit -m "${SCENARIO_MESSAGE}"
  git -C "${SCENARIO_DIR}" push origin main
}

require_repo "${SCENARIO_DIR}"
require_repo "${FSGITPAGE_DIR}"

sync_repo "${SCENARIO_DIR}" "scenario"
sync_repo "${FSGITPAGE_DIR}" "fsgitpage"
commit_scenario_if_needed

SCENARIO_COMMIT="$(git -C "${SCENARIO_DIR}" rev-parse --short=12 HEAD)"
CACHE_VERSION="fs-${SCENARIO_COMMIT}"
echo "== cache version: ${CACHE_VERSION}"

cd "${FSGITPAGE_DIR}"
if [[ "${DRY_RUN}" == "1" ]]; then
  python3 tools/deploy_from_scenario_yaml.py \
    --scenario "${SCENARIO_DIR}" \
    --message "${FSGITPAGE_MESSAGE}" \
    --cache-version "${CACHE_VERSION}" \
    --dry-run
else
  python3 tools/deploy_from_scenario_yaml.py \
    --scenario "${SCENARIO_DIR}" \
    --message "${FSGITPAGE_MESSAGE}" \
    --cache-version "${CACHE_VERSION}"
fi
