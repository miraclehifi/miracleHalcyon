import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DoubanClient } from "../../../src/domains/shelf/douban/client";
import { DoubanFetchError, DoubanParseError, RecognizeError } from "../../../src/domains/shelf/errors";
import type { ShelfRepo } from "../../../src/domains/shelf/repo";
import { createShelfService } from "../../../src/domains/shelf/service";

// SHELF-UT-09：recognize 全流程（替身 client / repo）
const load = (name: string) => JSON.parse(readFileSync(`tests/fixtures/douban/${name}.json`, "utf8"));
const JPG = new Uint8Array(readFileSync("tests/fixtures/douban/cover-ok.jpg"));

function setup(client: Partial<DoubanClient> = {}, existing: { id: number; title: string } | null = null) {
  const calls: string[] = [];
  const douban: DoubanClient = {
    fetchSubject: vi.fn(async (ref) => {
      calls.push(`subject:${ref.kind}/${ref.id}`);
      const byRef: Record<string, unknown> = { "book:27608239": load("book-principles"), "movie:37501131": load("tv-dispatch"), "book:2025999": load("book-manga") };
      return byRef[`${ref.kind}:${ref.id}`] ?? load("movie-shawshank");
    }),
    fetchBookTags: vi.fn(async (id) => {
      calls.push(`tags:${id}`);
      return id === "2025999" ? load("book-manga-tags").tags : [];
    }),
    fetchCover: vi.fn(async (url) => {
      calls.push(`cover:${new URL(url).hostname}`);
      return JPG;
    }),
    fetchInterests: vi.fn(),
    ...client,
  };
  const repo = {
    findByDoubanId: vi.fn(async () => (existing ? { ...existing, type: "book", status: "completed", markedOn: "2026-10-01" } : null)),
  } as unknown as ShelfRepo;
  const service = createShelfService({ repo, store: {} as never, douban, recognizeTimeoutMs: 8000 });
  return { service, calls, douban, repo };
}

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (error) {
    if (error instanceof RecognizeError) return error.code;
    throw error;
  }
};

afterEach(() => vi.useRealTimers());

