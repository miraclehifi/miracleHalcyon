import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownEditor } from "../../../src/components/admin/editor/MarkdownEditor";

// [SC-POSTINFO-01] MarkdownEditor（admin-post-editor.md"编辑区"）：标题占位"无标题"、回车进入正文（输入法组字中不跳）、
// 标题不含换行；底栏字数（不计空白，千分位）随输入更新
afterEach(cleanup);

function Harness({ body = "" }: { body?: string }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState(body);
  return <MarkdownEditor title={title} body={text} onTitleChange={setTitle} onBodyChange={setText} />;
}

describe("MarkdownEditor", () => {
  it("标题回车把焦点移到源码区；粘贴换行被去掉；底栏字数随输入更新", () => {
    render(<Harness body={"你好 world\n\n".repeat(1)} />);
    const title = screen.getByRole("textbox", { name: "标题" });
    const body = screen.getByRole("textbox", { name: "正文" });
    const count = () => screen.getByText(/^[\d,]+ 字$/);

    title.focus();
    fireEvent.keyDown(title, { key: "Enter", isComposing: true });
    const focusWhileComposing = document.activeElement === title;
    fireEvent.keyDown(title, { key: "Enter" });
    const focusAfterEnter = document.activeElement === body;

    fireEvent.change(title, { target: { value: "第一行\n第二行" } });
    const initialCount = count().textContent;
    fireEvent.change(body, { target: { value: "字".repeat(1284) + " \n\t" } });

    expect({
      placeholder: title.getAttribute("placeholder"),
      focusWhileComposing,
      focusAfterEnter,
      title: (title as HTMLTextAreaElement).value,
      monospace: body.className.includes("font-mono"),
      initialCount,
      count: count().textContent,
      tabular: count().className.includes("tabular-nums"),
    }).toEqual({
      placeholder: "无标题",
      focusWhileComposing: true,
      focusAfterEnter: true,
      title: "第一行第二行",
      monospace: true,
      initialCount: "7 字",
      count: "1,284 字",
      tabular: true,
    });
  });
});
