#!/usr/bin/env bash
# Minimal cron-ntp-agent entrypoint
# Reads the message (command) from stdin and executes it, streaming stdout/stderr.
set -euo pipefail
cmd="$(cat -)"
if [[ -z "$cmd" ]]; then
  echo "No command received on stdin" >&2
  exit 2
fi
# Execute command with shell to allow pipelines, redirects, etc.
# Capture exit code and print it at the end.
bash -ceu -o pipefail -c "$cmd"
exit_code=$?
echo "__AGENT_EXIT_CODE:${exit_code}" >&2
exit $exit_code
