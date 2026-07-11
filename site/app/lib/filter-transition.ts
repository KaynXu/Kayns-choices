export interface FilterTransitionOptions {
  commit: () => void;
  scroll: () => void;
  flush: (callback: () => void) => void;
  start?: (callback: () => void) => unknown;
  reducedMotion: boolean;
}

export function encodeViewTransitionName(value: string) {
  return `card-${Array.from(
    value,
    (character) => character.codePointAt(0)!.toString(16),
  ).join("-")}`;
}

export function runFilterTransition(options: FilterTransitionOptions) {
  if (!options.start || options.reducedMotion) {
    options.commit();
    options.scroll();
    return;
  }

  options.start(() => {
    options.flush(options.commit);
    options.scroll();
  });
}
