// jsdom 没有 matchMedia：补一个永远不匹配的实现（组件按桌面、精确指针、未开启减弱动效渲染）
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom 没有 ResizeObserver、CSS.supports：补空实现（列表动效等组件挂载时会用到）
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof window !== "undefined" && typeof window.CSS?.supports !== "function") {
  (window as unknown as { CSS: { supports: () => boolean } }).CSS = { ...(window.CSS ?? {}), supports: () => false };
}
