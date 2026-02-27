#!/usr/bin/env bash
set -euo pipefail

# Cron: time check and corrective actions
# Environment/Config
THRESHOLD_SECONDS=60
SOURCE="https://timeapi.io/api/Time/current/zone?timeZone=UTC"  # timeapi.io endpoint returning UTC
WORKDIR="/home/ubuntu/.openclaw/workspace/cron"
LOGFILE="/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log"
FAILCOUNT_FILE="$WORKDIR/cron_time_check.failcount"
MAX_FAILS=12
TELEGRAM_CHAT_ID="149218656"
# Optional: TELEGRAM_BOT_TOKEN env var. If set, the script will call Telegram API directly.
# Alternatively, if `openclaw` CLI supports messaging, script will attempt to use it as a fallback.

mkdir -p "$(dirname "$LOGFILE")" "$WORKDIR"
# Ensure failcount file exists
if [ ! -f "$FAILCOUNT_FILE" ]; then
  echo 0 > "$FAILCOUNT_FILE"
fi

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() {
  echo "[$(timestamp)] $*" | tee -a "$LOGFILE"
}

# Read system UTC (seconds since epoch) and network UTC from timeapi.io
get_system_utc() {
  date -u +%s
}

get_network_utc() {
  # Expect JSON from timeapi.io; try to extract a parsable UTC datetime or epoch if available.
  # timeapi.io returns JSON like: {"dateTime":"2026-02-27T06:52:00","date":"2026-02-27","time":"06:52:00","timeZone":"UTC","dayOfWeek":"Friday","dstActive":false}
  # We'll parse dateTime and convert to epoch.
  local resp
  if ! resp=$(curl -fsS --max-time 10 "$SOURCE"); then
    echo ""; return 1
  fi
  # Try to extract dateTime field
  local dt
  dt=$(echo "$resp" | sed -n 's/.*"dateTime"[[:space:]]*:[[:space:]]*"\([0-9:-TZ\.]*\)".*/\1/p' || true)
  if [ -z "$dt" ]; then
    # Fallback: try to extract a unix timestamp field if present
    dt=$(echo "$resp" | sed -n 's/.*"dateTimeEpoch"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' || true)
    if [ -n "$dt" ]; then
      echo "$dt"; return 0
    fi
    echo ""; return 2
  fi
  # Normalize dt to "YYYY-MM-DDTHH:MM:SS" (remove trailing Z if present)
  dt=${dt%Z}
  # Convert to epoch
  date -u -d "$dt" +%s 2>/dev/null || (echo ""; return 3)
}

# Main
log "Starting cron_time_check run"

sys_epoch=$(get_system_utc)
if [ -z "$sys_epoch" ]; then
  log "ERROR: could not determine system UTC time"
  exit 1
fi

net_epoch=""
if ! net_epoch=$(get_network_utc); then
  log "WARNING: failed to fetch or parse network time from $SOURCE"
  # Treat as transient failure; do not increment failcount nor notify. Exit non-zero so cron may report.
  exit 0
fi

if [ -z "$net_epoch" ]; then
  log "ERROR: network time empty after fetch"
  exit 0
fi

log "System epoch: $sys_epoch, Network epoch: $net_epoch"

diff_sec=$(( sys_epoch > net_epoch ? sys_epoch - net_epoch : net_epoch - sys_epoch ))
log "Absolute difference in seconds: $diff_sec (threshold: $THRESHOLD_SECONDS)"

if [ "$diff_sec" -le "$THRESHOLD_SECONDS" ]; then
  # Resolved — reset failcount if non-zero
  current_failcount=$(cat "$FAILCOUNT_FILE" 2>/dev/null || echo 0)
  if [ "$current_failcount" -ne 0 ]; then
    echo 0 > "$FAILCOUNT_FILE"
    log "Difference within threshold. Reset failcount from $current_failcount to 0. No external notifications."
  else
    log "Difference within threshold. Nothing to do."
  fi
  exit 0
fi

# Difference exceeds threshold — attempt corrective steps
log "Difference exceeds threshold. Attempting corrective steps: (a) toggle NTP off then on."

# 1) timedatectl set-ntp off; wait 2s; timedatectl set-ntp on; wait 2s; then re-check
if sudo timedatectl set-ntp off >/dev/null 2>&1; then
  log "Ran: timedatectl set-ntp off"
  sleep 2
else
  log "WARNING: timedatectl set-ntp off failed or requires permissions"
fi

if sudo timedatectl set-ntp on >/dev/null 2>&1; then
  log "Ran: timedatectl set-ntp on"
  sleep 2
