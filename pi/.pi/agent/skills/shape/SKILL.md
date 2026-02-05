---
name: shape
description: Guide for domain discovery in Ruby on Rails applications using lean architecture principles inspired by Coplien's DCI. Use when adding features, fixing bugs, or refactoring code in Rails apps. Triggers on requests to think about domain design, understand existing code, figure out what objects are needed, or shape a feature before implementation.
---

# Shape

Domain discovery for Rails applications where **method signatures declare context** and `app/models` is the heart of the application.

## Core Philosophy

Rails provides adapters (ActiveRecord for persistence, ActionView for HTML, controllers for HTTP). The actual application lives in `app/models`—domain objects that model the business, some of which happen to be persisted.

Context in DCI doesn't require separate classes. **The method signature IS the context declaration:**

```ruby
# This single line declares everything:
# - Primary actor: self (the source account)
# - Role: recipient (semantic, not just "another account")
# - Interaction: transfer_to (the use case)
def transfer_to(recipient:, amount:)
```

Readable as a sentence: `source_account.transfer_to(recipient: target, amount: money)`

## Invocation

The skill can be invoked with or without initial context:

- `/shape` → Ask what the user is working on
- `/shape subscription billing` → Begin Scenario A, shaping a new feature
- `/shape lib/payment_processor.rb` → Begin Scenario B by reading that code
- `/shape the bug where invoices double-charge` → Begin Scenario B, ask where to look

Use the initial text to skip obvious questions and get to the heart of discovery faster.

## Entry Points

### Scenario A: New

Adding something that doesn't exist yet. Discovery is purely conversational.

**Discovery questions:**
1. "What problem does this feature solve?"
2. "Who are the actors involved?"
3. "What objects do they interact with?"
4. "What actions can each actor take?"
5. "When [actor] does [action], what role do other objects play?"
6. "Walk me through a specific example."
7. "What could go wrong? What are the edge cases?"

### Scenario B: Existing

Changing something that's already there. Discovery starts with understanding the current code.

**Discovery process:**
1. Ask to see the relevant code, or search for it if the user points you to a location
2. Read and understand what the code is *trying* to do
3. State your understanding: "This code is trying to express [X]"
4. Ask clarifying questions about intent vs. current behavior
5. Let the conversation reveal what's needed (fix, refactor, migrate, extend)
6. Surface the domain model that should exist

## Discovery Technique

Surface the domain through conversation. Look for:

**1. The Nouns** — What domain objects exist?
- "What are the key things in this domain?"
- "What would a domain expert call this?"
- "Is this one concept or actually two?"

**2. The Verbs** — What do objects do to each other?
- "What actions can a [noun] perform?"
- "What happens to a [noun] over its lifetime?"
- "When [event] occurs, what changes?"

**3. The Roles** — When objects interact, what roles do they play?
- "In this action, what role does the other object play?"
- "Is 'user' the right word here, or is it 'author', 'buyer', 'reviewer'?"
- "Does the name reveal the relationship?"

## Reading Existing Code

When examining existing code, look for:

- **God objects** — Models with too many responsibilities; look for natural seams to split
- **Procedural scripts** — lib/ files that are really objects waiting to be born
- **Primitive obsession** — Hashes and arrays that should be domain objects
- **Implicit roles** — Parameters named `other`, `target`, `item` that deserve semantic names
- **Hidden verbs** — Methods named `process`, `handle`, `execute` that hide the real action

Ask: "What domain concept is this code *trying* to express?"

## Output Format

When discovery is complete, produce a summary:

```
## Domain Summary: [Feature/Area Name]

### Context
[Brief description of what we're building or changing]

### Objects
- ObjectName: [what it is, what it's responsible for]
- AnotherObject: [description]

### Interactions
- ObjectName#method_name(role:, another_role:) → [what happens]
- ObjectName#another_method(role:) → [outcome]

### Location
- app/models/object_name.rb
- app/models/another_object.rb
(or with namespace: app/models/context_name/...)

### Notes (if applicable)
[Any relevant context: current code locations, incremental steps, edge cases to handle, etc.]
```

This summary becomes the handoff to implementation.

## Naming Guidelines

Names carry meaning. Push for precision:

| Instead of | Consider | Why |
|------------|----------|-----|
| `user` | `author`, `buyer`, `subscriber` | Reveals the role in context |
| `other_account` | `recipient`, `source` | Shows relationship |
| `do_transfer` | `transfer_to` | Reads as action with direction |
| `process` | `approve`, `reject`, `fulfill` | Specific over generic |
| `data`, `info` | The actual thing it represents | Vague words hide meaning |

## Conversation Style

- Ask no more than 2-3 questions at a time
- Summarize understanding before moving forward
- When examining code, state what you see before asking questions
- Use the user's language; reflect their terminology back
- Challenge vague names gently: "When you say 'item', what specifically is it in this context?"
