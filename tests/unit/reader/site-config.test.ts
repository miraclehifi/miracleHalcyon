import { describe, expect, it } from "vitest";
import { normalizeSiteConfig } from "../../../src/lib/reader/site-config";

const base = { name: "Halcyon", avatar: "/avatar.png", bio: ["一段简介"], footerTagline: "写字" };

// [TC-US02-03][TC-US02-04][SC-HOME-03][SC-HOME-04] READER-UT-08
describe("normalizeSiteConfig", () => {
  it("空外链与空邮箱省略", () => {
    const site = normalizeSiteConfig({ ...base, github: "", photo: undefined, email: "" });
    expect(site).toEqual({ ...base, github: undefined, photo: undefined, email: undefined });
  });

  it("合法 http(s) 地址与邮箱保留", () => {
    const site = normalizeSiteConfig({ ...base, github: "https://github.com/example", photo: "http://photo.example", email: "me@example.com" });
    expect([site.github, site.photo, site.email]).toEqual(["https://github.com/example", "http://photo.example", "me@example.com"]);
  });

  it("非法配置抛错并指出字段", () => {
    expect(() => normalizeSiteConfig({ ...base, github: "javascript:alert(1)" })).toThrow(/site\.github/);
    expect(() => normalizeSiteConfig({ ...base, photo: "ftp://x" })).toThrow(/site\.photo/);
    expect(() => normalizeSiteConfig({ ...base, email: "me@" })).toThrow(/site\.email/);
    expect(() => normalizeSiteConfig({ ...base, bio: [] })).toThrow(/site\.bio/);
    expect(() => normalizeSiteConfig({ ...base, name: " " })).toThrow(/site\.name/);
  });

  // [UT-176][SC-AFIL-11][SC-AFIL-13] Afilmory 登记：缺省为 undefined；site 只能是 https 根地址（末尾 / 去掉）；storage 为 https 且以 / 结尾
  it("afilmory 配置校验", () => {
    const storage = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
    expect(normalizeSiteConfig(base).afilmory).toBeUndefined();
    expect(normalizeSiteConfig({ ...base, afilmory: { site: "https://miraclehalcyon.afilmory.art/", storage } }).afilmory).toEqual({
      site: "https://miraclehalcyon.afilmory.art",
      storage,
    });
    const bad = [
      { site: "http://miraclehalcyon.afilmory.art", storage },
      { site: "https://miraclehalcyon.afilmory.art/photos", storage },
      { site: "https://miraclehalcyon.afilmory.art", storage: "http://raw.githubusercontent.com/x/" },
      { site: "https://miraclehalcyon.afilmory.art", storage: "https://raw.githubusercontent.com/x/main" },
      { site: "https://miraclehalcyon.afilmory.art", storage: "https://raw.githubusercontent.com/x/?a=1" },
    ];
    for (const afilmory of bad) expect(() => normalizeSiteConfig({ ...base, afilmory })).toThrow(/site\.afilmory/);
  });
});
