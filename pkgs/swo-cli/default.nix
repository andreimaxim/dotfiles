{
  lib,
  stdenvNoCC,
  fetchurl,
  unzip,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "swo-cli";
  version = "1.3.7";

  src = fetchurl {
    url = "https://github.com/solarwinds/swo-cli/releases/download/v${finalAttrs.version}/swo-cli_linux_amd64.zip";
    hash = "sha256-UvnUBclKi2VBPqM+xOp5XtWETeDGxWy8jEXi8wp9ej4=";
  };

  nativeBuildInputs = [ unzip ];

  sourceRoot = ".";

  installPhase = ''
    runHook preInstall

    install -Dm755 swo $out/bin/swo
    install -Dm644 LICENSE $out/share/swo-cli/LICENSE
    install -Dm644 README.md $out/share/swo-cli/README.md

    runHook postInstall
  '';

  meta = {
    description = "SolarWinds Observability command-line interface";
    homepage = "https://github.com/solarwinds/swo-cli";
    downloadPage = "https://github.com/solarwinds/swo-cli/releases";
    license = lib.licenses.asl20;
    mainProgram = "swo";
    platforms = [ "x86_64-linux" ];
  };
})
