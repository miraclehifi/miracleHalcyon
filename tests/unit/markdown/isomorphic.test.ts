import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";
import source from "../../fixtures/markdown/images-sample.md?raw";

// [MD-UT-06] 同构：jsdom（Node）与 workerd（tests/integration/markdown/isomorphic.test.ts）比对同一个快照文件
describe("renderMarkdown 同构输出", () => {
  it("含图片、组图、代码块的样例与快照逐字节一致", async () => {
    const { html } = await renderMarkdown(source, { sourceMap: true });
    await expect(html).toMatchFileSnapshot("./__snapshots__/images-sample.html");
  });
});
