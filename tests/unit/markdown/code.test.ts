import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";

// [MD-UT-03][TC-US04-02][SC-PREVIEW-02] 代码块高亮：白名单语言出 token，未知 / 无语言按纯文本；亮 / 暗两套颜色，跟随站点主题
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code}\n\`\`\``;

async function block(lang: string, code: string) {
  const doc = parse((await renderMarkdown(fence(lang, code))).html);
  const pre = doc.querySelector("pre");
  const tokens = [...(pre?.querySelectorAll("code span[style]") ?? [])];
  return {
    language: pre?.getAttribute("data-language"),
    text: pre?.querySelector("code")?.textContent,
    colored: tokens.filter((span) => /--0:#\w+;--1:#\w+/.test(span.getAttribute("style") ?? "")).map((span) => span.textContent),
    css: [...doc.querySelectorAll("style")].map((style) => style.textContent).join("\n"),
  };
}

describe("renderMarkdown 代码高亮", () => {
  it("ts / js / css / bash 出 token；foobar 与无语言为纯文本；主题选择器跟随 <html data-theme> 与系统配色", async () => {
    const ts = await block("ts", "const a: number = 1;");
    const others = await Promise.all([block("js", "let x = 1;"), block("css", "a { color: red; }"), block("bash", "echo hi")]);
    const unknown = await block("foobar", "x");
    const plain = await block("", "plain");

    expect({
      ts: { language: ts.language, hasConst: ts.colored.includes("const"), hasNumber: ts.colored.includes("number") },
      othersColored: others.map((result) => result.colored.length > 0),
      unknown: [unknown.language, unknown.text, unknown.colored],
      plain: [plain.language, plain.text, plain.colored],
      themeSelectors: {
        forcedDark: ts.css.includes(":root[data-theme='dark']"),
        systemDark: ts.css.includes("@media (prefers-color-scheme: dark){:root:not([data-theme='light'])"),
        themeNameSelector: /data-theme='github-/.test(ts.css),
      },
    }).toEqual({
      ts: { language: "ts", hasConst: true, hasNumber: true },
      othersColored: [true, true, true],
      unknown: ["plaintext", "x", ["x"]], // 不分词：整段一个 span（仍带亮 / 暗前景色）
      plain: ["plaintext", "plain", ["plain"]],
      themeSelectors: { forcedDark: true, systemDark: true, themeNameSelector: false },
    });
  });
});
