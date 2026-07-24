{ hunk, ... }:
{
  imports = [ hunk.homeManagerModules.default ];

  programs.hunk = {
    enable = true;
    settings = {
      theme = "catppuccin-mocha";
      line_numbers = false;
      menu_bar = false;
    };
  };
}