describe("recognize", () => {
  // [TC-US02-01][SC-RECOG-03] 书：条目与标签并行，封面转 data URL，规范链接
  it("书条目", async () => {
    const { service, calls } = setup();
    const result = await service.recognize("https://book.douban.com/subject/27608239/");
    expect(result).toEqual({
      fields: {
        type: "book", title: "原则", creator: "瑞·达利欧", year: 2018,
        coverData: expect.stringMatching(/^data:image\/jpeg;base64,\/9j\//),
        doubanUrl: "https://book.douban.com/subject/27608239/", doubanId: "27608239",
      },
      missing: [],
    });
    expect(calls.sort()).toEqual(["cover:img2.doubanio.com", "subject:book/27608239", "tags:27608239"]);
  });

  // [TC-US02-02][SC-RECOG-05] 作者提供的 App 分享链接：剧，不请求标签
  it("dispatch 分享链接", async () => {
    const { service, calls } = setup();
    const result = await service.recognize("https://www.douban.com/doubanapp/dispatch/movie/37501131");
    expect([result.fields?.type, result.fields?.doubanUrl, calls.some((c) => c.startsWith("tags"))]).toEqual(["series", "https://movie.douban.com/subject/37501131/", false]);
  });

  // [TC-US02-03][SC-RECOG-10] 标签请求失败按 book 处理
  it("标签失败不影响识别", async () => {
    const { service } = setup({ fetchBookTags: async () => Promise.reject(new DoubanFetchError("x")) });
    expect((await service.recognize("https://book.douban.com/subject/2025999/")).fields?.type).toBe("book");
  });

  // [TC-US02-08][SC-RECOG-18][SC-RECOG-19] 重复：不请求豆瓣；excludeId 为自身时正常识别
  it("重复条目与 excludeId", async () => {
    const dup = setup({}, { id: 7, title: "原则" });
    const res = await dup.service.recognize("https://book.douban.com/subject/27608239/");
    const self = await dup.service.recognize("https://book.douban.com/subject/27608239/", 7);
    expect([res, dup.calls.filter((c) => c.startsWith("subject")).length, self.fields?.title]).toEqual([
      { duplicate: { id: 7, title: "原则", type: "book", status: "completed", markedOn: "2026-10-01" } }, 1, "原则",
    ]);
  });

  // [TC-US02-05][TC-US02-06][TC-US02-07] 错误码
  it("错误码", async () => {
    expect(await codeOf(setup().service.recognize("https://example.com/x"))).toBe("NOT_DOUBAN_LINK");
    expect(await codeOf(setup().service.recognize("https://www.douban.com/doulist/1/"))).toBe("NOT_SUBJECT_LINK");
    expect(await codeOf(setup({ fetchSubject: async () => Promise.reject(new DoubanFetchError("418")) }).service.recognize("https://book.douban.com/subject/1/"))).toBe("FETCH_FAILED");
    expect(await codeOf(setup({ fetchSubject: async () => Promise.reject(new DoubanParseError("html")) }).service.recognize("https://book.douban.com/subject/1/"))).toBe("PARSE_FAILED");
    expect(await codeOf(setup({ fetchSubject: async () => load("no-title") }).service.recognize("https://book.douban.com/subject/1/"))).toBe("PARSE_FAILED");
  });

  // [TC-US02-12][SC-RECOG-21] 封面失败只加 missing；非豆瓣图片域不下载
  it("封面失败与非豆瓣封面域", async () => {
    const svg = setup({ fetchCover: async () => new TextEncoder().encode("<svg/>") });
    const failed = setup({ fetchCover: async () => Promise.reject(new DoubanFetchError("timeout")) });
    const offsite = setup({ fetchSubject: async () => ({ ...load("book-principles"), cover_url: "https://evil.example/a.jpg", pic: undefined }) });
    const results = [await svg.service.recognize("https://book.douban.com/subject/27608239/"), await failed.service.recognize("https://book.douban.com/subject/27608239/"), await offsite.service.recognize("https://book.douban.com/subject/27608239/")];
    expect(results.map((r) => [r.fields?.coverData, r.missing])).toEqual([[null, ["cover"]], [null, ["cover"]], [null, ["cover"]]]);
    expect(offsite.calls.some((c) => c.startsWith("cover"))).toBe(false);
  });

  // [TC-US02-06][TC-US02-13] 8 秒总时限：条目挂起 → FETCH_FAILED；封面挂起 → 条目照常、封面缺失
  it("总时限", async () => {
    vi.useFakeTimers();
    const hangSubject = setup({ fetchSubject: () => new Promise(() => {}) });
    const p1 = codeOf(hangSubject.service.recognize("https://book.douban.com/subject/1/"));
    await vi.advanceTimersByTimeAsync(8000);
    expect(await p1).toBe("FETCH_FAILED");

    const hangCover = setup({ fetchCover: () => new Promise(() => {}) });
    const p2 = hangCover.service.recognize("https://book.douban.com/subject/27608239/");
    await vi.advanceTimersByTimeAsync(8000);
    const r = await p2;
    expect([r.fields?.title, r.fields?.coverData, r.missing]).toEqual(["原则", null, ["cover"]]);
  });

  // 输入校验
  it("空文本、超长文本", async () => {
    const { service } = setup();
    await expect(service.recognize("   ")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(service.recognize("x".repeat(10001))).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

// SHELF-UT-15：游戏不下载豆瓣封面（ADR-013 §5）；桌游照常
describe("recognize 游戏", () => {
  // [TC-US02-23][SC-RECOG-20]
  it("游戏缺封面且无封面请求；桌游下载封面", async () => {
    const { service, calls } = setup({
      fetchSubject: vi.fn(async (ref) => {
        calls.push(`subject:${ref.kind}/${ref.id}`);
        return load(ref.id === "10757298" ? "game-board" : "game-video");
      }),
    });
    const game = await service.recognize("https://www.douban.com/game/10734307/");
    const gameCalls = [...calls];
    const board = await service.recognize("https://www.douban.com/game/10757298/");
    expect({
      game: [game.fields?.type, game.fields?.coverData, game.missing?.filter((m) => m === "cover").length],
      gameCalls,
      board: [board.fields?.type, board.fields?.coverData?.startsWith("data:image/jpeg;base64,")],
    }).toEqual({ game: ["game", null, 1], gameCalls: ["subject:game/10734307"], board: ["boardgame", true] });
  });
});
