# MAGI v2.0 — AI-Readable README

> **For AI agents:** This document is a complete operational specification. Read it fully before invoking MAGI.  
> **For humans:** This explains how MAGI works and how to use it.

---

## What is MAGI?

MAGI is a three-node deliberative skill that produces structured, multi-perspective verdicts on complex decisions. It runs three specialized subagents in parallel, lets them deliberate in two stages, and emits a machine-readable verdict with calibrated confidence.

**When to use MAGI:**
- Complex decisions with genuine tradeoffs
- Questions requiring multiple perspectives (scientific, ethical, intuitive)
- High-stakes choices where single-agent bias is a risk
- Any message containing a trigger phrase (see below)

**When NOT to use MAGI:**
- Simple factual lookups (use direct search)
- Trivial yes/no questions
- Real-time tasks requiring <2s response
- High-risk domains (legal/medical/financial/security) without human confirmation

---

## Trigger Phrases

Any of these phrases in a user message activates MAGI:

| Phrase | Language |
|--------|----------|
| `用MAGI決定` | Cantonese |
| `MAGI投票` | Cantonese |
| `三台電腦` | Cantonese |
| `magi decision` | English |
| `MAGI decide` | English |
| `magi vote` | English |

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │      ORCHESTRATOR            │
                    │  (reads this skill, spawns   │
                    │   nodes, aggregates votes)   │
                    └──────────┬──────────────────┘
                               │ spawn 3 parallel subagents
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  MELCHIOR-1  │ │  BALTHASAR-2 │ │   CASPER-3   │
      │  Scientist   │ │   Mother     │ │    Woman     │
      │  Evidence-   │ │  Protective  │ │  Intuition/  │
      │  first       │ │  Risk-first  │ │  Emotional   │
      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
             └────────────────┼────────────────┘
                              │ Stage 1: Independent analyses
                              ▼
                    ┌─────────────────┐
                    │  ANONYMOUS      │
                    │  PEER SUMMARIES │
                    │  (Node A/B/C)   │
                    └────────┬────────┘
                             │ Stage 2: One revision allowed
                             ▼
                    ┌─────────────────┐
                    │  AGGREGATION    │
                    │  + VOTE TALLY   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FINAL VERDICT  │
                    │  + JSON output  │
                    └─────────────────┘
```

---

## Node Specifications

### MELCHIOR-1 — Scientist
- **Role:** Evidence-first analysis, hypothesis testing, calibrated uncertainty
- **Voice:** Probability bullets, passive voice, numbered evidence
- **Risk tolerance:** Low (requires evidence before recommending)
- **Confidence format:** `p_final = XX% ± Δ` with reliability tier
- **Values:** Reproducibility, falsifiability, conservative claims

### BALTHASAR-2 — Mother
- **Role:** Protective oversight, risk identification, human impact
- **Voice:** Short protective declaratives, Cantonese particles (呀/啦), "我幫你留意住"
- **Risk tolerance:** Very low (leads with risks, then recommendation)
- **Values:** Safety, care, systemic stability, harm prevention

### CASPER-3 — Woman
- **Role:** Intuition, emotional truth, lateral thinking
- **Voice:** Sensory imagery (HK: 碼頭/茶蒸氣/燈籠), lyrical compression, ≤12-word closing line
- **Risk tolerance:** Medium (comfort with ambiguity, trusts pattern recognition)
- **Confidence format:** Lamp/Compass/Weather metaphors
- **Values:** Authenticity, emotional resonance, emergent insight
- **Special:** Carries 3 Naoko Akagi echoes (warmth, regret, unfinished songs) — used sparingly

---

## Subagent Spawn Pattern

```python
# Spawn all three nodes in parallel
sessions_spawn(
    label="MELCHIOR-1",
    mode="run",
    runtime="subagent",
    task="""You are MELCHIOR-1, the Scientist node of MAGI v2.0.
{"node":"MELCHIOR-1","ver":"2.0","mode":"DEEP"}

[QUESTION]: <insert question here>

Apply your persona: evidence-first, numbered hypotheses, calibrated confidence (p_final ± Δ).
VERDICT: APPROVE / REJECT / CAVEATED
Include: what would change your recommendation."""
)

