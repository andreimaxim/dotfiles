---
name: shape
description: Shape a change through design discussion grounded in codebase research. Use after research to align on current state, desired end state, fat-marker design, patterns to follow, new or changed interfaces, and open questions before implementation.
---

# Shape

Use this skill to turn research into shared understanding of the domain problem and the solution shape.

This is the step between **research** and **implementation**. The goal is not to write implementation steps. The goal is to reach shared understanding between the user and the agent about the domain problem, the target end state, and the boundaries, invariants, and responsibilities that should shape the implementation. The shape document is the artifact of that shared understanding — not a substitute for it.

## Purpose

This skill answers two questions:
1. **Where are we going?**
2. **What does the final solution look like?**

It combines:
- evidence from `/skill:research`
- ubiquitous language refinement
- lightweight domain modeling
- careful naming of domain concepts, roles, and interactions
- iterative design discussion with the user
- fat-marker design thinking that leaves implementation freedom

## Preconditions

Prefer to run this skill **after** research exists.

If the user provides a research document or research summary:
- read it fully first
- treat it as the factual base for the design discussion

If no research exists:
- ask for the relevant research, or
- offer to run `/skill:research` first

Do not pretend a design decision is grounded if the underlying codebase facts were never verified.

## Core Rules

### This is design, not implementation planning
- Do not jump straight to code changes.
- Do not write a phase-by-phase plan.
- Do not produce large code blocks unless the user explicitly asks for a sketch.
- Keep the discussion focused on end state, boundaries, responsibilities, interactions, invariants, and tradeoffs.

### Fat marker, not fine marker
The shape should define the broad silhouette of the solution:
- what new capability will exist
- which boundaries will change
- which interfaces will be introduced or modified
- which responsibilities belong to which components
- which invariants must hold

The shape should **not** lock down:
- private method decomposition
- incidental refactors discovered during coding
- exact extraction choices that only become obvious during implementation
- file-by-file tactical steps

### Stay grounded in verified facts
- Use research findings and direct code reading as the source of truth.
- Include file + line references for current-state claims.
- Include short evidence snippets when they help anchor the design.
- If a design discussion depends on an unverified assumption, pause and verify it.
- Separate:
  - verified current state
  - desired end state
  - unresolved questions

### Push back on weak framing
- Do not default to agreement just because the user proposed an approach.
- When the user's framing, preferred design, or constraints seem weak, say so plainly and respectfully.
- Test proposals against research, existing codebase patterns, domain boundaries, likely failure modes, and unnecessary complexity.
- Surface tradeoffs, counterarguments, and simpler alternatives when they materially improve the design discussion.
- If a proposal conflicts with verified facts or established patterns, explain the conflict explicitly instead of smoothing it over.
- Do not manufacture objections for the sake of appearing critical; push back only when there is a concrete reason.

### Propose alternatives
- During the conversation, actively offer plausible alternative solutions rather than only critiquing the user's proposal.
- Prefer 2-3 concrete alternatives when the design space is still open, but do not force the discussion into only 2-3 if 5-8 materially distinct options are real.
- For each alternative, explain why it might be better, worse, simpler, safer, faster, or more aligned with the existing system.
- Do not force a single recommendation when multiple solutions remain plausibly good.
- If the design is still exploratory, it is acceptable to leave several viable options on the table.
- When multiple options remain open, define how they should be compared: success criteria, evaluation dimensions, or spike questions.
- If one option is clearly the default or least risky path, say so directly, but still preserve the other credible options.

### Drive toward shared understanding
The conversation is not a questionnaire. It is a joint effort to reach shared understanding of the domain, the problem, and the solution shape. Every question should move closer to that understanding.
- Ask one question at a time. Walk down each branch of the design tree, resolving dependencies between decisions before moving to the next branch.
- For each question, provide a recommended answer. The user should be able to agree, disagree, or refine — not start from a blank page.
- If a question can be answered by exploring the codebase, explore the codebase instead of asking.
- Summarize understanding before moving on to a new branch.
- Give the user chances to correct the design direction early.

## Workflow

### Step 1: Establish the factual base
Read all mentioned files fully before discussing design:
- research documents
- tickets
- docs
- related code files if directly referenced

Then summarize:
- the current domain and system behavior
- the desired capability or behavioral change
- verified facts vs design unknowns

### Step 2: Build a research-backed preamble
At the beginning of the shape document, include a **Research Basis** section.
This is a digest, not a full copy of the research document.

Include:
- the research source document(s), if any
- the key findings that matter for design
- the most relevant code references
- 1-3 short evidence snippets when useful
- the research unknowns that still affect shaping

The shape should be reasonably self-contained for a human implementer, but it should not duplicate the entire research artifact.

### Step 3: Frame the design discussion
Drive a conversation that clarifies:
- the problem being solved
- actors and roles
- domain objects
- interactions between those objects
- invariants and edge cases
- boundaries and out-of-scope decisions
- existing patterns that should be followed
- where the current proposal may be overreaching, under-specified, or mismatched with the problem
- what alternative solution shapes are available
- how competing alternatives would be evaluated if more than one remains viable

