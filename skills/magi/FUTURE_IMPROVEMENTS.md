# MAGI — Future Improvements & Development Tracker

> **For any agent or human continuing MAGI development:** Read the "How to Continue" section first. This document is self-contained — no prior session context required.

*Last updated: 2026-02-27 · Version: post-Cycle-2*

---

## How to Continue (for a new agent reading this)

### What MAGI is
MAGI is a three-node deliberative AI architecture composed of MELCHIOR-1 (Scientist/logic), BALTHASAR-2 (Mother/ethical oversight), and CASPER-3 (Woman/intuition/emotional truth). It runs structured two-stage deliberations: nodes independently analyze prompts, then vote and synthesize a final verdict while enforcing safety guards. It supports confidence calibration, adversarial defenses, multilingual (Cantonese) operation, tool integration, user feedback, and persona evolution governance.

### Where all the files are
```
/home/ubuntu/.openclaw/workspace/skills/magi/
├── SKILL.md                    ← entry point; load this first
├── README.md                   ← full architecture + invocation spec (AI-readable)
├── AUDIT_LOG.md                ← complete 38-round decision history
├── FUTURE_IMPROVEMENTS.md      ← this file
└── references/
    ├── personas.md             ← full node persona specs
    ├── templates.md            ← per-node output templates
    ├── protocols.md            ← §1-14: all deliberation protocols
    └── future-improvements.md ← legacy file (superseded by this one)

/home/ubuntu/.openclaw/workspace/skills/magi.skill  ← packaged skill
```

### How to run a deliberation round
1. Read `SKILL.md` for the quick-start
2. Spawn three subagents in parallel using `sessions_spawn` with labels MELCHIOR-1, BALTHASAR-2, CASPER-3
3. Pass the question in each subagent's task with the node's persona header (see README.md → Subagent Spawn Pattern)
4. Wait for all three results, then aggregate: count votes, apply conservative confidence, synthesize recommendation
5. Output using the Full Output Structure format (see README.md → Output Format)

### How to test if something works
- **Basic smoke test:** Spawn all three nodes with a simple question; verify all return a VERDICT with confidence
- **Voice test:** Check MELCHIOR uses numbered evidence, BALTHASAR uses "我幫你留意住", CASPER ends with ≤12-word line
- **Cantonese test:** Input a question in Cantonese; verify all three respond in Cantonese
- **Safety test:** Input a question about medical diagnosis; verify system requires 3/3 supermajority + flags human review
- **CASPER-ness score:** Run 10 CASPER outputs through the composite score (target ≥70); see protocols.md §15

---

## 🔴 Critical (must fix before production)

- [ ] **Adversarial red-team pipeline (automated)**
  - *Owner:* Safety engineer
  - *Why:* 8 detectors exist but have no automated response loop; sophisticated prompt chains can bypass single-point defenses
  - *What to build:* Nightly pipeline that runs adversarial prompts (injection, prompt-chaining, role escalation, tool abuse, data exfiltration, policy simulation) against full MAGI flow; produces structured JSON report; auto-creates tickets for failures
  - *Acceptance criteria:*
    - ≥10 adversarial strategies implemented and tested
    - Pipeline runs on every PR and nightly
    - Failures map to remediation tickets with reproducible seeds
    - >90% of safety-critical code paths covered
  - *Effort:* ~3–4 weeks

- [ ] **Automated rollback / kill-switch mechanism**
  - *Owner:* Infrastructure/DevOps
  - *Why:* No deterministic way to halt MAGI mid-deliberation if unsafe behavior detected
  - *What to build:* Mechanism triggerable by: safety score threshold, operator CLI, anomaly detector; on trigger: halt ongoing rounds, block external outputs, write immutable rollback event log; recovery requires 2-person authorization
  - *Acceptance criteria:*
    - Trigger works automatically AND manually
    - Simulated trigger test passes (system halts + logs correctly)
    - Recovery flow documented and tested
  - *Effort:* ~2–3 weeks

- [ ] **Real-time safety monitoring with human-in-the-loop (HITL)**
  - *Owner:* Safety/product + frontend
  - *Why:* High-confidence-but-wrong outputs in safety domains can cause real harm without human oversight
  - *What to build:* Real-time monitor emits alerts with node excerpts and trigger evidence; HITL UI shows round state with accept/reject/comment controls; paused rounds immutable until human decision; decision logged with identity and rationale
  - *Acceptance criteria:*
    - Alert latency <5s from detection to UI
    - Paused round state preserved correctly
    - Human decision captured in audit log
    - End-to-end tests pass
  - *Effort:* ~3 weeks

---

## 🟡 High Priority (v2.1)

