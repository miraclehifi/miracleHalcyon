import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "../../../src/components/ui/SegmentedControl";

// SegmentedControl（components.md"基础组件"）：单选组；← / → 切换；count 用 tabular-nums
afterEach(cleanup);

function StatusFilter({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("all");
  return (
    <SegmentedControl
      aria-label="状态筛选"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    >
      <SegmentedControl.Item value="all" count={23}>全部</SegmentedControl.Item>
      <SegmentedControl.Item value="draft" count={5}>草稿</SegmentedControl.Item>
      <SegmentedControl.Item value="published" count={18}>已发布</SegmentedControl.Item>
    </SegmentedControl>
  );
}

describe("SegmentedControl", () => {
  it("radiogroup 语义；方向键循环切换、焦点跟随并触发 onChange；count 用 tabular-nums", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusFilter onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "状态筛选" });
    const checked = () => screen.getAllByRole("radio").map((r) => r.getAttribute("aria-checked"));
    const tabStops = () => screen.getAllByRole("radio").map((r) => r.tabIndex);

    const initial = { checked: checked(), tabStops: tabStops() };
    await user.tab();
    await user.keyboard("{ArrowRight}");
    const afterRight = { checked: checked(), focused: document.activeElement?.textContent };
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    const afterWrap = { checked: checked(), focused: document.activeElement?.textContent };

    expect({
      group: group.getAttribute("role"),
      initial,
      afterRight,
      afterWrap,
      changes: onChange.mock.calls.map(([value]) => value),
      count: screen.getByText("23").classList.contains("tabular-nums"),
    }).toEqual({
      group: "radiogroup",
      initial: { checked: ["true", "false", "false"], tabStops: [0, -1, -1] },
      afterRight: { checked: ["false", "true", "false"], focused: "草稿5" },
      afterWrap: { checked: ["false", "false", "true"], focused: "已发布18" },
      changes: ["draft", "all", "published"],
      count: true,
    });
  });
});
