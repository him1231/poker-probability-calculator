# MAGI Auto Change Log

- Patch 001 applied: set `subagents.runTimeoutSeconds` = 0 in `~/.openclaw/openclaw.json` to align with SKILL.md defaults. Applied automatically per user instruction on 2026-03-03 15:32 HKT.
  - File changed: ~/.openclaw/openclaw.json
  - Change: 120 -> 0
  - Risk: Moderate
  - Commit: not available in system repo; change written directly to file and patch stored at `skills/magi/patches/patch-001-openclaw-runTimeoutSeconds.json.patch`
  - Revert: restore from patch or edit `~/.openclaw/openclaw.json` to previous value
