import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostCard } from "../../../src/components/reader/PostCard";
import type { CardModel } from "../../../src/lib/reader/types";

const card = (extra: Partial<CardModel> = {}): CardModel => ({
  slug: "hello",
  title: "Hello",
  excerpt: "手写摘要",
  publishedAt: "2026-10-10",
  tags: [{ name: "Astro", slug: "astro" }],
  cover: null,
  ...extra,
});

afterEach(cleanup);

// UT-207–209（SC-BROWSE-02、03、04）
describe("PostCard", () => {
  it("[TC-US04-05] 有封面：128×128 懒加载、装饰性 alt；无封面不渲染图片", () => {
    render(<PostCard card={card({ cover: "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg" })} />);
    const img = document.querySelector("img")!;
    expect([img.getAttribute("width"), img.getAttribute("height"), img.getAttribute("loading"), img.getAttribute("decoding"), img.getAttribute("alt")]).toEqual(["128", "128", "lazy", "async", ""]);
    cleanup();
    render(<PostCard card={card()} />);
    expect(document.querySelector("img")).toBeNull();
  });

  it("[TC-US04-03] 摘要为空时不渲染摘要元素", () => {
    render(<PostCard card={card({ excerpt: "" })} />);
    expect(document.querySelector("[data-excerpt]")).toBeNull();
  });

  it("[TC-US04-02] 标题链接与标签链接并列，不嵌套", () => {
    render(<PostCard card={card()} />);
    expect(screen.getByRole("link", { name: "Hello" }).getAttribute("href")).toBe("/posts/hello");
    expect(screen.getByRole("link", { name: "#Astro" }).closest("a[href='/posts/hello']")).toBeNull();
  });
});
