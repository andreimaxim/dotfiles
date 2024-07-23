return {
  {
    "neovim/nvim-lspconfig",

    opts = {
      servers = {
        -- Disable the default LSP server for Ruby
        solargraph = {
          autostart = false,
        },

        ruby_lsp = {
          -- Make sure that the ruby-lsp is loaded for the current Ruby version
          cmd = { "mise", "x", "--", "ruby-lsp" },
          on_attach = function(client, bufnr)
            -- Disable semantic tokens (syntax highlighting from LSP)
            client.server_capabilities.semanticTokensProvider = nil
            -- Disable document highlighting
            client.server_capabilities.documentHighlightProvider = false
          end,
        },
      },
    },
  },
}