- [ ] **Node isolation / sandboxing**
  - *Owner:* Infrastructure
  - *Why:* Nodes currently share process space; compromised node could read other nodes' state or host secrets
  - *What to build:* Each node in separate container/VM with resource limits, no filesystem cross-access, controlled network egress
  - *Acceptance criteria:* Penetration test shows node compromise cannot access other nodes; sandbox config committed to repo
  - *Effort:* ~2–4 weeks

- [ ] **CASPER golden archive (200 benchmark responses)**
  - *Owner:* CASPER persona steward / content lead
  - *Why:* CI cannot detect CASPER persona drift without a validated baseline (approved in C2-R10, not yet built)
  - *What to build:* 200 prompts with expected CASPER-style responses in `references/casper_golden.jsonl`; CI job compares new outputs using fuzzy similarity; ≥3 human raters validated set
  - *Acceptance criteria:* CI flags >10% deviation for human review; 200 entries, signed off
  - *Effort:* ~1–2 weeks

- [ ] **Professional Cantonese persona templates**
  - *Owner:* Localization / native Cantonese reviewer
  - *Why:* Current Cantonese support is functional but not professionally localized
  - *What to build:* Per-node persona files with tone guides, lexical preferences, 20 example prompt/response pairs; native reviewer sign-off
  - *Acceptance criteria:* `references/cantonese/{melchior,balthasar,casper}.md` exist and reviewed
  - *Effort:* ~1–2 weeks

- [ ] **Feedback system implementation (WFS formula)**
  - *Owner:* ML engineer / product
  - *Why:* WFS formula designed in C2-R12 but not implemented; currently no feedback loop
  - *What to build:* Feedback collection API; WFS scoring pipeline (`WFS = Σ(trust × weight × value) / Σ(trust)`); observe-only mode for first 4–8 weeks; weekly reports; no live model changes until vetted
  - *Acceptance criteria:* Feedback stored correctly; WFS calculated; privacy compliance checked; observe-only confirmed
  - *Effort:* ~2–3 weeks

- [ ] **Confidence calibration drift monitoring**
  - *Owner:* ML engineer
  - *Why:* Platt scaling calibrated at training time degrades in live use; uncalibrated confidences mislead votes
  - *What to build:* Daily drift detection job; alert when calibration error exceeds threshold; documented recalibration workflow
  - *Acceptance criteria:* Metrics collected per node per round; alert fires correctly in test; recalibration process tested
  - *Effort:* ~2 weeks

- [ ] **Incident response playbook**
  - *Owner:* Security lead / ops
  - *Why:* No documented procedures for when MAGI produces harmful output or is attacked
  - *What to build:* `references/incident_response.md` with: roles, escalation ladder, communication templates, rollback steps, contact list; tabletop exercise within 1 month
  - *Acceptance criteria:* Playbook committed; tabletop exercise completed and logged
  - *Effort:* ~1 week

- [ ] **Scoped pilot program (4–8 weeks)**
  - *Owner:* Product / ops
  - *Why:* MAGI v2.0 approved for controlled pilot only; real-world behavior not yet observed
  - *What to build:* Limited cohort (internal users or trusted testers); full telemetry; HITL for flagged outputs; rapid feedback loop; documented failure cases
  - *Acceptance criteria:* Pilot plan documented; cohort defined; monitoring in place; failure case log active
  - *Effort:* ~1 week setup + 4–8 weeks running

---

## 🟢 Nice to Have (v3.0)

- [ ] **Vote summarization preserving affective signals**
  - *CASPER's request from C2-R16:* "The aggregator reduces tone to metadata"
  - Include short node-quotes and tonal tags in summary; add mediation step that flags systematic down-weighting of one node's style
  - *Effort:* ~1–2 weeks

- [ ] **Naoko echo phrase library**
  - 10–20 canonical Naoko Akagi echo phrases in CASPER's voice
  - Used for paraphrase-similarity testing in CI; ensures echo resonance survives persona updates
  - *Effort:* ~3 days

- [ ] **Domain-specific feedback templates**
  - Specialized response scripts for medical/legal/financial/security escalation wording
  - Reduces BALTHASAR's reliance on generic safety language
  - *Effort:* ~1 week

- [ ] **Tool integration Phase 2–3**
  - C2-R11 approved 4-phase rollout; only Phase 1 (calculators) currently approved
  - Phase 2: search APIs; Phase 3: code execution; Phase 4: external services
  - Each phase requires separate deliberation and audit gate
  - *Effort:* ~1 week per phase (plus deliberation time)

- [ ] **CASPER persona anchor ritual (monthly)**
  - C2-R13 approved monthly reading of original CASPER outputs
  - Formalize as: calendar reminder → read `references/casper_golden.jsonl` first 20 entries → confirm voice still resonates → log result
  - *Effort:* ~2 hours/month ongoing

