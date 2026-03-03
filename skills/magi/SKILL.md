---
name: magi
description: >
  MAGI system — multi-subagent decision making inspired by Evangelion's MAGI supercomputer.
  Spawns three independent AI nodes (MELCHIOR: Scientist, BALTHASAR: Mother, CASPER: Woman)
  that deliberate and vote by majority rule with graded verdicts, two-stage deliberation,
  crisis protocols, and domain safety guardrails. Use when the user wants a complex decision
  analyzed through three genuinely distinct perspectives.
  Triggers: "用MAGI決定", "MAGI投票", "magi decision", "三台電腦", "多角度分析投票", "MAGI審議",
  "MAGI分析", "magi analyze", "magi vote", "三電腦審議", "マギ決定", "마기 결정", "用三個節點",
  or any request for structured multi-perspective deliberation on a complex or high-stakes question.
---

# MAGI System — v3.0

Three nodes. One covenant between logic, care, and human truth.

## File Map

| File | Contents |
|------|----------|
| `references/personas.md` | Persona architecture, heuristics, risk tolerance, values, linguistic fingerprints, Naoko echoes |
| `references/templates.md` | Production-ready prompt templates for MELCHIOR-1, BALTHASAR-2, CASPER-3 |
| `references/protocols.md` | All operational protocols: modes, deliberation, verdicts, confidence, deadlock, failure handling, domain guards, meta-review, report format, anti-patterns |

**Load order:** Read this file first. Load `references/protocols.md` for workflow. Load `references/personas.md` + `references/templates.md` when spawning nodes.

---

## Model Guard (Required)

MAGI orchestration requires a capable model to reliably manage state, handle partial failures, tally votes, and generate structured reports.

**Before running any MAGI deliberation, check the current session model:**

| Model tier | Action |
|---|---|
| Full models (claude-sonnet, gpt-4o, gpt-5, o3, etc.) | Proceed normally |
| Mini / lite models (gpt-5-mini, gpt-4o-mini, etc.) | **Spawn MAGI as a subagent with `model: "github-copilot/claude-sonnet-4.6"`** |

**Implementation:**
```
If current model is a mini/lite variant:
  → Use sessions_spawn with model="github-copilot/claude-sonnet-4.6" and task=<full MAGI request>
  → Do NOT attempt to run MAGI orchestration directly in mini session
Else:
  → Run MAGI orchestration in current session
```

**Rationale:** Lightweight models can recognize MAGI structure but lack reliable orchestration capacity — they lose state across multi-node flows, expose internal process to users, and produce inconsistent tally logic. Routing to a capable model ensures deliberation quality.

---



MAGI runs natively on OpenClaw's subagent infrastructure. Before first use, ensure:

```json5
// openclaw.json — add under agents.defaults
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2,          // required for orchestrator pattern
        maxChildrenPerAgent: 5,
        maxConcurrent: 8,
        runTimeoutSeconds: 0       // per-node overrides set in spawn call
      }
    }
  }
}
```

### Announce-Chain Pattern (v3.0)

**Spawn nodes as non-blocking subagents.** Do NOT poll `sessions_history` in a loop.
Each node auto-announces its result back to the orchestrator upon completion.

```
sessions_spawn(MELCHIOR) ──┐
sessions_spawn(BALTHASAR) ─┤── parallel, non-blocking
sessions_spawn(CASPER) ────┘
        │
        │ (each announces back automatically)
        ▼
Orchestrator collects 3 announces → tally → Stage 2 if DEEP
```

**Watchdog fallback:** If any node has not announced within `runTimeoutSeconds + 15s`,
fall back to `sessions_history` to retrieve result. Log the fallback as a node warning.

### Per-Node Model Configuration

Each node SHOULD be spawned with the most suitable model for its role:
- **MELCHIOR-1:** Logic-heavy model preferred (e.g. gpt-5, o3)
- **BALTHASAR-2:** Balanced model (e.g. claude-sonnet, gpt-4o)
- **CASPER-3:** Expressive/nuanced model preferred (e.g. claude-sonnet-4.6)
- **Fallback:** If preferred model unavailable, inherit orchestrator model; log warning

### Node Timeout Standards

| Mode | Per-node timeout | Stage 2 timeout |
|------|-----------------|-----------------|
| FAST | 30s | N/A |
| FAST+ | 45s | 20s |
| DEEP | 120s | 60s |

---

## Quick Architecture

