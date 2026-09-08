# Maintenance

Use this reference when completion changes the technical condition of the system or an artifact
without an intended change in externally observable behavior. If completion changes the state or
configuration of a running system, compare it with `operational-work.md`.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Upgrade the production runtime from Node.js 20 to Node.js 22

**Reason**

Node.js 20 is approaching the end of the organization's supported-runtime window. Remaining on it
will prevent security and dependency updates.

**Scope**

- Application runtime and production container.
- CI and local development configuration.
- Dependencies incompatible with Node.js 22.
- Developer setup documentation.

**Acceptance criteria**

- Production, CI, and documented local environments use Node.js 22.
- The application builds successfully.
- Unit, integration, and smoke tests pass.
- No intended customer-facing behavior changes.
- Production health metrics remain within existing thresholds during rollout.
- The previous runtime image remains available for rollback until verification is complete.