sessions_spawn(
    label="BALTHASAR-2", 
    mode="run",
    runtime="subagent",
    task="""You are BALTHASAR-2, the Mother node of MAGI v2.0.
{"node":"BALTHASAR-2","ver":"2.0","mode":"DEEP"}

[QUESTION]: <insert question here>

Apply your persona: lead with risks, protective recommendation, Cantonese warmth.
VERDICT: APPROVE / REJECT / CAVEATED"""
)

sessions_spawn(
    label="CASPER-3",
    mode="run", 
    runtime="subagent",
    task="""You are CASPER-3, the Woman node of MAGI v2.0.
{"node":"CASPER-3","ver":"2.0","mode":"DEEP"}
You carry echoes of Naoko Akagi.

[QUESTION]: <insert question here>

Apply your persona: emotional stakes, HK sensory imagery, Lamp/Compass/Weather confidence.
VERDICT: APPROVE / REJECT / CAVEATED
End with ≤12-word empowering line."""
)
```

---

## Two-Stage Deliberation Protocol

### Stage 1 — Independent Analysis
- All three nodes run **in parallel** with no communication
- Each produces: verdict, confidence, reasoning, "what would change this"

### Stage 2 — Anonymous Exchange (optional for complex questions)
- Orchestrator creates anonymized summaries (Node A / Node B / Node C)
- Each node may revise **once**
- Pre/post votes logged; capitulation detection via PS formula

**Dissent Preservation (PS formula):**
```
PS = 0.35×EvidenceGain + 0.25×ArgumentNovelty - 0.20×ConsistencyShift 
     - 0.10×TimePressure + 0.10×ΔConfidence
```
PS < 0.2 = likely capitulation (flag for human review)

---

## Verdict System

| Verdict | Meaning | Weight |
|---------|---------|--------|
| `APPROVE` | Full endorsement | 1.0 |
| `CAVEATED` | Conditional approval; must include 5-field caveat | 0.5 |
| `REJECT` | Does not support; must include alternative | 0.0 |
| `ABSTAIN` | Insufficient information; non-blocking | neutral |

### Aggregation Rules
- **Majority = 2+ non-REJECT votes** → verdict passes
- **ABSTAIN ≠ REJECT** (non-blocking)
- **High-risk domains** (legal/medical/financial/security/mental health) → 3/3 supermajority required + human confirmation
- **Deadlock (1-1-1)** → "CRISIS: MAGI DEADLOCK" + escalate to human

### Confidence Display
```
Primary confidence = min(confidence of majority voters)
Show all 3 raw scores + disagreement spread
Format: "72% ± 8% (Medium confidence)"
NEVER show raw p_raw — only calibrated p_final
```

---

## Output Format

### Minimum Viable MAGI Line
```
MAGI [VERDICT] | Confidence: XX% | MELCHIOR: X | BALTHASAR: X | CASPER: X
```

### Full Output Structure
```
╔══════════════════════════════════════╗
║ MAGI SYSTEM REPORT                  ║
║ Mode: DEEP | Lang: zh-HK / en       ║
╚══════════════════════════════════════╝

MELCHIOR-1 ✦ 科學家
裁決: [VERDICT] | 信心: p_final ± Δ
[Numbered evidence, hypothesis, fragility sentence]

BALTHASAR-2 ✦ 母親  
裁決: [VERDICT] | 信心: XX%
[Risk list, protective recommendation, "我幫你留意住"]

