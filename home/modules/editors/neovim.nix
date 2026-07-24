{ pkgs, ... }:
{
  programs.neovim = {
    enable = true;
    defaultEditor = true;
    viAlias = true;
    vimAlias = true;
    initLua = ''
      require("config.lazy")
    '';
    extraPackages = with pkgs; [
      clang
      fd
      fzf
      git
      lazygit
      luarocks
      nodejs_24
      ripgrep
      tree-sitter
      unzip
      wl-clipboard
    ];
  };

  xdg.configFile = {
    "nvim/lua/config/lazy.lua".text = ''
      local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
      if not (vim.uv or vim.loop).fs_stat(lazypath) then
        local lazyrepo = "https://github.com/folke/lazy.nvim.git"
        local out = vim.fn.system({
          "git",
          "clone",
          "--filter=blob:none",
          "--branch=stable",
          lazyrepo,
          lazypath,
        })
        if vim.v.shell_error ~= 0 then
          vim.api.nvim_echo({
            { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
            { out, "WarningMsg" },
            { "\nPress any key to exit..." },
          }, true, {})
          vim.fn.getchar()
          os.exit(1)
        end
      end
      vim.opt.rtp:prepend(lazypath)

      require("lazy").setup({
        spec = {
          { "LazyVim/LazyVim", import = "lazyvim.plugins" },
          { import = "lazyvim.plugins.extras.lang.ruby" },
          { import = "plugins" },
        },
        defaults = {
          lazy = false,
          version = false,
        },
        install = { colorscheme = { "catppuccin-mocha", "habamax" } },
        checker = {
          enabled = true,
          notify = false,
        },
        performance = {
          rtp = {
            disabled_plugins = {
              "gzip",
              "tarPlugin",
              "tohtml",
              "tutor",
              "zipPlugin",
            },
          },
        },
      })
    '';

    "nvim/lua/config/options.lua".text = ''
      vim.opt.number = true
      vim.opt.relativenumber = false
      vim.opt.expandtab = true
      vim.opt.shiftwidth = 2
      vim.opt.tabstop = 2
      vim.opt.termguicolors = true
    '';

    "nvim/lua/config/autocmds.lua".text = ''
      vim.api.nvim_create_autocmd("FileType", {
        pattern = "ruby",
        callback = function(event)
          -- GetRubyIndent uses these syntax groups to distinguish Ruby
          -- structure from keywords inside strings, comments, and heredocs.
          vim.bo[event.buf].syntax = "ruby"
        end,
      })
    '';

    "nvim/lua/config/keymaps.lua".text = ''
      -- Add custom keymaps here.
    '';

    "nvim/lua/plugins" = {
      source = ../../../files/nvim/lua/plugins;
      recursive = true;
    };
  };
}
