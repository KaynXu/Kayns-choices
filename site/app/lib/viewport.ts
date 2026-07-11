interface ScrollViewport {
  scrollTo(options: ScrollToOptions): void;
}

export function scrollAtlasToTop(viewport: ScrollViewport = window) {
  viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
