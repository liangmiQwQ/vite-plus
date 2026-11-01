#!/usr/bin/env bash
set -euo pipefail

vp_bin="$1"

prewarm_node() {
  local version="$1"
  local TIMEFORMAT="Node.js ${version}: %3R seconds elapsed"
  printf '\nPreparing Node.js %s\n' "$version"
  time VP_NODE_VERSION="$version" "$vp_bin" node --version || return "$?"
}

# Development, CI, and the installer all use this pin.
prewarm_node "$(< .node-version)"
prewarm_node lts
prewarm_node latest

# Runtime installation is locked per resolved version. Bound parallel downloads
# so aliases can share an installation without serializing unrelated versions.
pids=()
wait_for_downloads() {
  local status=0
  for pid in "${pids[@]}"; do
    wait "$pid" || status=1
  done
  pids=()
  return "$status"
}

while IFS= read -r node_version; do
  prewarm_node "$node_version" &
  pids+=("$!")
  if [[ ${#pids[@]} -eq 4 ]]; then
    wait_for_downloads
  fi
done < crates/vp_cli_snapshots/tests/cli_snapshots/node-versions.txt
wait_for_downloads
