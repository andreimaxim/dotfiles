---
name: implementing
description: Relays an agreed Amp plan and follow-up messages to local Claude Code on Opus 5.5 with high effort. Use when the user says "ask Claude to implement", offloads implementation after planning in Amp, or replies to that Claude session. Not for orbs.
builtin-tools:
  - claude_implement
  - claude_implement_wait
---

# Implementing with Claude Code

Plan in Amp; let Claude implement in the same checkout. After handoff, Amp is only a message relay.
Install this plugin only in `~/.config/amp/plugins/`, never in a global plugins repository or an orb.

1. Settle the plan in this thread. Call `claude_implement` with a self-contained brief: agreed outcome,
   approach, constraints, relevant files, existing changes to preserve or continue, acceptance criteria,
   and verification commands. Claude cannot read this thread. Carry over explicit authorizations;
   delegation grants no new permission to publish or change shared systems.
2. The send result shows the exact prompt for inspection, followed by a **Claude session** footer.
   Keep that session UUID and call `claude_implement_wait` once with it as `session_id`. Do not repeat
   the prompt or session metadata in chat. The call stays pending until Claude's turn ends and its
   process exits; there are no polling timeouts or cursors. Wait silently. Do not narrate waiting,
   elapsed time, raw tool activity, or the absence of updates. The grouped tool row shows that Claude
   is working. Do not end the Amp turn while the call is pending.
3. When the turn ends, present the **Claude Code reply** section unchanged under **Claude Code:** and
   yield to the user. Preserve its wording, formatting, questions, choices, and blockers. A reply means
   only that Claude ended its turn, not that the implementation is complete. Surface returned relay
   diagnostics, stderr, and permission denials separately when present. Relay any meaningful returned
   **Claude Code work summaries** unchanged without repeating them.
4. Do not answer Claude's questions, fetch missing information, resolve blockers, choose trade-offs,
   rewrite its reply, inspect the diff, run tests, or invoke a reviewer on its behalf. Do not
   automatically continue. The user may separately ask Amp to plan, investigate, or review.
5. When the user replies to Claude, pass their message unchanged as `instructions` to
   `claude_implement` with the same `session_id`, then wait again. Reuse that ID after plugin reload;
   never resume the most recent session implicitly. Do not retry a failed submission automatically.

Do not edit concurrently. To cancel while the wait is pending, the user can run
**claude-implementer: Stop Claude Code** from Amp's command palette. This aborts Claude directly,
without waiting for Amp's turn to end. If the user asks to stop before waiting, call
`claude_implement_wait` with `cancel: true` and await the cancellation result. The plugin also requests
cancellation when Amp reports the turn idle or errored, or unloads the plugin. Completed edits
remain. Reload loses in-memory run state, not Claude's persisted conversation. Keep the session ID
from the submit call so the user can resume after interruption.

Requires a locally installed, authenticated Claude Code 2.1.285 or newer. Bun caches the pinned Agent
SDK on first use. Each submitted turn reads `~/.claude/SYSTEM.md`, the same replacement system prompt
used by the user's `ccx` alias, and appends only the relay's handoff instructions. There is no stock
Claude Code prompt fallback: a missing, unreadable, or empty file fails the handoff. Claude may retain
a recorded system prompt in resumed conversations; use a new session to ensure an older conversation
switches from the stock prompt. Claude's user/project/local settings apply. Runs use bypass permissions;
explicit deny rules still apply.
Leave Claude's settings and authentication to the user. Oracle review is separate from this relay.
