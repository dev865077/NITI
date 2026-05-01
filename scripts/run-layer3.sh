#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ARTIFACTS_DIR=""

usage() {
  cat <<'USAGE'
Usage: scripts/run-layer3.sh [options]

Run the deterministic Layer 3 bilateral replay gate and write JSON artifacts.

Options:
  --artifacts-dir DIR       Write Layer 3 artifacts to DIR.
  -h, --help               Show this help.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --artifacts-dir)
      if [ "$#" -lt 2 ]; then
        echo "--artifacts-dir requires a value" >&2
        exit 2
      fi
      ARTIFACTS_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ -z "$ARTIFACTS_DIR" ]; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  ARTIFACTS_DIR="testnet/artifacts/layer3-${STAMP}"
fi

mkdir -p "$ARTIFACTS_DIR"
ARTIFACTS_DIR="$(cd "$ARTIFACTS_DIR" && pwd)"

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 127
  fi
}

run_step() {
  local name="$1"
  shift
  local log="$ARTIFACTS_DIR/${name}.log"

  echo "==> ${name}"
  set +e
  "$@" >"$log" 2>&1
  local status=$?
  set -e

  if [ "$status" -ne 0 ]; then
    echo "FAILED: ${name}" >&2
    echo "Log: ${log}" >&2
    tail -n 80 "$log" >&2 || true
    exit "$status"
  fi

  echo "ok: ${name} (log: ${log})"
}

run_json_step() {
  local name="$1"
  shift
  local out="$ARTIFACTS_DIR/${name}.json"
  local err="$ARTIFACTS_DIR/${name}.stderr.log"

  echo "==> ${name}"
  set +e
  "$@" >"$out" 2>"$err"
  local status=$?
  set -e

  if [ "$status" -ne 0 ]; then
    echo "FAILED: ${name}" >&2
    echo "Artifact: ${out}" >&2
    echo "Log: ${err}" >&2
    tail -n 80 "$err" >&2 || true
    exit "$status"
  fi

  if [ ! -s "$out" ]; then
    echo "FAILED: ${name} produced an empty artifact: ${out}" >&2
    exit 1
  fi

  echo "ok: ${name} (artifact: ${out})"
}

require_tool npm

echo "NITI Layer 3 bilateral artifact gate"
echo "Artifacts: ${ARTIFACTS_DIR}"

run_step node-build npm run build
run_json_step l3-bilateral-roles npm run --silent test:bilateral-roles
run_json_step l3-bilateral-setup-schema npm run --silent test:bilateral-setup-schema
run_json_step l3-bilateral-state-machine npm run --silent test:bilateral-state-machine
run_json_step l3-bilateral-template-agreement npm run --silent test:bilateral-template-agreement
run_json_step l3-bilateral-funding-validation npm run --silent test:bilateral-funding-validation
run_json_step l3-bilateral-adaptor-exchange npm run --silent test:bilateral-adaptor-exchange
run_json_step l3-bilateral-state-retention npm run --silent test:bilateral-state-retention
run_json_step l3-bilateral-two-process npm run --silent test:bilateral-two-process
run_json_step l3-bilateral-restart-recovery npm run --silent test:bilateral-restart-recovery
run_json_step l3-bilateral-malformed-counterparty npm run --silent test:bilateral-malformed-counterparty
run_json_step l3-bilateral-settlement-execution npm run --silent test:bilateral-settlement-execution
run_json_step l3-bilateral-wrong-path-replay npm run --silent test:bilateral-wrong-path-replay
run_step l3-artifact-verify npm run --silent test:layer3-artifacts -- --artifacts-dir "$ARTIFACTS_DIR"

echo "Layer 3 bilateral artifact gate passed."
