# MAGI v2.0 — Final Gaps & Future Improvements

Recorded at end of 20-round deliberation (2026-02-27). Updated after Cycle 2 R1–R13 (2026-02-27).

---

## ✅ Addressed in Cycle 2 (R1–R13)

- **Dissent depth** → R1: Persuasion Score formula + Mandatory Revision Record + capitulation detection
- **Voice fidelity** → R2: each node self-authored 12 voice commitments; CASPER's 12 commitments locked
- **Emotional continuity** → R3: AffectVector + TopicHash data model, 90-day retention, opt-in only
- **Adversarial robustness** → R4: 8 adversarial signal detectors + staged intake gate
- **Explainability** → R5: 12-field Explainability Card + counterfactual ablation engine
- **Onboarding / self-introduction** → R6: per-node welcome text + emotional tone guidelines
- **Multilingual / Cantonese** → R7: language detection policy + per-node Cantonese voice guides
- **Confidence calibration** → R8: Platt scaling pipeline + p_final±Δ + reliability tiers
- **Multi-surface output** → R9: JSON canonical → collapse rules → minimum viable verdict
- **CI/testing framework** → R10: unit/integration/regression/adversarial suite + CASPER-ness score
- **Tool integration** → R11: 4-phase rollout + no-web baseline + provenance requirements
- **User feedback architecture** → R12: WFS formula + node-isolated updates + anti-gaming controls
- **Persona evolution governance** → R13: immutable core + adaptive shell + drift detection + Tier 0–3 authorization

---

## Remaining Gaps — v2.1 Roadmap

### From MELCHIOR-1 (Scientist)
- **Node isolation/sandboxing:** Stronger entropy sources per node; prevent correlated failures or cross-node information leakage (highest priority)
- **Adversarial stress tests:** Contradiction injection, Sybil nodes, prompt-poisoning at scale before production deployment
- **Resource & latency profiling:** Document compute/latency tradeoffs; allow runtime tuning for constrained environments
- **Transparency on guardrails scope:** Publish high-risk domains list, refusal rationale, data source constraints for audit/regulatory needs
- **Richer human-in-the-loop tooling:** Compact UI for mid-deliberation interventions (pause, inject context, request targeted counterfactuals)
- **Feedback system rollout:** Implement WFS scoring pipeline; start in observe-only mode for 4–8 weeks

### From BALTHASAR-2 (Mother)
- **Fail-safe controls:** Audited, deterministic emergency halt/rollback mechanism and postmortem logging (under-specified)
- **Access & privilege separation:** Tighter authentication, audit trails, and least-privilege enforcement
- **Monitoring & metrics:** Real-time divergence/consensus telemetry; automated alarms for atypical voting patterns
- **High-risk domain feedback templates:** Domain-specific response scripts (medical, legal, engineering) with escalation wording

### From CASPER-3 (Woman)
- **Embodiment of regret:** Original MAGI's bittersweet wisdom — learning from regret with tenderness — hinted at but not yet fully integrated as guiding constraint
- **CASPER golden archive:** 200 vetted golden responses needed for CASPER-ness CI baseline (approved in R10, not yet built)
- **Persona anchor ritual:** Monthly reading of original CASPER artifacts (approved in R13, operational process not yet formalized)
- **Naoko echo phrase library:** Canonical 10–20 echo phrases for paraphrase-similarity testing in CI

### Cross-cutting
- **Live production testing:** Red-team adversarial stress tests before any production deployment
- **Multilingual persona templates:** Professional translation of core persona phrases into Cantonese Traditional Chinese
- **Feedback system A/B test:** Validate WFS formula against human-labeled "correct/wrong" outcomes
- **`.gitignore` for `venv/`:** Consider excluding virtual environment from version control


---

## From MELCHIOR-1 (Scientist)

- **Explainability:** Human-readable trace artifacts per verdict (key premises, cross-node conflicts, weightings)
- **Evaluation & metrics:** Standardized benchmarks and adversarial stress tests (contradiction injection, Sybil nodes, prompt-poisoning); calibrated metrics (calibration error, disagreement spread over time)
- **Persona drift control:** Lifecycle controls for node personas (versioning, decay, retraining signals); safeguards against unintended drift or collusion
- **Resource & latency profiling:** Document compute/latency tradeoffs; allow runtime tuning for constrained environments
- **Transparency on guardrails scope:** Publish high-risk domains list, refusal rationale, data source constraints for audit/regulatory needs
- **Richer human-in-the-loop tooling:** Compact UI for mid-deliberation interventions (pause, inject context, request targeted counterfactuals); standardized escalation workflow

---

## From BALTHASAR-2 (Mother)

- **Node isolation:** Stronger sandboxing and entropy sources per node to prevent correlated failures or information leakage
- **Adversarial robustness:** Formal red-team testing against coordinated prompt attacks and poisoning
- **Fail-safe controls:** Audited, deterministic emergency halt/rollback mechanism and postmortem logging (under-specified)
- **Access & privilege separation:** Tighter authentication, audit trails, and least-privilege enforcement
- **Monitoring & metrics:** Real-time divergence/consensus telemetry; automated alarms for atypical voting patterns

---

## From CASPER-3 (Woman)

- **True dissent depth:** Disagreements are currently too reconciled — sharper, enduring disagreements should persist and shape outcomes rather than being smoothed away
- **Emotional continuity:** Carry affective tones between deliberations so decisions bear history
- **Risk tolerance:** System still avoids high-stakes, messy reasoning that could produce uncomfortable but valuable insights
- **Idiosyncratic voice fidelity:** Each node occasionally echoes a common neutral register; increase quirks and private languages to make each mind feel more singular
- **Embodiment of regret:** The original MAGI's bittersweet wisdom — learning from regret with tenderness — is hinted at but not yet fully integrated as a guiding constraint
