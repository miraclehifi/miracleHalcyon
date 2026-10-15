import { describe, expect, it } from "vitest";
import { mergeDevVars } from "../../../scripts/dev-local";

// npm run dev:local：补齐 .dev.vars（账号、密码哈希、与端口一致的 SITE_ORIGIN）
const HASH = "pbkdf2$100000$c2FsdA==$aGFzaA==";

describe("mergeDevVars", () => {
  it("空配置 + 密码哈希：生成三项，SITE_ORIGIN 与端口一致", () => {
    const result = mergeDevVars("", { port: 4400, passwordHash: HASH });

    expect(result).toEqual({
      needsPassword: false,
      text: `ADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=${HASH}\nSITE_ORIGIN=http://localhost:4400\n`,
    });
  });

  it("已有完整配置且端口一致：内容不变，不需要密码", () => {
    const text = `# 本地\nADMIN_USERNAME=me\nADMIN_PASSWORD_HASH=${HASH}\nSITE_ORIGIN=http://localhost:4321\n`;

    expect(mergeDevVars(text, { port: 4321 })).toEqual({ needsPassword: false, text });
  });

  it("SITE_ORIGIN 与端口不一致：只改写该行，其他行与注释保留", () => {
    const text = `# 本地\nADMIN_USERNAME=me\nADMIN_PASSWORD_HASH=${HASH}\nSITE_ORIGIN=http://localhost:4321\nEXTRA=1\n`;

    expect(mergeDevVars(text, { port: 5000 }).text).toBe(
      `# 本地\nADMIN_USERNAME=me\nADMIN_PASSWORD_HASH=${HASH}\nSITE_ORIGIN=http://localhost:5000\nEXTRA=1\n`,
    );
  });

  it("缺密码哈希且未提供：报告需要密码", () => {
    const result = mergeDevVars("ADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=\n", { port: 4321 });

    expect(result.needsPassword).toBe(true);
  });
});
