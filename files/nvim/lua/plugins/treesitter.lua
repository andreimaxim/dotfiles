return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      -- Use the classic vim-ruby syntax and indentation engines. They
      -- handle incomplete Ruby and trailing dots more reliably.
      highlight = {
        disable = { "ruby" },
      },
      indent = {
        disable = { "ruby" },
      },
    },
  },
}
