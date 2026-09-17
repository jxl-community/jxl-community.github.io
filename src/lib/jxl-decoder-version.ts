// The jxl-rs version the shipped WebAssembly decoder was built from.
//
// The value is parsed from tools/jxl-wasm/Cargo.toml by astro.config.mjs and
// baked in as a literal by Vite's `define`, so bumping the pin there is the
// only edit a decoder update needs: the nav's decoder notice follows on the
// next build. Deliberately not read with `fs` here -- `import.meta.url` points
// into dist/ once the component is bundled, so a relative read fails at render
// time. The pin is exact (`=0.7.4`) by policy, which is what makes a single
// literal version meaningful.
declare const __JXL_DECODER_VERSION__: string;

export const JXL_DECODER_VERSION: string = __JXL_DECODER_VERSION__;
