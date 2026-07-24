{ config, pkgs, ... }:
{
  programs.zed-editor = {
    enable = true;
    package = null;

    extensions = [
      "catppuccin"
      "catppuccin-icons"
      "html"
      "nix"
      "ruby"
      "sql"
      "toml"
    ];

    mutableUserSettings = false;

    userSettings = {
      project_panel.dock = "right";
      zoomed_padding = true;
      diff_view_style = "unified";
      show_edit_predictions = false;
      icon_theme = "Catppuccin Mocha";
      git.inline_blame.enabled = false;
      buffer_font_family = "PragmataPro";
      which_key.enabled = true;
      autosave.after_delay.milliseconds = 1000;
      telemetry = {
        diagnostics = false;
        metrics = false;
      };
      auto_update = false;
      ui_font_size = 16;
      buffer_font_size = 15.0;
      theme = {
        mode = "dark";
        light = "macOS Classic Light";
        dark = "Catppuccin Mocha";
      };
      toolbar = {
        breadcrumbs = false;
        quick_actions = false;
        selections_menu = false;
      };
      tab_bar = {
        show_tab_bar_buttons = true;
        show = true;
      };
      title_bar = {
        show_branch_name = false;
        show_project_items = false;
        show_onboarding_banner = false;
        show_user_picture = false;
        show_user_menu = false;
        show_sign_in = false;
        show_menus = false;
      };
      status_bar = {
        show_active_file = true;
        "experimental.show" = true;
      };
      search.button = true;
      show_completions_on_input = false;
      minimap.show = "never";
      format_on_save = "on";
      terminal = {
        dock = "right";
        font_family = "PragmataPro Mono";
        font_size = 15;
        button = true;
        toolbar.breadcrumbs = false;
      };
      lsp.ruby-lsp.settings.use_bundler = false;

      languages = {
        "Nix".language_servers = [
          "nixd"
          "!nil"
        ];
        "Ruby".language_servers = [
          "ruby-lsp"
          "!solargraph"
          "!rubocop"
        ];
        "SQL".formatter.external = {
          command = "${pkgs.sqruff}/bin/sqruff";
          arguments = [
            "fix"
            "--config"
            "${config.xdg.configHome}/sqruff/.sqruff"
            "-"
          ];
        };
        "HTML+ERB".language_servers = [
          "herb"
          "ruby-lsp"
        ];
        "JS+ERB".language_servers = [ "ruby-lsp" ];
        "YAML+ERB".language_servers = [ "ruby-lsp" ];
      };
    };
  };
}
