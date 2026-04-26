#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_NODE=1
RUN_ADA=1
RUN_SPARK=1
SPARK_SUITE="core"
ARTIFACTS_DIR=""

usage() {
  cat <<'USAGE'
Usage: scripts/run-v0.1.sh [options]

Run the reproducible v0.1 verification gate:
  - TypeScript deterministic harness and cDLC smoke transcript
  - Ada finite cDLC manifest validator
  - SPARK core proof targets, with pragma Assume rejected

Options:
  --artifacts-dir DIR       Write logs and transcripts to DIR.
  --skip-node              Skip TypeScript build/tests/smoke transcript.
  --skip-ada               Skip Ada manifest validator build/check.
  --skip-spark             Skip SPARK proof targets.
  --all-spark-products     Run all SPARK product proof targets, not only core.
  -h, --help               Show this help.

The default command is intentionally strict. Missing required tools or any
failed invariant/proof returns a nonzero exit code.
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
    --skip-node)
      RUN_NODE=0
      shift
      ;;
    --skip-ada)
      RUN_ADA=0
      shift
      ;;
    --skip-spark)
      RUN_SPARK=0
      shift
      ;;
    --all-spark-products)
      SPARK_SUITE="all"
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

if [ -z "$ARTIFACTS_DIR" ]; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  ARTIFACTS_DIR="testnet/artifacts/v0.1-${STAMP}"
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

run_shell_step() {
  local name="$1"
  local command="$2"
  run_step "$name" bash -lc "$command"
}

reject_pragma_assume() {
  local log="$ARTIFACTS_DIR/spark-pragma-assume-scan.log"
  echo "==> spark-pragma-assume-scan"
  if grep -RIn "pragma[[:space:]]\+Assume" spark/src spark/*.gpr >"$log" 2>&1; then
    echo "FAILED: SPARK proof sources must not use pragma Assume." >&2
    echo "Log: ${log}" >&2
    cat "$log" >&2
    exit 1
  fi
  echo "No pragma Assume statements found." >"$log"
  echo "ok: spark-pragma-assume-scan (log: ${log})"
}

write_summary() {
  local status="$1"
  local summary="$ARTIFACTS_DIR/summary.json"
  local commit="unknown"
  commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  cat >"$summary" <<JSON
{
  "name": "NITI v0.1 verification",
  "status": "${status}",
  "gitCommit": "${commit}",
  "nodeHarness": $([ "$RUN_NODE" -eq 1 ] && echo true || echo false),
  "adaManifest": $([ "$RUN_ADA" -eq 1 ] && echo true || echo false),
  "sparkProofs": $([ "$RUN_SPARK" -eq 1 ] && echo true || echo false),
  "sparkSuite": "${SPARK_SUITE}",
  "artifactsDir": "${ARTIFACTS_DIR}"
}
JSON
  echo "Summary: ${summary}"
}

trap 'write_summary failed' ERR

echo "NITI v0.1 verifier"
echo "Artifacts: ${ARTIFACTS_DIR}"

if [ "$RUN_NODE" -eq 1 ]; then
  require_tool npm
  run_step node-build npm run build
  run_step node-tests npm test
  run_step parent-funding \
    npm run testnet -- cdlc:parent-funding --network testnet4 \
      --out "${ARTIFACTS_DIR}/parent-funding.json" \
      --raw-out "${ARTIFACTS_DIR}/parent-funding.hex"
  run_shell_step cdlc-smoke-transcript "npm run --silent test:cdlc-smoke > '${ARTIFACTS_DIR}/cdlc-smoke-transcript.json'"
  run_step l2-e2e-transcript \
    npm run test:l2-e2e-transcript -- \
      --input "${ARTIFACTS_DIR}/cdlc-smoke-transcript.json" \
      --out "${ARTIFACTS_DIR}/l2-e2e-transcript.json"
fi

if [ "$RUN_ADA" -eq 1 ]; then
  require_tool gprbuild
  run_step ada-build npm run ada:build
  run_step manifest-sample npm run testnet -- manifest:sample --network testnet4 --out "${ARTIFACTS_DIR}/sample-manifest.json"
  run_step manifest-validate npm run testnet -- manifest:validate --file "${ARTIFACTS_DIR}/sample-manifest.json"
fi

if [ "$RUN_SPARK" -eq 1 ]; then
  require_tool gnatprove
  reject_pragma_assume

  SPARK_TARGETS=(
    spark/cdlc_integer_proofs.gpr
    spark/cdlc_residue_proofs.gpr
    spark/cdlc_proofs.gpr
    spark/lightning_cdlc_proofs.gpr
  )

  if [ "$SPARK_SUITE" = "all" ]; then
    SPARK_TARGETS=(
      spark/cdlc_integer_proofs.gpr
      spark/cdlc_residue_proofs.gpr
      spark/cdlc_proofs.gpr
      spark/lightning_cdlc_proofs.gpr
      spark/btc_collateral_loan_proofs.gpr
      spark/covered_call_yield_note_proofs.gpr
      spark/synthetic_dollar_stable_exposure_proofs.gpr
      spark/perpetuals_rolling_forwards_proofs.gpr
      spark/btc_loan_lifecycle_proofs.gpr
      spark/collars_protective_notes_proofs.gpr
      spark/barrier_options_proofs.gpr
      spark/autocallables_proofs.gpr
      spark/accumulators_decumulators_proofs.gpr
      spark/cppi_proofs.gpr
      spark/variance_corridor_swaps_proofs.gpr
      spark/basis_calendar_rolls_proofs.gpr
      spark/parametric_insurance_proofs.gpr
    )
  fi

  for target in "${SPARK_TARGETS[@]}"; do
    safe_name="$(basename "$target" .gpr | tr '-' '_')"
    run_step "spark-${safe_name}" \
      gnatprove -P "$target" --level=4 --prover=cvc5,z3,altergo --timeout=20 --report=fail
  done
fi

trap - ERR
write_summary passed
echo "v0.1 verification passed."
