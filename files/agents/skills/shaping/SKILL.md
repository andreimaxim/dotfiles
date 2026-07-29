---
name: shaping
description: >-
  Shapes initial bug reports, feature requests, and product ideas into aligned, nontechnical
  answers explaining why the work matters and what behavior should exist. Use at the start of
  work, before solution design or implementation, to align on user pain, desired outcome, and
  observable success.
---

# Shaping

Turn an initial idea into a shared understanding of the problem and the desired outcome before
discussing how to implement it.

## Goal

Produce clear answers to two questions:

### Why are we doing this?

State the affected user's goal, the problem they experience today, and why it matters.

### What are we building?

Describe the capability or behavior that should exist when the work is complete.

The conversation is successful when the user and assistant agree on both answers. Producing
structured text is not a substitute for reaching that agreement.

## Working stance

Act as an informed collaborator, not a passive interviewer or transcriptionist. Use domain
knowledge, common product and workflow patterns, and available evidence to build a plausible
working model. Surface likely pains, hidden assumptions, alternative interpretations, and
clearer outcome language when they sharpen the intent.

Lead with a proposed understanding. Prefer "I think the problem is X because Y; is that
accurate?" over asking the user to formulate everything from scratch. The user remains the
authority on their context and priorities: distinguish observed facts from informed hypotheses,
explain the basis for important inferences, and make them easy to correct.

Use knowledge to reduce the user's burden, not to display breadth, manufacture requirements, or
expand the scope.

## Boundaries

Stay at the level of user-visible or externally observable behavior. Details such as where an
action happens, what a user can accomplish, or which error they no longer encounter belong in
this discussion.

Do not:

- choose architecture, storage, frameworks, APIs, classes, or other implementation details;
- inspect the codebase to design a solution;
- turn assumptions into requirements;
- invent business impact, metrics, constraints, or user needs;
- expand the request into adjacent improvements;
- estimate effort or create an implementation plan.

Use available code, tests, logs, and reproduction steps to establish current behavior and answer
factual questions rather than asking the user to supply facts that can be observed directly.
Investigate to understand the problem, not to choose or design its solution.

If the user introduces a technical solution, preserve any constraint they explicitly require,
then propose the problem or outcome you infer behind it and ask the user to confirm or correct
that interpretation. Do not challenge a firm constraint merely to keep the answers nontechnical.

## Alignment

Move among these activities as needed; they are not a fixed sequence.

### Develop and reflect a working model

Use the request, available evidence, and relevant domain knowledge to form the best current
interpretation. Briefly restate:

- who is affected;
- what they are trying to do;
- what prevents or frustrates them today;
- what would be different after the work succeeds.

Include a likely interpretation when the input leaves one of these implicit. Label it as a
hypothesis rather than presenting it as a fact the user supplied.

### Resolve material ambiguity

First answer as much as possible from the request, observable evidence, and well-established
patterns. For each remaining material gap, offer the most plausible interpretation and its basis,
then ask the user to confirm or correct it. Ask an open-ended question only when there is no
responsible hypothesis to offer.

Ensure the working model accounts for:

- who experiences the problem and in what situation;
- what they are trying to accomplish;
- what happens today;
- why the current behavior is painful or insufficient;
- what they should be able to do instead;
- what observable result would demonstrate success.

Ask only questions whose answers could change the problem or desired outcome. Prefer a short
conversational exchange over a questionnaire, and ask one question at a time when the answer
determines what to ask next. Proactively surface an overlooked interpretation or consequence when
it could materially change the intent, but avoid exhaustive lists of possibilities.

If the user does not know an answer and no evidence supports a likely answer, keep it as an open
question rather than filling the gap.

### Test alignment

Summarize the emerging intent in plain language:

> The problem is ...
>
> We will know this is successful when ...

Ask the user to correct the summary. Continue until corrections no longer change the central
problem or outcome. Do not prolong discovery to settle details that can safely remain open.

Do not present the answers as final in the same message as the first summary. Wait for the user's
response unless their initial request itself answers every material question without relying on
unconfirmed hypotheses.

### State and confirm the answers

Keep the answers in the conversation. Do not create or save a file unless the user asks.

Scale the answers to the work. For a small fix, one sentence per question may be enough.

Write the answers so each sentence can be confirmed or corrected on its own: name the actor, use
active voice and concrete verbs, state one main idea per sentence, make conditions and referents
explicit, and use one consistent name for each user, action, and object across both answers. Keep
the user's domain terms, and keep hypothesis and open-question labels—clarity means resolving
ambiguity, not hiding it.

Use this format:

```markdown
## Why are we doing this?
[Who is affected, what they are trying to accomplish, what happens today, and why it matters.]

## What are we building?
[The capability or behavior that should exist and the observable result that demonstrates success,
without prescribing its implementation.]
```

Success may be qualitative. Examples include completing an action directly from the relevant
screen, finishing a workflow with fewer obstacles, or performing an action without receiving an
error. Do not manufacture a numeric target when the user has not supplied one.

Present the answers as the current shared understanding and ask for corrections. Incorporate the
user's language where it is more precise than generalized product terminology. The answers are
ready for sketching only after the user confirms that they capture their intent.
