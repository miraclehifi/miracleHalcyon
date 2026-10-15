// npm run dev:local [-- --port 4321]：补齐 .dev.vars → 检查端口空闲 → 应用本地 D1 迁移 → astro dev
// 缺少 .dev.vars 时 SITE_ORIGIN 为空，中间件会拒绝所有后台写操作（SERVER_MISCONFIGURED）
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { hashPassword } from "../src/domains/auth/password.ts";
import { readHidden } from "./hash-password.ts";

const DEV_VARS = ".dev.vars";
const DEFAULT_PORT = 4321;
const DEFAULT_USERNAME = "admin";

interface MergeOptions {
  port: number;
  passwordHash?: string;
}

interface MergeResult {
  text: string;
  needsPassword: boolean;
}

// 在原文上逐项补齐 / 改写，其他行与注释原样保留
export function mergeDevVars(text: string, { port, passwordHash }: MergeOptions): MergeResult {
  const lines = text === "" ? [] : text.replace(/\n$/, "").split("\n");
  const indexOf = (key: string) => lines.findIndex((line) => line.startsWith(`${key}=`));
  const valueOf = (key: string) => {
    const index = indexOf(key);
    return index === -1 ? "" : lines[index].slice(key.length + 1).trim();
  };
  const set = (key: string, value: string) => {
    const index = indexOf(key);
    if (index === -1) lines.push(`${key}=${value}`);
    else if (valueOf(key) !== value) lines[index] = `${key}=${value}`;
  };

  set("ADMIN_USERNAME", valueOf("ADMIN_USERNAME") || DEFAULT_USERNAME);
  const hash = valueOf("ADMIN_PASSWORD_HASH") || passwordHash;
  if (hash) set("ADMIN_PASSWORD_HASH", hash);
  set("SITE_ORIGIN", `http://localhost:${port}`);
  return { text: `${lines.join("\n")}\n`, needsPassword: !hash };
}

function parsePort(argv: string[]): number {
  const index = argv.indexOf("--port");
  if (index === -1) return DEFAULT_PORT;
  const port = Number(argv[index + 1]);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error(`端口无效：${argv[index + 1]}`);
  return port;
}

// IPv4 / IPv6 任一能连上即视为占用（旧的 preview 进程可能只监听其中一个）
function isListening(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function ensureDevVars(port: number) {
  const original = existsSync(DEV_VARS) ? readFileSync(DEV_VARS, "utf8").replace(/\r\n/g, "\n") : "";
  let result = mergeDevVars(original, { port });
  if (result.needsPassword) {
    if (!process.stdin.isTTY) throw new Error(`${DEV_VARS} 缺少 ADMIN_PASSWORD_HASH：先运行 npm run hash-password --silent 并写入`);
    process.stderr.write("首次启动，设置本地管理员密码（输入不显示）：");
    const password = await readHidden(process.stdin);
    if (!password) throw new Error("密码不能为空");
    result = mergeDevVars(original, { port, passwordHash: await hashPassword(password) });
  }
  if (result.text !== original) {
    writeFileSync(DEV_VARS, result.text);
    console.log(`已更新 ${DEV_VARS}`);
  }
}

// Windows 下 npm / npx 是 .cmd，需要经 shell 启动；整条命令传字符串（shell 模式下传参数数组会触发 DEP0190）
const SHELL = { stdio: "inherit", shell: true } as const;

async function main() {
  const port = parsePort(process.argv.slice(2));
  if ((await isListening(port, "127.0.0.1")) || (await isListening(port, "::1"))) {
    throw new Error(`端口 ${port} 已被占用（可能是之前的 dev / preview 进程未退出），请先结束该进程或用 --port 换一个端口`);
  }

  await ensureDevVars(port);

  // CI=true：跳过 wrangler 应用迁移前的确认提问
  const migrate = spawnSync("npm run db:migrate:local --silent", { ...SHELL, env: { ...process.env, CI: "true" } });
  if (migrate.status !== 0) throw new Error("本地 D1 迁移失败");

  const username = readFileSync(DEV_VARS, "utf8").match(/^ADMIN_USERNAME=(.*)$/m)?.[1].trim();
  console.log(`后台登录：http://localhost:${port}/admin（账号 ${username}）`);
  const dev = spawn(`npx astro dev --port ${port}`, SHELL);
  dev.on("exit", (code) => process.exit(code ?? 0));
}

if (import.meta.main) {
  main().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
