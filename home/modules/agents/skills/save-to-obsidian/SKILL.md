---
name: save-to-obsidian
description: Save the current conversation output (research notes, shape docs, plans, summaries, code review findings, etc.) as a structured Markdown knowledge note in the user's Obsidian vault under ~/Documents/Principal/KB/. Use when the user asks to "save this", "save to obsidian", "save the findings", or otherwise wants the assistant's current output persisted as a note.
---

# Save to Obsidian

Outcome: a single structured Markdown knowledge note written under `~/Documents/Principal/KB/`, containing the relevant assistant output. The file starts with YAML frontmatter containing at least a non-empty `type`, followed by a Markdown body beginning with an H1 title.

The Obsidian folder `~/Documents/Principal/KB/` is the top-level knowledge folder. Code-related notes are only one kind of knowledge in this folder; do not assume every note belongs under a code-specific folder.

## When to Use

- The user asks to save the current output, research, plan, review, or summary.
- The user says "save to obsidian", "save as a note", "save to my vault", or similar.
- A research or shape run has produced a document the user wants kept.

Do **not** invoke this skill when:
- The user wants the content written into the current project itself.
- The user wants a gist, PDF, or any non-Markdown output.

## Note Format Requirements

Every saved note is a Markdown file with YAML frontmatter:

```yaml
---
type: Research Note
title: Example title
description: One-sentence summary of the note.
tags:
  - concrete-topic
  - source-or-project
timestamp: '2026-06-29T12:34:56+00:00'
---
```

- `type` is required and non-empty.
- `title`, `description`, `tags`, and `timestamp` are strongly preferred.
- `resource` is optional; include it only when there is a canonical URI for the thing described, such as official docs, an issue/PR, an API reference, or a repository URL.
- Additional frontmatter keys are allowed when useful, but keep them sparse.
- Use `tags`, not `categories`, for cross-cutting classification.
- The body starts after the closing frontmatter delimiter, then a blank line, then `# <Title>`.

## Output Path

Write notes under:

`~/Documents/Principal/KB/<section>/<YYYY-MM-DD>-<file-name>.md`

- **Knowledge root:** `~/Documents/Principal/KB/`.
- **`<section>`:** choose the most specific top-level section below.
- **`<YYYY-MM-DD>`:** today's date from the system context or `date +%F`.
- **`<file-name>`:** model-generated slug unless the user supplied a filename.

Create the section directory with `mkdir -p` if needed.

### Sections

Choose one:

| Section | Use for | Default `type` |
|---|---|---|
| `research/` | Long-form analysis, verified findings, "what does X do?", permissions investigations, endpoint behavior | `Research Note` |
| `plans/` | Implementation plans, shape docs, proposed changes | `Plan` or `Shape` |
| `reviews/` | Code review findings, audits, risk reviews | `Review` |
| `decisions/` | Decisions, ADR-like conclusions, selected tradeoffs | `Decision` |
| `references/` | Notes primarily summarizing or mirroring an external source | `Reference` |
| `concepts/` | Durable reusable ideas that are not tied to one artifact | `Concept` |
| `entities/` | Durable real-world things: projects, systems, services, people, organizations, repositories | `System`, `Project`, `Service`, `Person`, etc. |
| `inbox/` | Ambiguous captures that do not yet have a clear home | `Note` |

For the current common case — long-format analysis from the research skill — use `research/` and `type: Research Note`.

Do not use `index.md` or `log.md` as saved note filenames. These names are reserved for directory listings and update history if the user wants them later. Do not update `index.md` or `log.md` unless the user explicitly asks.

## Filename Slug

The model generates `<file-name>` from the content. Rules:

- Lowercase, ASCII, hyphen-separated (`kebab-case`).
- Describe the topic concretely — not `notes` or `research` alone. Prefer specific subjects like `dataplex-entry-group-permissions`, `account-search-refactor`, `session-permissions-flow`.
- Max ~60 characters.
- No file-system or Obsidian-hostile characters: `/`, `\\`, `:`, `|`, `?`, `*`, `"`, `<`, `>`, `#`, `^`, `[`, `]`, spaces.
- If the user supplied a filename or path, use it exactly within `~/Documents/Principal/KB/` (append `.md` if missing) unless it would escape the knowledge root.

