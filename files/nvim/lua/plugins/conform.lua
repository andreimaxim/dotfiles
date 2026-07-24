return {
  {
    "stevearc/conform.nvim",
    optional = true,
    opts = {
      formatters = {
        rubocop = {
          command = function(_, ctx)
            return vim.fs.root(ctx.dirname, ".envrc") and "direnv" or "rubocop"
          end,
          prepend_args = function(_, ctx)
            local root = vim.fs.root(ctx.dirname, ".envrc")
            return root and { "exec", root, "bundle", "exec", "rubocop" } or {}
          end,
          cwd = function(_, ctx)
            return vim.fs.root(ctx.dirname, { "Gemfile", ".git" })
          end,
        },
      },
    },
  },
}
