return {
  {
    "folke/snacks.nvim",
    opts = {
      indent = {
        animate = {
          enabled = false,
        },
      },
      quickfile = {
        exclude = { "ruby" },
      },
      picker = {
        layout = {
          preset = "ivy_split",
          preview = false,
        },
        matcher = {
          frecency = true,
          sort_empty = true,
        },
        sources = {
          explorer = {
            layout = {
              layout = {
                position = "right",
              },
            },
          },
        },
      },
    },
  },
}
