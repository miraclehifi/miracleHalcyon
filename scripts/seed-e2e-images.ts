// npm run e2e:seed：把 tests/fixtures/images 的只读图片夹具写入本地 R2（env.e2e），key 为 img/2026/10/{文件名}
// US-12 验收测试数据策略：9 张，宽高、主色各不相同，所有 TC 共用；重复执行覆盖写入
import { readdirSync, readFileSync } from "node:fs";
import { getPlatformProxy } from "wrangler";

const DIR = "tests/fixtures/images";
const PREFIX = "img/2026/10/";

const { env, dispose } = await getPlatformProxy<{ MEDIA: R2Bucket }>({ environment: "e2e" });
try {
  const files = readdirSync(DIR).filter((name) => name.endsWith(".jpg"));
  for (const name of files) {
    await env.MEDIA.put(PREFIX + name, readFileSync(`${DIR}/${name}`), { httpMetadata: { contentType: "image/jpeg" } });
  }
  console.log(`已写入 ${files.length} 张图片夹具`);
} finally {
  await dispose();
}
