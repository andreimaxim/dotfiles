return {
  "ibhagwan/fzf-lua",
  opts = {
    winopts = {
      split = "belowright 15new", -- bottom split instead of floating
      preview = {
        layout = "horizontal",
        horizontal = "right:50%",
      },
    },
  },
  keys = {
    {
      "<leader><leader>",
      function()
        require("fzf-lua").oldfiles({ cwd_only = true })
      end,
      desc = "Recent files",
    },
  },
}
