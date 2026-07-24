final: prev: {
  ampcode = final.callPackage ../pkgs/ampcode { };
  claude-code = final.callPackage ../pkgs/claude-code { };
  pi-coding-agent = final.callPackage ../pkgs/pi-coding-agent { };
  swo-cli = final.callPackage ../pkgs/swo-cli { };
}
