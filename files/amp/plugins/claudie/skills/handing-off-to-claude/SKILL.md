---
name: handing-off-to-claude
description: Delegates bounded implementation tasks to Opus 5.5/high or consults Claude Code as a read-only external oracle on Fable 5.1/high. Use for explicit requests to implement, review, give a second opinion, or act as an oracle through Claude, and answers to its outstanding task questions. Ordinary conversation after completion stays with Amp. Not for orbs.
builtin-tools:
  - claude_send
  - claude_wait
---

# Handing off to Claude

Delegate one bounded task or oracle consultation to Claude in the same checkout. Amp remains the
user's assistant; a saved Claude session preserves context, not ownership of later conversation.
Install this plugin only in `~/.config/amp/plugins/`, never in a global plugins repository or an orb.

## Choose the handoff

- **Implementation:** use `mode: "implement"` for an agreed change. Claude runs on Opus 5.5/high.
  Supply the agreed outcome, approach, constraints, relevant files, existing changes to preserve or
  continue, acceptance criteria, and known verification commands.
- **External oracle:** use `mode: "consult"` for independent, read-only engineering advice from
  Claude Code on Fable 5.1/high. Reviews, second opinions, design tradeoffs, and debugging questions
  use this same oracle, not separate modes. Supply the question, context, constraints, alternatives,
  and available evidence. For a code review, include the original requirements and exact change
  scope or comparison base. Do not turn a question into an implementation request.

Start a fresh session for an independent oracle consultation; do not resume the implementation
conversation. Keep the same mode and session ID when continuing that task. If the user asks Claude
to implement the recommendation, start a new implementation session with the agreed change and findings.
Claude cannot read this Amp thread. Provide a self-contained brief, distinguish observations from
assumptions, and carry over explicit authorizations. Delegation grants no new permission to publish
or change shared systems.

## Relay the conversation

1. Call `claude_send` with the selected mode and brief.
2. The send result shows the exact prompt for inspection, followed by a **Claude session** footer.
   Keep that session UUID and mode, and call `claude_wait` once with it as `session_id`. Do not repeat
   the prompt or session metadata in chat. The call stays pending until Claude's turn ends and its
   process exits; there are no polling timeouts or cursors. Wait silently. Do not narrate waiting,
   elapsed time, raw tool activity, or the absence of updates. The grouped tool row shows that Claude
   is working. Do not end the Amp turn while the call is pending.
3. When the turn ends, present the **Claude Code reply** section unchanged under **Claude Code:** and
   yield to the user. Preserve its wording, formatting, questions, choices, and blockers. A reply means
   only that Claude ended its turn, not that the implementation is complete. Surface returned relay
   diagnostics, stderr, and permission denials separately when present. Relay any meaningful returned
   **Claude Code work summaries** unchanged without repeating them.
4. Presenting that reply does not authorize Amp to answer Claude's questions, resolve its blockers,
   choose trade-offs, inspect or change its work, or continue it automatically. This restriction is
   for the handoff, not later requests addressed to Amp.
5. Handle each new user message in Amp by default. Resume Claude only when the message answers an
   unresolved question Claude needs answered to finish the delegated task, or explicitly asks to
   continue with Claude. A completion report or delivered oracle answer ends the handoff; a closing
   offer of more help does not keep it open.
   Questions about Claude's work or advice on a pending choice stay with Amp unless directed to Claude.
   For example, "Use B" answering Claude's outstanding A/B question resumes Claude; "What do you think
   of its recommendation?" stays with Amp. Ask who should respond only when the recipient is unclear.
6. For an authorized continuation, pass the user's message unchanged as `instructions` to
   `claude_send` with the same `mode` and `session_id`, then wait again. Reuse that ID after plugin
   reload; never resume the most recent session implicitly. Do not retry a failed or cancelled
   submission automatically.

## Images

Keep `<attached_image path="…">` tags in the user's message unchanged. The plugin downloads those
attachments with authenticated `amp files get` and sends the bytes as Claude image blocks, so Claude
does not need to open a private Amp URL. Do not replace an image with a description or ask the user
to transcribe it.

For images not represented by tags, pass their exact attachment URLs or local paths in `images`.
Relative paths resolve from the workspace; absolute paths and file URLs also work. Supported formats
are PNG, JPEG, GIF, and WebP. Duplicate sources are sent once. For an image-only message, use an empty
`instructions` string and provide `images`. Text-only calls are unchanged. Temporary downloads are
removed after the images are encoded, including on failure or cancellation.

Do not edit concurrently. To cancel while the wait is pending, the user can run
**claudie: Stop Claude Code** from Amp's command palette. This aborts Claude directly,
without waiting for Amp's turn to end. If the user asks to stop before waiting, call
`claude_wait` with `cancel: true` and await the cancellation result. The plugin also requests
cancellation when Amp reports the turn idle or errored, or unloads the plugin. Completed edits
remain. Reload loses in-memory run state, not Claude's persisted conversation. Keep the session ID
from the submit call so the user can resume after interruption.

Requires a locally installed, authenticated Claude Code 2.1.285 or newer. Bun caches the pinned Agent
SDK on first use. Each submitted turn reads `~/.claude/SYSTEM.md`, the same replacement system prompt
used by the user's `ccx` alias, and appends only the relay's handoff instructions. There is no stock
Claude Code prompt fallback: a missing, unreadable, or empty file fails the handoff. Claude may retain
a recorded system prompt in resumed conversations; use a new session to ensure an older conversation
switches from the stock prompt. Claude's user/project/local settings apply. Implementation runs use
bypass permissions; explicit deny rules still apply. Consultations use plan permissions, only
Read/Glob/Grep/Bash, no MCP tools, and deny requests that need permission approval. Their instructions
limit Bash to inspection and prohibit edits, test runs, delegation, or acting on findings.
Leave Claude's settings and authentication to the user. This external oracle is separate from Amp's
built-in Oracle and any Oracle subagent used inside a Claude Code implementation session.
