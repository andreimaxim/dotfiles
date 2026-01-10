local wezterm = require("wezterm")

local module = {}

function module.apply_to_config(config)
	config.font = wezterm.font("PragmataPro Mono")
	config.font_size = 12
end

return module
