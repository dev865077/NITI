#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUNDLE="docs/evidence/public-signet/public-activation-evidence-bundle.json"
RUN_FULL_LOCAL_GATE=0

usage() {
  cat <<'USAGE'
Usage: scripts/demo-v0.1.sh [options]

Run the NITI v0.1 technical demo from committed public signet artifacts.

Options:
  --bundle FILE           Evidence bundle to verify and summarize.
  --full-local-gate       Also run npm run v0.1:verify.
  -h, --help              Show this help.

The default mode is read-only. It verifies the committed public signet bundle,
prints the parent -> bridge -> child trace, and states the release boundary.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --bundle)
      if [ "$#" -lt 2 ]; then
        echo "--bundle requires a file path" >&2
        exit 2
      fi
      BUNDLE="$2"
      shift 2
      ;;
    --full-local-gate)
      RUN_FULL_LOCAL_GATE=1
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

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 127
  fi
}

require_file() {
  if [ ! -f "$1" ]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

require_tool npm
require_tool jq
require_file "$BUNDLE"

echo "NITI v0.1 technical demo"
echo "Evidence bundle: $BUNDLE"
echo

echo "==> 1. Verify public signet evidence bundle"
npm run test:evidence-bundle -- --bundle "$BUNDLE"
echo

echo "==> 2. Check boolean evidence gates"
jq -e '.checks | to_entries | all(.value == true)' "$BUNDLE" >/dev/null
jq -r '.checks | to_entries[] | "ok: \(.key)=\(.value)"' "$BUNDLE"
echo

echo "==> 3. Parent -> bridge -> child trace"
jq -r '
  "network: \(.network)",
  "bitcoin_core: \(.bitcoinCore.subversion) blocks=\(.bitcoinCore.blocks)",
  "funding_outpoint: \(.activationPath.parentFunding.txid):\(.activationPath.parentFunding.vout) value_sat=\(.activationPath.parentFunding.valueSat)",
  "oracle_event: \(.oracle.eventId)",
  "activating_outcome: \(.oracle.activatingOutcome)",
  "wrong_outcome: \(.oracle.wrongOutcome)",
  "activating_attestation_point: \(.oracle.activatingAttestationPointCompressedHex)",
  "parent_cet: \(.activationPath.parentCet.txid) block=\(.activationPath.parentCet.confirmation.blockHeight)",
  "bridge_pre_resolution_signature_valid: \(.activationPath.bridge.adaptor.preResolutionSignatureVerifies)",
  "bridge_completed_signature_valid: \(.activationPath.bridge.completion.completedSignatureVerifies)",
  "bridge_wrong_scalar_rejected: \(.activationPath.bridge.wrongScalar.rejected)",
  "bridge_tx: \(.activationPath.bridge.txid) block=\(.activationPath.bridge.confirmation.blockHeight)",
  "child_funding_outpoint: \(.activationPath.bridge.txid):\(.activationPath.bridge.output.vout) value_sat=\(.activationPath.bridge.output.valueSat)",
  "child_prepared_cet_input: \(.activationPath.childPreparedCet.input.txid):\(.activationPath.childPreparedCet.input.vout)",
  "child_refund_input: \(.activationPath.childRefund.input.txid):\(.activationPath.childRefund.input.vout)",
  "child_refund_early_accept: \(.activationPath.childRefund.earlyMempoolAccept.allowed) reason=\(.activationPath.childRefund.earlyMempoolAccept["reject-reason"])"
' "$BUNDLE"
echo

echo "==> 4. Evidence links"
jq -r '
  "funding_tx: https://mempool.space/signet/tx/\(.activationPath.parentFunding.txid)",
  "parent_cet_tx: https://mempool.space/signet/tx/\(.activationPath.parentCet.txid)",
  "bridge_tx: https://mempool.space/signet/tx/\(.activationPath.bridge.txid)",
  "raw_parent_cet: \(.activationPath.parentCet.rawTx.path)",
  "raw_bridge: \(.activationPath.bridge.rawTx.path)",
  "raw_child_prepared_cet: \(.activationPath.childPreparedCet.rawTx.path)",
  "raw_child_refund: \(.activationPath.childRefund.rawTx.path)"
' "$BUNDLE"
echo

if [ "$RUN_FULL_LOCAL_GATE" -eq 1 ]; then
  echo "==> 5. Full local v0.1 gate"
  npm run v0.1:verify
  echo
fi

cat <<'BOUNDARY'
Demo boundary:
- This is public signet technical-existence evidence for one cDLC activation path.
- It is not mainnet readiness, production custody software, a production oracle,
  a stablecoin, a solvency guarantee, or completed Lightning support.
- Economic stress remains a separate Layer 5 release gate.
BOUNDARY