else
  log "WARNING: timedatectl set-ntp on failed or requires permissions"
fi

# Re-fetch times
sys_epoch_after=$(get_system_utc)
net_epoch_after=""
if ! net_epoch_after=$(get_network_utc); then
  log "WARNING: failed to fetch network time on second attempt"
  # Proceed to run doctor anyway
fi

log "After corrective steps: system=$sys_epoch_after network=$net_epoch_after"

diff_after=0
if [ -n "$net_epoch_after" ]; then
  diff_after=$(( sys_epoch_after > net_epoch_after ? sys_epoch_after - net_epoch_after : net_epoch_after - sys_epoch_after ))
else
  diff_after=$diff_sec
fi
log "Absolute difference after corrective steps: $diff_after"

if [ "$diff_after" -le "$THRESHOLD_SECONDS" ]; then
  echo 0 > "$FAILCOUNT_FILE"
  log "Corrective steps succeeded (difference now $diff_after <= $THRESHOLD_SECONDS). Reset failcount to 0."
  exit 0
fi

# Still failing — run openclaw doctor --fix and capture output
log "Persistent difference after corrective steps. Running: openclaw doctor --fix"
doctor_out_file="/tmp/openclaw_doctor_output_$(date +%s).txt"
if openclaw doctor --fix >"$doctor_out_file" 2>&1; then
  log "openclaw doctor --fix exited with status 0"
else
  rc=$?
  log "openclaw doctor --fix exited with status $rc"
fi
# Append doctor output to main log
log "--- openclaw doctor --fix output start ---"
sed -n '1,2000p' "$doctor_out_file" | sed 's/^/[doctor] /' >> "$LOGFILE"
log "--- openclaw doctor --fix output end ---"

# Optionally inspect whether doctor reported unresolved issues. We'll treat non-zero exit as unresolved.
doctor_rc=0
if [ -f "$doctor_out_file" ]; then
  # If openclaw returned non-zero, assume unresolved. Try to capture from $rc variable if set
  if [ -n "${rc-}" ] && [ "$rc" -ne 0 ]; then
    doctor_rc=$rc
  else
    # Try to detect "UNRESOLVED" or "failed" in output (best-effort)
    if grep -Ei "fail|error|unresolv|unresolved|cannot" "$doctor_out_file" >/dev/null 2>&1; then
      doctor_rc=2
    fi
  fi
fi

if [ "$diff_after" -le "$THRESHOLD_SECONDS" ] && [ "$doctor_rc" -eq 0 ]; then
  # resolved
  echo 0 > "$FAILCOUNT_FILE"
  log "Problem resolved after doctor run. Reset failcount to 0. No external notification."
  exit 0
fi

# Problem persists — increment failcount and possibly notify
current_failcount=$(cat "$FAILCOUNT_FILE" 2>/dev/null || echo 0)
new_failcount=$((current_failcount + 1))
if [ "$new_failcount" -ge "$MAX_FAILS" ]; then
  # Send Telegram notification (if possible) and reset counter to 0
  log "Persistent failures reached threshold ($new_failcount >= $MAX_FAILS). Preparing to send Telegram notification."
  # Prepare concise message
  msg="CRON time check: persistent clock drift. system_epoch=$sys_epoch_after network_epoch=$net_epoch_after diff=$diff_after s. See $LOGFILE and $doctor_out_file for details."

  sent=1
  if [ -n "${TELEGRAM_BOT_TOKEN-}" ]; then
    # Attempt direct Telegram API send
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d chat_id="$TELEGRAM_CHAT_ID" -d text="$msg" >/dev/null 2>&1 && sent=0 || sent=1
  else
    # Try to use openclaw CLI as a fallback if available
    if command -v openclaw >/dev/null 2>&1; then
      # Best-effort: `openclaw message send --channel telegram --target <chat_id> --message "..."`
      if openclaw message send --channel telegram --target "$TELEGRAM_CHAT_ID" --message "$msg" >/dev/null 2>&1; then
        sent=0
      fi
    fi
  fi

  if [ "$sent" -eq 0 ]; then
    log "Telegram notification sent to chat_id=$TELEGRAM_CHAT_ID"
  else
    log "Failed to send Telegram notification: no TELEGRAM_BOT_TOKEN and openclaw CLI method failed or unavailable. Message would have been: $msg"
  fi
  echo 0 > "$FAILCOUNT_FILE"
  log "Reset failcount to 0 after attempting notification."
else
  echo "$new_failcount" > "$FAILCOUNT_FILE"
  log "Persistent failure (notified? no). Incremented failcount: $current_failcount -> $new_failcount"
fi

log "cron_time_check run complete"
exit 0
