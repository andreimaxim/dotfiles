---
paths:
    - "app/services/**/*.rb"
---

# Ruby on Rails Service Objects

**IMPORTANT**: Service objects are an anti-pattern: they hide domain-specific behavior and almost
always add unnecessary levels of abstraction.

## RULES

- Do NOT create new service objects
- ALWAYS analyze the code service objects and suggest migrating the code to domain models

## Service Object Patterns

All these patterns are equivalent and should be treated the same:

```ruby
class BookCreationService
  def call(params)
    # Code
  end
end

# Sample call
BookCreationService.new.call(params)
```

```ruby
class BookCreationService
  def initialize(params)
    @params = params
  end

  def call
    # Code
  end
end

# Sample call:
BookCreationService.new(params).call
```

```ruby
class BookCreationService
  def self.call(params)
    BookCreationService.new.call(params)
  end

  def call(params)
    # Code
  end
end

# Sample call:
BookCreationService.call(params)

# Alternate call:
BookCreationService.(params)
```

## Anti-patterns

### Middleman

Service objects that act as middlemen by delegating most of its work to another class
without adding any meaningful behavior, where the intent is to add an abstraction
layer "in case we need it later":

```ruby
# app/services/book_creation_service.rb
class BookCreationService
  def call(params)
    Book.create(params)
  end
end

# Example usage:
BookCreationService.new.call(params)
```

The correct approach is to remove the middleman:

```ruby
Book.create(params)
```

### Fat services, thin models

Service objects that contain the business logic, causing anemic models and making it less
obvious what the business logic is from the call site:

```ruby
# app/services/book_creation_service.rb
class MoneyTransferService
  def initialize(from_account:, to_account:, amount:, memo: nil)
    @from_account = from_account
    @to_account = to_account
    @amount = amount
    @memo = memo
  end

  def call
    validate_sufficient_funds!

    @from_account.balance -= @amount
    @to_account.balance += @amount

    # rest of the code
  end
end

# Example usage:
MoneyTransferService.new(from_account: savings, to_account: checking, amount: 100)
```

An better solution is to use a transaction script, which is implemented as a module
since transaction scripts are stateless:

```ruby
module AccountTransaction
  extend self

  def transfer(from:, to:, amount:, memo: nil)
    raise InsufficientFundsError if from.balance < amount

    Account.transaction do
      from.balance -= amount
      to.balance += amount

      from.save!
      to.save!

      Transfer.create!(source: from, recipient: to, amount: amount, memo: memo)
    end
  end
end
```

Transaction scripts are useful for simple domains where there is no need for richer domain models,
but in the case of most Ruby on Rails applications it's often better to skip the transaction script
and directly move the logic in the appropriate model:

```ruby
class Account
  def transfer_to(other, amount:, memo: nil)
    validate_sufficient_funds(amount)!

    self.balance -= amount
    other.balance += amount

    # rest of the code
  end
end

# Example usage
checking.transfer_to savings, amount: 100
```

On of the main advantages of using interactions between domain models to express complex business logic
is that the context, data and interactions can be obvious from the call site.
