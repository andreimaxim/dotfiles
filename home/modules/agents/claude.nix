{ config, pkgs, ... }:
let
  claudeSettings = {
    cleanupPeriodDays = 7;
    model = "claude-fable-5[1m]";
    autoMemoryEnabled = false;
    tui = "fullscreen";
    feedbackSurveyRate = 0;
    attribution = {
      commit = "";
      pr = "";
    };
    env = {
      CLAUDE_CODE_SUBAGENT_MODEL = "claude-fable-5[1m]";
      DISABLE_ERROR_REPORTING = "1";
      DISABLE_FEEDBACK_COMMAND = "1";
      DISABLE_AUTOUPDATER = "1";
    };
    permissions.defaultMode = "bypassPermissions";
    permissions.deny = [
      "AskUserQuestion"
      "ToolSearch"
      "ScheduleWakeup"
      "PushNotification"
      "NotebookEdit"
      "Monitor"
      "RemoteTrigger"
      "WebFetch"
      "WebSearch"
      "CronCreate"
      "CronDelete"
      "CronList"
      "TaskCreate"
      "TaskGet"
      "TaskList"
      "TaskOutput"
      "TaskStop"
      "TaskUpdate"
      "EnterPlanMode"
      "ExitPlanMode"
      "EnterWorktree"
      "ExitWorktree"
    ];
    enabledPlugins = { };
    skipWebFetchPreflight = true;
    alwaysThinkingEnabled = true;
    effortLevel = "xhigh";
    awaySummaryEnabled = false;
    autoUpdatesChannel = "latest";
    channelsEnabled = false;
    showThinkingSummaries = true;
    skipDangerousModePermissionPrompt = true;
    verbose = true;
    remoteControlAtStartup = false;
    autoUploadSessions = false;
    inputNeededNotifEnabled = false;
    agentPushNotifEnabled = false;
    autoCompactEnabled = false;
    spinnerTipsEnabled = false;
    promptSuggestionEnabled = false;
    disableWorkflows = true;
    fileCheckpointingEnabled = false;
    claudeInChromeDefaultEnabled = false;
  };
in
{
  programs.claude-code = {
    enable = true;
    package = pkgs.claude-code;
    settings = claudeSettings;
    skills = ./skills;
  };

  programs.bash.shellAliases.ccx = "claude --system-prompt-file ${config.home.homeDirectory}/.claude/SYSTEM.md";

  home.file.".claude/SYSTEM.md".source = ./SYSTEM.md;
}
