// jsdom removed queryCommandSupported; monaco-editor calls it at module load time
if (typeof document !== 'undefined' && !document.queryCommandSupported) {
  document.queryCommandSupported = () => false;
}

// jsdom does not expose CSS.escape as a global; monaco-editor uses it in async timers
if (typeof CSS === 'undefined' || !CSS.escape) {
  (
    globalThis as typeof globalThis & { CSS: { escape: (v: string) => string } }
  ).CSS = {
    escape: (value: string) => value.replace(/[^\w-]/g, (c) => `\\${c}`),
  };
}

// jsdom does not implement window.matchMedia; monaco-editor's StandaloneThemeService calls it
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
