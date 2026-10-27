import { describe, expect, it } from "vitest";
import {
  categorySyncLabel, failureText, hasAnySync, importErrorMessage, importPlan, isValidDoubanUid, progressCount, progressRatio, stepLabel, summaryText, uidError,
} from "../../../src/lib/admin/douban-import";
import type { ImportCategoryState } from "../../../src/domains/shelf/import-state-repo";

// UT-20、UT-21：导入面板的纯函数（frontend-unit-tests.md）
const empty = (): ImportCategoryState[] =>
  ["movie", "series", "book", "comic", "game", "boardgame"].flatMap((type) => ["done", "doing"].map((status) => ({ type, status, watermark: null, syncedAt: null }) as ImportCategoryState));
const withSync = (sync: Record<string, string>) => empty().map((c) => ({ ...c, syncedAt: sync[`${c.type}·${c.status}`] ?? null, watermark: sync[`${c.type}·${c.status}`] ? "2026-10-18 08:25:08" : null }));

describe("UT-20 用户 ID", () => {
  // [SC-IMPORT-02][SC-IMPORT-20] 前后端共用同一函数；表单提示
  it.each([
    ["189806038", true], ["ahbei", true], ["a_b.c-d", true], ["a".repeat(64), true],
    ["", false], ["a".repeat(65), false], ["../x", false], ["a/b", false], ["a?b", false], ["a%2Fb", false], ["张三", false], ["a b", false],
  ])("%j → %s", (uid, ok) => {
    expect(isValidDoubanUid(uid)).toBe(ok);
  });

  it("表单提示：空串不提示、格式不对提示", () => {
    expect([uidError(""), uidError("189806038"), uidError("abc/../x")]).toEqual([null, null, "用户 ID 只能包含字母、数字、下划线、点和短横线"]);
  });
});

describe("UT-21 步骤、进度与文案", () => {
  // [SC-IMPORT-12][SC-IMPORT-28] 只勾漫画 → 只有书两步；空 → 无步骤
  it("importPlan 与步骤名", () => {
    expect(importPlan(["comic"]).map((s) => [stepLabel(s), s.types])).toEqual([["书 · 读过", ["comic"]], ["书 · 在读", ["comic"]]]);
    expect(importPlan(["movie", "series", "book", "comic", "game", "boardgame"]).map(stepLabel)).toEqual(["影视 · 看过", "影视 · 在看", "书 · 读过", "书 · 在读", "游戏 · 玩过", "游戏 · 在玩"]);
    expect(importPlan([])).toEqual([]);
  });

  // [SC-IMPORT-12][SC-IMPORT-22] 全量："已处理 / 总数"（已处理 = min(nextStart, total)）；增量："已同步 N 条"
  it("进度", () => {
    expect([
      progressCount({ counting: "pages", processed: 40, total: 614, synced: 0 }),
      progressCount({ counting: "items", processed: 20, total: 614, synced: 3 }),
    ]).toEqual(["40 / 614", "已同步 3 条"]);
    expect([progressRatio({ counting: "pages", processed: 40, total: 160, synced: 0 }, 0, 6), progressRatio({ counting: "items", processed: 0, total: 0, synced: 3 }, 2, 6), progressRatio({ counting: "pages", processed: 0, total: 0, synced: 0 }, 0, 2)]).toEqual([0.25, 0.5, 0]);
  });

  // [SC-IMPORT-12][SC-IMPORT-15] 汇总前缀
  it("汇总", () => {
    const totals = { created: 3, updated: 2, failed: 1, coverFailed: 0 };
    expect([summaryText(totals, "full", false), summaryText(totals, "incremental", false), summaryText(totals, "full", true)]).toEqual([
      "导入完成：新增 3、更新 2、失败 1、封面失败 0", "同步完成：新增 3、更新 2、失败 1、封面失败 0", "已停止：新增 3、更新 2、失败 1、封面失败 0",
    ]);
  });

  // [SC-IMPORT-01] 上次同步：看过、在看较早的一次，本地时区 MM-dd HH:mm；任一为空 → 未同步
  it("categorySyncLabel / hasAnySync", () => {
    const state = withSync({ "movie·done": "2026-10-23T13:30:00.000Z", "movie·doing": "2026-10-23T14:00:00.000Z", "comic·done": "2026-10-20T01:05:00.000Z" });
    const local = (iso: string) => {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    expect([categorySyncLabel(state, "movie"), categorySyncLabel(state, "comic"), categorySyncLabel(state, "series")]).toEqual([local("2026-10-23T13:30:00.000Z"), "未同步", "未同步"]);
    expect([hasAnySync(state), hasAnySync(empty())]).toEqual([true, false]);
  });

  // [SC-IMPORT-13][SC-IMPORT-17][SC-IMPORT-18][SC-IMPORT-19] 错误码与失败原因
  it("错误码与失败原因", () => {
    expect(["VALIDATION_FAILED", "DOUBAN_USER_NOT_FOUND", "DOUBAN_FORBIDDEN", "FETCH_FAILED", "UNAUTHENTICATED", "WAT"].map(importErrorMessage)).toEqual([
      "导入参数不正确，请检查用户 ID 与类别",
      "豆瓣上找不到这个用户",
      "豆瓣标记未公开或需要登录，无法导入",
      "豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入",
      "登录已过期，请重新登录后再导入",
      "导入失败，请稍后重试",
    ]);
    expect([failureText({ doubanId: "1", title: null, reason: "PARSE_FAILED" }), failureText({ doubanId: null, title: "某书", reason: "WRITE_FAILED" }), failureText({ doubanId: "2", title: "x", reason: "FETCH_FAILED" })]).toEqual([
      "豆瓣 1：解析不出条目信息", "《某书》：写入失败，请重新导入", "豆瓣 2：豆瓣请求超时，请重新导入",
    ]);
  });
});
