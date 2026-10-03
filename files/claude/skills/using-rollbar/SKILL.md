---
name: using-rollbar
description: Investigates Rollbar items and occurrences through the read-only Rollbar MCP server. Use for production errors, exception triage, stack traces, occurrences, and Rollbar item links or numbers.
---

# Using Rollbar

Use these request patterns for Rollbar investigations.

## Prerequisite

This skill requires `rollbar_list_environments` and `rollbar_get` from a read-only
Rollbar MCP server with the contracts described below. Use the tool names exposed
by the current host, including any required server prefix. Do not guess a server
name or substitute tools with different schemas. If either tool is unavailable,
report the missing prerequisite rather than accessing credentials or making
HTTP calls from the shell.

## Examples

Discover configured credential environments with `rollbar_list_environments`:

```json
{}
```

Use the requested environment when listed, or the only listed environment when
there is just one.
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
