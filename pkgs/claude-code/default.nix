{
  lib,
  stdenvNoCC,
  fetchurl,
  installShellFiles,
  makeBinaryWrapper,
  autoPatchelfHook,
  alsa-lib,
  procps,
  ripgrep,
  bubblewrap,
  socat,
  versionCheckHook,
  writableTmpDirAsHomeHook,
}:
let
  stdenv = stdenvNoCC;
  baseUrl = "https://downloads.claude.ai/claude-code-releases";
  platformKey = "${stdenv.hostPlatform.node.platform}-${stdenv.hostPlatform.node.arch}";
  hashes = {
    linux-x64 = "sha256-we//qvNwqhh8tqCd2T1OURxkaJmwB4R2+DeRtmS95/4=";
  };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "claude-code";
  version = "2.1.215";

  src = fetchurl {
    url = "${baseUrl}/${finalAttrs.version}/${platformKey}/claude";
    hash = hashes.${platformKey};
  };

  dontUnpack = true;
  dontBuild = true;
  # Otherwise the bun runtime is executed instead of the binary.
  dontStrip = true;

  nativeBuildInputs = [
    installShellFiles
    makeBinaryWrapper
  ]
  ++ lib.optionals stdenv.hostPlatform.isElf [ autoPatchelfHook ];

  strictDeps = true;

  installPhase = ''
    runHook preInstall

    installBin $src

    wrapProgram $out/bin/claude \
      --set DISABLE_AUTOUPDATER 1 \
      --set-default FORCE_AUTOUPDATE_PLUGINS 1 \
      --set DISABLE_INSTALLATION_CHECKS 1 \
      --set USE_BUILTIN_RIPGREP 0 \
      ${lib.optionalString stdenv.hostPlatform.isLinux ''
        --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ alsa-lib ]} \
      ''}--prefix PATH : ${
        lib.makeBinPath (
          [
            procps
            ripgrep
          ]
          ++ lib.optionals stdenv.hostPlatform.isLinux [
            bubblewrap
            socat
          ]
        )
      }

    runHook postInstall
  '';

  doInstallCheck = true;
  nativeInstallCheckInputs = [
    writableTmpDirAsHomeHook
    versionCheckHook
  ];
  versionCheckKeepEnvironment = [ "HOME" ];
  versionCheckProgramArg = "--version";

  meta = {
    description = "Agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster";
    homepage = "https://github.com/anthropics/claude-code";
    downloadPage = "https://claude.com/product/claude-code";
    changelog = "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md";
    license = lib.licenses.unfree;
    mainProgram = "claude";
    platforms = [ "x86_64-linux" ];
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };
})
