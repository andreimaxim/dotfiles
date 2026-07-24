{ config, pkgs, ... }:
let
  npmPrefix = "${config.home.homeDirectory}/.npm-global";
in
{
  home.packages = [ pkgs.nodejs_24 ];

  home.file.".npmrc".text = ''
    prefix=${npmPrefix}
    fund=false
    audit=false
  '';

  home.sessionPath = [ "${npmPrefix}/bin" ];
}
