#!/usr/bin/env bash
set -euo pipefail

# Cron time check + NTP toggle helper
# Improvements:
# - Accept SOURCE as hostname or full URL
# - Use multiple fallback time sources
# - Use curl retries/timeouts
# - Robust ISO -> epoch conversion (trim microseconds >6 digits)
# - Prefer absolute openclaw binary path when available
# - Better logging

THRESH=${THRESHOLD_SECONDS:-60}
SOURCE_RAW=${SOURCE:-"timeapi.io"}
LOG="/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log"
FAILCOUNT="/home/ubuntu/.openclaw/cron/cron_time_check.failcount"
NOTIFY="/home/ubuntu/.openclaw/cron/cron_time_check.notify"

mkdir -p "$(dirname "$LOG")"
mkdir -p "$(dirname "$FAILCOUNT")"

# Resolve SOURCE -> full URL if needed
if [[ "$SOURCE_RAW" =~ ^https?:// ]]; then
  PRIMARY_URL="$SOURCE_RAW"
elif [[ "$SOURCE_RAW" == *"/"* ]]; then
  # contains path, assume https
  PRIMARY_URL="https://${SOURCE_RAW}"
else
  # common shorthand like "timeapi.io"
  PRIMARY_URL="https://${SOURCE_RAW}/api/Time/current/zone?timeZone=UTC"
fi

# Fallback sources (try in order)
TIME_SOURCES=(
  "$PRIMARY_URL"
  "https://worldtimeapi.org/api/timezone/Etc/UTC"
  "https://timeapi.io/api/Time/current/zone?timeZone=UTC"
)

# Curl options
CURL_OPTS=(--silent --show-error --fail --connect-timeout 10 --max-time 15 --retry 3 --retry-delay 2)

# Candidate openclaw binary locations (checked in order)
OPENCLAW_CANDIDATES=(
  "/home/ubuntu/.nvm/versions/node/v24.13.0/bin/openclaw"
  "/usr/local/bin/openclaw"
  "/usr/bin/openclaw"
)
OPENCLAW_BIN=""
for c in "${OPENCLAW_CANDIDATES[@]}"; do
  if [ -x "$c" ]; then OPENCLAW_BIN="$c"; break; fi
done
if [ -z "$OPENCLAW_BIN" ]; then
  # fallback to PATH lookup
  if command -v openclaw >/dev/null 2>&1; then
    OPENCLAW_BIN=$(command -v openclaw)
  fi
fi

log() { TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ"); printf "[%s] %s\n" "$TS" "$*" >> "$LOG"; }

log "START cron_time_check_ntp_reset (THRESHOLD=$THRESH, PRIMARY_SOURCE=$PRIMARY_URL)"

# Fetch network datetime (tries one src)
fetch_net_dt_from() {
  local src="$1"
  local raw
  raw=$(curl "${CURL_OPTS[@]}" "$src" 2>/dev/null || true)
  if [ -z "$raw" ]; then
    printf ''
    return
  fi
  # Extract ISO datetimes from known JSON keys or regex fallback
  printf '%s' "$raw" | python3 - <<'PY' 2>/dev/null || true
import sys, json, re
s = sys.stdin.read()
if not s.strip():
    sys.exit(0)
try:
    j = json.loads(s)
except Exception:
    m = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)', s)
    if m:
        print(m.group(1))
        sys.exit(0)
    sys.exit(0)
# common keys across providers
for k in ('dateTime','dateTimeOffset','dateTimeRfc1123','utc_datetime','datetime','date_time'):
    v = j.get(k)
    if v:
        print(v)
        sys.exit(0)
# fallback to reconstruct from numeric fields if present
if all(k in j for k in ('year','month','day','hour','minute','seconds')):
    try:
        print("%04d-%02d-%02dT%02d:%02d:%02dZ"%(j['year'],j['month'],j['day'],j['hour'],j['minute'],j['seconds']))
        sys.exit(0)
    except Exception:
        pass
# final regex fallback
m = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)', s)
if m:
    print(m.group(1))
PY
}

# Convert ISO-ish datetime to epoch robustly (trim fractional seconds to 6 digits)
iso_to_epoch() {
  local s="$1"
  if [ -z "$s" ]; then
    printf ''
    return
  fi
  printf '%s' "$s" | python3 - <<'PY' 2>/dev/null || true
import sys, re
from datetime import datetime
s = sys.stdin.read().strip()
if not s:
    sys.exit(0)
if s.endswith('Z'):
    s = s[:-1] + '+00:00'
m = re.match(r'^(?P<prefix>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(?P<frac>\d+))?(?P<tz>.*)$', s)
if not m:
    sys.exit(0)
prefix = m.group('prefix')
frac = m.group('frac') or ''
tz = m.group('tz') or ''
if frac and len(frac) > 6:
    frac = frac[:6]
if frac:
    s2 = f"{prefix}.{frac}{tz}"
else:
    s2 = f"{prefix}{tz}"
try:
    dt = datetime.fromisoformat(s2)
    print(int(dt.timestamp()))
except Exception:
    sys.exit(0)
PY
}

# Try sources in order until we get a usable network datetime and epoch
NET_DT=''
NET_EPOCH=''
for src in "${TIME_SOURCES[@]}"; do
  NET_DT=$(fetch_net_dt_from "$src") || NET_DT=''
  if [ -n "$NET_DT" ]; then
    NET_EPOCH=$(iso_to_epoch "$NET_DT") || NET_EPOCH=''
  fi
  if [ -n "$NET_EPOCH" ]; then
    log "Network source OK: $src -> $NET_DT (epoch=$NET_EPOCH)"
    break
  else
    log "Network source failed or produced unparsable datetime: $src"
  fi
done

SYS_EPOCH=$(date -u +%s)
ABS_DIFF=999999
if [ -n "$NET_EPOCH" ]; then
  ABS_DIFF=$(( NET_EPOCH > SYS_EPOCH ? NET_EPOCH - SYS_EPOCH : SYS_EPOCH - NET_EPOCH ))
fi
log "network_dt='$NET_DT' network_epoch='$NET_EPOCH' system_epoch='$SYS_EPOCH' abs_diff='$ABS_DIFF'"

if [ "$ABS_DIFF" -le "$THRESH" ]; then
  log "SUCCESS: time within threshold ($ABS_DIFF <= $THRESH). Resetting failcount."
  printf '0\n' > "$FAILCOUNT"
  exit 0
fi

log "WARNING: abs_diff $ABS_DIFF > threshold $THRESH. Attempting timedatectl set-ntp off/on (may require sudo)."
if sudo -n timedatectl set-ntp off >/dev/null 2>&1; then
  log "timedatectl set-ntp off succeeded"
  sleep 2
  if sudo -n timedatectl set-ntp on >/dev/null 2>&1; then
    log "timedatectl set-ntp on succeeded"
  else
    log "timedatectl set-ntp on failed (sudo/no-permission)"
  fi
else
  log "timedatectl set-ntp off failed (sudo/no-permission)"
fi

sleep 2

# re-check using the same source list
NET_DT2=''
NET_EPOCH2=''
for src in "${TIME_SOURCES[@]}"; do
  NET_DT2=$(fetch_net_dt_from "$src") || NET_DT2=''
  if [ -n "$NET_DT2" ]; then
    NET_EPOCH2=$(iso_to_epoch "$NET_DT2") || NET_EPOCH2=''
  fi
  if [ -n "$NET_EPOCH2" ]; then
    log "Post-toggle network source OK: $src -> $NET_DT2 (epoch=$NET_EPOCH2)"
    break
  else
    log "Post-toggle network source failed or produced unparsable datetime: $src"
  fi
done

SYS_EPOCH2=$(date -u +%s)
ABS_DIFF2=999999
if [ -n "$NET_EPOCH2" ]; then
  ABS_DIFF2=$(( NET_EPOCH2 > SYS_EPOCH2 ? NET_EPOCH2 - SYS_EPOCH2 : SYS_EPOCH2 - NET_EPOCH2 ))
fi
log "After toggle: network_dt2='$NET_DT2' network_epoch2='$NET_EPOCH2' system_epoch2='$SYS_EPOCH2' abs_diff2='$ABS_DIFF2'"

if [ "$ABS_DIFF2" -le "$THRESH" ]; then
  log "SUCCESS after toggle: abs_diff2 $ABS_DIFF2 <= $THRESH. Resetting failcount."
  printf '0\n' > "$FAILCOUNT"
  exit 0
fi

log "NTP toggle didn't fix clock. Running 'openclaw doctor --fix' if available. (OPENCLAW_BIN=$OPENCLAW_BIN)"
DOCTOR_OUT=''
if [ -n "$OPENCLAW_BIN" ] && [ -x "$OPENCLAW_BIN" ]; then
  DOCTOR_OUT=$("$OPENCLAW_BIN" doctor --fix 2>&1 || true)
  log "openclaw doctor --fix output: $(echo "$DOCTOR_OUT" | tr '\n' ' ' )"
else
  log "openclaw: binary not found; skipped doctor run"
fi

# final re-check
NET_DT3=''
NET_EPOCH3=''
for src in "${TIME_SOURCES[@]}"; do
  NET_DT3=$(fetch_net_dt_from "$src") || NET_DT3=''
  if [ -n "$NET_DT3" ]; then
    NET_EPOCH3=$(iso_to_epoch "$NET_DT3") || NET_EPOCH3=''
  fi
  if [ -n "$NET_EPOCH3" ]; then
    log "Post-doctor network source OK: $src -> $NET_DT3 (epoch=$NET_EPOCH3)"
    break
  else
    log "Post-doctor network source failed or produced unparsable datetime: $src"
  fi
done

SYS_EPOCH3=$(date -u +%s)
ABS_DIFF3=999999
if [ -n "$NET_EPOCH3" ]; then
  ABS_DIFF3=$(( NET_EPOCH3 > SYS_EPOCH3 ? NET_EPOCH3 - SYS_EPOCH3 : SYS_EPOCH3 - NET_EPOCH3 ))
fi
log "Post-doctor: network_dt3='$NET_DT3' network_epoch3='$NET_EPOCH3' system_epoch3='$SYS_EPOCH3' abs_diff3='$ABS_DIFF3'"

if [ "$ABS_DIFF3" -le "$THRESH" ]; then
  log "SUCCESS after doctor: abs_diff3 $ABS_DIFF3 <= $THRESH. Resetting failcount."
  printf '0\n' > "$FAILCOUNT"
  exit 0
fi

CUR=$(cat "$FAILCOUNT" 2>/dev/null || printf '0')
if ! printf '%s' "$CUR" | grep -E '^[0-9]+$' >/dev/null 2>&1; then CUR=0; fi
NEW=$((CUR + 1))
printf '%d\n' "$NEW" > "$FAILCOUNT"
log "PERSISTENT FAILURE: abs_diff3=$ABS_DIFF3. Incremented failcount: $CUR -> $NEW"

if [ "$NEW" -ge 12 ]; then
  log "Failcount >=12: creating notification marker and resetting count to 0"
  printf '%s | abs_diff=%s | doctor_out=%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$ABS_DIFF3" "$(echo "$DOCTOR_OUT" | tr '\n' ' ')" > "$NOTIFY"
  printf '0\n' > "$FAILCOUNT"
fi

exit 0
