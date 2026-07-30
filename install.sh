#!/bin/sh
# TruoCloud CLI installer.
#
#   curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
#
# Downloads the binary from the latest release, VERIFIES its sha256 against the
# SHA256SUMS of the same release, and places it in ~/.local/bin (or $TRUO_INSTALL_DIR).
#
# POSIX sh on purpose: this has to run in the minimal container where someone
# is debugging at 3 AM, not just in bash.
set -eu

REPO="truocloud/truo-devkit"
INSTALL_DIR="${TRUO_INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${TRUO_VERSION:-latest}"

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1" >&2; }

# ── Platform ─────────────────────────────────────────────────────────────────
os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Linux)  os_tag="linux" ;;
  Darwin) os_tag="darwin" ;;
  *) die "unsupported system: $os. On Windows: scoop install truocloud/truo" ;;
esac

case "$arch" in
  x86_64|amd64) arch_tag="x64" ;;
  aarch64|arm64) arch_tag="arm64" ;;
  *) die "unsupported architecture: $arch" ;;
esac

asset="truo-${os_tag}-${arch_tag}"

# musl (Alpine) needs its own binary: the glibc-linked one does not start, and the
# error it gives — "not found" about a file that exists — tells nobody anything.
if [ "$os_tag" = "linux" ] && [ "$arch_tag" = "x64" ]; then
  if [ -f /etc/alpine-release ] || ! ldd /bin/sh 2>/dev/null | grep -q 'GNU C Library\|libc\.so\.6'; then
    asset="truo-linux-x64-musl"
  fi
fi

# ── Download ─────────────────────────────────────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO "$2" "$1"; }
else
  die "curl or wget is required"
fi

if [ "$VERSION" = "latest" ]; then
  base="https://github.com/${REPO}/releases/latest/download"
else
  base="https://github.com/${REPO}/releases/download/v${VERSION#v}"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

info "Downloading $asset…"
fetch "${base}/${asset}" "$tmp/truo" || die "could not download ${base}/${asset}"

# ── Verification ─────────────────────────────────────────────────────────────
# Without this, the script is a `curl | sh` that runs whatever the network
# returns. With it, at least the binary is the one built in CI.
if fetch "${base}/SHA256SUMS" "$tmp/SHA256SUMS" 2>/dev/null; then
  expected="$(grep " ${asset}\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)"
  if [ -n "$expected" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      actual="$(sha256sum "$tmp/truo" | cut -d' ' -f1)"
    elif command -v shasum >/dev/null 2>&1; then
      actual="$(shasum -a 256 "$tmp/truo" | cut -d' ' -f1)"
    else
      actual=""
      info "Warning: neither sha256sum nor shasum available; the binary was not verified."
    fi
    if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
      die "sha256 mismatch (expected $expected, got $actual). Nothing was installed."
    fi
    [ -n "$actual" ] && info "sha256 verified."
  fi
else
  info "Warning: could not download SHA256SUMS; the binary was not verified."
fi

# ── Install ──────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
chmod +x "$tmp/truo"
mv "$tmp/truo" "$INSTALL_DIR/truo"

info ""
info "truo installed at $INSTALL_DIR/truo"
"$INSTALL_DIR/truo" --version >&2 || true

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    info ""
    info "$INSTALL_DIR is not in your PATH. Add it:"
    info "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> ~/.profile"
    ;;
esac

info ""
info "Get started with:  truo auth login"
