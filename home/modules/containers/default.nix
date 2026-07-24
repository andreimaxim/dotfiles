{ lib, ... }:
{
  imports = [
    ./podman-docker.nix
    ./postgres.nix
    ./redis.nix
    ./mysql.nix
    ./memcached.nix
  ];

  # Quadlets land in ~/.config/containers/systemd, which home-manager's systemd
  # activation (sd-switch) does not watch — it only diffs ~/.config/systemd/user.
  # Without this, an edited .container file is ignored until a manual
  # daemon-reload re-runs the quadlet generator. Restarts stay manual on
  # purpose: these are long-lived shared dev services, and a switch should
  # never bounce a database that running apps are connected to.
  home.activation.quadletReload = lib.hm.dag.entryAfter [ "reloadSystemd" ] ''
    run /usr/bin/systemctl --user daemon-reload
  '';
}
