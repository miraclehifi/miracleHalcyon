// 读者页构建数据（ADR-007）：Vite 插件在 Node 中取数，以虚拟模块 virtual:reader-data 注入预渲染页面
// spike 版：只支持夹具；正式取数逻辑见 build-reader-data-source
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:reader-data";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const FIXTURE_DIR = new URL("../../tests/fixtures/reader/", import.meta.url);

export function readerData(): Plugin {
  return {
    name: "reader-data",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const name = process.env.READER_FIXTURE || "reader-fixture";
      const json = await readFile(fileURLToPath(new URL(`${name}.json`, FIXTURE_DIR)), "utf8");
      return `export default ${json};`;
    },
  };
}
