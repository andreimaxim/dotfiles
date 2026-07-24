{
  description = "Ruby dev shell (Ruby from .ruby-version, project-scoped bundle)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    nixpkgs-ruby.url = "github:bobvanderlinden/nixpkgs-ruby";
    nixpkgs-ruby.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      nixpkgs,
      nixpkgs-ruby,
      ...
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      ruby = nixpkgs-ruby.lib.packageFromRubyVersionFile {
        file = ./.ruby-version;
        inherit system;
      };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [ ruby ]
        ++ (with pkgs; [
          libyaml

          pkg-config
        ]);

        env = {
          BUNDLE_PATH = ".bundle/gems";
        };
      };
    };
}
