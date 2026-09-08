# New Capability

Use this reference when completion gives an actor or system a capability that does not currently
exist. If the work intentionally alters a capability that already exists, compare it with
`behavior-change.md`.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Allow customers to save delivery addresses

**Problem**

Returning customers must re-enter their delivery address for every purchase, increasing checkout
time and abandonment.

**Desired outcome**

Signed-in customers can securely reuse previously saved addresses.

**Acceptance criteria**

- A signed-in customer can save an address during checkout.
- Saved addresses are available in future checkout sessions.
- Customers can add, edit, and delete their addresses.
- A customer cannot access another customer's addresses.
- Validation errors explain what must be corrected.
- Address details are not included in analytics or application logs.

**Not included**

- Saving payment methods.
- Importing addresses from third-party services.

**Success measure**

Median checkout completion time for returning customers decreases without an increase in
address-related delivery failures.
