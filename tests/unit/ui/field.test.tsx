import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Field } from "../../../src/components/ui/Field";

// Field（components.md"基础组件"）：label ↔ 输入框；error 时 aria-invalid + aria-describedby 指向错误文本
afterEach(cleanup);

describe("Field", () => {
  it("label 关联输入框；有 error 时标记无效并以错误文本描述；否则以 hint 描述", () => {
    render(
      <Field label="Slug（文章网址）" hint="仅小写字母、数字、连字符" error="slug 已存在，请换一个">
        <input defaultValue="hello-astro" />
      </Field>,
    );
    render(
      <Field label="账号" hint="登录用的账号">
        <input />
      </Field>,
    );
    const slug = screen.getByLabelText("Slug（文章网址）");
    const account = screen.getByLabelText("账号");
    const describedText = (el: HTMLElement) =>
      (el.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent)
        .join("|");

    expect({
      slug: { tag: slug.tagName, invalid: slug.getAttribute("aria-invalid"), described: describedText(slug) },
      account: { invalid: account.getAttribute("aria-invalid"), described: describedText(account) },
    }).toEqual({
      slug: { tag: "INPUT", invalid: "true", described: "slug 已存在，请换一个" },
      account: { invalid: null, described: "登录用的账号" },
    });
  });

  // 输入框质感（design-tokens"输入框质感"）：鼠标进入时外圈泛起光晕、圆心跟随光标，离开收起；触屏不显示
  it("悬停光晕：鼠标进入显示并跟随，离开收起；触屏不显示", () => {
    render(
      <Field label="标题">
        <input />
      </Field>,
    );
    const glow = screen.getByLabelText("标题").parentElement!;
    expect(glow.hasAttribute("data-field-glow")).toBe(true);
    fireEvent.pointerEnter(glow, { pointerType: "touch" });
    expect(glow.hasAttribute("data-glow")).toBe(false);
    fireEvent.pointerEnter(glow, { pointerType: "mouse" });
    fireEvent.pointerMove(glow, { pointerType: "mouse", clientX: 30, clientY: 12 });
    expect(glow.hasAttribute("data-glow")).toBe(true);
    expect(glow.style.getPropertyValue("--field-glow-x")).toBe("30px");
    fireEvent.pointerLeave(glow, { pointerType: "mouse" });
    expect(glow.hasAttribute("data-glow")).toBe(false);
  });
});
