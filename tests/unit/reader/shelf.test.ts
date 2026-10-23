import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countLabel, SHELF_TYPES, sortEntries, statusLabel } from "../../../src/domains/shelf/entry";
import { parseShelfData } from "../../../src/integrations/reader-data";
import { emptyIcon, groupShelf, markedMonth, shelfPath } from "../../../src/lib/reader/shelf";

const { entries } = parseShelfData(JSON.parse(readFileSync("tests/fixtures/reader/reader-fixture.shelf.json", "utf8")), "reader-fixture");

// [UT-01][SC-MANAGE-09][SC-SHELF-04]
describe("statusLabel", () => {
  it("6 个分类 × 2 个状态", () => {
    expect(SHELF_TYPES.map((t) => [statusLabel(t, "completed"), statusLabel(t, "in_progress")])).toEqual([
      ["读过", "在读"],
      ["读过", "在读"],
      ["看过", "在看"],
      ["看过", "在看"],
      ["玩过", "在玩"],
      ["玩过", "在玩"],
    ]);
  });
});

// [UT-02][SC-SHELF-03][SC-SHELF-12]
describe("countLabel", () => {
  it("量词与进行中数", () => {
    expect([countLabel("book", 10, 2), countLabel("movie", 5, 0), countLabel("boardgame", 0, 0), countLabel("series", 3, 1)]).toEqual(["10 本 · 在读 2", "5 部", "0 款", "3 部 · 在看 1"]);
  });
});

// [UT-03][SC-MANAGE-02][SC-SHELF-04]
describe("sortEntries", () => {
  const rows = [
    { id: 1, status: "completed", markedOn: "2026-03-01" },
    { id: 2, status: "in_progress", markedOn: "2026-01-10" },
    { id: 3, status: "completed", markedOn: "2026-09-15" },
    { id: 4, status: "completed", markedOn: "2026-09-15" },
  ] as const;
  it("进行中在前、日期倒序、同日 id 倒序；输入顺序无关；空数组", () => {
    expect(sortEntries(rows).map((r) => r.id)).toEqual([2, 4, 3, 1]);
    expect(sortEntries([...rows].reverse()).map((r) => r.id)).toEqual([2, 4, 3, 1]);
    expect(sortEntries([])).toEqual([]);
  });
});

// [UT-05] shared-field-formats"标记年月"
describe("markedMonth", () => {
  it("截取 yyyy-MM", () => {
    expect(markedMonth("2026-10-01")).toBe("2026-10");
  });
});

// [SHELF-UT-11][TC-US03-04][TC-US03-05]
describe("groupShelf / shelfPath / emptyIcon", () => {
  const groups = groupShelf(entries);
  const titles = (type: keyof typeof groups) => groups[type].map((e) => e.title);

  it("按分类分组，组内进行中在前、日期倒序；空分类为空数组", () => {
    expect({ series: titles("series"), book: titles("book"), movie: titles("movie"), boardgame: titles("boardgame") }).toEqual({
      series: ["B", "C", "A"],
      book: ["三体", "原则", "手记", "<b>粗体</b>"],
      movie: ["肖申克的救赎", "无名片"],
      boardgame: [],
    });
  });

  it("同日条目保持接口顺序（接口按 id 降序：新建在前）", () => {
    const same = [
      { ...entries[0], type: "game" as const, title: "新", markedOn: "2026-05-01" },
      { ...entries[0], type: "game" as const, title: "旧", markedOn: "2026-05-01" },
    ];
    expect(groupShelf(same).game.map((e) => e.title)).toEqual(["新", "旧"]);
  });

  it("分类地址与空状态图标", () => {
    expect(SHELF_TYPES.map(shelfPath)).toEqual(["/media", "/media/comic", "/media/movie", "/media/series", "/media/game", "/media/boardgame"]);
    expect(SHELF_TYPES.map(emptyIcon)).toEqual(["book-open", "book-image", "film", "tv", "gamepad-2", "dices"]);
  });
});
