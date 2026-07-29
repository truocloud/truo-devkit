#!/bin/sh
# Instalador del CLI de TruoCloud.
#
#   curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
#
# Baja el binario de la ultima release, VERIFICA su sha256 contra el SHA256SUMS
# del mismo release, y lo deja en ~/.local/bin (o en $TRUO_INSTALL_DIR).
#
# POSIX sh a proposito: esto tiene que correr en el contenedor minimo donde
# alguien esta debugueando a las 3 AM, no solo en bash.
set -eu

REPO="truocloud/truo-devkit"
INSTALL_DIR="${TRUO_INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${TRUO_VERSION:-latest}"

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1" >&2; }

# ── Plataforma ───────────────────────────────────────────────────────────────
os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Linux)  os_tag="linux" ;;
  Darwin) os_tag="darwin" ;;
  *) die "sistema no soportado: $os. En Windows: scoop install truocloud/truo" ;;
esac

case "$arch" in
  x86_64|amd64) arch_tag="x64" ;;
  aarch64|arm64) arch_tag="arm64" ;;
  *) die "arquitectura no soportada: $arch" ;;
esac

asset="truo-${os_tag}-${arch_tag}"

# musl (Alpine) necesita su propio binario: el glibc-linkeado no arranca y el
# error que da —"not found" sobre un archivo que existe— no le dice nada a nadie.
if [ "$os_tag" = "linux" ] && [ "$arch_tag" = "x64" ]; then
  if [ -f /etc/alpine-release ] || ! ldd /bin/sh 2>/dev/null | grep -q 'GNU C Library\|libc\.so\.6'; then
    asset="truo-linux-x64-musl"
  fi
fi

# ── Descarga ─────────────────────────────────────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO "$2" "$1"; }
else
  die "hace falta curl o wget"
fi

if [ "$VERSION" = "latest" ]; then
  base="https://github.com/${REPO}/releases/latest/download"
else
  base="https://github.com/${REPO}/releases/download/v${VERSION#v}"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

info "Bajando $asset…"
fetch "${base}/${asset}" "$tmp/truo" || die "no se pudo bajar ${base}/${asset}"

# ── Verificacion ─────────────────────────────────────────────────────────────
# Sin esto el script es un `curl | sh` que ejecuta lo que sea que devuelva la
# red. Con esto, al menos el binario es el que se construyo en CI.
if fetch "${base}/SHA256SUMS" "$tmp/SHA256SUMS" 2>/dev/null; then
  expected="$(grep " ${asset}\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)"
  if [ -n "$expected" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      actual="$(sha256sum "$tmp/truo" | cut -d' ' -f1)"
    elif command -v shasum >/dev/null 2>&1; then
      actual="$(shasum -a 256 "$tmp/truo" | cut -d' ' -f1)"
    else
      actual=""
      info "Aviso: sin sha256sum ni shasum, no se pudo verificar el binario."
    fi
    if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
      die "el sha256 no coincide (esperado $expected, obtenido $actual). NO se instalo nada."
    fi
    [ -n "$actual" ] && info "sha256 verificado."
  fi
else
  info "Aviso: no se pudo bajar SHA256SUMS; el binario no se verifico."
fi

# ── Instalacion ──────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
chmod +x "$tmp/truo"
mv "$tmp/truo" "$INSTALL_DIR/truo"

info ""
info "truo instalado en $INSTALL_DIR/truo"
"$INSTALL_DIR/truo" --version >&2 || true

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    info ""
    info "$INSTALL_DIR no esta en tu PATH. Agregalo:"
    info "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> ~/.profile"
    ;;
esac

info ""
info "Empeza con:  truo auth login"
