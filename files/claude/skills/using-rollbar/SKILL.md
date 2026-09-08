---
name: using-rollbar
description: Investigates Rollbar items and occurrences through the read-only Rollbar MCP server. Use for production errors, exception triage, stack traces, occurrences, and Rollbar item links or numbers.
---

# Using Rollbar

Use these request patterns for Rollbar investigations.

## Prerequisite

The user must configure the read-only Rollbar MCP server separately. This skill
does not install a server or credentials. It requires `rollbar_list_environments`
and `rollbar_get` with the contracts described below. Use their actual names
exposed by Claude Code, which may include an `mcp__<server>__` prefix; do not guess
a server name or substitute tools with different schemas. If either tool is
unavailable, stop and report the missing prerequisite. Do not bypass it with
direct credential access or HTTP calls from Bash.

## Examples

Discover configured credential environments:

```json
{}
```

Call the example above with `rollbar_list_environments`. Use the requested
environment when listed, or the only listed environment when there is just one.
Otherwise ask which configured environment to use; do not assume a particular
name for production or staging. Replace `<credential-environment>` below with
that exact discovered value. Replace `<payload-environment>` with the requested
payload filter or an observed value from the selected project, not the credential
selector. The numeric IDs below are fictional examples: use IDs from the request
or API responses. Never send placeholders or reuse example IDs as real targets.

List active errors with `rollbar_get`:

```json
{
  "path": "/api/1/items",
  "environment": "<credential-environment>",
  "query": {
    "status": "active",
    "level": ["error", "critical"],
    "page": 1
  }
}
```

Filter items by a payload environment within the selected Rollbar project:

```json
{
  "path": "/api/1/items",
  "environment": "<credential-environment>",
  "query": {
    "status": "active",
    "environment": "<payload-environment>",
    "page": 1
  }
}
```

Resolve item counter `456` from a Rollbar URL such as `/items/456/`:

```json
{
  "path": "/api/1/item_by_counter/456",
  "environment": "<credential-environment>"
}
```

List recent occurrences using the internal item ID returned by Rollbar:

```json
{
  "path": "/api/1/item/123456789/instances",
  "environment": "<credential-environment>",
  "query": {
    "limit": 20
  }
}
```

Fetch one occurrence's complete payload using an occurrence ID:

```json
{
  "path": "/api/1/instance/3209095494",
  "environment": "<credential-environment>"
}
```

Keep the top-level credential `environment` consistent across an investigation. Compare multiple occurrences before claiming a pattern, treat sensitive payload fields carefully, and distinguish Rollbar evidence from source-code inference.

Do not create, modify, resolve, mute, or delete Rollbar data. This MCP server intentionally exposes no mutation tools.
