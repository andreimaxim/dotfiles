---
name: nixify-project
description: Set up local-only Nix/direnv scaffolding for an existing project, then create a project-specific flake.nix by inspecting the project and adding only the dependencies it actually needs.
---

# Nixify Project

Use this skill when the user wants a local, untracked Nix + direnv setup for an existing project checkout.

## Goal

Make the project usable through `direnv` and a local `flake.nix` without committing Nix-specific files to the project.

Success means:

- `.envrc` exists with the template below
- repo-local git excludes include `/flake.nix`, `/flake.lock`, and `/.envrc`
- `flake.nix` is specific to this project, not generic boilerplate
- project install/build commands get past missing system dependency failures
- `nix flake lock path:.` has been run when `flake.nix` changed or `flake.lock` is missing
- the final response tells the user whether they need to run `direnv allow`

## Local scaffolding

Write `.envrc` in the target project:

```bash
# Register cache inputs before `use flake`. nix-direnv checks the watches known
# at this point when deciding whether its cached environment is still valid.
watch_file flake.nix flake.lock

# path:. bypasses Nix's git-tree-purity check when flake.nix is untracked.
use flake path:.

# Keep app/service configuration out of flake.nix. Rails also reads this through
# dotenv-rails, but direnv makes the same vars available to shell tools.
dotenv_if_exists .env
```

When `flake.nix` reads project files such as `.ruby-version`, `.node-version`,
or a toolchain file, add the files that actually apply to the project to the
`watch_file` call. Keep `watch_file` before `use flake`; registering a dynamic
input afterward can let nix-direnv reuse and refresh a stale cache before it
notices that the input changed.

For example, when a Ruby flake reads `.ruby-version`, the beginning of `.envrc`
must be:

```bash
watch_file flake.nix flake.lock .ruby-version
use flake path:.
```

For Ruby projects, keep manually installed gems isolated by Ruby ABI and make
`ruby-lsp` available to editors without adding it to the application Gemfile:

```bash
ruby_version="$(ruby -e 'print RUBY_VERSION')"
export GEM_HOME="$(expand_path ".gem/$ruby_version")"
PATH_add "$GEM_HOME/bin"

if ! gem list -i ruby-lsp >/dev/null 2>&1; then
  log_status "installing ruby-lsp into $GEM_HOME …"
  gem install --no-document ruby-lsp
fi
```

Place this after `use flake` so the Ruby version comes from the project shell.
The standalone `ruby-lsp` executable composes its own bundle against the
project's locked dependencies and therefore must not be launched with
`bundle exec`.

Also add `/.gem/` to the repo-local git excludes for Ruby projects.

Ensure each line is present in the repo-local git excludes file, usually `.git/info/exclude`:

```gitignore
/flake.nix
/flake.lock
/.envrc
```

## Build the flake

Inspect the project files to identify the stack, runtime versions, package manager, and normal setup commands. Create `flake.nix` from that evidence.

Use the project’s normal install/build/test commands to discover missing system dependencies. When a command fails because a system dependency is missing, add only that dependency to `flake.nix` and retry the smallest useful check.

Prefer the project’s actual choices over broad defaults.

Use generic, role-based names for flake internals (`dev`, `gems`, `devBundle`) rather than the project's name. The flake already lives in the project; encoding the project name in a `bundlerEnv` or binding is redundant.

## Constraints

- Keep `flake.nix`, `flake.lock`, and `.envrc` local-only unless the user explicitly wants them tracked.
- Do not edit any project files
- Do not run long-running services or destructive commands unless the user asks.
- Do not add mutually exclusive tools or speculative dependencies just in case.

## Validation

After changes, run the most relevant cheap validation available:

- `nix flake lock path:.` when needed
- `nix develop path:. -c <small install/build/check command>` when practical
- `direnv exec . <runtime-version command>` when `.envrc` is allowed, to verify
  that nix-direnv is not serving a stale cached environment
- a package-manager install/check command scoped to the project’s normal workflow

If validation cannot be run, explain why and name the next best check.

## Stop rules

Stop iterating when the project gets past system dependency failures or when the next failure is clearly project code, credentials, services, network access, or application configuration rather than missing Nix dependencies.

Ask the user only when missing information would materially change the flake or require risky side effects.
