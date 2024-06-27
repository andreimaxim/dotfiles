return {
  "nvim-telescope/telescope.nvim",
  keys = {
    {
      "<leader><leader>",
      function()
        local builtin = require("telescope.builtin")
        local themes = require("telescope.themes")
        builtin.find_files(themes.get_ivy({
          hidden = true,
          no_ignore = true,
          no_ignore_parent = true,
          file_ignore_patterns = {
            "^.git/",
            "^node_modules/",
          },
          layout_config = {
            height = 15,
          },
        }))
      end,
      desc = "Find all files",
    },
    {
      "<leader>fw",
      function()
        local builtin = require("telescope.builtin")
        local themes = require("telescope.themes")
        builtin.grep_string(themes.get_ivy({
          additional_args = function()
            return { "--hidden", "--no-ignore", "--glob", "!**/.git/*", "--glob", "!**/node_modules/*" }
          end,
          search = vim.fn.expand("<cword>"),
          layout_config = {
            height = 15,
          },
        }))
      end,
      desc = "Find word under cursor",
    },
  },
}
