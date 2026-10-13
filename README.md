# miracleHalcyon

个人技术博客兼作品集：读者端阅读体验优先，作者登录后在线写作。Astro 7 + React 19 + TypeScript，部署在 Cloudflare（Workers + D1 + R2）。

## 开发

```bash
npm install
npm run db:migrate:local   # 初始化本地 D1
npm run dev                # http://localhost:4321
```

| 命令 | 用途 |
|------|------|
| `npm test` | Vitest（`unit` jsdom + `workers` workerd/D1/R2） |
| `npm run test:e2e` | Playwright（build + `astro preview`） |
| `npm run lint` / `npm run check` | ESLint / astro check |

## 管理员账号

后台只有一个管理员账号，凭据通过 Secrets 配置，不存数据库。

| 名称 | 说明 |
|------|------|
| `ADMIN_USERNAME` | 管理员账号 |
| `ADMIN_PASSWORD_HASH` | 密码哈希，由 `npm run hash-password` 生成 |
| `SITE_ORIGIN` | 站点 Origin，用于校验写请求来源；本地为 `http://localhost:4321` |

缺少任一项时登录接口返回 500；缺少 `SITE_ORIGIN` 时后台所有写操作也会被拒绝。

**1. 生成密码哈希**

```bash
npm run hash-password --silent
# 管理员密码（输入不显示）：
# pbkdf2$100000$...
```

**2. 本地开发**：复制 `.dev.vars.example` 为 `.dev.vars`（已 gitignore），填入三项。

**3. 生产**：逐项写入 Cloudflare Secrets。

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SITE_ORIGIN
```

改密码：重新生成哈希后再次 `wrangler secret put ADMIN_PASSWORD_HASH`。已登录的会话不受影响，最长 7 天后过期。

## 文档

需求、设计与任务在 [specs/](specs/_index.md)，开发流程见 [CLAUDE.md](CLAUDE.md)。
