---
name: reviewing-code
description: Reviews code for correctness and actively challenges its design to find worthwhile improvements. Use when asked to review a branch, diff, or implementation, including before shipping.
---

# Reviewing Code

Check whether the code works and whether there is a clearer, simpler design for the same outcome.
Do both unless the request narrows the review. Do not treat a working implementation as a design
to defend, or wait for the developer to identify its structural problems.

## Ground the review

Establish the intended behavior, review scope, and base ref. Include relevant committed and local
changes, and read surrounding owners, callers, and tests rather than reviewing isolated diff lines.
Read the applicable repository architecture, layer, and testing guides; apply their principles to
the actual design, distinguishing intended direction from legacy examples.

Keep required behavior, accepted trade-offs, and settled decisions distinct from incidental
implementation mechanisms. Do not reopen accepted trade-offs without new evidence. When a Jira
ticket is associated, use `checking-work-against-jira` and validate its findings against the code.

## Check correctness and evidence

Look for material defects in behavior, boundaries, failure handling, security, data integrity,
performance, and operation. Trace a suspected failure to a concrete scenario and check contradictory
evidence before reporting it. Distinguish introduced defects from pre-existing problems.

Assess whether tests prove the important public outcomes using the repository's conventions.
Passing tests do not establish a contract they never assert, and tests that pin internal
collaborations are not evidence that those collaborations must be preserved. Run focused checks
when needed to resolve a claim; distinguish inspected evidence from executed verification.

## Challenge the design

Step back from the current decomposition and reconsider the affected flow as a whole. Preserve the
required outcome, not the existing arrangement of classes and methods. Look beyond individual
functions when their complexity comes from how responsibilities are divided.

Useful questions are what each object represents, which rules or lifecycle it owns, and what a
caller must understand to use it. Look for fragmented ownership, unnecessary coordination,
duplicated representations, abstractions that merely relay work, and mechanisms that obscure a
simple domain operation. Examine whether orchestration methods mix levels of abstraction and
whether names reveal coherent roles, operations, and states.

Actively seek worthwhile improvements through deletion, consolidation, clearer ownership, direct
interfaces, and framework idioms—not just new abstractions. Fewer objects or lines are not a goal
in themselves: retain distinctions that express meaningful outcomes or responsibilities. Do not
turn a particular solution into a universal rule against inheritance, composition, or callbacks.

Use the architecture-comparison lens in `shaping` when ownership or boundaries need comparison,
and `naming-things` when naming discomfort exposes an unclear concept. Ground a recommendation in actual code and show how it
improves a representative caller-to-outcome path, including relevant skip or failure cases. A small
code sketch can make a disputed boundary clearer than architectural labels. Expose costs and any
behavioral or operational trade-off rather than presenting a redesign as a free simplification.

These are reasoning cues, not a checklist to print or a quota of alternatives. Do not manufacture
improvements, expand into unrelated redesign, or keep iterating until no reviewer has suggestions.
Use expert consultation for a specific unresolved consequential question, not as an automatic
review or approval gate.

## Report and hand off

Present correctness findings and design improvements distinctly within one review. Explain the
concrete consequence and evidence for each defect; explain the current burden, recommended change,
and trade-off for each design improvement. Do not disguise design recommendations as bugs or
discard them because they are not bugs. Prefer a coherent recommendation over a pile of local nits.

State material uncertainty and verification limits. Bring consequential choices to the developer
together, with a recommendation, rather than requiring a back-and-forth over individual names and
methods. A review request alone does not authorize implementation. When fixes are authorized,
carry accepted findings through implementation and verification; distinguish them from suggestions
that were declined or left open.
