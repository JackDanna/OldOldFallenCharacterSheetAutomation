{
  description = "Automation for Fallen character sheet";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
      config.allowUnfreePredicate = pkg: builtins.elem (pkgs.lib.getName pkg) [
         "vscode-with-extensions"
         "vscode"
       ];
        
    };
  in 
  {
    packages.${system}.default = pkgs.writeShellScriptBin "transpileAndRollUp" ''
      ${pkgs.dotnet-sdk}/bin/dotnet fable --lang js
      ${pkgs.nodejs}/bin/npx rollup FallenLib.fs.js --file GoogleAppscript/FallenLibBundled.js --format cjs
      sed -i '/^export./d' GoogleAppscript/FallenLibBundled.js
    '';

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

