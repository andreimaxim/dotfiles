local wezterm = require("wezterm")
local config = wezterm.config_builder()

local defaults = require("omakub.wezterm")
local font = require("omakub.font")
local theme = require("omakub.theme")

font.apply_to_config(config)
theme.apply_to_config(config)
defaults.apply_to_config(config)

return config
