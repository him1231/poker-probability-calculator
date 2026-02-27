#!/usr/bin/env bash
set -euo pipefail
LOG_DIR=/home/ubuntu/.openclaw/workspace/logs
mkdir -p "$LOG_DIR"
LOG=$LOG_DIR/cron_time_check.log
FAILDIR=/home/ubuntu/.openclaw/cron
mkdir -p "$FAILDIR"
FAILCOUNT_FILE=$FAILDIR/cron_time_check.failcount
THRESHOLD_SECONDS=60
SOURCE="timeapi.io"
TIMESTAMP() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
echo "\n===== $(TIMESTAMP) UTC check run =====" >> "$LOG"
# fetch network UTC from timeapi.io
NET_JSON=$(curl -sS --max-time 10 "https://timeapi.io/api/Time/current/zone?timeZone=UTC" 2>&1) || { echo "curl failed: $NET_JSON" >> "$LOG"; exit 1; }
NET_DT=$(printf "%s" "$NET_JSON" | grep -oP '"dateTime"\s*:\s*"\K[^"]+' || true)
if [ -z "$NET_DT" ]; then
  echo "Failed to parse network dateTime from response: $NET_JSON" >> "$LOG"
  exit 1
fi
# Convert to epoch (UTC)
NET_EPOCH=$(date -u -d "$NET_DT" +%s 2>/dev/null) || { echo "date parse failed for $NET_DT" >> "$LOG"; exit 1; }
SYS_EPOCH=$(date -u +%s)
DIFF=$(( NET_EPOCH - SYS_EPOCH ))
if [ $DIFF -lt 0 ]; then DIFF=$(( -DIFF )); fi
echo "Source: $SOURCE" >> "$LOG"
echo "Network UTC (raw): $NET_DT -> $NET_EPOCH" >> "$LOG"
echo "System UTC epoch: $SYS_EPOCH" >> "$LOG"
echo "Absolute difference (s): $DIFF" >> "$LOG"
PERSISTENT=0
if [ $DIFF -gt $THRESHOLD_SECONDS ]; then
  echo "Difference > $THRESHOLD_SECONDSs, attempting corrective steps" >> "$LOG"
  echo "Running: sudo timedatectl set-ntp off" >> "$LOG"
  sudo timedatectl set-ntp off 2>&1 | sed 's/^/STDOUT: /' >> "$LOG" || true
  sleep 2
  echo "Running: sudo timedatectl set-ntp on" >> "$LOG"
  sudo timedatectl set-ntp on 2>&1 | sed 's/^/STDOUT: /' >> "$LOG" || true
  sleep 2
  # re-check network vs system UTC
  SYS_EPOCH_AFTER=$(date -u +%s)
  NET_JSON2=$(curl -sS --max-time 10 "https://timeapi.io/api/Time/current/zone?timeZone=UTC" 2>&1) || { echo "curl failed: $NET_JSON2" >> "$LOG"; }
  NET_DT2=$(printf "%s" "$NET_JSON2" | grep -oP '"dateTime"\s*:\s*"\K[^"]+' || true)
  NET_EPOCH2=$(date -u -d "$NET_DT2" +%s 2>/dev/null) || NET_EPOCH2=0
  DIFF2=$(( NET_EPOCH2 - SYS_EPOCH_AFTER ))
  if [ $DIFF2 -lt 0 ]; then DIFF2=$(( -DIFF2 )); fi
  echo "After corrective steps -- Network UTC: $NET_DT2 ($NET_EPOCH2), System UTC: $SYS_EPOCH_AFTER, Diff: $DIFF2" >> "$LOG"
  if [ $DIFF2 -gt $THRESHOLD_SECONDS ]; then
    echo "Difference still > threshold after corrective steps. Running openclaw doctor --fix" >> "$LOG"
    DOCTOR_OUT=$(openclaw doctor --fix 2>&1) || DOCTOR_RC=$?
    DOCTOR_RC=${DOCTOR_RC:-0}
    echo "openclaw doctor --fix exit_code=$DOCTOR_RC" >> "$LOG"
    echo "--- doctor output start ---" >> "$LOG"
    printf "%s\n" "$DOCTOR_OUT" >> "$LOG"
    echo "--- doctor output end ---" >> "$LOG"
    # consider unresolved if non-zero rc or contains keywords
    if [ $DOCTOR_RC -ne 0 ] || printf "%s" "$DOCTOR_OUT" | grep -qiE "unresolved|failed|error"; then
      PERSISTENT=1
      echo "Doctor reported unresolved issues or non-zero exit ($DOCTOR_RC)" >> "$LOG"
    else
      # resolved by doctor
      PERSISTENT=0
      echo "Doctor completed without detected unresolved issues." >> "$LOG"
    fi
  else
    # resolved by ntp toggling
    PERSISTENT=0
    echo "Corrective steps resolved the time difference." >> "$LOG"
  fi
fi
# Manage failcount file
if [ ! -f "$FAILCOUNT_FILE" ]; then echo 0 > "$FAILCOUNT_FILE"; fi
FAILCOUNT=$(cat "$FAILCOUNT_FILE" || echo 0)
if [ "$PERSISTENT" -eq 1 ]; then
  FAILCOUNT=$((FAILCOUNT + 1))
  echo "$FAILCOUNT" > "$FAILCOUNT_FILE"
  echo "Persistent failure count incremented to $FAILCOUNT" >> "$LOG"
  if [ "$FAILCOUNT" -ge 12 ]; then
    echo "Failure count reached threshold (12) -> will send Telegram notification and reset counter" >> "$LOG"
    # send telegram via openclaw message tool later (the runner will handle); mark flag file
    # We'll write a small notification file for the caller to pick up
    NOTIFY_FILE="$FAILDIR/cron_time_check.notify"
    cat > "$NOTIFY_FILE" <<EOF
FAILCOUNT_REACHED=12
TIMESTAMP=$(TIMESTAMP)
LOG_PATH=$LOG
EOF
    echo "Notify file written: $NOTIFY_FILE" >> "$LOG"
    echo 0 > "$FAILCOUNT_FILE"
  fi
else
  # issue resolved -> reset counter
  if [ "$FAILCOUNT" != "0" ]; then
    echo "Issue resolved; resetting failure counter from $FAILCOUNT to 0" >> "$LOG"
  fi
  echo 0 > "$FAILCOUNT_FILE"
fi
# Always append details to log (already done). Exit 0
exit 0
