{
  description = "andrei's home environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    hunk = {
      url = "github:modem-dev/hunk";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      home-manager,
      hunk,
      ...
    }:
    let
      system = "x86_64-linux";
      username = "andrei";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ (import ./overlays) ];
        config.allowUnfree = true;
      };
    in
    {
      homeConfigurations.${username} = home-manager.lib.homeManagerConfiguration {
        inherit pkgs;
        extraSpecialArgs = { inherit hunk username; };
        modules = [ ./home/common.nix ];
      };

      packages.${system} = {
        inherit (pkgs)
          ampcode
          claude-code
          pi-coding-agent
          swo-cli
          ;
      };

      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nixfmt-tree
          nixd
          ruby_4_0
          bundix
        ];
      };

      templates = {
        ruby = {
          path = ./templates/ruby;
          description = "Generic Ruby dev shell: nixpkgs-ruby + bundlerEnv for LSP, project-scoped bundle";
        };
        rails = {
          path = ./templates/rails;
          description = "Rails dev shell: ruby template + DB/media/JS packages for ActiveStorage & asset bundling";
        };
      };

      formatter.${system} = pkgs.nixfmt-tree;
    };
}
