import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { EditorToolbar } from "../../../src/components/admin/editor/EditorToolbar";

// UT-163（SC-LIVE-15）：工具栏"实况照片"开关——role=switch、名称"实况照片"、aria-checked 随点击切换、有悬停提示；
// 不传 checked 的按钮仍是普通按钮
afterEach(cleanup);

function Harness() {
  const [live, setLive] = useState(false);
  return <EditorToolbar onCommand={() => undefined} onInsertImage={() => undefined} live={live} onLiveChange={setLive} />;
}

describe("EditorToolbar 实况照片开关", () => {
  it("开关语义、点击切换、提示文字；其他按钮无 role=switch", async () => {
    render(<Harness />);
    const toggle = screen.getByRole("switch", { name: "实况照片" });
    const initial = toggle.getAttribute("aria-checked");
    fireEvent.click(toggle);
    const afterClick = toggle.getAttribute("aria-checked");
    fireEvent.pointerEnter(toggle);
    fireEvent.focus(toggle);
    const tooltip = await screen.findByRole("tooltip");
    expect({
      initial,
      afterClick,
      tooltip: tooltip.textContent,
      insertImageRole: screen.getByRole("button", { name: "插入图片" }).getAttribute("role"),
      switches: screen.getAllByRole("switch").length,
    }).toEqual({ initial: "false", afterClick: "true", tooltip: "实况照片", insertImageRole: null, switches: 1 });
  });
});
