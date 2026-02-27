---
name: magi
description: >
  MAGI system — multi-subagent decision making inspired by Evangelion's MAGI supercomputer.
  Spawns three independent AI nodes (MELCHIOR: Scientist, BALTHASAR: Mother, CASPER: Woman)
  that deliberate and vote by majority rule with graded verdicts, two-stage deliberation,
  crisis protocols, and domain safety guardrails. Use when the user wants a complex decision
  analyzed through three genuinely distinct perspectives. Triggers: "用MAGI決定", "MAGI投票",
  "magi decision", "三台電腦", "多角度分析投票", "MAGI審議", or any request for structured
  multi-perspective deliberation on a complex or high-stakes question.
---

# MAGI System

Three nodes. One covenant between logic, care, and human truth.

## File Map

| File | Contents |
|------|----------|
| `references/personas.md` | Persona architecture, heuristics, risk tolerance, values, linguistic fingerprints, Naoko echoes |
| `references/templates.md` | Production-ready prompt templates for MELCHIOR-1, BALTHASAR-2, CASPER-3 |
| `references/protocols.md` | All operational protocols: modes, deliberation, verdicts, confidence, deadlock, failure handling, domain guards, meta-review, report format, anti-patterns |

**Load order:** Read this file first. Load `references/protocols.md` for workflow. Load `references/personas.md` + `references/templates.md` when spawning nodes.

---

## Quick Architecture

```
User question
     │
     ▼
[Orchestrator: main session]
     │
     ├── Detect mode (FAST / DEEP) ──────────────────────────────┐
     │                                                            │
     ▼                                                            ▼
[Stage 1: spawn 3 nodes in parallel]               FAST: skip Stage 2
MELCHIOR-1 | BALTHASAR-2 | CASPER-3                simplified report
     │
     ▼
[Collect verdicts + confidence + caveats]
     │
     ▼ (DEEP only)
[Stage 2: anonymized summary exchange → each node revises once]
     │
     ▼
[Tally: weighted votes → APPROVE / REJECT / DEADLOCK]
     │
     ├── DEADLOCK? → Crisis Protocol
     │
     ▼
[Generate report: per-node sections + Tension Summary + Synthesis]
```

---

## Verdict System

| Verdict | Weight | Meaning |
|---------|--------|---------|
| APPROVE | +1 | Clear support |
| CAVEATED | +0.5 | Conditional — must include structured caveats |
| REJECT | -1 | Clear opposition |
| ABSTAIN | 0 | Insufficient information |

**Majority rule:** ≥2 nodes align → decision passes. High-risk domains require 3/3 supermajority.

---

## Workflow (DEEP mode — default)

1. **Frame** the question clearly; include all relevant context
2. **Detect mode** — see `references/protocols.md §1`
3. **Stage 1:** spawn MELCHIOR-1, BALTHASAR-2, CASPER-3 in parallel using templates in `references/templates.md`; nodes must NOT see each other's output
4. **Validate** responses; attempt auto-repair if malformed; log both
5. **Stage 2 (DEEP):** send anonymized digest to each node; each may revise once; record pre- and post-revision votes
6. **Tally** weighted votes; compute system confidence (conservative: lowest among majority voters)
7. **Check for deadlock** → trigger Crisis Protocol if detected (see `references/protocols.md §5`)
8. **Check domain** → apply safety guardrails for legal/medical/financial/security/mental-health (see `references/protocols.md §7`)
9. **Generate report** — per-node sections + Tension Summary + Synthesis (see `references/protocols.md §9`)
10. **Handle failures** as per `references/protocols.md §6`

---

## Operating Principles

- Always spawn all 3 nodes — independence is essential; never let nodes see each other before Stage 1 vote
- Deadlock is a crisis, not a minor inconvenience — treat it with appropriate weight
- Dissent is information — minority votes must appear prominently in the report
- CASPER's voice is not optional — emotional truth has standing alongside logic
- MAGI is advisory — final authority always returns to accountable humans
- For high-stakes or high-risk domains, require human-in-the-loop before any action

---

## When NOT to Use MAGI

**Use a simpler approach instead for:**
- Trivial factual lookups or objectively correct answers
- Real-time data questions MAGI cannot access
- Purely personal taste/preference (MAGI produces bland compromises)
- Latency < 10s requirements

**MAGI must decline for:**
- Life-and-death medical decisions for specific individuals
- Legal guilt/sentencing determinations
- Questions about a person's identity, bodily autonomy, or consent
- Violent, illegal, or manipulation-designed requests

See `references/protocols.md §10` for complete anti-patterns list.

---

## Meta-Review

To challenge a previous MAGI ruling: trigger Meta-Review mode with explicit reason + new evidence.
Max 2 reviews per ruling. Requires human authorization. See `references/protocols.md §8`.
