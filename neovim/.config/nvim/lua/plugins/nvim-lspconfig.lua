return {
  {
    "neovim/nvim-lspconfig",
 
    opts = {
      servers = {
        -- disable solargraph
        solargraph = {
          autostart = false
        },

        ruby_lsp = {}
      }
    }
  }
}
