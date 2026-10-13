import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";

// [MD-UT-01] GFM 全集：标题、列表、表格、任务列表、删除线、自动链接、脚注（脚注无障碍文案为中文）
const SOURCE = [
  "# 标题一",
  "",
  "## 标题二",
  "",
  "- 列表 A",
  "- 列表 B",
  "",
  "1. 一",
  "2. 二",
  "",
  "| 名称 | 数量 |",
  "| :--- | ---: |",
  "| 苹果 | 3 |",
  "",
  "- [x] 已完成",
  "- [ ] 待办",
  "",
  "~~删除线~~",
  "",
  "访问 https://example.com 了解",
  "",
  "正文[^1]",
  "",
  "[^1]: 注释内容",
].join("\n");

describe("renderMarkdown GFM", () => {
  it("输出与快照一致", async () => {
    const { html } = await renderMarkdown(SOURCE, { sourceMap: false });
    await expect(html).toMatchFileSnapshot("__snapshots__/gfm.html");
  });
});
