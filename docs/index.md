---
layout: default
title: "nix-home-manager · andrei"
description: "Bootstrap and daily-driver notes for andreimaxim/nix-config on Fedora Kinoite."
---

<section class="hero" id="apply">

<header class="sec-head">
  <h1 class="title">Usage</h1>
</header>

<div class="cmd-stack">

{% include cmd.html
   label="Pull the latest committed config and apply."
   cmd="cd ~/.config/home-manager && git pull && home-manager switch" %}

{% include cmd.html
   label="Or, update the pins to the latest revisions and apply."
   cmd="cd ~/.config/home-manager && nix flake update && home-manager switch" %}

</div>

</section>

<section class="motivation" id="motivation">

<header class="sec-head">
  <h2 class="title">Motivation</h2>
</header>

<div class="motivation-body" markdown="1">

Fedora's atomic distributions split the OS into a read-only base that updates
transactionally, and user-land apps distributed as flatpaks. Developer tooling
is the gray area — compilers, linkers, kernel headers traditionally live in
the OS layer, which makes a setup hard to replicate across machines and
strays from the atomic approach of layering as little as possible on top.

Home Manager and Nix shells own the user configuration and activate the right
tools per project. Fedora owns the base OS. A handful of packages still get
layered onto the host — container tooling and hardware video drivers among them
(see Bootstrap) — but two are GUI apps whose integrations leave no choice:

- 1Password — GUI plus the `op` CLI, used to keep secrets out of env files.
- Google Chrome — mostly for the 1Password extension integration.

Both could be flatpaks; the integration would just involve more moving parts.

A third category sits between Nix and the base OS: fast-moving leaf tools and
the Zed editor. They self-update several times a week, faster than nixpkgs
tracks them, so the binaries come from their own installers (the vendor script
or `npm`) instead of being pinned through Nix. Home Manager still owns their
configuration; only the binaries float.

</div>

</section>

<section class="bootstrap" id="bootstrap">

<header class="sec-head">
  <h2 class="title">Bootstrap</h2>
  <a class="right right-action" href="#" data-toggle-all>[ + ] expand all</a>
</header>

<ol class="steps">

{% capture step_prepare %}
Edit `/etc/ostree/prepare-root.conf` with `sudo $EDITOR` and add a `[root]`
section.

```ini
[composefs]
enabled = yes
```
{: data-before="Before" data-path="/etc/ostree/prepare-root.conf"}

```ini
[composefs]
enabled = yes

[root]
transient = true
```
{: data-before="After" data-path="/etc/ostree/prepare-root.conf"}

Track the file so it survives ostree updates, then reboot.

```bash
sudo rpm-ostree initramfs-etc \
  --track=/etc/ostree/prepare-root.conf
```

```bash
sudo systemctl reboot
```
{% endcapture %}
{% include step.html
   id="prepare"
   title="Prepare a transient root"
   summary="Nix needs to write to /nix, but Kinoite's composefs root is read-only. Mark it transient so the installer can land."
   body=step_prepare %}

{% capture step_host_packages %}
App, CLI, and Chrome have to live on the host together: the extension talks
to the app via Chrome's native-messaging hosts, the CLI talks via a Unix
socket, and git signs commits via `/opt/1Password/op-ssh-sign` at a fixed
absolute path. Flatpak sandboxing or Nix's FHS layout breaks each of those
wires.

```bash
sudo rpm-ostree install \
  1password 1password-cli google-chrome-stable
```

Podman tooling on top of Kinoite's base `podman`: `podman-docker` aliases the
`docker` CLI, `podman-tui` is a terminal UI.

```bash
sudo rpm-ostree install \
  podman-docker podman-tui
```

Hardware H.264/H.265: Fedora ships `mesa-va-drivers` with the
patent-encumbered codecs stripped out. RPM Fusion's `-freeworld` variant
re-enables the hardware encoder on AMD VCN GPUs; `gstreamer1-plugins-va`
exposes it to apps as `vah264enc` / `vah265enc`.

```bash
sudo rpm-ostree install \
  https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm
```

```bash
sudo rpm-ostree override replace --experimental \
  --from repo=rpmfusion-free-updates \
  mesa-va-drivers-freeworld
```

```bash
sudo rpm-ostree install gstreamer1-plugins-va
```

```bash
sudo systemctl reboot
```
{% endcapture %}
{% include step.html
   id="host-packages"
   title="Layer host packages"
   summary="1Password trio, Chrome, podman tooling, and the freeworld mesa drivers for hardware H.264/H.265."
   body=step_host_packages %}

{% capture step_onepassword %}
> Open the 1Password app, sign in, and complete the first-run setup.

> Settings → Developer → enable **Use the SSH agent**. Add at least one SSH
> key to your vault if you don't already have one.

List authorised SSH keys handed out by the agent.

```bash
ssh-add -l
```

