return {
  {
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    opts = {
      flavour = "mocha", -- latte, frappe, macchiato, mocha
      transparent_background = false,
      integrations = {
        blink_cmp = true,
        bufferline = true,
        cmp = true,
        gitsigns = true,
        mason = true,
        mini = true,
        native_lsp = {
          enabled = true,
        },
        neo_tree = true,
        notify = true,
        telescope = true,
        treesitter = true,
        which_key = true,
      },
    },
  },
  -- Set catppuccin as the LazyVim colorscheme
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "catppuccin",
    },
  },
}
