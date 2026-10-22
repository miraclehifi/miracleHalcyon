import { describe, expect, it } from "vitest";
import { formDefaults, formFromEntry, toEntryFields, validateForm } from "../../../src/lib/admin/shelf-form";
import type { ShelfEntryView } from "../../../src/lib/admin/shelf-client";

// 条目表单纯逻辑（admin-media.md §二"校验与保存"，UT-07、UT-08）
describe("formDefaults（UT-08）", () => {
  // [SC-MANAGE-04] 分类取入口分类、状态已完成、日期今天，其余为空
  it("电影入口、今天 2026-10-21", () => {
    expect(formDefaults("movie", "2026-10-21")).toEqual({
      type: "movie", title: "", creator: "", year: "", status: "completed", rating: null, markedOn: "2026-10-21", comment: "", doubanUrl: null, doubanId: null,
    });
  });
});

describe("validateForm（UT-07）", () => {
  const base = formDefaults("book", "2026-10-21");
  // [SC-MANAGE-07][SC-MANAGE-08] 等价类 + 边界：标题空白、年份位数
  it.each([
    [{ title: "   " }, { title: "请填写标题" }],
    [{ title: "x", year: "23" }, { year: "年份为 4 位数字" }],
    [{ title: "x", year: "20231" }, { year: "年份为 4 位数字" }],
    [{ title: "x", year: "20a3" }, { year: "年份为 4 位数字" }],
    [{ title: "x", year: "" }, {}],
    [{ title: "x", year: " 2023 " }, {}],
    [{ title: "", year: "1" }, { title: "请填写标题", year: "年份为 4 位数字" }],
  ])("%j → %j", (patch, errors) => {
    expect(validateForm({ ...base, ...patch })).toEqual(errors);
  });
});

describe("toEntryFields", () => {
  // [SC-MANAGE-05] 年份转数字、空串转 null；豆瓣引用原样带上
  it("转换为接口字段", () => {
    const form = { ...formDefaults("book", "2026-10-21"), title: " 原则 ", creator: "", year: "2018", rating: 4, comment: "  ", doubanUrl: "https://book.douban.com/subject/1/", doubanId: "1" };
    expect(toEntryFields(form)).toEqual({
      type: "book", title: " 原则 ", creator: null, year: 2018, status: "completed", rating: 4, markedOn: "2026-10-21", comment: null, doubanUrl: "https://book.douban.com/subject/1/", doubanId: "1",
    });
  });
});

describe("formFromEntry", () => {
  // [SC-MANAGE-13] 编辑页：条目回填表单（null → 空串）
  it("条目回填", () => {
    const entry: ShelfEntryView = {
      id: "7", type: "series", title: "请回答1988", creator: null, year: 2015, status: "in_progress", rating: null, markedOn: "2026-09-01",
      comment: null, cover: null, doubanUrl: null, doubanId: null, hidden: false, createdAt: "", updatedAt: "",
    };
    expect(formFromEntry(entry)).toEqual({
      type: "series", title: "请回答1988", creator: "", year: "2015", status: "in_progress", rating: null, markedOn: "2026-09-01", comment: "", doubanUrl: null, doubanId: null,
    });
  });
});