```
User question
     │
     ▼
[Orchestrator: main session]
     │
     ├── Detect mode (FAST / FAST+ / DEEP) ─────────────────────┐
     │                                                           │
     ▼                                                    FAST: skip Stage 2
[Stage 1: spawn 3 nodes in parallel via sessions_spawn]  simplified report
  MELCHIOR-1 | BALTHASAR-2 | CASPER-3                    FAST+: Stage 2 lite
  (non-blocking, announce-chain, isolated sessions)
     │
     │ collect via announce (watchdog fallback: sessions_history)
     ▼
[Validate + auto-repair malformed outputs]
     │
     ▼ (DEEP / FAST+)
[Stage 2: orchestrator sends anonymized digest → each node revises once]
     │
     ▼
[Tally: weighted votes → APPROVE / REJECT / DEADLOCK]
     │
     ├── DEADLOCK? → Crisis Protocol (default: Option D + C)
     │
     ▼
[Generate report]
```

### State Machine (explicit)

```
INIT
  └─► STAGE1_SPAWNING    (spawn all 3 nodes)
        └─► STAGE1_COLLECTING  (await announces / watchdog)
              └─► VALIDATING   (schema check, auto-repair)
                    ├─► STAGE2_DIGEST (DEEP/FAST+ only)
                    │     └─► STAGE2_COLLECTING
                    └─► TALLYING
                          ├─► DEADLOCK → CRISIS
                          └─► REPORTING → DONE
```

---

## Operating Modes

| Mode | Trigger | Stage 2 | Tension Summary | Report |
|------|---------|---------|-----------------|--------|
| FAST | Speed request / simple / time ≤10s | No | No | Condensed |
| FAST+ | Medium complexity / user wants more than FAST | Lite (no per-node deep revision) | No | Standard |
| DEEP | Default / complex / high-stakes / ambiguous | Full | Yes | Full |

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

## Confidence (Simplified — v3.0)

Replace complex Platt-scaling formula with 3-tier + provenance:

| Label | Range | Meaning |
|-------|-------|---------|
| High | 76–100 | Strong evidence base, low uncertainty |
| Medium | 41–75 | Reasonable basis, notable unknowns |
| Low | 0–40 | Significant gaps, treat with caution |

**System confidence = lowest confidence among majority-aligned voters.**
Always pair with: provenance note + top 2 failure modes + recommended next step.
Low + high-stakes → block automated execution, require human confirmation.

**Node-specific confidence expression:**
- MELCHIOR: numeric range (e.g. "~82%") + tier label
- BALTHASAR: tier label + protective action ("Confidence: Medium — recommend staged rollout")
- CASPER: metaphor register — Compass (steady/foggy/spinning) or Lamp (bright/dim/flickering)

---

## Workflow (DEEP mode — default)

1. **Frame** the question clearly; include all relevant context
2. **Detect mode** — auto-detect or user override (FAST / FAST+ / DEEP)
3. **Stage 1:** spawn MELCHIOR-1, BALTHASAR-2, CASPER-3 via `sessions_spawn` (parallel, non-blocking, isolated); include `runTimeoutSeconds` per mode table above
4. **Collect** via announce-chain; apply watchdog fallback if needed
5. **Validate** responses; attempt auto-repair if malformed; log both
6. **Stage 2 (DEEP/FAST+):** send anonymized digest to each node; each may revise once; record pre- and post-revision votes
7. **Tally** weighted votes; compute system confidence (conservative method)
8. **Check for deadlock** → trigger Crisis Protocol if detected; default posture = Option D (precautionary) + Option C (escalate)
9. **Check domain** → apply safety guardrails for high-risk domains (require 3/3 supermajority + human-in-loop)
10. **Generate report** — per-node sections + Tension Summary (DEEP) + Synthesis
11. **Handle failures** — retry once; replacement node if needed; log all incidents

---

## Report Format (Mobile-Friendly)

Default output uses **text-with-emoji** format (renders cleanly on Telegram, WhatsApp, Discord).
ASCII box format available on request.