Confirm GitHub accepts the agent-signed key.

```bash
ssh -T git@github.com
```
{% endcapture %}
{% include step.html
   id="onepassword"
   title="Sign in to 1Password & enable the SSH agent"
   summary="Every git push and ssh login that follows is signed by the agent."
   body=step_onepassword %}

{% capture step_install_nix %}
```bash
curl --proto '=https' --tlsv1.2 -sSf -L \
  https://install.determinate.systems/nix \
  | sh -s -- install
```

Reboot so `nix.mount` and the daemon come up cleanly.

```bash
sudo systemctl reboot
```

> After reboot, return here for the sanity check below.

Sanity check: version, mount, and a one-shot package run.

```bash
nix --version \
  && mount | grep ' /nix ' \
  && nix run nixpkgs#hello
```
{% endcapture %}
{% include step.html
   id="install-nix"
   title="Install Determinate Nix"
   summary="Detects ostree + transient root, arranges nix.mount for /var/home/nix → /nix."
   body=step_install_nix %}

{% capture step_substituters %}
The base config pulls Ruby straight from nixpkgs; only the `ruby` and `rails`
project templates build their Ruby through nixpkgs-ruby. Point Nix at its cachix
so those per-project dev shells don't compile each Ruby patch from source.

```bash
sudo tee /etc/nix/nix.custom.conf <<'EOF'
extra-substituters = https://nixpkgs-ruby.cachix.org
extra-trusted-public-keys = nixpkgs-ruby.cachix.org-1:vrcdi50fTolOxWCZZkw0jakOnUI1T19oYJ+PRYdK4SM=
EOF
```
{: data-path="/etc/nix/nix.custom.conf"}

Restart the daemon so it picks up the new substituters.

```bash
sudo systemctl restart nix-daemon
```
{% endcapture %}
{% include step.html
   id="substituters"
   title="Add nixpkgs-ruby substituter"
   summary="Pre-built Rubies for the ruby/rails template dev shells — without this each patch compiles from source (~5 min)."
   body=step_substituters %}

{% capture step_activate %}
Ensure `~/.config` exists.

```bash
mkdir -p ~/.config
```

Clone the flake into the path home-manager expects by default.

```bash
git clone git@github.com:andreimaxim/nix-config.git \
  ~/.config/home-manager
```

Build and switch the Home Manager profile.

```bash
nix run home-manager/master -- \
  init --switch \
  --flake ~/.config/home-manager#andrei
```

Enable lingering once so the user systemd manager can start the Podman
quadlets at boot, before the first interactive login. Home Manager does not
manage this host setting; it is a one-time workstation bootstrap step.

```bash
loginctl enable-linger $USER
```

Enable the rootless Podman REST socket. Used by Podman Desktop, DataGrip's
Docker integration, and anything reading
`DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock`.

```bash
systemctl --user enable --now podman.socket
```
{% endcapture %}
{% include step.html
   id="activate"
   title="Fetch the flake & switch the profile"
   summary="First run pulls 2–4 GB; expect 5–20 min."
   body=step_activate %}

{% capture step_leaf_tools %}
These live outside Nix on purpose (see Motivation). Home Manager has already
deployed their config and the Node runtime in the previous step; here you
install the binaries themselves.

Zed: the editor uses the host Vulkan/Mesa stack, so it comes from the vendor
installer rather than Nix. Lands a self-updating binary at `~/.local/bin/zed`
and registers its own desktop entry.

```bash
curl -fsSL https://zed.dev/install.sh | sh
```

The npm utilities and the ERB language server via `npm`. `~/.npmrc` (from Home Manager)
points the global prefix at `~/.npm-global`, so these land in `~/.npm-global/bin`
— already on `PATH` — without touching `~/.local/bin`.

```bash
npm install -g \
  ccusage \
  @andreimaxim/git-xor \
  @herb-tools/language-server
```

Update later with `npm update -g`; Zed self-updates in place.
{% endcapture %}
{% include step.html
   id="leaf-tools"
   title="Install the self-updating leaf tools"
   summary="Zed via its vendor installer, npm for the remaining fast-moving leaf tools."
   body=step_leaf_tools %}

</ol>

</section>

<section class="see-also" id="see-also">

<header class="sec-head">
  <h2 class="title">See also</h2>
</header>

<nav class="see-also-list" aria-label="Related links" markdown="1">

- [andreimaxim/nix-config](https://github.com/andreimaxim/nix-config)
- [Determinate Systems Nix installer](https://determinate.systems/posts/changes-to-the-determinate-nix-installer/)
- [Fedora Kinoite documentation](https://docs.fedoraproject.org/en-US/fedora-kinoite/)
- [composefs documentation](https://ostreedev.github.io/ostree/composefs/)
- [ostree-prepare-root command](https://ostreedev.github.io/ostree/man/ostree-prepare-root.html)

</nav>

</section>
