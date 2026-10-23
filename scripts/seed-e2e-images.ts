// npm run e2e:seed：把 tests/fixtures/images 的只读图片夹具写入本地 R2（env.e2e），key 为 img/2026/10/{文件名}；另写入书影音封面 covers/*
// US-12 验收测试数据策略：9 张，宽高、主色各不相同，所有 TC 共用；另有 2 组实况照片（jpg + 同名 .live.mp4）供 US-11
// 预览播放用例：jjjjjjjjjj 为 H.264 视频，kkkkkkkkkk 的视频是损坏字节（WebKit 的媒体请求不经过 page.route）；重复执行覆盖写入
import { readdirSync, readFileSync } from "node:fs";
import { getPlatformProxy } from "wrangler";

const DIR = "tests/fixtures/images";
const PREFIX = "img/2026/10/";
const SHELF_COVERS: Record<string, string> = {
  "covers/2026/10/k3j7x2m4q5ab.jpg": "cccccccccc_800x1200_445566.jpg",
  "covers/2026/08/shawshank2ab.jpg": "ffffffffff_900x1600_3d6a2c.jpg",
  "covers/2026/06/zeldabotw2ab.jpg": "hhhhhhhhhh_1080x1350_e8a15a.jpg",
};

const { env, dispose } = await getPlatformProxy<{ MEDIA: R2Bucket }>({ environment: "e2e" });
try {
  const files = readdirSync(DIR).filter((name) => name.endsWith(".jpg") || name.endsWith(".live.mp4"));
  for (const name of files) {
    const contentType = name.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    await env.MEDIA.put(PREFIX + name, readFileSync(`${DIR}/${name}`), { httpMetadata: { contentType } });
  }
  // 书影音封面（reader-fixture.shelf.json 引用的 /covers/* 地址；"无名片"的封面故意不写入，用于加载失败占位）
  for (const [key, name] of Object.entries(SHELF_COVERS)) {
    await env.MEDIA.put(key, readFileSync(`${DIR}/${name}`), { httpMetadata: { contentType: "image/jpeg" } });
  }
  console.log(`已写入 ${files.length} 个图片 / 视频夹具、${Object.keys(SHELF_COVERS).length} 个书影音封面`);
} finally {
  await dispose();
}
