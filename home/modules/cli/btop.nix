{ ... }:
{
  programs.btop = {
    enable = true;
    settings = {
      color_theme = "catppuccin_mocha";
      theme_background = true;
      truecolor = true;
    };
  };

  xdg.configFile."btop/themes/catppuccin_mocha.theme".source =
    ../../../files/btop/catppuccin_mocha.theme;
}
