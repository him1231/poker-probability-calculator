cron_time_check - README

What this does

- cron_time_check.sh fetches network UTC time (tries timeapi.io, falls back to worldtimeapi.org)
- Compares system UTC time to network UTC time (seconds)
- If absolute difference > THRESHOLD_SECONDS (default 30):
  - Optionally runs `openclaw doctor --fix` when CONFIG_RUN_FIX=true
  - Writes diagnostics to /home/ubuntu/.openclaw/workspace/logs/cron_time_check.log
  - Optionally writes the full diagnostic to /home/ubuntu/.openclaw/workspace/logs/cron_time_check_telegram.txt when CONFIG_NOTIFY_TELEGRAM=true
  - Exits with code 2 when threshold exceeded

Files created

- /home/ubuntu/.openclaw/workspace/scripts/cron_time_check.sh  (executable)
- /home/ubuntu/.openclaw/workspace/scripts/README_cron_time_check.md

Configuration

You can configure behavior by exporting environment variables before running the script, or by setting them in the crontab line.

- THRESHOLD_SECONDS (default: 30)
- CONFIG_RUN_FIX (default: false)  - set to true or 1 to enable running `openclaw doctor --fix` when a discrepancy is found
- CONFIG_NOTIFY_TELEGRAM (default: false) - set to true or 1 to write a telegram-ready diagnostics file

Log locations

- Main log: /home/ubuntu/.openclaw/workspace/logs/cron_time_check.log
- Optional telegram diagnostic: /home/ubuntu/.openclaw/workspace/logs/cron_time_check_telegram.txt

Crontab entry

To run every 5 minutes, add this line to the crontab for the user that should run it (example uses absolute paths and exports any desired env vars):

*/5 * * * * THRESHOLD_SECONDS=30 CONFIG_RUN_FIX=false CONFIG_NOTIFY_TELEGRAM=false /home/ubuntu/.openclaw/workspace/scripts/cron_time_check.sh

If you rely on environment (PATH, openclaw binary), consider setting PATH in the crontab or use full path to openclaw.

Install

1. Ensure the script is executable (it already is):
   chmod +x /home/ubuntu/.openclaw/workspace/scripts/cron_time_check.sh
2. Edit the crontab: crontab -e
3. Add the line from "Crontab entry" above and save.

Uninstall

1. Remove the crontab entry (crontab -e) that runs the script.
2. Optionally remove script and logs:
   rm -f /home/ubuntu/.openclaw/workspace/scripts/cron_time_check.sh
   rm -f /home/ubuntu/.openclaw/workspace/scripts/README_cron_time_check.md
   rm -rf /home/ubuntu/.openclaw/workspace/logs

Notes

- The script is idempotent and safe to run frequently (designed for cron every 5 minutes).
- Exit code 2 indicates the threshold was exceeded; 0 indicates OK; 1 indicates a failure to fetch network time or other error.
