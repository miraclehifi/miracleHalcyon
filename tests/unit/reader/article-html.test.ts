import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";
import { prepareArticleHtml } from "../../../src/lib/reader/article-html";

const prepare = async (markdown: string) => prepareArticleHtml((await renderMarkdown(markdown)).html);

// [TC-US07-02][TC-US08-09][SC-ARTICLE-01][SC-SIDEBAR-05] READER-UT-07（h1 降级、标题 id、目录）
describe("prepareArticleHtml", () => {
  it("正文 h1 降为 h2，页面只有标题区一个 h1", async () => {
    const { html } = await prepare("# 一级\n\n正文");
    expect(html).not.toMatch(/<h1/);
    expect(html).toMatch(/<h2 id="一级">一级<\/h2>/);
  });

  it("h2 / h3 补 id，同名去重；目录取可见文字，只含 h2 / h3", async () => {
    const { html, toc } = await prepare("## 安装\n\n### 依赖 `npm`\n\n## 安装\n\n#### 不进目录\n\n## [链接](/a) 标题");
    expect(toc).toEqual([
      { id: "安装", text: "安装", depth: 2 },
      { id: "依赖-npm", text: "依赖 npm", depth: 3 },
      { id: "安装-1", text: "安装", depth: 2 },
      { id: "链接-标题", text: "链接 标题", depth: 2 },
    ]);
    expect(html).toContain('<h2 id="安装-1">');
  });

  // 只有正文顶层的标题进目录（当前章节高亮与跳转留白都只认顶层）；已有 id 不覆盖；空标题不进目录
  it("脚注区标题保留原 id 且不进目录；引用 / 列表里的标题与空标题不进目录", async () => {
    const { html, toc } = await prepare("## 正文\n\n第一段[^1]\n\n> ## 引用里的标题\n\n- ## 列表里的标题\n\n## \n\n[^1]: 注释");
    expect(toc).toEqual([{ id: "正文", text: "正文", depth: 2 }]);
    expect(html).toContain('id="user-content-footnote-label"');
    expect(html).toContain('aria-describedby="user-content-footnote-label"');
    expect(html).not.toMatch(/id=""/);
  });

  it("没有 h2 / h3 时目录为空；有图片时 hasImages 为真", async () => {
    expect((await prepare("只有正文\n\n#### 四级")).toc).toEqual([]);
    expect((await prepare("正文")).hasImages).toBe(false);
    expect((await prepare("![山](/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg)")).hasImages).toBe(true);
  });
});

// [TC-US07-01][TC-US07-10][SC-ARTICLE-01][SC-ARTICLE-07] 读者页与预览同一 renderMarkdown；清洗规则随之生效
describe("读者页正文渲染", () => {
  it("GFM、代码高亮", async () => {
    const { html } = await prepare("| a |\n|---|\n| 1 |\n\n- [x] 完成\n\n~~删~~\n\n```ts\nconst a: number = 1;\n```");
    expect(html).toMatch(/<table>/);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled/);
    expect(html).toMatch(/<del>删<\/del>/);
    expect(html).toMatch(/class="expressive-code"/);
  });

  it("script、事件属性、javascript: 链接被清洗", async () => {
    const { html } = await prepare('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))');
    expect(html).not.toMatch(/alert\(1\)<\/script>|onerror|javascript:/);
  });
});

// [TC-US07-06][TC-US07-07][SC-ARTICLE-04][SC-ARTICLE-05] READER-UT-07（首字下沉标记）
describe("首字下沉标记", () => {
  it("只在正文第一个元素是段落时标记该段", async () => {
    expect((await prepare("第一段\n\n第二段")).html).toMatch(/^<p data-dropcap(="")?>第一段<\/p>\n<p>第二段<\/p>/);
    expect((await prepare("![图](/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg)\n\n正文")).html).not.toMatch(/data-dropcap/);
    expect((await prepare("## 标题\n\n正文")).html).not.toMatch(/data-dropcap/);
    expect((await prepare("```ts\nconst a = 1;\n```\n\n正文")).html).not.toMatch(/data-dropcap/);
  });
});
