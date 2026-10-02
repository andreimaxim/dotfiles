---
name: handing-off-to-claude
description: Delegates implementation to Opus or independent, read-only consultations to Fable through Claude Code. Use when the user asks Claude to implement, review, give a second opinion, or act as an oracle, and when resolving questions within that handoff. For local checkouts, not orbs.
builtin-tools:
  - claude_implement
  - claude_consult
---

# Handing off to Claude

Delegate a bounded task, not the conversation. Amp remains the user's assistant.

## A self-contained handoff

Claude cannot see this Amp conversation. Prepare a brief of the agreed outcome, constraints,
and decisions, distinguishing what is settled from what remains open. Preserve the shaping
already done with the user rather than reopening it.

Use implementation for agreed changes and consultation for independent, read-only advice. A consultation
does not authorize implementation. Start a fresh session for a different task or an independent
consultation; keep continuations of the same task in its existing session.

## Decisions and continuation

When Claude needs a clarification to finish the task, answer from the latest explicit decisions
already settled with the user and supply the relevant context. If the conversation does not
establish the answer, or new permission is needed, bring the question to the user.

Continue Claude for those clarifications or at the user's explicit request. New user messages are
addressed to Amp by default, including questions about Claude's work. A completed task or answered
consultation ends the handoff; a saved session does not redirect later conversation to Claude.

## Amp owns the result

Assess Claude's work or advice and write your own response rather than transcribing its reply.
Carry forward material findings, unanswered questions, blockers, and uncertainty. Any further work
stays within the user's existing authorization.
