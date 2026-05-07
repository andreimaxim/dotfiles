---
name: domain-language
description: Use when establishing or reviewing the language a system uses across its surfaces — models, operations, roles, events, tests, errors, logs, and UI copy — in a DDD or rich-domain context. Mines existing vocabulary first, then explores metaphors from adjacent fields rather than defaulting to generic technical labels. Keeps the same language flowing across every surface.
---

# Domain Language Skill

Use this skill whenever the language of the system matters: domain models, business operations, roles, events, state transitions, policies, workflows, public APIs, tests, errors, logs, and UI copy.

Goal: make the system read like the product's own language. Names should feel inevitable once you understand the domain, reveal the caller's intent, hide mechanical details, and maintain consistent quality at every level of abstraction.

## When Not to Apply

Skip this skill when the domain *is* the technical layer. Concrete cases:

- middleware, transport adapters, serialization layers — the vocabulary is the protocol's
- build, CI, and release tooling — the vocabulary is the toolchain's
- thin wrappers over a third-party API where the vendor's terms already win
- generic CRUD admin panels with no business behavior beyond persistence
- one-off scripts and internal tools used by a single engineer

Strong domain language adds friction when there is no real domain to express. If you cannot write the domain sentence below in plain language without inventing the meaning, stop.

## Calibrate to the Question

Treat the sections below as constraints and shortcuts, not a checklist. Apply only the parts that fit the question. Naming a single method warrants a short recommendation; auditing the language across a bounded context warrants the full review. Match the depth of the answer to the depth of the question.

## Working Model

Before proposing terms, work through four things:

- domain sentence: one plain-language sentence describing what happens in the business or user's own words
- caller sentence: how the caller should naturally talk to the concept
- language field: words already used in this domain, then useful words or metaphors from adjacent or unrelated domains
- concept type & boundary: entity, role, capability, policy, event, workflow, value object, or integration boundary

Surface these explicitly in the naming format. For vocabulary reviews, fold only the useful parts into the language map and recommendations rather than forcing a separate preamble.

Then propose terms. Never begin with architecture buckets unless the domain itself uses them.

## Evidence First

When working in a codebase, mine the existing vocabulary before inventing terms. Search the relevant models, tests, routes, views, API serializers, errors, logs, documentation, product copy, and fixture names. Treat user-provided ticket text, support language, and product language as evidence too.

In the response, separate what is observed from what is proposed. Quote or cite representative file paths, test names, UI labels, log/event names, API keys, or docs when they shaped the recommendation. If you cannot inspect a surface, say so instead of guessing.

Mining is not the same as deferring. Existing vocabulary earns deference when it is consistent across surfaces, recognized by the product or its users, and survives the litmus checks at the bottom of this skill. It earns replacement when it is inconsistent, leaks implementation (`...Service`, `...Manager`, `process`, `handle`), or reflects an old understanding of the domain that the product has since outgrown. When you replace, name the old term in the migration notes and propose a rename order that keeps the system green.

## Beautiful Defaults

- Respect the host project's idioms; strong domain language should still look native in that codebase.
- Let the public interface read like a sentence a domain expert would say.
- Use bold domain nouns only when they sharpen meaning and are grounded in language the product, users, or adjacent domain would recognize. Prefer a plain domain word over a dramatic metaphor that needs explanation.
- Hide implementation details behind the name — the caller should ask for the outcome, not orchestrate the mechanism.
- Ensure symmetry in paired concepts (approve/deny, publish/unpublish, grant/revoke).
- Use the same vocabulary at every level — the words at the model, call site, test, error, log, and UI should match.

## Creative Language Discovery

The best names come from the domain itself, neighboring fields, or a metaphor that instantly communicates shape — not the usual programming vocabulary.

1. **Mine the existing domain.** Models, tests, routes, views, API payloads, errors, logs, user stories, support conversations, business documents. Reuse established language when it fits; cite the surfaces that shaped the recommendation.
2. **Name the motion.** What does the operation actually do? It narrows, admits, screens, reconciles, retires, quarantines, broadcasts, settles, promotes.
3. **Explore adjacent domains.** Law, publishing, logistics, finance, hospitality, governance, cartography.
4. **Borrow from unrelated domains only when the metaphor clarifies.** A rule isolating suspicious items can be a quarantine; a process aligning two sources can be a ledger. Avoid dramatic words that make the author feel clever and the reader pause.
5. **Return to the caller.** The name must still feel natural at the call site.

Favor precise verbs over blurry ones:
- `narrowed_to` over `filter` when a broad set becomes smaller
- `screened_by` over `checked_by` when access is formally examined
- `admitted_to` over `added_to` when membership or permission is granted
- `reconciled_with` over `sync` when two sources of truth are aligned
- `retired` over `disabled` when something leaves active service but remains historically meaningful
- `shelved` over `hidden` when something is intentionally set aside for later
- `quarantined` over `flagged` when a suspicious item is isolated pending review
- `revoked` over `removed` when a previously granted right is taken back

