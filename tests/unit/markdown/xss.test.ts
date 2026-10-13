import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";
import payloads from "../../fixtures/markdown/xss-payloads.json";

// [MD-UT-02][TC-US04-03][SC-PREVIEW-03] XSS 载荷经渲染器后不含可执行内容；[TC-US04-04] 合法链接与图片保留
const FORBIDDEN_TAGS = "script, iframe, object, embed, form, meta, style, base, link";
const SAFE: [string, string, string][] = [
  ["[a](https://a.test/x?y=1&z=2)", "a", "https://a.test/x?y=1&z=2"],
  ["[b](mailto:me@test.local)", "a", "mailto:me@test.local"],
  ["[c](/posts/hello)", "a", "/posts/hello"],
  ["[d](#sec)", "a", "#sec"],
  ["![r2](https://img.miraclehalcyon.test/2026/10/a.webp)", "img", "https://img.miraclehalcyon.test/2026/10/a.webp"],
  ["![png](data:image/png;base64,iVBORw0KGgo=)", "img", "data:image/png;base64,iVBORw0KGgo="],
];

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html").body;
// 去掉空白与控制字符后比较协议，覆盖大小写 / 空白 / 实体变体
const isIgnoredInProtocol = (char: string) => char.trim() === "" || char.charCodeAt(0) <= 0x1f;
const protocolOf = (url: string) => [...url].filter((char) => !isIgnoredInProtocol(char)).join("").toLowerCase().split(":")[0];

// Expressive Code 在 sanitize 之后生成的受信任结构：块根下的 style / script，以及 token 着色的 CSS 变量
const isCodeBlockAsset = (el: Element) => el.parentElement?.classList.contains("expressive-code") === true;
const isTokenColor = (el: Element, style: string) => el.closest(".expressive-code") !== null && /^(--\d+:#[0-9a-f]{3,8};?)+$/i.test(style);

function violations(body: HTMLElement): string[] {
  const found = [...body.querySelectorAll(FORBIDDEN_TAGS)].filter((el) => !isCodeBlockAsset(el)).map((el) => `<${el.localName}>`);
  for (const el of body.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("on")) found.push(`${el.localName}[${attr.name}]`);
      if (attr.name === "style" && !isTokenColor(el, attr.value)) found.push(`${el.localName}[style]`);
    }
    const url = el.getAttribute("href") ?? el.getAttribute("src");
    if (url && ["javascript", "vbscript"].includes(protocolOf(url))) found.push(`${el.localName} → ${url}`);
    if (url && protocolOf(url) === "data" && !/^data:image\//i.test(url)) found.push(`${el.localName} → ${url}`);
    if (el.getAttribute("target") === "_blank" && !/\bnoopener\b/.test(el.getAttribute("rel") ?? "")) found.push("target=_blank 无 noopener");
  }
  return found;
}

describe("renderMarkdown XSS 过滤", () => {
  it("载荷不留可执行内容，合法链接、图片与文本保留", async () => {
    const unsafe: Record<string, string[]> = {};
    for (const payload of payloads) {
      const found = violations(parse((await renderMarkdown(payload)).html));
      if (found.length > 0) unsafe[payload] = found;
    }
    const safe = await Promise.all(
      SAFE.map(async ([source, tag]) => parse((await renderMarkdown(source)).html).querySelector(tag)?.getAttribute(tag === "a" ? "href" : "src")),
    );
    const text = parse((await renderMarkdown("1 < 2 && 3 > 2")).html).textContent?.trim();

    expect({ unsafe, safe, text }).toEqual({ unsafe: {}, safe: SAFE.map(([, , expected]) => expected), text: "1 < 2 && 3 > 2" });
  });
});