Useful question types:
- What problem does this change solve?
- Who are the actors involved?
- What objects or concepts participate?
- What domain action or state transition occurs here?
- What invariants must hold after this change?
- What is explicitly not part of this work?
- Which existing pattern in the codebase should this resemble?
- What is the simplest version that would solve the problem?
- Why is the proposed direction better than keeping the current behavior?
- What are the strongest reasons not to do it this way?
- What are the viable alternative ways to shape this?
- Which options are meaningfully different versus cosmetic variations?
- How would we decide whether option A is better than option B?
- What success criteria, measurements, or spike outcomes would reduce the uncertainty?

### Step 4: Surface domain concepts and refine the ubiquitous language
Use naming to clarify the design.
Look for:
- nouns: objects, entities, concepts
- verbs: actions, transitions, responsibilities
- roles: how one object relates to another in a specific interaction
- boundaries: where framework plumbing ends and domain logic begins

Challenge vague language gently.
Examples:
- `user` may really mean `author`, `buyer`, `subscriber`, `operator`, or `tenant`
- `process` may really mean `enqueue`, `reticulate`, `register`, `approve`, or `synchronize`

### Step 5: Resolve design decisions explicitly
As the conversation progresses, maintain an explicit record of:
- decisions that are resolved
- decisions that are provisional
- alternatives that were considered
- evaluation criteria or spike questions for unresolved alternatives
- questions that remain open

Do not bury open questions inside other sections.

### Step 6: Propose candidate spikes when uncertainty blocks design
When a design decision cannot be resolved through discussion alone — because the answer depends on runtime behavior, performance characteristics, library capabilities, or integration details that no one in the conversation can verify — propose a spike.

A spike is a small, time-boxed experiment designed to answer a specific question. It is not a prototype, not a proof of concept, and not an excuse to start building.

For each candidate spike:
- state the design question it answers
- describe the smallest experiment that would answer it
- define what a conclusive result looks like
- explain how the result feeds back into the design (which decision it unblocks, which alternatives it eliminates)

Do not propose spikes for questions that can be answered by reading code, checking documentation, or reasoning from known constraints. Spikes are for empirical uncertainty, not analytical laziness.

If no decisions are blocked by empirical uncertainty, skip this step.

### Step 7: Produce the shape document
When the discussion has converged, produce a concise design document.
It should contain:
- research basis
- current state
- desired end state
- fat-marker design
- alternatives considered
- evaluation criteria / decision framework
- candidate spikes when needed
- new or changed interfaces
- patterns to follow
- constraints / invariants
- resolved design decisions
- open questions
- out of scope

Helpful optional sections:
- domain objects
- interactions
- expected behaviors
- implementation guardrails
- rabbit holes / no-gos
- code references

### Step 8: Present on screen by default; save only when explicitly asked
By default, present the shape document in the chat.

Only write a file when the user explicitly asks to save the result.
If they provide a path, use that path.
If they ask to save but do not provide a path, ask where they want it saved.

If saving, use a structure like:

```markdown
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

### Research Sources
- `/path/to/research-document.md`

### Key Findings
- `path/to/file.ts:10-40` - what exists today

### Evidence Snippets
```ts
// short current-state excerpt
```

What this establishes.

### Research Unknowns
- ...

## Current State
[Grounded in research and code references]

## Desired End State
[What should be true when this work is complete]

## Fat Marker Design
[The broad silhouette of the solution: boundaries, responsibilities, and major interactions]

## Alternatives Considered
- Option A: ...
- Option B: ...
- Option C: ...

## Evaluation Criteria / Decision Framework
- Criterion 1: ...
- Criterion 2: ...
- How we would compare the options: ...

## Candidate Spikes
- Spike A: what uncertainty it resolves
- Spike B: what uncertainty it resolves

## New or Changed Interfaces
- New endpoint / command / event / payload / repository capability
- Boundary-level inputs and outputs
- Responsibilities at the boundary, not private internals

## Patterns to Follow
- `path/to/file.ts:10-40` - existing pattern and why it matters

## Constraints / Invariants
- ...

## Resolved Design Decisions
- ...

## Open Questions
- ...

## Out of Scope
- ...
```

## Conversation Style

- Use the user's language, but refine it when better domain names emerge.
- Prefer short summaries and bullets over essays.
- Be polite but willing to disagree when the facts or design constraints point elsewhere.
- If something is tentative, say so directly.

## Guardrails

Stop and clarify when:
- the user is asking for implementation details rather than design
- the research foundation is missing or contradictory
- multiple different problems are being shaped at once
- naming is still too vague to support clear design

If implementation later reveals a design-level discovery, revise the shape document rather than pretending the earlier shape was complete. The shape should guide a human or agent implementer without over-determining the code.