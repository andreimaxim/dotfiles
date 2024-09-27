local module = {}

function module.apply_to_config(config)
    local wezterm = require 'wezterm'
    local act = wezterm.action

    config.default_prog = { 'C:\\Windows\\System32\\wsl.exe', '~' }
    config.mux_enable_ssh_agent = false

    config.leader = { key = "a", mods = "CTRL", timeout_milliseconds = 1000 }
    config.keys = {
        -- Send C-a when pressing C-a twice
        { key = "a",          mods = "LEADER|CTRL",                    action = act.SendKey { key = "a", mods = "CTRL" } },
        { key = "c",          mods = "LEADER",                         action = act.ActivateCopyMode },
        { key = "phys:Space", mods = "LEADER",                         action = act.ActivateCommandPalette },

        -- Pane keybindings
        { key = "s",          mods = "LEADER",                         action = act.SplitVertical { domain = "CurrentPaneDomain" } },
        { key = "v",          mods = "LEADER",                         action = act.SplitHorizontal { domain = "CurrentPaneDomain" } },
        { key = "h",          mods = "LEADER",                         action = act.ActivatePaneDirection("Left") },
        { key = "j",          mods = "LEADER",                         action = act.ActivatePaneDirection("Down") },
        { key = "k",          mods = "LEADER",                         action = act.ActivatePaneDirection("Up") },
        { key = "l",          mods = "LEADER",                         action = act.ActivatePaneDirection("Right") },
        { key = "q",          mods = "LEADER",                         action = act.CloseCurrentPane { confirm = true } },
        { key = "z",          mods = "LEADER",                         action = act.TogglePaneZoomState },
        { key = "o",          mods = "LEADER",                         action = act.RotatePanes "Clockwise" },
        -- We can make separate keybindings for resizing panes
        -- But Wezterm offers custom "mode" in the name of "KeyTable"
        { key = "n",          mods = "LEADER",                         action = act.ActivateKeyTable { name = "resize_pane", one_shot = false } },

        -- Lastly, workspace
        { key = "w",          mods = "LEADER",                         action = act.ShowLauncherArgs { flags = "FUZZY|WORKSPACES" } },

        { key = 'F11',        action = wezterm.action.ToggleFullScreen }
    }

    config.key_tables = {
        resize_pane = {
            { key = "h",      action = act.AdjustPaneSize { "Left", 1 } },
            { key = "j",      action = act.AdjustPaneSize { "Down", 1 } },
            { key = "k",      action = act.AdjustPaneSize { "Up", 1 } },
            { key = "l",      action = act.AdjustPaneSize { "Right", 1 } },
            { key = "Escape", action = "PopKeyTable" },
            { key = "Enter",  action = "PopKeyTable" },
        },
        move_tab = {
            { key = "h",      action = act.MoveTabRelative(-1) },
            { key = "j",      action = act.MoveTabRelative(-1) },
            { key = "k",      action = act.MoveTabRelative(1) },
            { key = "l",      action = act.MoveTabRelative(1) },
            { key = "Escape", action = "PopKeyTable" },
            { key = "Enter",  action = "PopKeyTable" },
        }
    }

    config.window_decorations = "TITLE|RESIZE"
    config.enable_tab_bar = false
    config.window_padding = {
        left = 16,
        right = 16,
        top = 14,
        bottom = 14
    }

    config.audible_bell = "Disabled"
    config.visual_bell = {
        fade_in_function = 'EaseIn',
        fade_in_duration_ms = 50,
        fade_out_function = 'Linear',
        fade_out_duration_ms = 0,
    }
end

return module
