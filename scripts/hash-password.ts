// npm run hash-password：生成 ADMIN_PASSWORD_HASH（auth domain-model §6）
// 终端中输入时不回显；也可管道输入：echo -n "密码" | npm run hash-password --silent
import type { Readable } from "node:stream";
import { hashPassword } from "../src/domains/auth/password.ts";

const ENTER = new Set(["\r", "\n", "\u0004"]); // 回车 / Ctrl+D
const CTRL_C = "\u0003";
const BACKSPACE = new Set(["\u0008", "\u007f"]);

async function readAll(input: Readable): Promise<string> {
  let text = "";
  for await (const chunk of input) text += String(chunk);
  return text.replace(/\r?\n$/, "");
}

// 终端原始模式逐字读取，不回显
function readHidden(stdin: NodeJS.ReadStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let password = "";
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (ENTER.has(char)) return finish(() => resolve(password));
        if (char === CTRL_C) return finish(() => reject(new Error("已取消")));
        password = BACKSPACE.has(char) ? password.slice(0, -1) : password + char;
      }
    };
    const finish = (done: () => void) => {
      stdin.setRawMode(false);
      stdin.off("data", onData);
      stdin.pause();
      process.stderr.write("\n");
      done();
    };
    stdin.on("data", onData);
    stdin.resume();
  });
}

export async function hashFromInput(input: Readable): Promise<string> {
  const password = await readAll(input);
  if (!password) throw new Error("密码不能为空");
  return hashPassword(password);
}

async function main() {
  const stdin = process.stdin;
  if (stdin.isTTY) {
    process.stderr.write("管理员密码（输入不显示）：");
    const password = await readHidden(stdin);
    if (!password) throw new Error("密码不能为空");
    process.stdout.write(`${await hashPassword(password)}\n`);
    return;
  }
  process.stdout.write(`${await hashFromInput(stdin)}\n`);
}

if (import.meta.main) {
  main().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
