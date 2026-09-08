# Documentation

Use this reference when an audience must gain the information needed to understand or complete a
task. Documentation can remain supporting work within another kind when it directly serves the
same outcome.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Create an operational runbook for rotating API credentials

**Audience**

On-call engineers and service owners.

**Desired outcome**

An engineer unfamiliar with the service can safely rotate credentials and verify the result
without causing downtime.

**Acceptance criteria**

- The runbook documents prerequisites and required permissions.
- It describes rotation, verification, rollback, and escalation steps.
- Examples use placeholders and contain no real credentials.
- It explains how to detect failed authentication after rotation.
- An engineer other than the author validates the procedure in a non-production environment.
- The runbook is linked from the on-call documentation index.