```
🧠 MAGI REPORT — [Mode: FAST/FAST+/DEEP]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ Question: <question>

⚗️ MELCHIOR-1 [Scientist]
Verdict: APPROVE/REJECT/CAVEATED
Confidence: XX% (High/Medium/Low)
→ <2-3 sentence reasoning>

🛡️ BALTHASAR-2 [Mother]
Verdict: APPROVE/REJECT/CAVEATED
Confidence: XX% (High/Medium/Low)
→ <2-3 sentence reasoning>
⚠️ Risks: <top risks>

💙 CASPER-3 [Woman]
Emotional stakes: <1 sentence>
Verdict: APPROVE/REJECT/CAVEATED
Confidence: <metaphor>
→ <2-3 sentence reasoning>
✨ <≤12 word final sentence>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DEEP only]
⚡ TENSIONS
• <Point 1>: M says X / B-C say Y
• <Point 2>: ...

📋 SYNTHESIS
→ Recommendation: <clear action>
→ Trade-offs: <3-4 bullets>
→ Rollback if: <measurable signals>
→ Required: <conditions if any>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗳️ VOTE: X APPROVE / Y REJECT / Z other
📊 System Confidence: XX% (conservative)
🏛️ FINAL RULING: APPROVED / REJECTED / DEADLOCK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Operating Principles

- Always spawn all 3 nodes — independence is essential; never let nodes see each other before Stage 1 vote
- Deadlock is a crisis, not a minor inconvenience — default posture: Option D (precautionary hold) + Option C (escalate to human), applied in sequence
- Dissent is information — minority votes must appear prominently in the report
- CASPER's voice is not optional — emotional truth has standing alongside logic
- MAGI is advisory — final authority always returns to accountable humans
- For high-stakes or high-risk domains, require human-in-the-loop before any action

---

## Anti-Patterns (When NOT to Use MAGI) — Expanded

**Technical failures (use simpler approach):**
- Trivial factual lookups or objectively correct answers (math, code output, citations)
- Real-time data questions MAGI cannot access
- Purely personal taste/preference (MAGI produces bland compromises)
- Latency < 10s requirements — use single model
- Single stakeholder subjective decisions ("which font do I prefer")
- Yes/no binary questions with obvious answers
- Requests where all 3 nodes will trivially agree — deliberation adds no value

**MAGI must decline:**
- Life-and-death medical decisions for specific individuals
- Legal guilt/sentencing determinations
- Questions about a person's identity, bodily autonomy, or consent
- Violent, illegal, or manipulation-designed requests
- Doxxing, deanonymizing, or exposing private data
- Malware, exploitation chains, safety bypass requests

See `references/protocols.md §10` for complete anti-patterns list.

---

## Meta-Review

To challenge a previous MAGI ruling:
- Trigger Meta-Review with explicit reason + **evidence delta** (new information not available in original deliberation)
- Evidence delta must be concrete: new data, changed conditions, or demonstrated procedural error
- CASPER may propose "emotional evidence delta" (lived outcome, human impact report)
- Max 2 reviews per ruling, max 3 reviews per decision per 30 days
- Requires human authorization to initiate AND to accept any overturning
- See `references/protocols.md §8`

---

## CASPER Emotional Log (Optional, Opt-in)

CASPER may maintain a lightweight emotional memory across deliberations:
- **Location:** `memory/casper-emotional-log.json` in workspace
- **Activation:** Opt-in only; set `casper.emotionalLog: true` in skill config (default: false)
- **Schema:** `{date, topic_hash, valence, primary_emotion, lesson_1_line}`
- **Retention:** 90 days; half-life decay at 60 days; max 2 entries surfaced per deliberation
- **Cannot override** factual or safety constraints
- Human review required if >3 emotionally-charged entries cluster within 7 days

---

## Multilingual Triggers

Full trigger list (all map to MAGI activation):

**Cantonese/Traditional Chinese:** 用MAGI決定, MAGI投票, MAGI審議, MAGI分析, 三台電腦, 用三個節點, 多角度分析投票, 三腦審議

**Simplified Chinese:** 用MAGI决定, MAGI投票, 三台电脑, 多角度分析

**English:** magi decision, magi vote, magi analyze, magi deliberate, three nodes, triple perspective

**Japanese:** マギ決定, マギ審議, マギ投票

**Korean:** 마기 결정, 마기 심의

**Any language:** requests for "structured multi-perspective deliberation", "three-way analysis", "devil's advocate + logic + care analysis"

---

## Changelog

| Version | Changes |
|---------|---------|
| v3.0 | Announce-chain pattern; per-node model config; timeout standards; FAST+ mode; mobile-friendly report; simplified confidence; state machine; expanded anti-patterns; CASPER emotional log impl; multilingual triggers; meta-review evidence delta; deadlock default posture |
| v2.0 | Cycle 2 enhancements: dissent preservation, Cantonese voice, confidence calibration, multi-surface output, tool integration, feedback protocols, persona evolution |
| v1.0 | Initial MAGI system |
