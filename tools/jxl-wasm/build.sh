#!/usr/bin/env bash
# Build the jxl-rs decoder for the browser.
#
# Produces two modules, mirroring what the site already ships for libjxl:
#   jxl_decoder_rs_simd.wasm  - wasm SIMD128, for browsers that report support
#   jxl_decoder_rs.wasm       - scalar fallback
#
# Neither has any imports, so the loader is just:
#   const { instance } = await WebAssembly.instantiate(bytes);
# No JS glue, no emscripten runtime, no SharedArrayBuffer, and therefore no
# COOP/COEP isolation and no service worker.
set -euo pipefail

cd "$(dirname "$0")"
OUT="${1:-dist}"
mkdir -p "$OUT"

TARGET=wasm32-unknown-unknown
WASM_OPT="${WASM_OPT:-wasm-opt}"

build() {
  local name="$1" flags="$2"
  echo "==> building $name (${flags:-scalar})"
  RUSTFLAGS="$flags" cargo build --release --target "$TARGET"
  local raw="target/$TARGET/release/jxl_wasm.wasm"

  if command -v "$WASM_OPT" >/dev/null 2>&1; then
    # Only baseline features: the module deliberately avoids threads and
    # exception handling so it stays loadable on older browsers, which are
    # exactly the ones that need a JXL fallback in the first place.
    "$WASM_OPT" -O3 \
      --enable-simd --enable-bulk-memory --enable-sign-ext \
      --enable-mutable-globals --enable-nontrapping-float-to-int \
      --enable-reference-types \
      "$raw" -o "$OUT/$name"
  else
    echo "    (wasm-opt not found; shipping unoptimised - expect ~8% larger)" >&2
    cp "$raw" "$OUT/$name"
  fi
  printf '    %s  %s bytes\n' "$name" "$(wc -c < "$OUT/$name" | tr -d ' ')"
}

build jxl_decoder_rs_simd.wasm "-C target-feature=+simd128"
build jxl_decoder_rs.wasm      ""

echo
echo "==> verifying the modules have no imports"
node -e '
const fs = require("fs");
let bad = 0;
for (const f of process.argv.slice(1)) {
  const m = new WebAssembly.Module(fs.readFileSync(f));
  const imports = WebAssembly.Module.imports(m);
  const exports = WebAssembly.Module.exports(m).length;
  console.log(`    ${f}: ${imports.length} imports, ${exports} exports`);
  if (imports.length) { console.error(`    FAIL: ${f} expects imports`); bad = 1; }
}
process.exit(bad);
' "$OUT/jxl_decoder_rs_simd.wasm" "$OUT/jxl_decoder_rs.wasm"

echo
echo "done -> $OUT"
