#!/usr/bin/env bash
set -euo pipefail
LOG="/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log"
mkdir -p "$(dirname "$LOG")"

echo "---- cron_time_check run: $(date -u +"%Y-%m-%dT%H:%M:%SZ") UTC ----" | tee -a "$LOG"

get_network_epoch() {
  # Fetch JSON and extract dateTime without depending on fragile here-doc quoting
  resp=$(curl -sS "https://timeapi.io/api/Time/current/zone?timeZone=UTC" ) || return 1
  dt=$(echo "$resp" | grep -o '"dateTime"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/"dateTime"[[:space:]]*:[[:space:]]*"([^"]*)"/\1/')
  if [ -z "$dt" ]; then echo "ERROR:no dateTime"; return 2; fi
  # convert to epoch (GNU date)
  epoch=$(date -u -d "$dt" +%s 2>/dev/null) || return 3
  echo "$epoch"
}

net_epoch=$(get_network_epoch 2>&1) || true
echo "network_epoch_raw: $net_epoch" | tee -a "$LOG"
if [[ "$net_epoch" == ERROR* ]] || ! [[ "$net_epoch" =~ ^[0-9]+$ ]]; then
  echo "Failed to get network time. Aborting." | tee -a "$LOG"
  exit 0
fi

sys_epoch=$(date -u +%s)
echo "system_epoch: $sys_epoch" | tee -a "$LOG"

# compute diff
diff=$(( net_epoch - sys_epoch ))
absdiff=${diff#-}
echo "difference_seconds: $diff (abs: $absdiff)" | tee -a "$LOG"

if [ "$absdiff" -le 60 ]; then
  echo "Time difference within threshold (<=60s). No action required." | tee -a "$LOG"
  exit 0
fi

# attempt timedatectl off/on
echo "Time difference >60s. Attempting timedatectl set-ntp off then on." | tee -a "$LOG"
cmd_out=$(timedatectl set-ntp false 2>&1) || true
echo "timedatectl_off_output: $cmd_out" | tee -a "$LOG"
sleep 2
cmd_out2=$(timedatectl set-ntp true 2>&1) || true
echo "timedatectl_on_output: $cmd_out2" | tee -a "$LOG"
sleep 2

# recheck
net_epoch2=$(get_network_epoch 2>&1) || true
echo "network_epoch_after: $net_epoch2" | tee -a "$LOG"
sys_epoch2=$(date -u +%s)
echo "system_epoch_after: $sys_epoch2" | tee -a "$LOG"
diff2=$(( net_epoch2 - sys_epoch2 ))
absdiff2=${diff2#-}
echo "difference_after_seconds: $diff2 (abs: $absdiff2)" | tee -a "$LOG"

if [ "$absdiff2" -le 60 ]; then
  echo "Timedatectl restart fixed the time (<=60s)." | tee -a "$LOG"
  exit 0
fi

# still bad -> run openclaw doctor --fix
echo "Time still off >60s after timedatectl. Running: openclaw doctor --fix" | tee -a "$LOG"
openclaw_out=$(openclaw doctor --fix 2>&1) || true
echo "openclaw_doctor_output: $openclaw_out" | tee -a "$LOG"

# final recheck
net_epoch3=$(get_network_epoch 2>&1) || true
sys_epoch3=$(date -u +%s)
echo "final_network_epoch: $net_epoch3" | tee -a "$LOG"
echo "final_system_epoch: $sys_epoch3" | tee -a "$LOG"
final_diff=$(( net_epoch3 - sys_epoch3 ))
final_abs=${final_diff#-}
echo "final_difference_seconds: $final_diff (abs: $final_abs)" | tee -a "$LOG"

if [ "$final_abs" -le 60 ]; then
  echo "Final check: time within threshold." | tee -a "$LOG"
else
  echo "Final check: time still NOT within threshold. Manual intervention may be required." | tee -a "$LOG"
fi

echo "---- end run: $(date -u +"%Y-%m-%dT%H:%M:%SZ") UTC ----" | tee -a "$LOG"