The name must make the next reader faster, never make the author feel clever.

## Grammar Conventions

The same domain word adapts its form to fit each surface:

- **Methods**: imperative verbs — `admit`, `shelve`, `revoke`
- **Predicates**: question form — `admitted?`, `screened?`, `shelved?`
- **Events / log names**: past tense — `application.admitted`, `clearance.revoked`
- **State columns / timestamps**: past participle adjective — `admitted_at`, `shelved_at`, `revoked_at`
- **Exceptions**: noun phrases describing the condition — `ScreeningPending`, `ClearanceRevoked`

One verb (admit) yields one cohesive family across the system.

## Plurals, Namespaces, Modules

The shape of a name carries meaning too:

- **Collections** read as the noun the user would use: `applications`, `clearances`, `cohorts`. If the user says "applicants" but the table is `applications`, prefer the user's word at the boundary and translate inward.
- **Namespaces and modules** describe a region of the domain, not an architectural layer: `Admissions::Screening`, not `Services::ApplicationServices`. The module name should be a noun a domain expert would use to describe a department or a process.
- **Nested concepts** keep the parent in the name only when ambiguity demands it. `Application::Screening` is justified when bare `Screening` would collide; otherwise the bare noun is stronger.
- **Avoid pluralized buckets** as namespaces (`Helpers::`, `Concerns::`, `Mixins::`, `Lib::`). These are filing systems, not language.

## Where the Language Surfaces

Every surface a human reads is part of the language: call sites, tests, errors, logs, UI copy, exception names. The same domain words must appear at each.

### Call sites

Prefer natural, intention-revealing calls that speak the domain:

```ruby
registration.cancel
contact.designate_to(box)
account.terminate
invitation.claim_by(person)
```

Over procedural orchestration that exposes the mechanism:

```ruby
CancellationService.execute(registration)   # pattern suffix + generic verb; "cancel" is the real name
DesignationProcessor.run(contact, box)      # "Processor" hides what happens; the contact is the real subject
TerminateAccountCommand.new(account).call   # Command-pattern ceremony for what is just `account.terminate`
```

The underlying operation object is allowed when justified, especially for integration boundaries or workflows with no natural owner. Keep that object behind a domain-facing interface when possible, and name the public concept for the outcome rather than the mechanism.

Use the host language's idioms at the call site. The same domain reads differently in different languages — the verb survives, the punctuation does not:

```ruby
# Ruby
application.admit
application.screened?
```

```typescript
// TypeScript
await application.admit()
application.isScreened
```

```python
# Python
application.admit()
application.is_screened
```

Preserve the domain verb (`admit`, `screened`); fit the project's idioms for everything else (async, casing, predicate style). Use bang variants only when the host project uses them consistently to signal mutating, validating, or raising operations; otherwise keep the plain verb.

### Tests

Test names are sentences about the domain. Use the same verbs and conditions a domain expert would say.

Prefer:

```ruby
class RegistrationTest < ActiveSupport::TestCase
  test "admits the applicant once screening clears" do
    # ...
  end

  test "shelves the application while screening is pending" do
    # ...
  end

  test "refuses to admit a quarantined applicant" do
    # ...
  end
end
```

Over:

```ruby
class RegistrationTest < ActiveSupport::TestCase
  test "#call returns true when valid" do
  end

  test "calls NotificationService" do
  end

  test "raises error with invalid params" do
  end
end
```

The condition belongs in the sentence ("once screening clears", "while screening is pending"), not as setup leakage ("with valid params", "when stub returns false"). The subject under test should be the domain concept, not the entrypoint method.

### Errors and validation messages

Errors are public — users and operators read them. Use the domain's words.

Prefer:

```ruby
errors.add(:base, "Application cannot be admitted until screening clears")
raise ScreeningPending, "Applicant has not been screened"
```

Over:

```ruby
errors.add(:base, "Invalid state transition")
raise StandardError, "validation failed"
```

### Logs and instrumentation

Event names live in the same vocabulary. They are read by future humans debugging incidents.

Prefer:

```ruby
ActiveSupport::Notifications.instrument("application.admitted", id: application.id)
ActiveSupport::Notifications.instrument("application.shelved", id: application.id, reason:)
```

Over:

```ruby
ActiveSupport::Notifications.instrument("user.create_success", id: user.id)
ActiveSupport::Notifications.instrument("model.update", id: ...)
```

### UI copy

Buttons, headings, and confirmation text are the most visible surface of the language. They should match the model.

Prefer "Admit applicant", "Shelve application", "Revoke clearance".

Over "Submit", "Save", "Delete" when a domain action exists.

### Exception class names

Exception names are nouns in the same vocabulary.

