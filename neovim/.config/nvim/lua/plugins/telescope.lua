return {
  "nvim-telescope/telescope.nvim",
  opts = function(_, opts)
    local theme = require("telescope.themes").get_ivy({
      layout_config = {
        height = 15,
      },
    })

    opts.defaults = vim.tbl_deep_extend("force", opts.defaults or {}, theme, {
      mappings = {
        i = {
          ["<esc>"] = "close",
        },
      },
    })

    opts.pickers = vim.tbl_deep_extend("force", opts.pickers or {}, {
      find_files = {
        hidden = true,
        no_ignore = true,
        no_ignore_parent = true,
        file_ignore_patterns = {
          "^.git/",
          "^node_modules/",
        },
      },
      grep_string = {
        additional_args = function()
          return { "--hidden", "--no-ignore", "--glob", "!**/.git/*", "--glob", "!**/node_modules/*" }
        end,
      },
    })

    return opts
  end,
  keys = {
    {
      "<leader><leader>",
      function()
        require("telescope.builtin").find_files()
      end,
      desc = "Find all files",
    },
    {
      "<leader>fw",
      function()
        require("telescope.builtin").grep_string({ search = vim.fn.expand("<cword>") })
      end,
      desc = "Find word under cursor",
    },
    {
      "<leader>,",
      function()
        require("telescope.builtin").resume()
      end,
      desc = "Resume last picker",
    },
  },
}
