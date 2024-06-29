return {
  "sheerun/vim-polyglot",
  event = "BufReadPre",
  config = function()
    vim.g.polyglot_disabled = { "ruby" } -- Disable polyglot's Ruby support since we're using vim-ruby
  end,
}
