#!/usr/bin/env bash
# Live local Anvil fixture for MarketLens batch verification
# No private keys, no signing, no broadcasting, no Monad
set -euo pipefail

ANVIL_PORT="${ANVIL_PORT:-8546}"
ANVIL_STATE_FILE="${ANVIL_STATE_FILE:-/tmp/marketlens_anvil_state.json}"
CONTRACT_ADDR="0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

find_anvil() {
  if anvil --version >/dev/null 2>&1; then echo "anvil"
  elif [ -x "$HOME/.foundry/bin/anvil" ]; then echo "$HOME/.foundry/bin/anvil"
  else echo ""; fi
}

start_anvil() {
  echo "[fixture] Starting Anvil on port $ANVIL_PORT..."
  ANVIL_BIN=$(find_anvil)
  if [ -z "$ANVIL_BIN" ]; then
    echo "[fixture] ERROR: anvil not found. Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
  fi

  if [ -f "$ANVIL_STATE_FILE" ]; then
    $ANVIL_BIN --port "$ANVIL_PORT" --chain-id 143 --load-state "$ANVIL_STATE_FILE" --silent &
  else
    $ANVIL_BIN --port "$ANVIL_PORT" --chain-id 143 --silent &
  fi
  ANVIL_PID=$!
  echo "[fixture] Anvil PID: $ANVIL_PID"

  for i in $(seq 1 30); do
    if curl -s -X POST -H "Content-Type: application/json"       -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'       "http://127.0.0.1:$ANVIL_PORT" >/dev/null 2>&1; then
      echo "[fixture] Anvil ready"
      echo "$ANVIL_PID" > /tmp/marketlens_anvil.pid
      return 0
    fi
    sleep 0.5
  done
  echo "[fixture] ERROR: Anvil failed"
  kill "$ANVIL_PID" 2>/dev/null || true
  exit 1
}

seed_fixture() {
  echo "[fixture] Seeding contract state..."
  node "$REPO_ROOT/packages/moss-prediction-market/scripts/seed-batch-fixture.mjs"     "http://127.0.0.1:$ANVIL_PORT" batch 2>&1 | sed 's/^/[fixture]   /'
  echo "[fixture] Fixture seeded"
}

save_state() {
  curl -s -X POST -H "Content-Type: application/json"     -d '{"jsonrpc":"2.0","id":1,"method":"anvil_dumpState","params":[]}'     "http://127.0.0.1:$ANVIL_PORT" > "$ANVIL_STATE_FILE"
  echo "[fixture] State saved"
}

stop_anvil() {
  if [ -f /tmp/marketlens_anvil.pid ]; then
    local pid=$(cat /tmp/marketlens_anvil.pid)
    if kill -0 "$pid" 2>/dev/null; then
      echo "[fixture] Stopping Anvil (PID $pid)..."
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f /tmp/marketlens_anvil.pid
  fi
  echo "[fixture] Stopped"
}

# Trap cleanup
cleanup() { stop_anvil; }
trap cleanup EXIT

case "${1:-start}" in
  start)
    if [ -f "$ANVIL_STATE_FILE" ]; then
      start_anvil
    else
      start_anvil
      seed_fixture
      save_state
    fi
    echo "ANVIL_RPC=http://127.0.0.1:$ANVIL_PORT"
    # Keep running until signal
    wait $ANVIL_PID
    ;;
  stop)  stop_anvil; trap - EXIT ;;
  restart) stop_anvil; trap - EXIT; sleep 1; exec "$0" start ;;
  reset)  stop_anvil; trap - EXIT; rm -f "$ANVIL_STATE_FILE"; exec "$0" start ;;
  *)
    echo "Usage: $0 {start|stop|restart|reset}"
    exit 1 ;;
esac
