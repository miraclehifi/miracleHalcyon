import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagInput } from "../../../src/components/admin/editor/TagInput";

// [TC-US03-25][UT-39][UT-40][UT-41][UT-42][SC-POSTINFO-10] 标签输入：回车加入、去重、× 与 Backspace 删除、补全（debounce 200ms）、键盘与 ARIA
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Harness() {
  const [tags, setTags] = useState(["astro"]);
  return <TagInput tags={tags} onChange={setTags} />;
}

const chips = () => screen.getAllByRole("listitem").map((item) => item.textContent);

describe("TagInput", () => {
  it("回车加入（去空白、不区分大小写去重、空白不加）；补全下拉可键盘选择；× 与 Backspace 删除", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ tags: [{ name: "Astro", count: 3 }, { name: "Cloudflare", count: 2 }, { name: "cloud-run", count: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "标签" });
    const type = (value: string) => fireEvent.change(input, { target: { value } });

    type("  react  ");
    fireEvent.keyDown(input, { key: "Enter" });
    type("ASTRO");
    fireEvent.keyDown(input, { key: "Enter" });
    type("   ");
    fireEvent.keyDown(input, { key: "Enter" });
    const afterEnter = chips();

    type("cl");
    await act(async () => vi.advanceTimersByTimeAsync(199));
    const requestsBeforeDebounce = fetchMock.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    const expanded = input.getAttribute("aria-expanded");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent;
    fireEvent.keyDown(input, { key: "Enter" });
    const afterPick = { tags: chips(), input: (input as HTMLInputElement).value, expanded: input.getAttribute("aria-expanded") };

    fireEvent.click(screen.getByRole("button", { name: "删除标签 astro" }));
    fireEvent.keyDown(input, { key: "Backspace" });

    expect({
      afterEnter,
      requestsBeforeDebounce,
      request: String(fetchMock.mock.calls[0]?.[0]),
      options,
      expanded,
      active,
      afterPick,
      final: chips(),
    }).toEqual({
      afterEnter: ["astro", "react"],
      requestsBeforeDebounce: 0,
      request: "/api/admin/tags?q=cl",
      options: ["Cloudflare", "cloud-run"], // 已选的 astro 不再出现
      expanded: "true",
      active: "cloud-run",
      afterPick: { tags: ["astro", "react", "cloud-run"], input: "", expanded: "false" },
      final: ["react"],
    });
  });
});
