local wezterm = require 'wezterm'

local module = {}

function module.apply_to_config(config)
    config.font = wezterm.font("JetBrainsMonoNL Nerd Font")
    config.font_size = 11
end

return module
