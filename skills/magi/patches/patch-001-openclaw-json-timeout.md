# Patch 001 — openclaw.json subagents.runTimeoutSeconds alignment

**Status:** AWAITING HUMAN REVIEW  
**Risk:** Moderate — changes global subagent runtime cap  
**Round:** Auto-audit Round 8  
**Verdict:** 2/3 APPROVE (MELCHIOR + CASPER), BALTHASAR: CAVEATED → produce patch, not auto-apply  

## Problem

`SKILL.md` code example specifies `runTimeoutSeconds: 0` (unlimited, with per-node overrides in spawn calls).  
Current `openclaw.json` has `runTimeoutSeconds: 120`.

This means any MAGI node spawn WITHOUT an explicit `runTimeoutSeconds` override will be capped at 120s globally, even if the spawn call intends unlimited.

In practice, DEEP mode per-node timeout is 120s (matching the cap), so there is no immediate bug — but FAST mode nodes (30s) and FAST+ (45s) should terminate early to free resources, and the global cap doesn't help enforce that.

## Recommended Change

```json
// In openclaw.json, agents.defaults.subagents:
{
  "runTimeoutSeconds": 0
}
```

This matches SKILL.md intent: global = unlimited; each spawn call passes explicit timeout per mode.

## Caveats

- Verify no other skills rely on the 120s global cap as a safety bound
- After changing, confirm MAGI spawns include explicit `runTimeoutSeconds` per mode table in SKILL.md
- Low actual risk since MAGI always passes explicit timeouts via sessions_spawn

## Revert

```bash
# In openclaw.json, change runTimeoutSeconds back to 120
```
