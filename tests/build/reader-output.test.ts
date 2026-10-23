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
    expect(worker).not.toContain("virtual:shelf-data");
    expect(worker).not.toContain("希望是美好的事物"); // 书影音夹具短评（ADR-012：只用于预渲染）
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

  // F-005 US-03 书影音（reader-media.md；夹具 reader-fixture.shelf.json = US-03 测试数据表，隐藏条目由接口过滤，不在夹具中）
  describe("书影音 /media", () => {
    const MEDIA_PAGES: Record<string, string> = { book: "media.html", comic: "media/comic.html", movie: "media/movie.html", series: "media/series.html", game: "media/game.html", boardgame: "media/boardgame.html" };
    const page = (type: string) => html(MEDIA_PAGES[type]);
    // 每个条目是 <li data-media-item>…</li>；按出现顺序取出
    const items = (type: string) => [...page(type).matchAll(/<li[^>]*data-media-item[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[0]);
    const item = (type: string, title: string) => items(type).find((li) => li.includes(`>${title}<`)) ?? "";
    const titleOf = (li: string) => /data-media-title[^>]*>([^<]*)</.exec(li)?.[1];
    const header = (type: string) => /data-media-count[^>]*>([^<]*)</.exec(page(type))?.[1];

    // [TC-US03-11][SC-SHELF-17] 静态页、/media/book 与已去掉的分类不生成；每页有分类导航岛（服务端输出链接与当前项）；
    // 电影、剧集页另有且仅有一个海报墙岛，服务端输出 [data-poster-static] 静态网格（标题、短评、yyyy-MM-dd、豆瓣链接，不含导演）；只允许封面占位的内联 onerror
    it("[TC-US03-11] 6 个分类静态页；分类导航岛 + 电影 / 剧集海报墙岛", () => {
      expect(Object.values(MEDIA_PAGES).filter((path) => !existsSync(join(CLIENT, path)))).toEqual([]);
      expect([existsSync(join(CLIENT, "media/book.html")), existsSync(join(CLIENT, "media/anime.html"))]).toEqual([false, false]);
      for (const [type, path] of Object.entries(MEDIA_PAGES)) {
        const doc = html(path);
        const wall = type === "movie" || type === "series";
        expect(doc.match(/<astro-island/g)?.length, path).toBe(wall ? 2 : 1);
        expect(doc, path).toMatch(/<astro-island[^>]*component-export="MediaTypeTabs"[^>]*client="load"/);
        expect(/<astro-island[^>]*component-export="MediaPosterWall"[^>]*client="load"/.test(doc), path).toBe(wall);
        const href = type === "book" ? "/media" : `/media/${type}`;
        expect(doc, path).toMatch(new RegExp(`<a[^>]*href="${href}"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="${href}"`));
        expect(doc, path).toContain('aria-label="书影音分类"');
        const handlers = [...doc.matchAll(/\son([a-z]+)=/g)].map((m) => m[1]);
        expect(handlers.every((h) => h === "error"), path).toBe(true);
      }
      const movie = page("movie");
      const grid = movie.slice(movie.indexOf("data-poster-static"), movie.indexOf("</ul>", movie.indexOf("data-poster-static")));
      for (const text of ["肖申克的救赎", "无名片", "希望是美好的事物", "看过 · 2026-08-20", "看过 · 2026-07-01", 'href="https://movie.douban.com/subject/1292052/"']) expect(grid, text).toContain(text);
      expect(grid).not.toContain("弗兰克·德拉邦特");
      // 海报墙不显示导演：岛 props（序列化进 HTML）里也不带
      expect(movie).not.toContain("弗兰克·德拉邦特");
      expect(grid).not.toContain("在看");
    });

    // [TC-US03-03][SC-SHELF-03][SC-SHELF-10][SC-SHELF-12]
    it("[TC-US03-03] 页头数量、量词与进行中数", () => {
      expect(["book", "movie", "series", "game", "boardgame"].map(header)).toEqual(["4 本 · 在读 1", "2 部", "3 部 · 在看 1", "2 款", "0 款"]);
    });

    // [TC-US03-04][SC-SHELF-04]
    it("[TC-US03-04] 排序与进行中标记", () => {
      expect([...page("series").matchAll(/data-poster-title="([^"]*)"/g)].map((m) => m[1])).toEqual(["B", "C", "A"]);
      expect(page("series")).toMatch(/data-poster-title="B"[\s\S]*?在看[\s\S]*?data-poster-title="C"/);
      expect(items("book").map(titleOf)).toEqual(["三体", "原则", "手记", "&lt;b&gt;粗体&lt;/b&gt;"]);
    });

    // [TC-US03-05][SC-SHELF-05] 书 / 漫画为卡片
    it("[TC-US03-05] 书 / 漫画卡片内容", () => {
      const principles = item("book", "原则");
      expect(principles).toContain('src="/covers/2026/10/k3j7x2m4q5ab.jpg"');
      expect(principles).toContain('loading="lazy"');
      for (const text of ["瑞·达利欧", 'aria-label="评分 4 / 5"', "值得反复读", "读过 · 2026-10", "豆瓣 ↗"]) expect(principles, text).toContain(text);
      const santi = item("book", "三体");
      expect(santi).toContain("在读");
      expect(santi).not.toMatch(/读过 ·|2026-08|aria-label="评分/);
      expect(items("comic")).toHaveLength(1);
      expect(items("comic")[0]).toContain("data-media-card");
      expect(principles).toContain("data-media-card");
    });

    // [TC-US03-06][SC-SHELF-06][SC-SHELF-07] 游戏、桌游为列表行；无评分保留评分列占位
    it("[TC-US03-06] 列表行内容与无评分占位", () => {
      const botw = item("game", "旷野之息");
      expect(botw).toContain("data-media-row");
      for (const text of ['src="/covers/2026/06/zeldabotw2ab.jpg"', "任天堂", 'aria-label="评分 5 / 5"', "2026-06"]) expect(botw, text).toContain(text);
      const unrated = item("game", "无评游戏");
      expect(unrated).toContain("data-rating-slot");
      expect(unrated).not.toContain('aria-label="评分');
    });

    // [TC-US03-07][SC-SHELF-08][SC-SHELF-09]
    it("[TC-US03-07] 豆瓣外链与不可点击条目", () => {
      expect(item("book", "原则")).toMatch(/<a[^>]*href="https:\/\/book\.douban\.com\/subject\/27608239\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
      const note = item("book", "手记");
      expect(note).not.toContain("<a");
      expect(note).not.toContain("豆瓣 ↗");
      const all = Object.keys(MEDIA_PAGES).map(page).join("\n");
      const doubanLinks = [...all.matchAll(/<a[^>]*href="https:\/\/[a-z.]*douban\.com[^"]*"[^>]*>/g)].map((m) => m[0]);
      expect(doubanLinks.length).toBeGreaterThan(0);
      expect(doubanLinks.filter((a) => !a.includes('rel="noopener noreferrer"'))).toEqual([]);
    });

    // [TC-US03-08][SC-SHELF-10] 隐藏条目不进产物（接口已过滤；此处防夹具或页面意外引入）
    it("[TC-US03-08] 隐藏条目不进产物", () => {
      const all = files(CLIENT).filter((path) => /media/.test(path)).map((path) => readFileSync(path, "utf8")).join("\n");
      expect(all).not.toContain("隐书");
    });

    // [TC-US03-10][SC-SHELF-16] 封面一律站内路径
    it("[TC-US03-10] 图片均为站内路径", () => {
      const srcs = Object.keys(MEDIA_PAGES).flatMap((type) => [...page(type).matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => m[1]));
      expect(srcs.filter((src) => !src.startsWith("/"))).toEqual([]);
    });

    // [TC-US03-13][SC-SHELF-05] 转义、超长标题单行省略、多行短评保留换行并限 4 行
    it("[TC-US03-13] HTML 转义、超长标题、多行短评", () => {
      expect(page("book")).toContain("&lt;b&gt;粗体&lt;/b&gt;");
      expect(page("book")).not.toContain("<b>粗体</b>");
      const comic = items("comic")[0];
      expect(comic).toMatch(/data-media-title[^>]*class="[^"]*truncate/);
      expect(comic).toMatch(/class="[^"]*whitespace-pre-line[^"]*line-clamp-4[^"]*"[^>]*>第一行\n第二行/);
    });

    // [TC-US03-16][SC-SHELF-12] 空分类（构建部分）
    it("[TC-US03-16] 空分类空状态", () => {
      expect(page("boardgame")).toContain("还没有记录桌游");
      expect(items("boardgame")).toEqual([]);
    });
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

  // reader module-spec §1.3：无 .shelf.json 的夹具 → 书影音为空，6 个分类页照常生成
  it("无书影音夹具：/media 各分类为空状态", () => {
    expect(html("media.html")).toContain("还没有记录书");
    expect(html("media/movie.html")).toContain("还没有记录电影");
  });
});
