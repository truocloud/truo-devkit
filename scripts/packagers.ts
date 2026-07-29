/**
 * Genera la formula de Homebrew y el manifiesto de Scoop de una version.
 *
 *   bun scripts/packagers.ts 0.2.0
 *
 * Los dos apuntan a los binarios del release de GitHub y verifican el sha256 que
 * salio de `bun run build --binaries` (archivo `SHA256SUMS`). Se generan y no se
 * escriben a mano porque un hash tipeado a mano esta mal la mitad de las veces, y
 * el sintoma es un `brew install` que falla despues de bajar 60 MB.
 *
 * Salen a `dist-packagers/`; el workflow los empuja a `truocloud/homebrew-tap` y
 * `truocloud/scoop-bucket`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BIN = resolve(ROOT, "packages/cli/bin");
const OUT = resolve(ROOT, "dist-packagers");

const version = (process.argv[2] ?? "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Uso: bun scripts/packagers.ts <version>");
  process.exit(2);
}

const REPO = "truocloud/truo-devkit";
const base = `https://github.com/${REPO}/releases/download/v${version}`;

/** `<sha256>  <archivo>` → mapa. Es el formato de `sha256sum`. */
function readChecksums(): Map<string, string> {
  const text = readFileSync(resolve(BIN, "SHA256SUMS"), "utf8");
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = /^([0-9a-f]{64})\s+(\S+)$/.exec(line.trim());
    if (match) map.set(match[2]!, match[1]!);
  }
  return map;
}

const sums = readChecksums();
function sha(file: string): string {
  const value = sums.get(file);
  // Preferible romper el release a publicar una formula que no verifica nada:
  // un `sha256 ""` en brew instala igual y sin comprobar.
  if (!value) throw new Error(`falta el sha256 de ${file} en SHA256SUMS`);
  return value;
}

mkdirSync(OUT, { recursive: true });

// ── Homebrew ────────────────────────────────────────────────────────────────
// Binario y no `depends_on "node"`: la gracia del single-file es que instalar el
// CLI no arrastre un runtime. `brew install truocloud/tap/truo`.
const formula = `# Generado por scripts/packagers.ts — no editar a mano.
class Truo < Formula
  desc "CLI de TruoCloud: VPS, DNS, bases de datos, contenedores y balanceadores"
  homepage "https://docs.truo.cloud/cli"
  version "${version}"
  license "MIT"

  on_macos do
    on_arm do
      url "${base}/truo-darwin-arm64"
      sha256 "${sha("truo-darwin-arm64")}"
    end
    on_intel do
      url "${base}/truo-darwin-x64"
      sha256 "${sha("truo-darwin-x64")}"
    end
  end

  on_linux do
    on_arm do
      url "${base}/truo-linux-arm64"
      sha256 "${sha("truo-linux-arm64")}"
    end
    on_intel do
      url "${base}/truo-linux-x64"
      sha256 "${sha("truo-linux-x64")}"
    end
  end

  def install
    bin.install Dir["truo-*"].first => "truo"
    generate_completions_from_executable(bin/"truo", "completion", shells: [:bash, :zsh, :fish])
  end

  test do
    assert_match "${version}", shell_output("#{bin}/truo --version")
  end
end
`;
writeFileSync(resolve(OUT, "truo.rb"), formula, "utf8");

// ── Scoop ───────────────────────────────────────────────────────────────────
// `scoop bucket add truocloud https://github.com/truocloud/scoop-bucket`
const manifest = {
  version,
  description: "CLI de TruoCloud: VPS, DNS, bases de datos, contenedores y balanceadores",
  homepage: "https://docs.truo.cloud/cli",
  license: "MIT",
  architecture: {
    "64bit": {
      url: `${base}/truo-windows-x64.exe#/truo.exe`,
      hash: sha("truo-windows-x64.exe"),
    },
  },
  bin: "truo.exe",
  checkver: {
    github: `https://github.com/${REPO}`,
  },
  autoupdate: {
    architecture: {
      "64bit": {
        url: `https://github.com/${REPO}/releases/download/v$version/truo-windows-x64.exe#/truo.exe`,
      },
    },
    // Scoop recalcula el hash del SHA256SUMS del release en cada version nueva,
    // asi que `scoop update` no depende de que este script vuelva a correr.
    hash: {
      url: `https://github.com/${REPO}/releases/download/v$version/SHA256SUMS`,
      find: "([a-fA-F0-9]{64})\\s+truo-windows-x64\\.exe",
    },
  },
};
writeFileSync(resolve(OUT, "truo.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`dist-packagers/truo.rb    (brew, v${version})`);
console.log(`dist-packagers/truo.json  (scoop, v${version})`);
