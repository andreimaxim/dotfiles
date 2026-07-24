{ username, ... }:
{
  imports = [
    ./host.nix

    ./modules/shell
    ./modules/cli
    ./modules/terminals
    ./modules/languages
    ./modules/editors
    ./modules/agents
    ./modules/containers
  ];

  home.username = username;
  home.homeDirectory = "/home/${username}";
  home.stateVersion = "26.05";

  programs.home-manager.enable = true;

  manual.manpages.enable = false;
}