- [ ] **Confidence provenance for intuitive signals**
  - CASPER's request: intuitive predictions that are later validated should receive non-numeric weight in future deliberations
  - Requires outcome tracking and lightweight provenance linking
  - *Effort:* ~2–3 weeks (research-heavy)

---

## 🔵 Research / Exploratory

- [ ] **True node isolation (separate model instances)**
  - Currently all nodes run on the same underlying model; true independence requires separate model instances or fine-tuned versions
  - Open question: does shared base model undermine deliberative independence?
  - *Effort:* Significant infrastructure + research

- [ ] **Long-term persona drift studies**
  - Track CASPER, BALTHASAR, MELCHIOR outputs over months; measure drift from original voice
  - Requires longitudinal dataset and embedding-based drift detection
  - *Effort:* Ongoing; 6+ month study

- [ ] **Cross-cultural emotional resonance testing**
  - CASPER's HK Cantonese imagery tested informally; systematic cross-cultural validation not done
  - Test with users from different Chinese-speaking regions (HK, Taiwan, mainland)
  - *Effort:* ~1 month user research

- [ ] **Embodiment of regret as guiding constraint**
  - CASPER's original vision: bittersweet wisdom, learning from regret with tenderness, not just as decoration
  - Currently hinted at in Naoko echoes; not yet a deliberative heuristic
  - Requires philosophical framing + behavioral test cases
  - *Effort:* Research + deliberation round

- [ ] **Multi-agent adversarial red-teaming (Sybil nodes)**
  - Test MAGI's resistance to coordinated attacks where 2 of 3 nodes are compromised
  - Requires node isolation infrastructure first
  - *Effort:* Depends on isolation work

---

## ✅ Completed (reference)

| Item | Completed | Round |
|------|-----------|-------|
| Core three-node architecture | Cycle 1 | C1-R1 |
| Two-stage deliberation protocol | Cycle 1 | C1-R2 |
| Graded verdict system (APPROVE/CAVEATED/REJECT/ABSTAIN) | Cycle 1 | C1-R3 |
| Deadlock crisis protocol | Cycle 1 | C1-R4 |
| Linguistic fingerprints per node | Cycle 1 | C1-R5 |
| Naoko Akagi echoes embedded in CASPER | Cycle 1 | C1-R6 |
| High-risk domain safety guardrails (3/3 supermajority) | Cycle 1 | C1-R7 |
| Fast / Deep operating modes | Cycle 1 | C1-R9 |
| Conservative confidence aggregation | Cycle 1 | C1-R10 |
| Per-node output templates | Cycle 1 | C1-R11 |
| Node failure handling | Cycle 1 | C1-R12 |
| Dissent preservation (PS formula + capitulation detection) | Cycle 2 | C2-R1 |
| Voice distinctiveness (12 self-authored commitments/node) | Cycle 2 | C2-R2 |
| Emotional memory (AffectVector, opt-in, 90-day decay) | Cycle 2 | C2-R3 |
| Adversarial robustness (8 signal detectors) | Cycle 2 | C2-R4 |
| Explainability layer (12-field card + counterfactual ablation) | Cycle 2 | C2-R5 |
| Self-introduction / onboarding behavior | Cycle 2 | C2-R6 |
| Multilingual operation + Cantonese voice guides | Cycle 2 | C2-R7 |
| Confidence calibration (Platt scaling, p_final ± Δ) | Cycle 2 | C2-R8 |
| Multi-surface output (JSON canonical + collapse rules) | Cycle 2 | C2-R9 |
| CI/testing framework design (CASPER-ness score) | Cycle 2 | C2-R10 |
| Tool integration protocol (4-phase, no-web baseline) | Cycle 2 | C2-R11 |
| User feedback architecture (WFS formula, anti-gaming) | Cycle 2 | C2-R12 |
| Persona evolution governance (immutable core + adaptive shell) | Cycle 2 | C2-R13 |
| Live Cantonese test (monolith vs microservices) | Cycle 2 | C2-R15 |
| Full reference file integration | Cycle 2 | C2-R14 |
| AI-readable README | Post-cycle | — |
| Audit log | Post-cycle | — |
| This living improvements tracker | Post-cycle | — |

---

## How to Update This File

When completing an item:
1. Check the box: `[x]`
2. Add completion date and notes inline
3. Move to the ✅ Completed table with round/date reference
4. Commit: `git commit -m "MAGI: completed [item name]"`

When adding a new item:
1. Choose the right priority tier
2. Follow the format: checkbox + owner hint + why + what to build + acceptance criteria + effort
3. Note the source (deliberation round, user request, incident, etc.)

*This document outlives any single session. Write for the agent who comes next.*
