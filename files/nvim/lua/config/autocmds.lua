vim.api.nvim_create_autocmd("FileType", {
  pattern = "ruby",
  callback = function(event)
    -- GetRubyIndent uses these syntax groups to distinguish Ruby
    -- structure from keywords inside strings, comments, and heredocs.
    vim.bo[event.buf].syntax = "ruby"
  end,
})
