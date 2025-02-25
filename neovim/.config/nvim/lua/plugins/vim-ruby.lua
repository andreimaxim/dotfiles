return {
  "vim-ruby/vim-ruby",
  ft = "ruby",
  config = function()
    -- Enable vim-ruby indentation
    vim.g.ruby_indent_access_modifier_style = "indent"
    vim.g.ruby_indent_block_style = "do"
    vim.g.ruby_indent_assignment_style = "hanging"
  end,
}
