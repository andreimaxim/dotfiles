---
name: research
description: Turn a task, ticket, or vague implementation request into neutral research questions, then investigate the codebase and report only verified facts with citations and short evidence snippets. Use before shaping a change.
---

# Research

Outcome: a factual map of the current system that answers neutral research questions, grounded in code references and short evidence snippets. Use before shaping a change.

This skill creates a clean fact-finding phase that is decoupled from design and implementation.

## Calibrate to the Question

Treat the sections below as constraints and shortcuts, not a checklist. A small targeted question earns a tight answer with a few citations; a broad system trace earns the full report. Match the depth of the answer to the depth of the question.

## When to Use

- understand how something currently works
- map codebase areas related to a feature or bug
- trace data flow, control flow, or system boundaries
- gather evidence before `/skill:shape`
- turn a ticket into better research questions

This skill is **not** for implementation planning or solution design.

## Invariants

- Document what is, not what should be. No recommendations, no implementation planning, no architecture critique, and no root-cause analysis unless the user explicitly asks.
- Separate verified findings, working assumptions, and unresolved unknowns. Label inferences as inferences.
- Every factual claim has a `path/to/file:line` reference; evidence snippets are short and labeled with what they prove.

## Convert Implementation Requests to Research Questions

If the user gives a task phrased as implementation work, do not research the task literally. Convert it into neutral questions about the current system before reading code.

Example:
- *Implementation request:* `add a new endpoint to reticulate splines across tenants`
- *Research framing:* `Explain endpoint registration in the backend, trace all spline-related flows, and identify workers involved in reticulation.`

Good research questions focus on existing behavior, structure, and interactions. They avoid solution language and map user intent onto concrete codebase areas.

If the original framing is implementation-heavy, offer a rewritten research framing and ask the user to confirm before investigating.

## Collaboration Style

If the request is vague, ask 2–4 targeted questions before reading code. Useful things to learn: what prompted the research, what outcome the user wants, what terms or paths are already known, and what is out of scope. If the user already provided enough, summarize it back instead of asking unnecessary questions.

If the user mentions specific files, docs, tickets, or research notes, read them fully before broader exploration. Treat them as input context, not as ground truth about the implementation.

Use the user's terminology; normalize when vague.

## Success Criteria

- The report answers the research questions; nothing more.
- Every factual claim has a citation; snippets are minimal evidence, not bulk dumps.
- Verified findings, assumptions, and unknowns are clearly separated.
- Unknowns are listed explicitly, not buried in prose.
- A reader can act on the result without re-reading the code paths cited.

## Deliverable

By default, present the research in the chat.

Only write a file when the user explicitly asks to save the research. If they provide a path, use it. If they ask to save without a path, ask where. If saving follow-up research into an existing document, append a new section instead of rewriting history.

When useful, organize by sections such as: Entrypoints, Data Flow, Control Flow, Key Types / Objects, Integration Points, Tests / Existing Patterns, Unknowns.

If saving, use a structure like:

````markdown
---
date: 2026-03-18T12:34:56Z
topic: "How endpoint registration and spline reticulation work"
---

# Research: How endpoint registration and spline reticulation work

## Research Question
[original user request]

## Refined Research Questions
- ...

## Summary
- ...

## Detailed Findings

### Area
- `path/to/file.ts:10-40` - factual description

### Evidence Snippets

```ts
// short excerpt
```

What this shows and why it matters.

## Code References
- `path/to/file.ts:10-40` - what is there

## Unknowns
- ...
````

## Style

Concrete, neutral, evidence-first. Prefer bullets over long prose. Label inferences as inferences.

## Guardrails

Stop and clarify when:
- the user wants recommendations rather than research
- the request mixes multiple unrelated areas and needs scoping
- the user refers to a file or ticket that does not exist
- the codebase evidence conflicts with the user's description

If the user asks for recommendations after the research is complete, provide them as a clearly separate section or suggest moving to `/skill:shape`.

## Handoff

A good outcome is:
1. a set of refined research questions
2. a factual map of the current codebase with citations and evidence snippets
3. a saved research document if requested
4. enough shared understanding to move into `/skill:shape`
