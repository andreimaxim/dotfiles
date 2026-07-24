# Repository guidance

This is a single-user (`andrei`), `x86_64-linux` Home Manager flake.

- `flake.nix` is the entry point; `home/common.nix` composes the configuration.
- Put user configuration in the matching `home/modules/<domain>/` module and import new modules from that domain's `default.nix`.
- Put local derivations in `pkgs/` and expose them through `overlays/default.nix`. `files/` contains static deployed assets; `templates/` and `docs/` are standalone project/bootstrap content.
- Keep changes focused and preserve `home.stateVersion` unless a migration explicitly requires changing it.
- Format Nix files with `nix fmt` and validate with `nix flake check --no-build`.
- Do not edit generated `result*` paths. Update `flake.lock` only when changing dependencies intentionally.
- Do not run `home-manager switch` unless explicitly requested: it activates the configuration in the user's live environment.



