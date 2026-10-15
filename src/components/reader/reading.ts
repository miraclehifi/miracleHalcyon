// 阅读进度与目录（reader module-spec §3、ADR-008）：原生脚本，不加载 React。纯函数可单测，bind* 在页面脚本中调用

// 正文顶部到达视口顶部之前为 0，正文底部进入视口为 100（正文比视口短时直接 100）
export function progressOf(scrollY: number, articleTop: number, articleHeight: number, viewport: number): number {
  const range = articleHeight - viewport;
  if (range <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((scrollY - articleTop) / range) * 100)));
}

// tops 为各标题相对视口的 top；返回最后一个越过阅读线（line）的标题，都未越过时为第一个；没有标题为 -1
export function currentHeading(tops: readonly number[], line: number): number {
  if (tops.length === 0) return -1;
  let current = 0;
  tops.forEach((top, i) => {
    if (top <= line) current = i;
  });
  return current;
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// 目录链接：滚动到标题（减弱动效时直接跳），用 replaceState 更新 hash（不新增历史记录）；beforeJump 供抽屉先关闭
export function bindTocLinks(nav: HTMLElement, beforeJump?: () => void): void {
  nav.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    beforeJump?.();
    target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  });
}

// 进度（右栏百分比 + 进度条、窄屏细条）与当前章节高亮；scroll 事件 rAF 节流
export function bindReading(article: HTMLElement): void {
  const headings = [...article.querySelectorAll<HTMLElement>(":scope > h2[id], :scope > h3[id]")];
  const bars = [...document.querySelectorAll<HTMLElement>("[data-reading-progress]")];
  const labels = [...document.querySelectorAll<HTMLElement>("[data-reading-label]")];
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]")];
  let frame = 0;

  const update = () => {
    frame = 0;
    const rect = article.getBoundingClientRect();
    const value = progressOf(window.scrollY, rect.top + window.scrollY, rect.height, window.innerHeight);
    for (const bar of bars) {
      bar.setAttribute("aria-valuenow", String(value));
      bar.style.setProperty("--reading-progress", `${value}%`);
    }
    for (const label of labels) label.textContent = `已读 ${value}%`;
    const index = currentHeading(
      headings.map((h) => h.getBoundingClientRect().top),
      window.innerHeight * 0.3,
    );
    const id = index >= 0 ? headings[index].id : null;
    for (const link of links) {
      if (link.dataset.tocLink === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  update();
}

// 窄屏目录抽屉（原生 <dialog>）：打开时焦点到当前章节项；Esc（cancel）/ 点遮罩 / 关闭按钮 / 点目录项后关闭，焦点回按钮
export function bindTocDrawer(button: HTMLElement, dialog: HTMLDialogElement): void {
  const close = () => {
    if (dialog.open) dialog.close();
  };
  button.addEventListener("click", () => {
    dialog.showModal();
    (dialog.querySelector<HTMLElement>("[data-toc-link][aria-current]") ?? dialog.querySelector<HTMLElement>("[data-toc-link]"))?.focus();
  });
  dialog.addEventListener("close", () => button.focus());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close(); // 点在 ::backdrop 上
  });
  dialog.querySelector("[data-toc-close]")?.addEventListener("click", close);
  const nav = dialog.querySelector<HTMLElement>("nav");
  if (nav) bindTocLinks(nav, close);
}