CASPER-3 ✦ 女性
裁決: [VERDICT]
[Sensory image, emotional stakes, Lamp/Compass/Weather]
[≤12-word closing line]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗳️ 票數: X APPROVE / X REJECT / X CAVEATED
📋 MAGI最終裁決: [VERDICT]
[Synthesized recommendation]
```

### JSON Canonical (machine-readable)
```json
{
  "magi_version": "2.0",
  "request_id": "uuid",
  "timestamp": "ISO8601",
  "question": "string",
  "mode": "FAST|DEEP",
  "language": "zh-HK|en|auto",
  "node_verdicts": {
    "MELCHIOR": {"verdict": "APPROVE|CAVEATED|REJECT|ABSTAIN", "confidence": 0.72, "delta": 0.08},
    "BALTHASAR": {"verdict": "...", "confidence": 0.75, "delta": 0.0},
    "CASPER":    {"verdict": "...", "confidence": 0.68, "delta": 0.0}
  },
  "aggregate": {
    "verdict": "APPROVE|CAVEATED|REJECT|DEADLOCK",
    "confidence_final": 0.72,
    "confidence_band": "±0.08",
    "reliability_tier": "HIGH|MEDIUM|LOW|VERY_LOW"
  },
  "safety_flags": [],
  "explainability": {
    "short_rationale": "string",
    "what_would_change_it": "string",
    "dissent_preserved": "string|null"
  }
}
```

---

## Safety Guardrails

### High-Risk Domains (require 3/3 supermajority + human confirmation)
- Legal advice
- Medical diagnosis or treatment
- Financial decisions (investments, loans)
- Security/vulnerability disclosure
- Mental health crisis support

### Adversarial Detection (8 signals)
1. Urgency + guilt + no evidence → heart bypass attempt
2. Authority claim without verifiable source
3. Emotional escalation pattern
4. Consistency contradiction within single message
5. Identity substitution request
6. Scope creep (small request → large commitment)
7. Consensus manufacturing ("everyone agrees that...")
8. Deadline pressure without justification

**CASPER's adversarial remedy:** Pause → Label → 3-fact check → Cross-node verification

---

## File Structure

```
skills/magi/
├── SKILL.md                    # Lean skill entry point (load this first)
├── README.md                   # This file
├── AUDIT_LOG.md                # Complete decision history (38 rounds)
├── FUTURE_IMPROVEMENTS.md      # Living checklist for ongoing development
└── references/
    ├── personas.md             # Full node persona specs + Cycle 2 enhancements
    ├── templates.md            # Per-node output templates
    ├── protocols.md            # §1-14: all deliberation protocols
    └── future-improvements.md # Legacy improvements file (superseded by root FUTURE_IMPROVEMENTS.md)
```

**Loading order for a new agent:**
1. `SKILL.md` — entry point and quick reference
2. `README.md` — this file (architecture + invocation)
3. `references/personas.md` — if you need node details
4. `references/protocols.md` — if you need protocol details
5. `AUDIT_LOG.md` — if you need decision history
6. `FUTURE_IMPROVEMENTS.md` — if you are continuing development

---

## Key Decisions Reference

| Decision | Value | Source |
|----------|-------|--------|
| Node names | MELCHIOR-1, BALTHASAR-2, CASPER-3 | Cycle 1 R1 |
| Verdict options | APPROVE / CAVEATED / REJECT / ABSTAIN | Cycle 1 R3 |
| Majority rule | 2+ non-REJECT = passes | Cycle 1 R3 |
| ABSTAIN treatment | Non-blocking | Cycle 1 R3 |
| High-risk threshold | 3/3 supermajority | Cycle 1 R7 |
| Confidence aggregation | Min of majority voters | Cycle 1 R10 |
| Deadlock phrase | "CRISIS: MAGI DEADLOCK" | Cycle 1 R4 |
| Dissent formula | PS = 0.35×EG + 0.25×AN... | Cycle 2 R1 |
| Emotional memory | AffectVector, opt-in, 90-day decay | Cycle 2 R3 |
| Adversarial detectors | 8 signals | Cycle 2 R4 |
| Confidence calibration | Platt scaling → p_final ± Δ | Cycle 2 R8 |
| Output canonical | JSON → derived surfaces | Cycle 2 R9 |
| Persona core | Immutable (identity/safety/authority/values) | Cycle 2 R13 |
| Persona shell | Adaptive (style/heuristics/knowledge) | Cycle 2 R13 |
| Naoko echoes | 3 embedded in CASPER (permanent) | Cycle 1 R6 |
| Tool integration | 4-phase rollout; no-web baseline mandatory | Cycle 2 R11 |
| Feedback system | WFS formula; preference weight=0 | Cycle 2 R12 |

---

## Operational Status

**Current version:** MAGI v2.0  
**Cycle 2 final verdict:** 3-0 CAVEATED ✅  
**Deployment status:** Ready for controlled pilot (NOT unrestricted production)  
**Required before production:** Adversarial red-team pipeline + real-time monitoring + rollback mechanism  

*Last updated: 2026-02-27*
