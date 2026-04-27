#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATA_DIR="${NITI_REGTEST_DIR:-$ROOT_DIR/testnet/artifacts/regtest-node}"
RPC_HOST="${NITI_REGTEST_RPC_HOST:-127.0.0.1}"
RPC_PORT="${NITI_REGTEST_RPC_PORT:-18443}"
RPC_USER="${NITI_REGTEST_RPC_USER:-niti}"
RPC_PASSWORD="${NITI_REGTEST_RPC_PASSWORD:-niti}"
WALLET="${NITI_REGTEST_WALLET:-niti-regtest}"
BITCOIND="${BITCOIND:-bitcoind}"
BITCOIN_CLI="${BITCOIN_CLI:-bitcoin-cli}"

usage() {
  cat <<'USAGE'
Usage: scripts/regtest-env.sh <command> [args]

Commands:
  start                 Start bitcoind regtest, create/load wallet, mine 101 blocks.
  stop                  Stop the regtest node.
  info                  Print blockchain and wallet information.
  env                   Print .env-compatible Bitcoin RPC settings.
  mine [blocks]         Mine blocks to the harness wallet. Default: 1.
  fund-address ADDRESS [BTC]
                        Send BTC to ADDRESS and mine one confirmation.
                        Default amount: 0.001.
  reset                 Stop node and delete the regtest data directory.

Environment overrides:
  NITI_REGTEST_DIR, NITI_REGTEST_RPC_HOST, NITI_REGTEST_RPC_PORT,
  NITI_REGTEST_RPC_USER, NITI_REGTEST_RPC_PASSWORD, NITI_REGTEST_WALLET,
  BITCOIND, BITCOIN_CLI
USAGE
}

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 127
  fi
}

write_conf() {
  mkdir -p "$DATA_DIR"
  cat >"$DATA_DIR/bitcoin.conf" <<CONF
regtest=1
server=1
txindex=1
fallbackfee=0.00001000
rpcuser=${RPC_USER}
rpcpassword=${RPC_PASSWORD}

[regtest]
rpcport=${RPC_PORT}
rpcbind=${RPC_HOST}
rpcallowip=127.0.0.1
port=18444
CONF
}

cli() {
  "$BITCOIN_CLI" \
    -datadir="$DATA_DIR" \
    -regtest \
    -rpcconnect="$RPC_HOST" \
    -rpcport="$RPC_PORT" \
    -rpcuser="$RPC_USER" \
    -rpcpassword="$RPC_PASSWORD" \
    "$@"
}

wallet_cli() {
  cli -rpcwallet="$WALLET" "$@"
}

wait_for_rpc() {
  for _ in $(seq 1 60); do
    if cli getblockchaininfo >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "bitcoind RPC did not become ready." >&2
  exit 1
}

ensure_wallet() {
  if wallet_cli getwalletinfo >/dev/null 2>&1; then
    return 0
  fi

  if cli createwallet "$WALLET" false false "" false true true >/dev/null 2>&1; then
    return 0
  fi

  cli loadwallet "$WALLET" >/dev/null
}

mine_blocks() {
  local blocks="${1:-1}"
  local address="${2:-}"
  if [ -z "$address" ]; then
    address="$(wallet_cli getnewaddress niti-mining bech32m)"
  fi
  cli generatetoaddress "$blocks" "$address"
}

write_artifact() {
  mkdir -p "$ROOT_DIR/testnet/artifacts"
  cat >"$ROOT_DIR/testnet/artifacts/regtest-env.json" <<JSON
{
  "network": "regtest",
  "rpcUrl": "http://${RPC_HOST}:${RPC_PORT}",
  "rpcUser": "${RPC_USER}",
  "wallet": "${WALLET}",
  "dataDir": "${DATA_DIR}"
}
JSON
}

start() {
  require_tool "$BITCOIND"
  require_tool "$BITCOIN_CLI"
  write_conf

  if cli getblockchaininfo >/dev/null 2>&1; then
    echo "regtest bitcoind already running"
  else
    "$BITCOIND" -datadir="$DATA_DIR" -conf="$DATA_DIR/bitcoin.conf" -daemon
    wait_for_rpc
  fi

  ensure_wallet
  local height
  height="$(cli getblockcount)"
  if [ "$height" -lt 101 ]; then
    mine_blocks "$((101 - height))" >/dev/null
  fi

  write_artifact
  echo "regtest ready"
  echo "RPC: http://${RPC_HOST}:${RPC_PORT}"
  echo "Wallet: ${WALLET}"
  echo "Height: $(cli getblockcount)"
  echo "Artifact: testnet/artifacts/regtest-env.json"
}

stop() {
  if cli stop >/dev/null 2>&1; then
    echo "regtest stopped"
  else
    echo "regtest node was not running"
  fi
}

info() {
  cli getblockchaininfo
  wallet_cli getwalletinfo
}

print_env() {
  cat <<ENV
BITCOIN_RPC_URL=http://${RPC_HOST}:${RPC_PORT}
BITCOIN_RPC_USER=${RPC_USER}
BITCOIN_RPC_PASSWORD=${RPC_PASSWORD}
BITCOIN_RPC_WALLET=${WALLET}
ENV
}

fund_address() {
  if [ "$#" -lt 1 ]; then
    echo "fund-address requires ADDRESS" >&2
    exit 2
  fi
  local address="$1"
  local amount="${2:-0.001}"
  local txid
  txid="$(wallet_cli sendtoaddress "$address" "$amount")"
  mine_blocks 1 >/dev/null
  cat <<JSON
{
  "address": "${address}",
  "amountBtc": "${amount}",
  "txid": "${txid}",
  "confirmations": 1
}
JSON
}

command="${1:-}"
case "$command" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  info)
    info
    ;;
  env)
    print_env
    ;;
  mine)
    shift
    mine_blocks "${1:-1}"
    ;;
  fund-address)
    shift
    fund_address "$@"
    ;;
  reset)
    stop || true
    rm -rf "$DATA_DIR"
    echo "removed ${DATA_DIR}"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    usage >&2
    exit 2
    ;;
esac
