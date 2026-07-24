{ ... }:
{
  programs.bash = {
    enable = true;

    enableCompletion = false;

    historyControl = [ "ignoreboth" ];
    historySize = 32768;
    historyFileSize = 32768;

    initExtra = ''
      if [[ -r "$HOME/.config/op/plugins.sh" ]]; then
        source "$HOME/.config/op/plugins.sh"
      fi

      if command -v ssh.exe >/dev/null 2>&1; then
        alias ssh='ssh.exe'
        alias ssh-add='ssh-add.exe'
      fi
    '';

    shellAliases = {
      ls = "eza -lh --group-directories-first";
      lsa = "ls -a";
      lt = "eza --tree --level=2 --long --icons --git";
      lta = "lt -a";
      ff = "fzf --preview 'bat --style=numbers --color=always {}'";

      cd = "z";
      ".." = "cd ..";
      "..." = "cd ../..";
      "...." = "cd ../../..";

      d = "docker";
      lzg = "lazygit";
      gs = "git status";
      n = "nvim";

      r = "bin/rails";
      rs = "bin/rails server";
      rc = "bin/rails console";
      rt = "bin/rails test";
      rdb = "bin/rails dbconsole";
      rdm = "bin/rails db:migrate";
      rdr = "bin/rails db:rollback";
      rgc = "bin/rails g controller";
      rgj = "bin/rails g job";
      rgm = "bin/rails g model";
      rgs = "bin/rails g script";
    };
  };

  home.sessionPath = [ "$HOME/.local/bin" ];
}
