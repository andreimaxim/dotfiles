-- Windows-owned WezTerm configuration; not deployed into WSL.
-- See https://wezfurlong.org/wezterm/

    local wezterm = require 'wezterm'
    local config = wezterm.config_builder and wezterm.config_builder() or {}
    local act = wezterm.action

    config.font = wezterm.font("PragmataPro Mono")
    config.font_size = 12
    config.line_height = 1.3
    config.color_scheme = "Catppuccin Mocha"
    config.colors = {
      scrollbar_thumb = "#2f334d",
    }

    -- WezTerm pane management is disabled; tmux owns panes inside WSL.
    --[[
    local prefix_timeout_ms = 250
    local pending_prefix = {}

    local function pane_key(pane)
      return tostring(pane:pane_id())
    end

    local function cancel_prefix(pane)
      pending_prefix[pane_key(pane)] = nil
    end

    local function send_ctrl_a(window, pane)
      window:perform_action(act.SendKey({ key = "a", mods = "CTRL" }), pane)
    end

    local function prefix_action(action)
      return wezterm.action_callback(function(window, pane)
        cancel_prefix(pane)
        window:perform_action(act.PopKeyTable, pane)
        window:perform_action(action, pane)
      end)
    end

    local function enter_prefix(window, pane)
      local key = pane_key(pane)
      local token = {}
      pending_prefix[key] = token

      wezterm.time.call_after(prefix_timeout_ms / 1000, function()
        if pending_prefix[key] == token then
          pending_prefix[key] = nil
          pcall(send_ctrl_a, window, pane)
        end
      end)

      window:perform_action(
        act.ActivateKeyTable({
          name = "prefix",
          one_shot = false,
          timeout_milliseconds = prefix_timeout_ms,
          until_unknown = true,
        }),
        pane
      )
    end
    ]]

    config.keys = {
      -- WezTerm's C-a prefix is disabled so C-a passes through to the shell.
      --[[
      -- C-a starts a short prefix window; if no prefix key is pressed, pass C-a
      -- through to readline so it moves to the beginning of the line.
      {
        key = "a",
        mods = "CTRL",
        action = wezterm.action_callback(enter_prefix),
      },
      ]]

      -- Send Shift+Enter as CSI-u so Amp can distinguish it from Enter.
      {
        key = "Enter",
        mods = "SHIFT",
        action = act.SendString("\x1b[13;2u"),
      },

      { key = "F11", action = wezterm.action.ToggleFullScreen },
    }

    config.mouse_bindings = {
      {
        event = { Down = { streak = 1, button = { WheelUp = 1 } } },
        mods = "NONE",
        action = act.ScrollByLine(-1),
      },
      {
        event = { Down = { streak = 1, button = { WheelDown = 1 } } },
        mods = "NONE",
        action = act.ScrollByLine(1),
      },
    }

    -- WezTerm pane key tables are disabled in favor of tmux.
    --[[
    config.key_tables = {
      prefix = {
        { key = "a", mods = "CTRL", action = prefix_action(act.SendKey({ key = "a", mods = "CTRL" })) },
        { key = "c", action = prefix_action(act.ActivateCopyMode) },
        { key = "phys:Space", action = prefix_action(act.ActivateCommandPalette) },
        { key = "s", action = prefix_action(act.SplitVertical({ domain = "CurrentPaneDomain" })) },
        { key = "v", action = prefix_action(act.SplitHorizontal({ domain = "CurrentPaneDomain" })) },
        { key = "h", action = prefix_action(act.ActivatePaneDirection("Left")) },
        { key = "j", action = prefix_action(act.ActivatePaneDirection("Down")) },
        { key = "k", action = prefix_action(act.ActivatePaneDirection("Up")) },
        { key = "l", action = prefix_action(act.ActivatePaneDirection("Right")) },
        { key = "q", action = prefix_action(act.CloseCurrentPane({ confirm = true })) },
        { key = "z", action = prefix_action(act.TogglePaneZoomState) },
        { key = "o", action = prefix_action(act.RotatePanes("Clockwise")) },
        {
          key = "n",
          action = prefix_action(act.ActivateKeyTable({ name = "resize_pane", one_shot = false })),
        },
        { key = "w", action = prefix_action(act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" })) },
        { key = "Escape", action = prefix_action(act.Nop) },
      },
      resize_pane = {
        { key = "h", action = act.AdjustPaneSize({ "Left", 1 }) },
        { key = "j", action = act.AdjustPaneSize({ "Down", 1 }) },
        { key = "k", action = act.AdjustPaneSize({ "Up", 1 }) },
        { key = "l", action = act.AdjustPaneSize({ "Right", 1 }) },
        { key = "Escape", action = "PopKeyTable" },
        { key = "Enter", action = "PopKeyTable" },
      },
      move_tab = {
        { key = "h", action = act.MoveTabRelative(-1) },
        { key = "j", action = act.MoveTabRelative(-1) },
        { key = "k", action = act.MoveTabRelative(1) },
        { key = "l", action = act.MoveTabRelative(1) },
        { key = "Escape", action = "PopKeyTable" },
        { key = "Enter", action = "PopKeyTable" },
      },
    }
    ]]

    config.window_decorations = "TITLE|RESIZE"
    config.enable_tab_bar = true
    config.hide_tab_bar_if_only_one_tab = true
    config.use_fancy_tab_bar = true
    config.alternate_buffer_wheel_scroll_speed = 1
    config.enable_scroll_bar = true
    config.window_padding = {
      left = 16,
      right = 16,
      top = 14,
      bottom = 14,
    }

    config.audible_bell = "Disabled"
    config.visual_bell = {
      fade_in_function = "EaseIn",
      fade_in_duration_ms = 50,
      fade_out_function = "Linear",
      fade_out_duration_ms = 0,
    }

return config
