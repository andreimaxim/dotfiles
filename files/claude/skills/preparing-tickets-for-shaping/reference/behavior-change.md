# Behavior Change

Use this reference when completion intentionally changes, removes, or deprecates existing
behavior. If the existing behavior reportedly violates an established expectation, compare it
with `defect.md`.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Warn administrators before inactive sessions expire

**Current behavior**

Administrators are signed out after 30 minutes of inactivity without warning.

**Desired behavior**

Administrators receive a warning two minutes before expiration and can choose to remain signed in.

**Acceptance criteria**

- A warning appears after 28 minutes of inactivity.
- The warning states how much time remains.
- Choosing **Stay signed in** renews the session and dismisses the warning.
- Taking no action signs the administrator out after 30 minutes.
- Activity in another tab prevents an unnecessary warning.
- Keyboard and screen-reader users can operate the warning.
- The existing 30-minute security policy remains unchanged.

**Not included**

- Allowing administrators to configure the timeout.
- Changing timeout behavior for non-administrator accounts.
