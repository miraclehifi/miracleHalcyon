// npm run e2e:seed：把 tests/fixtures/images 的只读图片夹具写入本地 R2（env.e2e），key 为 img/2026/10/{文件名}
// US-12 验收测试数据策略：9 张，宽高、主色各不相同，所有 TC 共用；另有 2 组实况照片（jpg + 同名 .live.mp4）供 US-11
// 预览播放用例：jjjjjjjjjj 为 H.264 视频，kkkkkkkkkk 的视频是损坏字节（WebKit 的媒体请求不经过 page.route）；重复执行覆盖写入
import { readdirSync, readFileSync } from "node:fs";
import { getPlatformProxy } from "wrangler";

const DIR = "tests/fixtures/images";
const PREFIX = "img/2026/10/";

const { env, dispose } = await getPlatformProxy<{ MEDIA: R2Bucket }>({ environment: "e2e" });
try {
  const files = readdirSync(DIR).filter((name) => name.endsWith(".jpg") || name.endsWith(".live.mp4"));
  for (const name of files) {
    const contentType = name.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    await env.MEDIA.put(PREFIX + name, readFileSync(`${DIR}/${name}`), { httpMetadata: { contentType } });
  }
  console.log(`已写入 ${files.length} 个图片 / 视频夹具`);
} finally {
  await dispose();
}
