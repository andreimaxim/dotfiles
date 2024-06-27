return {
  "nvim-telescope/telescope.nvim",
  keys = {
    {
      "<leader><leader>",
      function()
        require("telescope.builtin").find_files({
          hidden = true,
          no_ignore = true,
          no_ignore_parent = true,
          file_ignore_patterns = {
            "^.git/",
            "^node_modules/",
          },
        })
      end,
      desc = "Find all files",
    },
    {
      "<leader>fw",
      function()
        require("telescope.builtin").grep_string({
          additional_args = function()
            return { "--hidden", "--no-ignore", "--glob", "!**/.git/*", "--glob", "!**/node_modules/*" }
          end,
          search = vim.fn.expand("<cword>"),
        })
      end,
      desc = "Find word under cursor",
    },
  },
}
