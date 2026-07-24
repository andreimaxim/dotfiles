{ pkgs, ... }:
{
  xdg.configFile."containers/containers.conf".text = ''
    [network]
    default_rootless_network_cmd = "slirp4netns"
  '';

  xdg.configFile."systemd/user/podman-user-wait-network-online.service.d/override.conf".text = ''
    [Service]
    ExecStart=
    ExecStart=${pkgs.coreutils}/bin/true
  '';
}
