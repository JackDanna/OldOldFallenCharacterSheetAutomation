{
  description = "Automation for Fallen character sheet";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
    };
  in 
  {

    devShells.${system}.default = pkgs.mkShell rec {
      name = "FallenCharacterSheetAutomation";
      buildInputs = with pkgs; [
        dotnet-sdk_8
        nodejs
        gnome.gnome-terminal
        netcoredbg
	      bashInteractive

        (vscode-with-extensions.override  {
          vscode = pkgs.vscode;
          vscodeExtensions = with pkgs.vscode-extensions; [
            ms-dotnettools.csharp
            jnoortheen.nix-ide
            ionide.ionide-fsharp
            mhutchie.git-graph
          ] ++ pkgs.vscode-utils.extensionsFromVscodeMarketplace [
            {
              name = "vscode-edit-csv";
              publisher = "janisdd";
              version = "0.8.2";
              sha256 = "sha256-DbAGQnizAzvpITtPwG4BHflUwBUrmOWCO7hRDOr/YWQ=";
            }
          ];
        })
      ];

      shellHook = ''
        export PS1+="${name}> "
        echo "Welcome to the Fallen Character Sheet Automation shell"
      '';
    };
  }; 

}

