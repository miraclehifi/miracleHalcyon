import { describe, expect, it } from "vitest";
import { extractDoubanLink, isDoubanHost, isDoubanImageHost, isSafeUrl, parseSubjectUrl } from "../../../src/domains/shelf/douban/link";

// SHELF-UT-06、07：链接提取、白名单、条目链接解析
const ref = (text: string) => extractDoubanLink(text);

describe("白名单", () => {
  it("豆瓣主机与图片主机", () => {
    expect(["douban.com", "book.douban.com", "WWW.DOUBAN.COM", "douban.com.evil.example", "evildouban.com", "img3.doubanio.com"].map(isDoubanHost)).toEqual([true, true, true, false, false, false]);
    expect(["img3.doubanio.com", "qnmob3-sign.doubanio.com", "doubanio.com.evil.example", "douban.com"].map(isDoubanImageHost)).toEqual([true, true, false, false]);
  });

  it("isSafeUrl：拒绝 userinfo、端口、IP 字面量、非 http(s)", () => {
    const cases = ["https://book.douban.com/subject/1/", "https://u:p@book.douban.com/", "https://book.douban.com:8443/", "http://127.0.0.1/", "http://[::1]/", "ftp://book.douban.com/"];
    expect(cases.map((u) => isSafeUrl(new URL(u)))).toEqual([true, false, false, false, false, false]);
  });
});

describe("parseSubjectUrl（SHELF-UT-07）", () => {
  // [TC-US02-01][SC-RECOG-03][SC-RECOG-04] 桌面、移动、App 分享、带查询与片段、http
  it.each([
    ["https://book.douban.com/subject/27608239/", { kind: "book", id: "27608239" }],
    ["https://movie.douban.com/subject/1292052/?from=share#comments", { kind: "movie", id: "1292052" }],
    ["http://movie.douban.com/subject/1292052", { kind: "movie", id: "1292052" }],
    ["https://m.douban.com/movie/subject/1292052/", { kind: "movie", id: "1292052" }],
    ["https://m.douban.com/book/subject/2567698/", { kind: "book", id: "2567698" }],
    ["https://m.douban.com/game/subject/10734307/", { kind: "game", id: "10734307" }],
    ["https://www.douban.com/game/10734307/", { kind: "game", id: "10734307" }],
    ["https://www.douban.com/doubanapp/dispatch/movie/37501131", { kind: "movie", id: "37501131" }],
    ["https://www.douban.com/doubanapp/dispatch/book/27608239", { kind: "book", id: "27608239" }],
    ["https://book.douban.com/subject/abc/", null],
    ["https://www.douban.com/doulist/123/", null],
    ["https://www.douban.com/", null],
    ["https://book.douban.com/subject/1234567890123/", null],
  ])("%s", (url, expected) => {
    expect(parseSubjectUrl(new URL(url))).toEqual(expected);
  });
});

describe("extractDoubanLink（SHELF-UT-06）", () => {
  // [TC-US02-02][SC-RECOG-05][SC-RECOG-06]
  it("从分享文字中取第一个豆瓣链接", () => {
    expect(ref("https://www.douban.com/doubanapp/dispatch/movie/37501131")).toEqual({ kind: "subject", ref: { kind: "movie", id: "37501131" } });
    expect(ref("推荐 https://example.com/a 和 https://book.douban.com/subject/111/ 还有 https://book.douban.com/subject/222/")).toEqual({ kind: "subject", ref: { kind: "book", id: "111" } });
    expect(ref("看这个：https://book.douban.com/subject/111/。")).toEqual({ kind: "subject", ref: { kind: "book", id: "111" } });
    expect(ref("\n  https://book.douban.com/subject/111/  \n")).toEqual({ kind: "subject", ref: { kind: "book", id: "111" } });
    expect(ref("【豆瓣】我在看《肖申克的救赎》 https://www.douban.com/doubanapp/dispatch/movie/1292052")).toEqual({ kind: "subject", ref: { kind: "movie", id: "1292052" } });
  });

  // [TC-US02-05][TC-US02-09][SC-RECOG-13][SC-RECOG-23]
  it("非豆瓣、非条目、伪装地址", () => {
    expect([
      ref("https://example.com/book/1"),
      ref("一段没有链接的文字"),
      ref("https://douban.com.evil.example/subject/1/"),
      ref("https://book.douban.com@evil.example/subject/1/"),
      ref("http://127.0.0.1/subject/1/"),
      ref("http://169.254.169.254/"),
    ]).toEqual([null, null, null, null, null, null]);
    expect([ref("https://www.douban.com/"), ref("https://www.douban.com/doulist/123/"), ref("https://book.douban.com/subject/abc/")]).toEqual([
      { kind: "not_subject" }, { kind: "not_subject" }, { kind: "not_subject" },
    ]);
  });
});