Prefer `ScreeningPending`, `ClearanceRevoked`, `QuarantineExpired`.

Over `InvalidStateError`, `ValidationFailed`, `ProcessingError`.

## When to Introduce a New Concept

Introduce a new named entity, role, policy, or workflow when it improves understanding:
- The idea has its own lifecycle, state, or validation rules.
- Multiple objects collaborate and no single one naturally owns the behavior.
- The concept already appears in product language or support conversations.
- The logic is complex enough that the public interface should be a clean facade.

Prefer domain nouns over pattern names.

## Roles & Capabilities

A role or capability should capture a genuine trait of its host. Good names answer "this thing is/acts as/can be…" — Completable, Publishable, Examiner, Petitioner, Trackable.

Avoid buckets that are merely organizational: Utilities, Helpers, Common, Actions, Shared.

Worked example. A `Document` and a `Comment` both need a "mark this finished" operation. Two paths:

- *Real trait*: both are genuinely `Completable` — they have a completion lifecycle, a `completed_at`, and "is this done?" is meaningful for each. The role names a characteristic the host actually has.
- *Fake trait*: extracting `MarkAsCompletedHelper` because both files were getting long. The host gains no new characteristic; the helper is a filing cabinet with a verb taped on.

If you cannot explain the role as a real characteristic of the host, the behavior probably belongs somewhere else — usually back on the model, or on a domain object that owns the workflow.

## Abstraction Levels

A method should do one thing from the caller's point of view. Its internal steps should sit at the same level of abstraction.

Prefer — every line speaks the domain:

```text
def relay_now
  relay_to_timeline
  relay_to_webhooks_later
  relay_to_recipients
end
```

Over — orchestration, infrastructure, and persistence mixed in one body:

```text
def relay_now
  Timeline::Relayer.new(self).relay
  webhook_client.post(payload)
  recipients.each { |recipient| Notification.create!(recipient:) }
end
```

Extract lower-level details behind names that keep the journey readable. The same vocabulary should hold whether you zoom out to the top-level method or in to its helpers.

## Avoid

By default, avoid:

- pattern suffixes (Service, Manager, Processor, Handler, Operation, UseCase, Util, Data, Info) when a domain noun, role, or owner exists
- generic technical verbs (filter, process, handle, execute, run) when a domain or metaphorical word is available
- splitting rich domain behavior into an anemic object plus a procedural service unless no natural owner exists
- names that only make sense after reading the implementation, or cute names that require explanation
- classifying code by architecture (Helpers, Concerns, Mixins) when domain meaning is available
- introducing a role or capability just to break up a large file — it must name a real trait the host actually has

## Litmus Checks

- Can the system be understood by reading only the public names aloud?
- Would a domain expert recognize the concept without seeing the code?
- Does the name improve the model, or does it merely label implementation mechanics?
- Is the same language used consistently across models, tests, interfaces, documentation, and support conversations?
- If the implementation changed tomorrow, would the name still feel true?
- Does the name make the next reader faster?

## Examples

Keep this file focused on the core workflow. When a task needs concrete patterns, read [the extended examples](references/examples.md).

The examples cover:

- carrying one vocabulary through model methods, tests, errors, logs, and UI copy
- sharpening everyday class, scope, predicate, and local names without leaking implementation mechanics

## Output Format

Pick the format by what the question is actually asking for, not by the words the user typed:

- *Naming a concept* (new model, method, role, event, exception, copy string) — use the first format below.
- *Reviewing existing vocabulary* (audit, rename, consolidate across surfaces) — use the second format.
- *"Is this name any good?"* — use the first format with the existing name as one of the alternatives, and be decisive about whether to keep or replace it.

When asked to name something, respond with:

1. domain read — the domain sentence, caller sentence, and concept type/boundary
2. evidence — observed vocabulary with citations or representative references; note unavailable surfaces
3. language map — existing domain words, adjacent-domain words, and useful metaphors
4. recommended terms — the chosen vocabulary (noun, verbs, paired states)
5. how it surfaces — short examples at the call site, in tests, and any other surface that matters (errors, logs, UI, exceptions), using the host project's idioms
6. alternatives — 2–4 viable options with tradeoffs
7. avoid — terms to reject and why

When asked to review existing language, respond with:

1. current language map — observed terms, where they appear, and which surfaces are missing from the review
2. inconsistencies and drift — competing words, vague buckets, implementation leaks, and mismatched abstractions
3. recommended vocabulary — the canonical nouns, verbs, roles, states, and event names to consolidate around
4. surface-by-surface changes — how the vocabulary should appear in models, operations, tests, errors, logs, APIs, docs, and UI copy
5. migration notes — compatibility concerns, aliases, deprecations, and a safe rename order when relevant
6. avoid — terms to retire and why

Be decisive. The goal is not endless discussion but one vocabulary that feels inevitable once chosen.