If a file with the chosen name already exists:
- If the new content explicitly continues the existing note, append a new `## <date> — <subtitle>` section.
- Otherwise, pick a more specific slug or ask the user.

## Frontmatter Fields

Use this order when possible:

```yaml
---
type: <note type>
title: <Human-readable title>
description: <One-sentence summary>
resource: <Canonical URI, only if applicable>
tags:
  - <tag>
  - <tag>
timestamp: '<ISO 8601 datetime>'
---
```

Guidance:

- **`type`:** choose a descriptive note type. Prefer `Research Note` for research output. Other useful values: `Plan`, `Shape`, `Review`, `Decision`, `Reference`, `Concept`, `System`, `Project`, `Service`, `Endpoint`, `Permission`, `Role`, `Workflow`.
- **`title`:** human-readable display name matching the H1.
- **`description`:** one sentence, specific enough to be useful in generated indexes/search snippets.
- **`resource`:** omit if there is no canonical URI. Do not put arbitrary local file paths here unless they are truly the resource being described.
- **`tags`:** include 2–6 concrete tags. Include the repo/project/context name when meaningful. Avoid vague tags like `misc`.
- **`timestamp`:** use `date -Iseconds` when available. If exact time is unavailable, use an ISO 8601 datetime based on the current date.

When saving from inside a git repository, resolve the repo name with `basename "$(git rev-parse --show-toplevel)"` and include its lowercase/kebab-case form as a tag when relevant. If not in a repo, use the current directory basename only when it is meaningful.

## File Body

- Preserve the structure of the original output unless the user asked for rewriting.
- The body starts with `# <Title>` and then the saved content.
- Prefer clear Markdown headings, lists, tables, and fenced code blocks.
- Keep `path/to/file:line` evidence citations verbatim; they render fine in Obsidian.
- If the saved content includes sourced claims, preserve or add a `# Citations` section at the bottom. Do not invent citations.
- Use normal Markdown links, not Obsidian-only wikilinks, unless the user asks otherwise.
- When linking to another known KB note, prefer links from the KB root that start with `/`, such as `[Dataplex](/entities/dataplex.md)`.
- Do not rewrite local code/file citations into KB links unless an actual KB note exists for that target.

## Flow

1. Determine whether the note is research, plan/shape, review, decision, reference, durable concept/entity, or inbox.
2. Choose `<section>` and `type` from the table above.
3. Resolve useful context tags, especially the git repo name when relevant.
4. Generate the filename slug, H1 title, and one-sentence description.
5. Run `mkdir -p ~/Documents/Principal/KB/<section>/` and check for collisions.
6. Write the note. It must begin with YAML frontmatter, then a blank line, then `# <Title>`.
7. Reply with the absolute path of the saved file. Do not paste the full content back.

## Guardrails

- Never write outside `~/Documents/Principal/KB/` under this skill.
- Never include secrets, tokens, private keys, or `.env` values in the saved note. Strip them if they appeared in the output.
- Do not auto-commit the vault to git.
- Do not modify existing KB notes other than appending to an existing note when the user explicitly wants to continue it.
- Do not create fake links, citations, resources, or tags just to fill fields.

## Example

Inside repo `fws-bilaterals`, after a research run about declined bilaterals:

- Path: `~/Documents/Principal/KB/research/2026-05-25-declined-bilaterals-and-404s.md`
- File contents:

  ```markdown
  ---
  type: Research Note
  title: Declined bilaterals and 404s from GET /api/v1/sessions/:id
  description: Verified analysis of why declined bilaterals can surface as 404 responses from the session lookup endpoint.
  tags:
    - fws-bilaterals
    - sessions
    - declined-bilaterals
    - 404s
  timestamp: '2026-05-25T14:30:00+00:00'
  ---

  # Declined bilaterals and 404s from GET /api/v1/sessions/:id

  …research body verbatim…

  # Citations

  - `app/controllers/api/v1/sessions_controller.rb:42`
  - `app/models/session.rb:118`
  ```
