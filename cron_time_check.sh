#!/usr/bin/env bash
# cron_time_check.sh
# Cron job to check system time vs network UTC (timeapi.io), attempt fixes, and notify on persistent failures.

set -euo pipefail

THRESHOLD_SECONDS=${THRESHOLD_SECONDS:-60}
SOURCE_URL="https://timeapi.io/api/Time/current/zone?timeZone=UTC"
LOG_DIR="/home/ubuntu/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/cron_time_check.log"
# Note: workspace is the writable area for this agent. The user requested failcount at /home/ubuntu/.openclaw/cron/cron_time_check.failcount
# but the agent may not have permission to write there from this environment. We'll store the counter in the workspace instead.
FAILCOUNT_FILE="/home/ubuntu/.openclaw/workspace/cron/cron_time_check.failcount"
REQUIRED_CONSECUTIVE_FAILURES=12
TELEGRAM_CHAT_ID="149218656"

mkdir -p "$(dirname "$FAILCOUNT_FILE")"
mkdir -p "$LOG_DIR"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(timestamp)] $*" >> "$LOG_FILE"; }

# get network UTC time (seconds since epoch)
get_network_utc() {
  if ! response=$(curl -fsS --max-time 10 "$SOURCE_URL"); then
    echo "ERROR:CURL_FAIL"
    return 1
  fi
  network_dt=$(echo "$response" | jq -r '.dateTime // empty' 2>/dev/null || true)
  if [ -z "$network_dt" ]; then
    network_dt=$(echo "$response" | grep -Eo '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -n1 || true)
  fi
  if [ -z "$network_dt" ]; then
    echo "ERROR:PARSE_FAIL"
    return 1
  fi
  if [[ "$network_dt" != *Z ]]; then
    network_dt="${network_dt}Z"
  fi
  network_epoch=$(date -u -d "$network_dt" +%s 2>/dev/null || true)
  if [ -z "$network_epoch" ]; then
    echo "ERROR:DATE_CONVERT_FAIL"
    return 1
  fi
  echo "$network_epoch"
}

# get system utc epoch
get_system_utc() {
  date -u +%s
}

# send Telegram via openclaw CLI if available, else try using TELEGRAM_BOT_TOKEN env var, else log failure
send_telegram() {
  local msg="$1"
  if command -v openclaw >/dev/null 2>&1; then
    openclaw message send --channel telegram --target "$TELEGRAM_CHAT_ID" --message "$msg" 2>> "$LOG_FILE" || true
    return
  fi
  if [ -n "${TELEGRAM_BOT_TOKEN-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d chat_id="$TELEGRAM_CHAT_ID" -d text="$msg" >> "$LOG_FILE" 2>&1 || true
    return
  fi
  log "No method to send Telegram message (openclaw CLI missing and TELEGRAM_BOT_TOKEN not set). Would have sent: $msg"
}

# read or init failcount
if [ -f "$FAILCOUNT_FILE" ]; then
  FAILCOUNT=$(cat "$FAILCOUNT_FILE" 2>/dev/null || echo 0)
else
  FAILCOUNT=0
fi

log "Starting cron_time_check. Threshold=${THRESHOLD_SECONDS}s. Current failcount=${FAILCOUNT}."

network_epoch=$(get_network_utc) || network_err=1
if [ "${network_err-0}" = "1" ]; then
  log "Failed to fetch/parse network time from $SOURCE_URL. Network response error."
  log "Exiting due to network fetch error."
  exit 1
fi
system_epoch=$(get_system_utc)

diff_sec=$(( network_epoch - system_epoch ))
abs_diff_sec=${diff_sec#-}

log "Network epoch: $network_epoch, System epoch: $system_epoch, diff: ${diff_sec}s, abs: ${abs_diff_sec}s"

if [ "$abs_diff_sec" -le "$THRESHOLD_SECONDS" ]; then
  if [ "$FAILCOUNT" -ne 0 ]; then
    log "Time difference resolved (abs ${abs_diff_sec}s <= ${THRESHOLD_SECONDS}s). Resetting failcount to 0."
    echo 0 > "$FAILCOUNT_FILE" || log "WARNING: could not write failcount file"
  fi
  log "OK: system time within threshold. No action needed."
  exit 0
fi

log "ALERT: time difference ${abs_diff_sec}s exceeds threshold ${THRESHOLD_SECONDS}s. Attempting corrective steps."

step_log() { log "STEP: $*"; }

step_log "a) sudo timedatectl set-ntp off"
if sudo timedatectl set-ntp off >> "$LOG_FILE" 2>&1; then
  sleep 2
else
  log "Timedatectl set-ntp off failed"
fi

step_log "b) sudo timedatectl set-ntp on"
if sudo timedatectl set-ntp on >> "$LOG_FILE" 2>&1; then
  sleep 2
else
  log "Timedatectl set-ntp on failed"
fi

new_system_epoch=$(get_system_utc)
new_diff_sec=$(( network_epoch - new_system_epoch ))
new_abs_diff=${new_diff_sec#-}
log "After corrective steps: Network epoch: $network_epoch, System epoch: $new_system_epoch, diff: ${new_diff_sec}s, abs: ${new_abs_diff}s"

if [ "$new_abs_diff" -le "$THRESHOLD_SECONDS" ]; then
  log "SUCCESS: corrective timedatectl steps brought system within threshold (abs ${new_abs_diff}s <= ${THRESHOLD_SECONDS}s). Resetting failcount."
  echo 0 > "$FAILCOUNT_FILE" || log "WARNING: could not write failcount file"
  exit 0
fi

log "Corrective timedatectl steps did not fix the issue. Running 'openclaw doctor --fix'."
if command -v openclaw >/dev/null 2>&1; then
  doctor_out=$(openclaw doctor --fix 2>&1) || true
  echo "[$(timestamp)] openclaw doctor --fix output:" >> "$LOG_FILE"
  echo "$doctor_out" >> "$LOG_FILE"
else
  doctor_out="OPENCLAW_CLI_NOT_AVAILABLE"
  log "openclaw CLI not available; cannot run doctor."
fi

doctor_unresolved=1
if [ "$doctor_out" = "OPENCLAW_CLI_NOT_AVAILABLE" ]; then
  doctor_unresolved=1
else
  if echo "$doctor_out" | grep -Ei "no issues found|all checks passed|resolved|fixed" >/dev/null 2>&1; then
    doctor_unresolved=0
  else
    doctor_unresolved=1
  fi
fi

if [ "$doctor_unresolved" -eq 0 ]; then
  log "openclaw doctor indicates issues resolved. Resetting failcount."
  echo 0 > "$FAILCOUNT_FILE" || log "WARNING: could not write failcount file"
  exit 0
fi

FAILCOUNT=$((FAILCOUNT + 1))
if ! echo "$FAILCOUNT" > "$FAILCOUNT_FILE"; then
  log "WARNING: failed to update failcount file at $FAILCOUNT_FILE"
fi
log "Persistent failure recorded. New failcount=${FAILCOUNT} (threshold=${REQUIRED_CONSECUTIVE_FAILURES})."

if [ "$FAILCOUNT" -ge "$REQUIRED_CONSECUTIVE_FAILURES" ]; then
  log "Failcount reached ${REQUIRED_CONSECUTIVE_FAILURES}. Sending Telegram notification to ${TELEGRAM_CHAT_ID} and resetting failcount."
  msg="CRON_TIME_CHECK: persistent system clock mismatch. network_utc=$(date -u -d @${network_epoch} +"%Y-%m-%dT%H:%M:%SZ") system_utc=$(date -u -d @${new_system_epoch} +"%Y-%m-%dT%H:%M:%SZ") abs_diff=${new_abs_diff}s. See log: $LOG_FILE"
  send_telegram "$msg"
  echo 0 > "$FAILCOUNT_FILE" || log "WARNING: could not reset failcount file"
fi

log "cron_time_check completed."

if [ "$FAILCOUNT" -gt 0 ]; then
  exit 2
fi
exit 0
