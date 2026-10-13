import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { hashFromInput } from "../../../scripts/hash-password";
import { verifyPassword } from "../../../src/domains/auth/password";

// npm run hash-password：从 stdin 读取密码，输出 PasswordHash
const PASSWORD = "s3cret-password";

describe("hash-password 脚本", () => {
  it("输出的字符串可被 verifyPassword 校验通过", async () => {
    const output = await hashFromInput(Readable.from([`${PASSWORD}\n`]));

    expect(await verifyPassword(PASSWORD, output)).toBe(true);
  });
});
