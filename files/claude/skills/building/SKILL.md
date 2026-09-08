---
name: building
description: Builds agreed Shape Up solutions through emergent vertical scopes. Use when asked to implement a shaped brief or continue an active Shape Up build; not for routine coding changes.
---

# Building

Own the complete requested outcome, not just the first implementation or an initial task list.
Start from an agreed brief or an equivalent request; no separate artifact or approval is needed
when the request already settles the relevant choices. Use `shaping` for material unresolved
product or architecture decisions, not missing paperwork. Small settled changes need no orchestration.

## Build through evidence

Discover coherent, independently verifiable vertical scopes in real code. Start with a central path
that confronts costly uncertainty, integrate it, and use what it reveals to choose the next scope.
Keep required behavior and quality fixed while allowing flexible breadth and implementation detail
to change. Progress means unknown becoming understood and then verified, not task counts.

The following lenses are inline guidance, not mandatory stages or separate skills to load.

### Orient and discover scopes

Follow the relevant entry point through rule ownership and observable effects, grounded in repository
guidance, comparable flows, and behavior evidence. Distinguish intended direction from legacy
accidents. Find a meaningful starting point, not a complete repository map or architecture.

Draw scopes around independently integrable and verifiable outcomes, not layers, files, or people.
Split work with independent outcomes or unknowns; combine fragments that produce nothing useful
alone. Let boundaries and tasks emerge from implementation rather than an exhaustive upfront plan.

Track **unknown → understood → verified**. Understood means the approach has enough evidence that
remaining work is visible; verified means integrated behavior works. New evidence can move work
backward. State labels are optional; activity and task counts are not substitutes for this distinction.
Keep the scope map only as detailed as needed to choose the next move, and report material changes.

### Tidy when it pays

Compare the smallest behavior-preserving preparation with changing behavior directly. Weigh immediate
reduction in risk or complexity against verification, migration, review cost, and the chance the
behavior change will discard the tidy.

**Tidy first** when bounded, separately verifiable preparation materially helps the imminent change.
**Tidy later** when useful but not required. **Do not tidy** when benefit is speculative, aesthetic,
or smaller than the cost. A short rationale is enough. Make preserved behavior clear and complete
and verify a tidy-first change before changing behavior. Keep later work outside the scope unless
requested; do not create a speculative backlog or hide behavior changes in refactors.

### Implement a vertical result

Complete the smallest end-to-end path that produces the selected scope's observable result within
the agreed outcome.

**Test the resulting contract, not the patch's history.** Prefer assertions about required outcomes
over checks that removed fields, classes, or calls no longer exist. Assert absence when absence is
itself part of the contract—for example, no secret in a public response or no duplicate charge—not
merely because something disappeared from the patch. Existing tests that pin internal collaborations
do not make those collaborations requirements.

Verify the integrated result proportionately and carry discoveries and remaining uncertainty into
the next scope.

### Steer when work stalls or strains the boundary

Distinguish newly required work from optional polish, pre-existing problems, and excluded ideas.
Is the scope stuck because its boundary is incoherent, or because a material question is unsolved?
Revise the scope map and next move accordingly. When work still fits, continue; this is not a routine
checkpoint or permission to turn implementation into cleanup.

## Adapt locally; escalate consequential changes

**Preserve the required outcome, not the current arrangement of code.** Treat the sketch as a
starting design. Step back from the edited method when the real issue is how responsibilities are
divided, and use broader programming knowledge to spot useful alternatives before friction forces
reconsideration.

Adapt local names, decomposition, and implementation within agreed behavior, ownership, public
contracts, scope, and fixed constraints. Bring consequential improvements to the developer with
their benefit and cost before implementing them. A suggestion is not itself a blocker: continue
independent authorized work unless a decision is needed to proceed.

Repeated workarounds, type escapes, boundary leaks, or duplicated representations are signals to
investigate, not automatic approval gates. Use the de-risking guidance in `shaping` when a named
assumption could materially change the shape.

Do not cut required behavior or fixed constraints without the developer's decision. Reduce optional
breadth before correctness, security, or data integrity. Keep unrelated work outside the scope.

## Continue to completion

A completed scope is an internal milestone, not a user-review gate. Continue through integration,
proportionate verification, and fixes caused by the requested change until the authorized outcome
is complete or a genuine blocker needs the user. Honor an explicitly requested review stop.

Compare the complete change with the agreed outcome and original baseline, not an imagined perfect
system. Inspect the relevant diff and verification evidence for required and unchanged behavior,
fixed constraints, and material compatibility or operational obligations. Optional polish must not
become an accidental blocker; temporary experiments and unsupported generality are not the outcome.

Distinguish **ready**, **incomplete**, and **needs reshaping**. Finish known required work within the
authorized boundary; investigate uncertainty and return consequential contradictions or scope changes
to the developer. A requested separate code review uses `reviewing-code`, not as a substitute for
direct verification.

Report decisive evidence and any remaining limitation. Implementation authorization does not itself
authorize pushing, deploying, releasing, or production writes; obtain explicit authorization for
shared-state actions. If that is the only remaining step, report the implementation as ready for it.
