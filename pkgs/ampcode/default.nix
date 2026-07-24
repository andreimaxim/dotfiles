{
  lib,
  stdenvNoCC,
  fetchurl,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "ampcode";
  version = "0.0.1784031823-g5829be";

  src = fetchurl {
    url = "https://static.ampcode.com/cli/${finalAttrs.version}/amp-linux-x64";
    hash = "sha256-47KHQCZd9LS5hxQQERO62npiwtfgNDjyqK9vdii1UiM=";
  };

  dontUnpack = true;
  # Amp is a Bun standalone executable. ELF rewriting changes offsets used by
  # the embedded payload, so install the verified upstream binary unchanged.
  dontFixup = true;

  installPhase = ''
    runHook preInstall

    install -Dm755 "$src" "$out/bin/amp"

    runHook postInstall
  '';

  meta = {
    description = "Amp coding agent CLI";
    homepage = "https://ampcode.com";
    license = lib.licenses.unfree;
    mainProgram = "amp";
    platforms = [ "x86_64-linux" ];
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };
})
