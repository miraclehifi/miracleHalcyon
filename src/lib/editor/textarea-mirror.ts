// textarea 镜像测量：textarea 不暴露文字的排版位置，用一个复刻其排版的隐藏 div 计算。
// offsetFromPoint：把视口坐标（如拖放位置）换算为源码字符偏移——按"该偏移处的光标是否在坐标之前"二分查找
// （阅读顺序上光标位置单调：上方的行、同一行左侧在前）。同步滚动（editor module-spec §3）也基于这套镜像

const COPIED = [
  "boxSizing",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textTransform",
  "textIndent",
  "tabSize",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
] as const;

interface Mirror {
  caretAt(offset: number): { top: number; left: number; height: number };
  dispose(): void;
}

function createMirror(textarea: HTMLTextAreaElement): Mirror {
  const style = getComputedStyle(textarea);
  const div = document.createElement("div");
  for (const name of COPIED) div.style[name] = style[name];
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  Object.assign(div.style, {
    position: "absolute",
    top: "0",
    left: "-9999px",
    visibility: "hidden",
    boxSizing: "content-box",
    width: `${textarea.clientWidth - paddingX}px`, // clientWidth 不含滚动条，与 textarea 的实际排版宽度一致
    padding: "0",
    border: "0",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });
  const text = document.createTextNode("");
  const marker = document.createElement("span");
  marker.textContent = String.fromCharCode(0x200b); // 零宽空格：撑出行高，标出光标位置
  div.appendChild(text);
  div.appendChild(marker);
  document.body.appendChild(div);
  const value = textarea.value;
  return {
    caretAt(offset) {
      text.data = value.slice(0, offset);
      return { top: marker.offsetTop, left: marker.offsetLeft, height: marker.offsetHeight };
    },
    dispose: () => div.remove(),
  };
}

export function offsetFromPoint(textarea: HTMLTextAreaElement, clientX: number, clientY: number): number {
  const rect = textarea.getBoundingClientRect();
  const style = getComputedStyle(textarea);
  const x = clientX - rect.left - textarea.clientLeft - parseFloat(style.paddingLeft) + textarea.scrollLeft;
  const y = clientY - rect.top - textarea.clientTop - parseFloat(style.paddingTop) + textarea.scrollTop;
  const mirror = createMirror(textarea);
  try {
    const isBefore = (offset: number) => {
      const caret = mirror.caretAt(offset);
      return caret.top + caret.height <= y || (caret.top <= y && caret.left <= x);
    };
    // 最后一个"在坐标之前"的偏移
    let lo = 0;
    let hi = textarea.value.length;
    if (!isBefore(0)) return 0;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (isBefore(mid)) lo = mid;
      else hi = mid - 1;
    }
    // 同一行内取更近的一侧
    if (lo < textarea.value.length) {
      const here = mirror.caretAt(lo);
      const after = mirror.caretAt(lo + 1);
      if (after.top === here.top && after.left - x < x - here.left) return lo + 1;
    }
    return lo;
  } finally {
    mirror.dispose();
  }
}

// 各源码行（1 起）行首在 textarea 内容中的 top（含上内边距，与 scrollTop 同一坐标）；同步滚动用
export function lineTops(textarea: HTMLTextAreaElement, lines: readonly number[]): number[] {
  const value = textarea.value;
  const starts = [0];
  for (let i = value.indexOf("\n"); i !== -1; i = value.indexOf("\n", i + 1)) starts.push(i + 1);
  const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 0;
  const mirror = createMirror(textarea);
  try {
    return lines.map((line) => mirror.caretAt(starts[Math.min(Math.max(line, 1), starts.length) - 1]).top + paddingTop);
  } finally {
    mirror.dispose();
  }
}
