# Defect

Use this reference when existing behavior reportedly violates an established expectation. If the
expectation itself is intentionally changing, compare the work with `behavior-change.md`.

The example below is a complete source ticket. Use it to recognize information that can matter for
this kind of work. Apply the filtering rules in `SKILL.md`; not every detail belongs in the
prepared brief. The example is not an output template. Do not copy its structure or introduce
details that the source ticket does not provide.

## Example

**Title:** Prevent duplicate orders when payment submission is retried

**Customer impact**

Some customers receive two orders and two charges when the payment request is submitted more than
once.

**Steps to reproduce**

1. Add an item to the cart.
2. Proceed to payment.
3. Submit payment twice before the first request completes.
4. Observe two orders for the same checkout.

**Expected behavior**

A single checkout produces at most one order and one charge.

**Actual behavior**

Concurrent submissions can produce duplicate orders and charges.

**Acceptance criteria**

- Repeated or concurrent submissions for the same checkout produce one order.
- The customer receives one confirmation.
- A legitimate later purchase of the same items is still permitted.
- Automated coverage reproduces the original failure and verifies the correction.
- Duplicate attempts are observable without logging payment or personal information.
