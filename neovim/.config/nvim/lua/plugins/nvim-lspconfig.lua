return {
  {
    "neovim/nvim-lspconfig",

    opts = {
      servers = {
        -- disable solargraph
        solargraph = {
          autostart = false,
        },

        ruby_lsp = {
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
