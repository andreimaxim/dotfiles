return {
  {
    "stevearc/conform.nvim",
    optional = true,
    opts = {
      formatters = {
        rubocop = {
          command = function(_, ctx)
            return vim.fs.root(ctx.dirname, ".ruby-version") and "mise-project-exec" or "rubocop"
          end,
          prepend_args = function(_, ctx)
            local root = vim.fs.root(ctx.dirname, ".ruby-version")
            return root and { root, "bundle", "exec", "rubocop" } or {}
          end,
          cwd = function(_, ctx)
            return vim.fs.root(ctx.dirname, { "Gemfile", ".git" })
          end,
        },
      },
    },
  },
}
