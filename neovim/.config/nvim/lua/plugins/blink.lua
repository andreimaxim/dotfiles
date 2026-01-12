return {
  {
    "saghen/blink.cmp",
    opts = {
      -- Disable automatic completion
      completion = {
        trigger = {
          show_on_keyword = false,
          show_on_trigger_character = false,
          show_on_insert_on_trigger_character = false,
        },
      },
      -- Manual trigger with Ctrl+Space
      keymap = {
        ["<C-Space>"] = { "show" },
      },
    },
  },
}
