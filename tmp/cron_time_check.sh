#!/usr/bin/env bash
LOG=/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log
mkdir -p "$(dirname "$LOG")"
THRESHOLD=60
NET_JSON=$(curl -sS "https://timeapi.io/api/Time/current/zone?timeZone=UTC")
NET_DT=$(printf "%s" "$NET_JSON" | jq -r .dateTime)
NET_TS=$(date -u -d "$NET_DT" +%s)
SYS_TS=$(date -u +%s)
NOW_HUMAN=$(date -u --iso-8601=seconds)
DIFF=$(( NET_TS>SYS_TS ? NET_TS-SYS_TS : SYS_TS-NET_TS ))
{
  echo "---"
  echo "Run at: $(date -u --iso-8601=seconds)"
  echo "Network UTC (timeapi.io): $NET_JSON"
  echo "Network dateTime: $NET_DT"
  echo "Network epoch: $NET_TS"
  echo "System UTC epoch: $SYS_TS"
  echo "System human: $NOW_HUMAN"
  echo "Absolute difference (s): $DIFF"
} >> "$LOG"

STATUS=OK
if [ "$DIFF" -gt "$THRESHOLD" ]; then
  echo "Difference $DIFF > $THRESHOLD - attempting corrective steps" >> "$LOG"
  echo "Running: sudo timedatectl set-ntp off" >> "$LOG"
  sudo timedatectl set-ntp off 2>&1 >> "$LOG" || true
  sleep 2
  echo "Running: sudo timedatectl set-ntp on" >> "$LOG"
  sudo timedatectl set-ntp on 2>&1 >> "$LOG" || true
  sleep 2
  SYS_TS2=$(date -u +%s)
  DIFF2=$(( NET_TS>SYS_TS2 ? NET_TS-SYS_TS2 : SYS_TS2-NET_TS ))
  echo "Post-correction system epoch: $SYS_TS2" >> "$LOG"
  echo "Post-correction absolute difference (s): $DIFF2" >> "$LOG"
  if [ "$DIFF2" -gt "$THRESHOLD" ]; then
    echo "Difference still > threshold after timedatectl steps. Running: openclaw doctor --fix" >> "$LOG"
    openclaw doctor --fix >> "$LOG" 2>&1 || echo "openclaw doctor exited nonzero" >> "$LOG"
    echo "Captured 'openclaw doctor --fix' output appended above." >> "$LOG"
    SYS_TS3=$(date -u +%s)
    DIFF3=$(( NET_TS>SYS_TS3 ? NET_TS-SYS_TS3 : SYS_TS3-NET_TS ))
    echo "Post-doctor system epoch: $SYS_TS3" >> "$LOG"
    echo "Post-doctor absolute difference (s): $DIFF3" >> "$LOG"
    if [ "$DIFF3" -gt "$THRESHOLD" ]; then
      echo "PERSISTENT_PROBLEM" >> "$LOG"
      STATUS=PERSISTENT
    else
      echo "Resolved after openclaw doctor --fix" >> "$LOG"
      STATUS=RESOLVED
    fi
  else
    echo "Resolved after toggling NTP" >> "$LOG"
    STATUS=RESOLVED
  fi
else
  echo "Difference within threshold; no action needed." >> "$LOG"
  STATUS=OK
fi
# Print concise status
printf "STATUS=%s\nDIFF=%s\n" "$STATUS" "$DIFF"
