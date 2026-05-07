---
name: shape
description: Shape a change through design discussion grounded in codebase research. Use after research to align on current state, desired end state, fat-marker design, patterns to follow, new or changed interfaces, and open questions before implementation.
---

# Shape

Outcome: a fat-marker design document that captures shared understanding of the current system, the desired end state, the boundaries and responsibilities that should shape the implementation, the alternatives considered, and the open questions that remain. The document is the artifact of shared understanding — not a substitute for it.

The conversation that produces it sits between research and implementation.

## Calibrate to the Question

Treat the sections below as constraints and shortcuts, not a checklist. A small bounded change earns a tight document with only the essential sections; a substantial cross-system change earns the full template. Match the depth of the design discussion to the depth of the change.

## Preconditions

This skill assumes research exists. If the user provides a research document or summary, read it fully before discussing design and treat it as the factual base.

If no research exists, ask for it or offer to run `/skill:research` first. Do not pretend a design decision is grounded if the underlying codebase facts were never verified.

## Invariants

- This is design, not implementation. No phase-by-phase plan, no large code blocks unless the user asks for a sketch.
- Stay grounded in verified facts. Every current-state claim has a code reference. Separate verified findings, working assumptions, and unresolved questions.
- Fat marker, not fine marker. Define the broad silhouette — capabilities, boundaries, interfaces, responsibilities, invariants. Leave private decomposition, incidental refactors, and file-by-file tactical steps to implementation.

## Collaboration Style

The conversation is a joint effort to reach shared understanding — not a questionnaire. Every question should move closer to that understanding.

- Push back when the user's proposal conflicts with the research, an existing pattern, a simpler alternative, or a likely failure mode. Be candid about the conflict; do not smooth it over. Do not manufacture objections to appear critical.
- Offer concrete alternatives when the design space is open. 2–3 is usually right; allow 5–8 when the options are genuinely distinct. For each, explain why it might be better, worse, simpler, safer, or more aligned with the existing system. If one path is clearly the default or least risky, say so directly while preserving the other credible options. When multiple options stay viable, name how they should be compared — criteria, dimensions, or spike outcomes.
- Resolve one decision branch at a time. Summarize understanding before opening a new branch. For each open question, propose a recommended answer the user can agree with, refine, or reject — not a blank prompt.
- If a question can be answered by reading the code, read it instead of asking.
- Refine vague language as the conversation progresses; for naming work that goes beyond surface refinements, defer to `/skill:domain-language`.

## Spikes

When a design decision depends on empirical answers no one in the conversation can verify — runtime behavior, performance, library limits, integration details — propose a small time-boxed experiment. State the question it answers, the smallest experiment that would answer it, what a conclusive result looks like, and which decision it unblocks. A spike is not a prototype, not a proof of concept, and not an excuse to start building. Skip this entirely when nothing is blocked by empirical uncertainty.

## Success Criteria

- Every current-state claim has a code reference.
- The design names boundaries, interfaces, responsibilities, and invariants — not method signatures.
- Alternatives are real and comparable; the default path is identified when one exists.
- Open questions are listed explicitly, not buried in prose.
- A competent implementer could pick up the document and proceed without asking what was meant.

## Deliverable

By default, present the shape document in the chat.

Only write a file when the user explicitly asks to save the result. If they provide a path, use it. If they ask to save without a path, ask where.

If saving, use a structure like:

````markdown
---
date: 2026-03-18T12:34:56Z
topic: "Shape spline reticulation across tenants"
based_on:
  - /path/to/research-document.md
---

# Shape: Spline reticulation across tenants

## Context
[What we are changing and why]

## Research Basis
- Source documents
- Key findings, with `path/to/file.ts:10-40` references
- 1–3 short evidence snippets when useful
- Research unknowns that still affect shaping

## Current State
[Grounded in research and code references]

## Desired End State
[What should be true when this work is complete]

## Fat Marker Design
[The broad silhouette: boundaries, responsibilities, major interactions]

## Alternatives Considered
- Option A: ...
- Option B: ...
- Option C: ...

## Evaluation Criteria / Decision Framework
[How options should be compared, when more than one remains viable]

## Candidate Spikes
[When empirical uncertainty blocks a decision]

## New or Changed Interfaces
[Boundary-level inputs, outputs, and responsibilities — not private internals]

## Patterns to Follow
- `path/to/file.ts:10-40` — existing pattern and why it matters

## Constraints / Invariants
- ...

## Resolved Design Decisions
- ...

## Open Questions
- ...

## Out of Scope
- ...
````

Optional sections when they help: domain objects, interactions, expected behaviors, implementation guardrails, rabbit holes, code references.

If implementation later reveals a design-level discovery, revise the shape document instead of pretending the earlier shape was complete.

## Response Style

Use the user's language; refine it when better domain names emerge. Prefer short summaries and bullets over essays. State tentative conclusions tentatively. Be willing to disagree when facts or design constraints point elsewhere.

## Guardrails

Stop and clarify when:
- the user is asking for implementation details rather than design
- the research foundation is missing or contradictory
- multiple unrelated problems are being shaped at once
- naming is too vague to support clear design
