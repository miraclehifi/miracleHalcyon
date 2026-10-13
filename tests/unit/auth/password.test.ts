import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/domains/auth/password";

// [AUTH-UT-01] PasswordHash：pbkdf2$<iterations>$<saltB64>$<hashB64>，PBKDF2-SHA256 × 100000
const PASSWORD = "correct horse battery staple";

function tamperSalt(stored: string): string {
  const [algo, iterations, salt, hash] = stored.split("$");
  const flipped = (salt[0] === "A" ? "B" : "A") + salt.slice(1);
  return [algo, iterations, flipped, hash].join("$");
}

describe("hashPassword / verifyPassword", () => {
  it("[AUTH-UT-01] 往返为 true；错误密码、篡改 salt、iterations 非数字为 false 且不抛错", async () => {
    const stored = await hashPassword(PASSWORD);

    expect({
      format: /^pbkdf2\$100000\$[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=$/.test(stored),
      roundTrip: await verifyPassword(PASSWORD, stored),
      wrongPassword: await verifyPassword(`${PASSWORD}!`, stored),
      tamperedSalt: await verifyPassword(PASSWORD, tamperSalt(stored)),
      badIterations: await verifyPassword(PASSWORD, stored.replace("$100000$", "$abc$")),
    }).toEqual({ format: true, roundTrip: true, wrongPassword: false, tamperedSalt: false, badIterations: false });
  });
});
