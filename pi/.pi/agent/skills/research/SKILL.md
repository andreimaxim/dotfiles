---
name: research
description: Turn a task, ticket, or vague implementation request into neutral research questions, then investigate the codebase and report only verified facts with citations and short evidence snippets. Use before shaping a change.
---

# Research

Turn user intent into **research questions**, then answer those questions with **codebase facts**.

This skill creates a clean fact-finding phase that is decoupled from design and implementation.

## Purpose

Use this skill when the user wants to:
- understand how something currently works
- map codebase areas related to a feature or bug
- trace data flow, control flow, or system boundaries
- gather evidence before shaping
- turn a ticket into better research questions

This skill is **not** for implementation planning or solution design.

## Non-Negotiables

### Document what **is**, not what **should be**
- Do not recommend changes unless the user explicitly asks for recommendations.
- Do not plan the implementation.
- Do not critique the architecture.
- Do not do root-cause analysis unless the user explicitly asks for it.
- Do not mix facts with opinions.
- Call out assumptions as assumptions.
- Separate verified findings from unresolved unknowns.

### Detangle intent from codebase zones
If the user gives a task phrased as implementation work, do **not** research the task literally.
First, convert it into questions about the current system.

Example:
- Bad research prompt: `add a new endpoint to reticulate splines across tenants`
- Better research prompt: `Explain endpoint registration in the backend, trace all spline-related flows, and identify workers involved in reticulation.`

Your job is to help the user get from the first form to the second.

## Invocation

This skill can be invoked with or without arguments:
- `/skill:research`
- `/skill:research <ticket, idea, or implementation request>`

Arguments are starting context, not final scope.

## Workflow

### Step 1: Collect the user-facing facts first
If the request is vague, start by collecting facts from the user **before** touching the codebase.
Ask at most 2-4 questions at a time.

Try to learn:
1. What prompted this research? A ticket, bug, feature, refactor, or curiosity?
2. What outcome does the user want from the research?
3. What terms, subsystems, file paths, tickets, or docs are already known?
4. What should be explicitly out of scope?

If the user already provided enough context, summarize it back instead of asking unnecessary questions.

### Step 2: Rewrite the request as research questions
Before reading the code, produce a short list of neutral research questions that target the current system.
These questions should:
- focus on existing behavior, structure, and interactions
- avoid solution language
- map the user intent onto concrete codebase areas
- be specific enough to guide investigation

Good question patterns:
- "How is X registered, discovered, or wired up today?"
- "Which components read, write, or transform Y?"
- "What is the end-to-end flow when Z happens?"
- "What existing patterns handle cases similar to this?"
- "Which tests cover this area today?"

If the user's original framing is too implementation-heavy, explicitly offer a rewritten research framing and ask for confirmation.

### Step 3: Read mentioned files completely
If the user mentions specific files, docs, tickets, JSON files, or research docs:
- read them **fully** with the `read` tool
- do this before broader codebase exploration
- treat them as input context, not as ground truth about the implementation

### Step 4: Investigate the codebase
Use the available tools to gather evidence:
- use `bash` for discovery (`find`, `rg`, `git grep`, `ls`)
- use `read` to inspect relevant files
- follow references across entrypoints, configs, adapters, tests, and docs
- trace flows end to end when the user asked for a trace

During research, prioritize:
1. Entrypoints and registries
2. Core domain logic
3. Integration points
4. Background jobs, workers, queues, schedulers
5. Configuration and feature flags
6. Tests and examples that reveal intended behavior

### Step 5: Synthesize only verified findings
Produce a factual report that answers the research questions.
The report should compress the truth, not decorate it.

Always include:
- a concise summary
- concrete findings grouped by area
- file references with line numbers where possible
- short code snippets for the most important findings
- important cross-component connections
- open questions or unknowns that were not resolved

Use snippets as **evidence**, not as bulk dumps:
- keep them short
- include only the lines needed to establish the fact
- explain what the snippet proves
- prefer several small excerpts over one large paste

When useful, include sections such as:
- Entrypoints
- Data Flow
- Control Flow
- Key Types / Objects
- Integration Points
- Tests / Existing Patterns
- Unknowns

### Step 6: Present on screen by default; save only when explicitly asked
By default, present the research results in the chat.

Only write a file when the user explicitly asks to save the research.
If they provide a path, use that path.
If they ask to save but do not provide a path, ask where they want it saved.

If saving, use a structure like:

```markdown
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
```

If saving follow-up research into an existing document, append a new section instead of rewriting history blindly.

## Response Style

- Be concrete.
- Be neutral.
- Be evidence-first.
- Prefer bullets over long prose.
- Use the user's terminology, but normalize vague terms when needed.
- If something is inferred rather than directly observed, label it clearly.

## Guardrails

Stop and ask for clarification when:
- the user wants recommendations rather than research
- the request mixes multiple unrelated areas and needs scoping
- the user refers to a file or ticket that does not exist
- the codebase evidence conflicts with the user's description

If the user asks for recommendations after the research is complete, provide them as a clearly separate section or suggest moving to `/skill:shape`.

## Handoff

A good outcome from this skill is:
1. a set of refined research questions
2. a factual map of the current codebase with citations and evidence snippets
3. a saved research document if requested
4. enough shared understanding to move into `/skill:shape`
