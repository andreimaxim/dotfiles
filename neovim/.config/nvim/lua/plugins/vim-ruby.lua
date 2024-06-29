return {
  "vim-ruby/vim-ruby",
  event = "BufReadPre *.rb",
  config = function()
    vim.g.ruby_recommended_style = 1
  end,
}
