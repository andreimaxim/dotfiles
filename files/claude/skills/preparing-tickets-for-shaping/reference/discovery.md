# Discovery

Use this reference when evidence or a decision is the deliverable. A proposed production change is
not part of discovery unless the ticket establishes it as a separate, independently completable
outcome.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Determine the cause of elevated checkout p95 latency

**Context**

Checkout p95 latency increased from approximately 800 ms to 1.8 seconds after the last two
releases. The responsible component is unknown.

**Questions to answer**

- Which request or dependency accounts for the increase?
- Which release first introduced it?
- Is the problem dependent on traffic volume, region, or payment provider?
- What options could restore latency, and what are their risks?

**Time box**

Two working days.

**Deliverables**

- Evidence from traces, metrics, logs, or a reproducible test.
- Confirmed cause, or ranked hypotheses if the cause cannot be confirmed.
- Recommended next action with expected impact and risk.
- Follow-up implementation tickets where appropriate.

**Not included**

Production remediation, except an emergency mitigation handled through the incident process.
