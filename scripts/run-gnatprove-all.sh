#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ARTIFACTS_DIR=""
LEVEL=4
TIMEOUT=20
PROVERS="cvc5,z3,altergo"
LIST_ONLY=0

usage() {
  cat <<'USAGE'
Usage: scripts/run-gnatprove-all.sh [options]

Run every SPARK proof target in spark/*.gpr with GNATprove.

Options:
  --artifacts-dir DIR   Write proof logs and summary.json to DIR.
  --level N             GNATprove proof level. Default: 4.
  --timeout N           Timeout for finite modular/product targets. Default: 20.
  --prover LIST         Comma-separated prover list. Default: cvc5,z3,altergo.
  --list-targets        Print the target list and exit.
  -h, --help            Show this help.

The runner fails on any missing tool, proof failure, warning, unproved check,
pragma Assume, or Assert(False) proof shortcut.
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
    --level)
      if [ "$#" -lt 2 ]; then
        echo "--level requires a value" >&2
        exit 2
      fi
      LEVEL="$2"
      shift 2
      ;;
    --timeout)
      if [ "$#" -lt 2 ]; then
        echo "--timeout requires a value" >&2
        exit 2
      fi
      TIMEOUT="$2"
      shift 2
      ;;
    --prover)
      if [ "$#" -lt 2 ]; then
        echo "--prover requires a value" >&2
        exit 2
      fi
      PROVERS="$2"
      shift 2
      ;;
    --list-targets)
      LIST_ONLY=1
      shift
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

prepend_path_if_dir() {
  if [ -d "$1" ]; then
    PATH="$1:$PATH"
  fi
}

prepend_path_if_dir /opt/gnat-fsf/tools/gnatprove-x86_64-linux-15.1.0-1/bin
prepend_path_if_dir /opt/gnat-fsf/tools/gprbuild-x86_64-linux-25.0.0-1/bin
prepend_path_if_dir /opt/gnat-fsf/tools/gnat-x86_64-linux-15.1.0-2/bin
export PATH

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 127
  fi
}

readarray -t SPARK_TARGETS < <(find spark -maxdepth 1 -type f -name '*.gpr' | sort)

if [ "${#SPARK_TARGETS[@]}" -eq 0 ]; then
  echo "No SPARK targets found in spark/*.gpr" >&2
  exit 1
fi

if [ "$LIST_ONLY" -eq 1 ]; then
  printf '%s\n' "${SPARK_TARGETS[@]}"
  exit 0
fi

if [ -z "$ARTIFACTS_DIR" ]; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  ARTIFACTS_DIR="testnet/artifacts/gnatprove-all-${STAMP}"
fi

mkdir -p "$ARTIFACTS_DIR"
ARTIFACTS_DIR="$(cd "$ARTIFACTS_DIR" && pwd)"

reject_spark_proof_shortcuts() {
  local log="$ARTIFACTS_DIR/spark-proof-shortcut-scan.log"
  echo "==> spark-proof-shortcut-scan"
  if grep -RInE "pragma[[:space:]]+Assume|Assert[[:space:]]*\\([[:space:]]*False[[:space:]]*\\)" \
    spark/src spark/*.gpr >"$log" 2>&1; then
    echo "FAILED: SPARK proof sources must not use pragma Assume or Assert(False)." >&2
    echo "Log: ${log}" >&2
    cat "$log" >&2
    exit 1
  fi
  echo "No pragma Assume or Assert(False) statements found." >"$log"
  echo "ok: spark-proof-shortcut-scan (log: ${log})"
}

reject_problem_log() {
  local log="$1"
  if grep -Eiq '(^|[[:space:]])warning:|medium:|high:|not proved|unproved|cannot prove|might fail' "$log"; then
    echo "FAILED: proof log contains a warning or unproved obligation." >&2
    echo "Log: ${log}" >&2
    grep -Ein '(^|[[:space:]])warning:|medium:|high:|not proved|unproved|cannot prove|might fail' "$log" >&2 || true
    exit 1
  fi
}

run_gnatprove_target() {
  local target="$1"
  local safe_name
  safe_name="$(basename "$target" .gpr | tr '-' '_')"
  local log="$ARTIFACTS_DIR/${safe_name}.log"
  local command=(gnatprove -P "$target" --level="$LEVEL" --prover="$PROVERS" --report=fail)

  if [ "$(basename "$target")" != "cdlc_integer_proofs.gpr" ]; then
    command+=(--timeout="$TIMEOUT")
  fi

  echo "==> ${target}"
  set +e
  "${command[@]}" >"$log" 2>&1
  local status=$?
  set -e

  if [ "$status" -ne 0 ]; then
    echo "FAILED: ${target}" >&2
    echo "Log: ${log}" >&2
    tail -n 120 "$log" >&2 || true
    exit "$status"
  fi

  reject_problem_log "$log"
  echo "ok: ${target} (log: ${log})"
}

write_summary() {
  local status="$1"
  local summary="$ARTIFACTS_DIR/summary.json"
  local commit="unknown"
  commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  {
    printf '{\n'
    printf '  "name": "NITI all-target GNATprove sweep",\n'
    printf '  "status": "%s",\n' "$status"
    printf '  "gitCommit": "%s",\n' "$commit"
    printf '  "level": %s,\n' "$LEVEL"
    printf '  "timeout": %s,\n' "$TIMEOUT"
    printf '  "provers": "%s",\n' "$PROVERS"
    printf '  "targetCount": %s,\n' "${#SPARK_TARGETS[@]}"
    printf '  "artifactsDir": "%s"\n' "$ARTIFACTS_DIR"
    printf '}\n'
  } >"$summary"
  echo "Summary: ${summary}"
}

trap 'write_summary failed' ERR

require_tool gnatprove

echo "NITI all-target GNATprove sweep"
echo "Artifacts: ${ARTIFACTS_DIR}"
echo "Targets: ${#SPARK_TARGETS[@]}"

reject_spark_proof_shortcuts

for target in "${SPARK_TARGETS[@]}"; do
  run_gnatprove_target "$target"
done

trap - ERR
write_summary passed
echo "All SPARK proof targets passed."
