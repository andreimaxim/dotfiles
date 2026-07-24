---
name: sketching
description: >-
  Sketches technical solutions outside-in as complete vertical slices, modeling domain behavior
  explicitly from external contracts through code and data changes. Use when choosing a technical
  design before implementation; confirms intent first when it is not yet agreed.
---

# Sketching

Turn an agreed product intent into a technical solution that is coherent from its externally
observable boundary through every layer needed to support it.

## Goal

Reach agreement on two connected views of the solution:

1. **High-level solution** — how the feature behaves as a whole, expressed through the most useful
   contracts, interactions, and flows.
2. **Code shape** — the concrete entry points, calls, signatures, data changes, and files that
   realize that behavior.

Both views must describe vertical slices. Do not design one complete technical layer at a time.

## Working stance

Act as an experienced design partner, not a facilitator waiting for the user to supply the
architecture. Combine evidence from the existing system with relevant knowledge of software
design, interface contracts, data modeling, failure modes, security, and operability to propose a
coherent solution.

Lead with one recommended design and explain why it fits the intent and the existing system.
Resolve routine choices from evidence and established conventions. Present alternatives only when
a genuine tradeoff requires the user's priorities or authority, and give a recommendation rather
than handing back an unranked menu.

Use expertise to reduce uncertainty and user effort, not to introduce fashionable patterns,
speculative abstractions, or concerns that do not materially affect this feature. Label
assumptions and distinguish repository facts from engineering judgment.

## Input gate

Begin only when the answers to "Why are we doing this?" and "What are we building?" are understood.
Use the agreed answers from the shaping conversation when they are available. Otherwise, restate
the problem, desired outcome, and meaning of success and ask the user to confirm them before
choosing a solution.

Treat confirmed intent and constraints as inputs. Do not silently change the intended outcome to
fit the current architecture. If technical discovery reveals a conflict, bring it back to the user
explicitly.

## Learn the existing system

Inspect only enough of the codebase to understand:

- the external entry point for the behavior;
- one or two comparable flows and the conventions they establish;
- the domain and persistence boundaries the slice will cross;
- the domain language, invariants, state transitions, and existing ownership of the rules;
- the contracts that must remain compatible;
- how similar behavior is verified.

Read repository guidance before proposing changes. Prefer existing patterns and responsibilities
over new abstractions. Ask the user about intent and material tradeoffs; answer factual codebase
questions by inspecting the code.

Consult authoritative documentation when an external framework, protocol, or service contract
matters and the answer is not established locally. Do not ask the user to research facts the
assistant can establish.

Separate current behavior from proposed behavior throughout the sketch.

## Work in vertical slices

A vertical slice is the smallest coherent path that produces an observable part of the desired
outcome. It begins at an external boundary and follows the behavior through every layer it needs,
then returns or exposes a result.

Examples of external boundaries include an HTTP route, user interaction, command, event, job, or
public method. A slice may cross a handler, domain behavior, persistence, and an external
integration. Crossing many layers does not make it too large; combining unrelated outcomes does.

Define slices in terms of behavior, not technical components.

Account for the full feature by identifying all behaviorally distinct slices. Keep important
error, authorization, empty, and recovery paths visible, either within the main slice or as later
slices when they represent separate outcomes.

## Model the domain

Use the language of the agreed problem in names and contracts. When a slice reaches domain
behavior, identify the concepts, invariants, valid states and transitions, and the owner of each
rule. Keep transport and persistence details at the boundaries instead of letting them define the
domain model.

Mine the vocabulary already used in the agreed intent and relevant code before inventing terms.
Prefer plain names that express the domain outcome rather than the mechanism, fit the host
project's idioms, and carry the same nouns and verbs across every human-readable surface the slice
touches: contracts, call sites, state, tests, errors, events and logs, and UI copy.

Prefer a structure that encodes real constraints over scattered conditionals, synchronized
booleans, loose parameters, or repeated shape assumptions. A value object, state machine, domain
collection, command or event, lookup, or cohesive module is useful only when it makes rules
explicit, invalid states harder to represent, or behavior easier to change safely.

Do not force tactical DDD patterns. Prefer boring local code when the behavior is already clear
and local; an abstraction must remove duplicated rules, branching, invalid states, or lifecycle
risk rather than merely add indirection.

Keep each proposed method's steps at one level of abstraction from its caller's point of view. If
a domain flow mixes intention with transport, persistence, or other lower-level mechanics, place
those details behind intention-revealing operations so the slice remains readable outside-in.

## Sketching workflow

- **Identify observable scenarios.** Derive each actor, trigger, external boundary, and result from
  the agreed answers instead of asking the user to enumerate them.
- **Sketch the high-level solution.** Recommend and justify the contracts, interactions, and flows;
  wait for confirmation unless a small, fully settled change warrants an announced skip.
- **Shape the code outside-in.** Trace each slice from its boundary through call paths and data
  changes to its observable result, marking names provisional unless code or contract establishes
  them; place domain rules with the concept that owns them; for multi-slice features, present one
  slice at a time and invite correction as you go.
- **Design one slice end-to-end at a time.** Complete each proposed path before designing the next,
  attach prerequisites to the first slice that needs them, and state how its behavior will be
  verified rather than verifying the proposed call graph; slice order describes the design, not
  the implementation sequence.
- **Resolve material decisions.** Recommend choices affecting contracts, ownership, data integrity,
  compatibility, or slice boundaries; keep genuine tradeoffs and unresolved risks visible. When a
  material fork depends on observable behavior, run the smallest isolated throwaway experiment
  that can decide it, retain the evidence, and discard the experiment.
- **Check completeness and confirm.** Map every observable success condition to a slice and every
  code change to a scenario, remove unsupported work, and ask for correction before implementation.

Develop and confirm the solution in conversation. Do not create a standalone document or file
unless the user asks. For a small fix, one slice with a short code shape and one verification can
be the entire sketch.

If implementation repeatedly requires workarounds, type escapes, boundary leaks, or departures
from the agreed ownership and contracts, treat that friction as evidence against the sketch.
Return to sketching and revise the design rather than normalizing the escapes.

## Boundaries

Do not:

- implement the solution while sketching it;
- proceed from an unconfirmed problem or desired outcome;
- design all changes in one layer before following an end-to-end path;
- introduce abstractions for hypothetical future requirements;
- scatter domain rules across handlers, conditionals, or data shapes when one concept can own them;
- force DDD patterns when the behavior is already clear and local;
- prescribe internal structure that existing conventions already settle differently;
- confuse a file inventory with a call path;
- produce diagrams or other artifacts that do not clarify a decision;
- hide uncertainty behind exact names or signatures.

## Quality check

Before finishing, verify that:

- the high-level solution explains the complete behavior;
- public and external contracts are explicit where they matter;
- each slice produces an observable outcome;
- each slice is traced from its boundary through all required layers;
- method signatures, schema changes, call graphs, and file changes agree with one another;
- every success condition is covered;
- shared work has a clear owning slice or a justified prerequisite;
- domain language matches the agreed problem and remains consistent across the surfaces each slice
  touches, and each invariant or state transition has a clear owner;
- domain structures remove duplicated rules or invalid states rather than only adding indirection;
- the sketch follows the existing system unless a deliberate change is explained;
- the sketch makes a clear recommendation instead of merely collecting questions and options;
- implementation can begin without rediscovering the overall design.
