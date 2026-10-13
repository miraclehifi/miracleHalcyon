import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/lib/markdown/render";

// spike：ADR-001 —— 同一渲染模块能否在 workerd 中运行 Expressive Code（Shiki JS 正则引擎）
const SOURCE = [
  "# 标题",
  "",
  "```ts",
  "export function add(a: number, b: number): number {",
  "  return a + b;",
  "}",
  "```",
].join("\n");

describe("Markdown 渲染在 workerd 中运行", () => {
  it("输出 Expressive Code 结构与语法着色，热渲染 < 50ms", async () => {
    await renderMarkdown(SOURCE); // 预热：首次加载主题与语法
    const start = performance.now();
    const { html } = await renderMarkdown(SOURCE);
    const elapsed = performance.now() - start;

    expect({
      expressiveCode: html.includes('class="expressive-code"'),
      colored: /<span style="--0:#[0-9a-fA-F]{6}/.test(html),
      fast: elapsed < 50,
    }).toEqual({ expressiveCode: true, colored: true, fast: true });
  });
});
