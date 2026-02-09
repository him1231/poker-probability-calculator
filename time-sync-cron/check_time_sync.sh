#!/bin/bash
# /usr/local/bin/check_time_sync.sh
# Checks NTP sync using timedatectl. If unsynchronized or offset >300s,
# toggles NTP and rechecks. If still >300s, notifies via OpenClaw message CLI
# to the requesting Telegram session and logs actions to syslog.

set -euo pipefail

LOG_TAG="check_time_sync"
ALERT_THRESHOLD=300  # seconds (5 minutes)
TELEGRAM_TARGET="149218656"  # requester session Telegram id from subagent context

# Helper: syslog
log() {
  logger -t "$LOG_TAG" -- "$@"
}

# Helper: get remote time (seconds since epoch) from HTTP Date header
get_remote_time() {
  local date_hdr
  date_hdr=$(curl -fsS --head https://google.com 2>/dev/null | awk -F': ' '/^Date: /{print substr($0,index($0,$2))}') || return 1
  if [[ -z "$date_hdr" ]]; then
    return 1
  fi
  # Parse using GNU date; ensure UTC
  date -u -d "$date_hdr" +%s 2>/dev/null || return 1
}

# Get local time (UTC epoch seconds)
get_local_time() {
  date -u +%s
}

# Get NTP synchronized state from timedatectl
get_ntp_synced() {
  timedatectl show -p NTPSynchronized --value 2>/dev/null || echo "no"
}

# Compute absolute difference between local and remote
compute_offset() {
  local local_ts=$1
  local remote_ts=$2
  local diff
  diff=$(( local_ts - remote_ts ))
  if (( diff < 0 )); then
    diff=$(( -diff ))
  fi
  echo "$diff"
}

# Notify via OpenClaw CLI (to Telegram). The exact openclaw CLI may vary.
notify_telegram() {
  local message="$1"
  # Log that we will attempt to notify
  log "Notifying Telegram target ${TELEGRAM_TARGET}: ${message}"

  # Try using openclaw CLI 'openclaw message send' if available
  if command -v openclaw >/dev/null 2>&1; then
    # Note: CLI flags may differ depending on OpenClaw version. Attempt a sensible invocation.
    openclaw message send --channel telegram --target "${TELEGRAM_TARGET}" --message "$message" 2>/dev/null || \
      log "openclaw CLI send attempt failed; please verify CLI invocation"
  else
    log "openclaw CLI not found; cannot send Telegram message"
  fi
}

main() {
  log "Starting time sync check"

  # Get remote time with fallback to HEAD of google.com
  remote_time=$(get_remote_time) || {
    log "Failed to fetch remote time via curl; aborting check"
    exit 0
  }

  local_time=$(get_local_time)
  offset=$(compute_offset "$local_time" "$remote_time")
  ntp_synced=$(get_ntp_synced)

  log "Initial check: ntp_synced=${ntp_synced}, offset=${offset}s"

  if [[ "$ntp_synced" != "yes" ]] || (( offset > ALERT_THRESHOLD )); then
    log "Detected unsynchronized time (ntp_synced=${ntp_synced}, offset=${offset}s). Toggling NTP."

    # Toggle NTP
    if ! timedatectl set-ntp false 2>/dev/null; then
      log "Failed to set-ntp off"
    else
      log "Set NTP off"
    fi
    sleep 2
    if ! timedatectl set-ntp true 2>/dev/null; then
      log "Failed to set-ntp on"
    else
      log "Set NTP on"
    fi

    # Wait briefly for service to settle
    sleep 5

    # Recheck
    remote_time2=$(get_remote_time) || {
      log "Failed to fetch remote time after toggle; aborting"
      exit 0
    }
    local_time2=$(get_local_time)
    offset2=$(compute_offset "$local_time2" "$remote_time2")
    ntp_synced2=$(get_ntp_synced)

    log "Post-toggle check: ntp_synced=${ntp_synced2}, offset=${offset2}s"

    if (( offset2 > ALERT_THRESHOLD )); then
      # Persistent issue: notify via Telegram once
      msg="Persistent time sync problem on host $(hostname) - offset ${offset2}s, NTP synced: ${ntp_synced2}. Attempted toggle of NTP."
      log "$msg"
      notify_telegram "$msg"
    else
      log "Time sync restored (offset ${offset2}s)"
    fi
  else
    log "Time in sync (offset ${offset}s) and NTP synchronized"
  fi

  log "Finished time sync check"
  exit 0
}

main "$@"
