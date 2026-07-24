local function project_command(command)
  return function(dispatchers, config)
    local cwd = config.root_dir or vim.fn.getcwd()
    local version_file = vim.fs.find(".ruby-version", { path = cwd, upward = true })[1]
    local cmd = vim.deepcopy(command)

    if version_file then
      cwd = vim.fs.dirname(version_file)
      cmd = vim.list_extend({ "mise-project-exec", cwd }, cmd)
    end

    return vim.lsp.rpc.start(cmd, dispatchers, {
      cwd = cwd,
      env = config.cmd_env,
      detached = config.detached,
    })
  end
end

return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        ruby_lsp = {
          cmd = project_command({ "ruby-lsp" }),
          mason = false,
          on_attach = function(client)
            vim.lsp.on_type_formatting.enable(true, { client_id = client.id })
          end,
        },
        rubocop = {
          -- Ruby LSP loads the project's RuboCop as an add-on, so a
          -- second RuboCop LSP would only duplicate its diagnostics.
          enabled = false,
          mason = false,
        },
      },
    },
  },
}
