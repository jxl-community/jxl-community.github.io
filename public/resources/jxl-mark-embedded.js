// The JXL polyfill detects URLs ending in .jxl. Mark embedded data:image/jxl payloads
// with a URL fragment so the renderer also handles inline gallery images.
// Load this before /resources/jxl-rs.js, as an inline head script.
(() => {
  const markEmbeddedJxl = (node) => {
    if (!(node instanceof HTMLImageElement)) return;
    const source = node.getAttribute('src');
    if (source?.startsWith('data:image/jxl') && !source.endsWith('#.jxl')) {
      node.setAttribute('src', `${source}#.jxl`);
    }
  };
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(markEmbeddedJxl));
  }).observe(document.documentElement, { childList: true, subtree: true });
  // Sweep anything already parsed in case this script runs late.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(markEmbeddedJxl);
  });
})();
