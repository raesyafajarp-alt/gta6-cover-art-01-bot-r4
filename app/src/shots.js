// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, edge to edge.
// window.__shotReady is set once the cover has been painted twice, after
// the webfonts have settled, so a headless screenshot catches the final art.
export function runShot(shot, query) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // Re-render once more now that the fonts are ready, then signal.
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (window.ViceCoastApp) window.ViceCoastApp.render();
      window.__shotReady = true;
    }, 300);
  });
}
