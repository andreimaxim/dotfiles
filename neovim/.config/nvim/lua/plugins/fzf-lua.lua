return {
  "ibhagwan/fzf-lua",
  opts = {
    winopts = {
      split = "botright 15new", -- bottom split spanning full width
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
