# nix-config

Full bootstrap walkthrough lives at <https://nix.andreimaxim.com> (sources
under `docs/`).

## Common commands

```bash
# Apply the currently committed configuration.
home-manager switch

# Update flake pins and apply.
nix flake update && home-manager switch

# Format every tracked Nix file with nixfmt (RFC 166).
nix fmt

# Scaffold a new project from one of the templates.
nix flake init -t ~/.config/home-manager#ruby
nix flake init -t ~/.config/home-manager#rails
```


After the initial setup:

```bash
npm install -g ccusage @andreimaxim/git-xor @herb-tools/language-server
```
