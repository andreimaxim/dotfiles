# Domain Language Examples

These examples are reference material for the domain-language skill. Read them when a task needs concrete patterns beyond the core workflow.

## Screening and Admission

A single domain — applicants must be screened before being admitted to a cohort — surfacing the same language everywhere.

*Evidence (illustrative, showing what citations look like in a real review):* the verbs come from product copy ("Admit to cohort", "Shelve for now") and the policy doc at `docs/admissions.md`; the model lives at `app/models/application.rb`; existing tests in `test/models/application_test.rb:14` already use "screened" as the gate term. No competing vocabulary found in support transcripts.

**Model:**

```ruby
class Application < ApplicationRecord
  def admit
    raise ScreeningPending unless screened?
    update!(admitted_at: Time.current)
    ActiveSupport::Notifications.instrument("application.admitted", id:)
  end

  def shelve(reason:)
    update!(shelved_at: Time.current, shelved_reason: reason)
    ActiveSupport::Notifications.instrument("application.shelved", id:, reason:)
  end
end
```

**Call site:**

```ruby
application.admit
application.shelve(reason: "awaiting clearance")
```

**Test:**

```ruby
class ApplicationTest < ActiveSupport::TestCase
  test "admits the applicant once screening clears" do
    application = applications(:screened)
    application.admit
    assert application.admitted?
  end

  test "refuses to admit while screening is pending" do
    application = applications(:unscreened)
    assert_raises(ScreeningPending) { application.admit }
  end
end
```

**Error:**

```ruby
class ScreeningPending < StandardError
  def message = "Applicant has not been screened"
end
```

**Log events:** `application.admitted`, `application.shelved`

**UI copy:** "Admit applicant", "Shelve application"

Read aloud, the system tells the same story everywhere: applications are *screened*, then *admitted* or *shelved*. Implementation details (state machines, persistence, instrumentation) never leak into the names.

## Sharpening Everyday Names

The discipline applies at every scale. A first draft for small surfaces — classes, scopes, predicates, named parameters, locals — almost always reaches for a generic verb or a container-shaped noun. Treat that draft as a placeholder and run the discovery progression on it before committing.

A first draft on a `Document` model and a class that operates on it:

```ruby
class DocumentApprover
  def execute(document)
    arr = document.reviewers.select(&:active?)
    arr.each(&:notify)
    document.update(approved_at: Time.current)
  end
end

class Document < ApplicationRecord
  scope :filter_by_owner, ->(account) { where(owner: account) }
  scope :get_recent, -> { where(created_at: 7.days.ago..) }
  def is_done?; completed_at.present?; end
end
```

Each name hides the motion the call actually performs. Apply the progression — name the motion, check the preposition, reach for an adjacent-domain verb when it sharpens:

- `DocumentApprover#execute` → the model name plus an `-er` suffix is `Service`-by-another-name, and `execute` is generic. The class is the workflow itself — an *Approval* — and the verb is the act it grants.
- `arr` → names the container, not the contents. Either name the local after what's in it (*active reviewers*), or remove it when the surrounding code reads cleanly without one.
- `filter_by_owner` → the motion is *attribution*. The document is *owned by* an account, not filtered by a column. The preposition flips from *by* to a verb that already implies the relation.
- `get_recent` → "get" hides the motion. The window itself is the name; the caller asks for *recent* documents, not for the act of getting them.
- `is_done?` → predicates do not need an "is" prefix in Ruby; the motion is *completion*, and the question form carries the predicate role.

After the pass:

```ruby
class Approval
  class << self
    def grant_for(document)
      notify_reviewers_of(document)
      record_on(document)
    end

    private

    def notify_reviewers_of(document)
      document.reviewers.select(&:active?).each(&:notify)
    end

    def record_on(document)
      document.update(approved_at: Time.current)
    end
  end
end

class Document < ApplicationRecord
  scope :owned_by, ->(account) { where(owner: account) }
  scope :recent, -> { where(created_at: 7.days.ago..) }
  scope :completed, -> { where.not(completed_at: nil) }

  def completed?; completed_at.present?; end
end
```

Read aloud at the call sites: `Approval.grant_for(document)` and `Document.owned_by(account).recent.completed`. Every public name describes a motion the domain expert would recognise, and no public name leaks the mechanism (`where`, `created_at`, `present?`, `arr`, `Approver`, `execute`) the implementation happens to use.
