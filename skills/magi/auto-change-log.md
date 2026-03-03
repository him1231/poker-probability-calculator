# MAGI Auto-Change Log

*Maintained by the MAGI autonomous audit process. Each entry records an applied change with decision metadata.*

---

## Format

| Field | Description |
|-------|-------------|
| Round | Audit round number |
| Date | Applied date |
| File | File modified |
| Summary | One-line change description |
| Vote | MEL/BAL/CAS tally |
| Verdict | APPROVE / CAVEATED / REJECT |
| Risk | Low / Moderate / High |
| Commit | Git commit hash (filled after commit) |

---

## Applied Changes

### Round 1 — 2026-03-03
| Field | Value |
|-------|-------|
| File | `references/templates.md` |
| Summary | Add `CAVEATED` to MELCHIOR-1 VERDICT schema line (was missing, causing schema mismatch with other nodes) |
| Vote | 3-0 APPROVE (MEL/BAL/CAS) |
| Risk | Low (documentation/schema fix) |
| Commit | (see git log) |

### Round 2 — 2026-03-03
| Field | Value |
|-------|-------|
| File | `AUDIT_LOG.md` |
| Summary | Add Cycle 3 / v3.0 section recording all 12 v3.0 enhancement rounds (announce-chain through model guard) |
| Vote | 3-0 APPROVE (MEL/BAL/CAS) |
| Risk | Low (documentation) |
| Commit | (see git log) |

### Round 3 — 2026-03-03
| Field | Value |
|-------|-------|
| File | `FUTURE_IMPROVEMENTS.md` |
| Summary | Move 12 v3.0 items from untracked to ✅ Completed table with round references |
| Vote | 3-0 APPROVE (MEL/BAL/CAS) |
| Risk | Low (documentation) |
| Commit | (see git log) |

---

## Deferred / Patched (Requires Human Review)

### Patch 001 — 2026-03-03
| Field | Value |
|-------|-------|
| File | `openclaw.json` |
| Summary | Align `agents.defaults.subagents.runTimeoutSeconds` from `120` to `0` to match SKILL.md intent |
| Vote | 2/3 APPROVE (MEL+CAS), BALTHASAR: CAVEATED |
| Risk | Moderate |
| Patch | `patches/patch-001-openclaw-json-timeout.md` |
| Status | ⏳ AWAITING HUMAN REVIEW |

---

## Deferred (No Change)

| Round | Topic | Reason |
|-------|-------|--------|
| Round 3 | State machine VALIDATING order | Correct as-is |
| Round 5 | CASPER/BALTHASAR VERDICT lines | Already include CAVEATED |
| Round 10 | FAST mode timeout vs global cap | Implied by per-node overrides; no change needed |

---

*Last updated: 2026-03-03*
