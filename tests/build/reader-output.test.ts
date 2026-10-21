import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// 读者页构建产物（ADR-007、ADR-008，US-03 / US-01）：用夹具构建，检查静态页、Worker 包与 JS 体积
const CLIENT = "dist/client";
const SERVER = "dist/server";

function build(fixture: string) {
  execSync("npx astro build", { stdio: "pipe", env: { ...process.env, READER_FIXTURE: fixture, CLOUDFLARE_ENV: "e2e" } });
}

function files(dir: string, skip: (path: string) => boolean = () => false): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (skip(path)) return [];
    return statSync(path).isDirectory() ? files(path, skip) : [path];
  });
}

const html = (path: string) => readFileSync(join(CLIENT, path), "utf8");
const fixture = JSON.parse(readFileSync("tests/fixtures/reader/reader-fixture.json", "utf8")) as { posts: { slug: string }[] };

describe("reader-fixture 构建产物", () => {
  beforeAll(() => build("reader-fixture"));

  // [TC-US03-01][SC-REBUILD-01] 读者路由全部是静态 HTML
  it("[TC-US03-01] 首页、列表分页、41 篇详情、标签页与分页、404 都是静态页", () => {
    const expected = ["index.html", "posts.html", "posts/page/2.html", "posts/page/3.html", "404.html", "tags/astro.html", "tags/astro/page/2.html", "tags/cloudflare.html", "tags/c-与-net-core.html"];
    expected.push(...fixture.posts.map((post) => `posts/${post.slug}.html`));
    expect(expected.filter((path) => !existsSync(join(CLIENT, path)))).toEqual([]);
    expect(existsSync(join(CLIENT, "posts/page/1.html"))).toBe(false);
    expect(existsSync(join(CLIENT, "posts/page/4.html"))).toBe(false);
  });

  // [TC-US03-09][SC-REBUILD-09] 草稿与已撤回不进入产物
  it("[TC-US03-09] 产物中没有草稿与已撤回文章", () => {
    const all = files(CLIENT).filter((path) => path.endsWith(".html")).map((path) => readFileSync(path, "utf8")).join("\n");
    for (const marker of ["draft-post", "withdrawn-post", ">Draft<", ">Withdrawn<", "#Secret"]) expect(all, marker).not.toContain(marker);
  });

  // [TC-US05-38][SC-IMAGE-20] 正文残留的上传占位（失败 / 上传中 / 处理中，独占段落或行内）不出现在读者页
  it("[TC-US05-38] 读者页不渲染上传占位", () => {
    const page = html("posts/filler-20.html");
    const article = page.slice(page.indexOf("段落A"), page.indexOf("段落B") + 3);
    expect(article).toContain("前文");
    expect(article).not.toMatch(/data-upload-placeholder|upload-placeholder|图片上传中|上传中…|处理中…|上传失败|上传已中断|src=""|<p>\s*<\/p>/);
  });

  // [TC-US13-12][SC-AFIL-08][SC-AFIL-11] 外链照片（ADR-010）：img 为缩略图、带宽高与 data-thumb / data-mp；未登记前缀不解析扩展片段
  it("[TC-US13-12] 外链照片输出缩略图与扩展属性", () => {
    const page = html("posts/filler-23.html");
    const storage = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
    // 构建产物里属性按 HTML 转义输出；取 data-src 为指定地址的 figure 开始标签及其中第一个 img 标签的属性
    const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] ?? ""]));
    const figure = (src: string) => {
      const at = page.indexOf(`data-src="${src}"`);
      const open = page.lastIndexOf("<figure", at);
      const tag = page.slice(open, page.indexOf(">", at) + 1);
      const imgAt = page.indexOf("<img", open);
      return { figure: attrs(tag), img: attrs(page.slice(imgAt, page.indexOf(">", imgAt) + 1)) };
    };
    const live = figure(`${storage}e2e/live.jpg`);
    expect(live.figure).toMatchObject({
      "data-w": "960",
      "data-h": "1280",
      "data-rgb": "6b7f8e",
      "data-thumb": `${storage}.afilmory/thumbnails/live.jpg`,
      "data-mp": "21119+81755",
      "data-live": "",
    });
    expect([live.img.src, live.img.width, live.img.height]).toEqual([`${storage}.afilmory/thumbnails/live.jpg`, "960", "1280"]);
    expect(figure(`${storage}%E6%89%8B%E5%8A%9E/e2e/grid-a.jpg`).figure["data-thumb"]).toBe(`${storage}.afilmory/thumbnails/grid-a.jpg`);
    const forged = figure("https://example.com/a.jpg");
    expect(Object.keys(forged.figure).filter((key) => ["data-w", "data-h", "data-rgb", "data-thumb", "data-mp", "data-live"].includes(key))).toEqual([]);
    expect(forged.img.src).toBe("https://example.com/a.jpg");
  });

  // ADR-007 验证结果②：构建数据与 Markdown 渲染（Shiki）不进运行时 Worker 包
  it("Worker 包不含读者数据与 Shiki", () => {
    const worker = files(SERVER, (path) => relative(SERVER, path).startsWith(".prerender"))
      .filter((path) => /\.(m?js)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(worker).not.toContain("这是 Halcyon 的第一篇长文");
    expect(worker).not.toMatch(/shiki/i);
    expect(worker).not.toContain("virtual:reader-data");
  });

  // [TC-US01-09][SC-SHELL-02] 首页、404 不加载 React 运行时（只有主题切换的原生脚本）
  it("[TC-US01-09] 首页与 404 不加载 React", () => {
    for (const path of ["index.html", "404.html"]) {
      const page = html(path);
      expect(page, path).not.toContain("<astro-island");
      expect(page, path).not.toMatch(/renderer-url|client\.[\w-]+\.js/);
    }
    expect(html("posts/latest-post.html")).not.toContain("<astro-island"); // 无图文章也不加载
  });
});

// [TC-US03-07][TC-US04-08][SC-REBUILD-07][SC-BROWSE-08] 0 篇文章也能构建
describe("reader-fixture-empty 构建产物", () => {
  beforeAll(() => build("reader-fixture-empty"));

  it("[TC-US03-07][TC-US04-08] 空数据：/posts 为空态、无分页，不生成详情页与标签页", () => {
    const posts = html("posts.html");
    expect(posts).toContain("还没有文章");
    expect(posts).not.toContain('aria-label="分页"');
    expect(existsSync(join(CLIENT, "posts"))).toBe(false);
    expect(existsSync(join(CLIENT, "tags"))).toBe(false);
  });
});
