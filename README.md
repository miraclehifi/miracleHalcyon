# miracleHalcyon

个人技术博客兼作品集：读者端阅读体验优先，作者登录后在线写作。Astro 7 + React 19 + TypeScript，部署在 Cloudflare（Workers + D1 + R2）。

## 开发

```bash
npm install
npm run dev:local          # http://localhost:4321，后台 /admin
```

`dev:local` 依次：补齐 `.dev.vars`（首次提示设置管理员密码，账号默认 `admin`，`SITE_ORIGIN` 跟随端口）→ 检查端口空闲 → 应用本地 D1 迁移 → `astro dev`。换端口：`npm run dev:local -- --port 4400`。只想启动、不做这些检查时用 `npm run dev`。

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

**2. 本地开发**：`npm run dev:local` 自动生成 `.dev.vars`（已 gitignore）；也可复制 `.dev.vars.example` 手动填入三项。

**3. 生产**：逐项写入 Cloudflare Secrets。

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SITE_ORIGIN
```

改密码：重新生成哈希后再次 `wrangler secret put ADMIN_PASSWORD_HASH`。已登录的会话不受影响，最长 7 天后过期。

## 读者页构建数据

读者页（`/`、`/posts`、`/posts/:slug`、`/tags/:tag`）在构建时预渲染，数据由构建变量决定（ADR-007）：

| 变量 | 说明 |
|------|------|
| `READER_API_ORIGIN` | 生产构建必填：站点自身域名（如 `https://halcyon.example.com`），构建时读取公开接口 `GET /api/posts[/:slug]` |
| `READER_FIXTURE` | 改用 `tests/fixtures/reader/{名}.json` 夹具（E2E 用 `reader-fixture`）；本地 `npm run dev` 未配置时默认用它 |
| `READER_BOOTSTRAP` | 设为 `1` 时，接口取不到数据也以 0 篇文章构建。只用于首次部署（线上还没有接口），站点上线后删除 |

取数失败时构建失败，线上保持上一版。

**发布后自动重建**：在 Workers Builds 为生产分支创建 Deploy Hook，把它的地址写入 Worker Secret（发布 / 发布更新 / 撤回 / 删除已发布文章后，后台会 POST 这个地址；失败只记日志，可在控制台手动重建）：

```bash
npx wrangler secret put DEPLOY_HOOK_URL
```

**首次部署**：线上还没有接口时，构建变量设 `READER_BOOTSTRAP=1` 与 `READER_API_ORIGIN`；站点上线后删除 `READER_BOOTSTRAP`。部署前先执行待执行的 D1 迁移（[ddl-changes](specs/deploy/ddl-changes.md)）。

## 文档

需求、设计与任务在 [specs/](specs/_index.md)，开发流程见 [CLAUDE.md](CLAUDE.md)。
