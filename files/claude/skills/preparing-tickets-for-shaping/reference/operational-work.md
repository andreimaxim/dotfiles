# Operational Work

Use this reference when completion changes the state or configuration of a running system. If the
work changes the technical condition of the system or an artifact, compare it with
`maintenance.md`.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Progressively enable the new checkout for production customers

**Preconditions**

- The new checkout release is deployed.
- Checkout, payment-error, latency, and conversion dashboards are available.
- Customer support has received the rollout notes.
- The feature can be disabled without another deployment.

**Rollout plan**

1. Enable for employees.
2. Enable for 5% of customers.
3. Increase to 25%, 50%, and 100% after each stage meets its guardrails.
4. Record the time, observed metrics, and decision at each stage.

**Guardrails**

- No statistically meaningful conversion regression beyond the agreed threshold.
- Payment error rate remains below 1%.
- Checkout p95 latency does not increase by more than 20%.
- No new severity-one or severity-two support issue is attributed to the checkout.

**Rollback**

Disable the flag immediately if a guardrail is breached, confirm recovery, and link a follow-up
incident or defect ticket.
