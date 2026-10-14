import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";
import source from "../../fixtures/markdown/images-sample.md?raw";
import expected from "../../unit/markdown/__snapshots__/images-sample.html?raw";

// [MD-UT-06] 同构：workerd 中的输出与 jsdom 单元测试写出的快照逐字节一致
describe("renderMarkdown 同构输出（workerd）", () => {
  it("与 unit 快照一致", async () => {
    const { html } = await renderMarkdown(source, { sourceMap: true });
    expect(html).toBe(expected);
  });
});
