#!/usr/bin/env bash
# 用法：bash playwright-test-post-list-ui.sh [PLAYWRIGHT_ENV=<base URL>] [HEADLESS=1]
# 默认测本地 preview（http://localhost:4321）；需先以 CLOUDFLARE_ENV=e2e 构建并启动（见 playwright.config.ts webServer）
export PLAYWRIGHT_ENV="${PLAYWRIGHT_ENV:-http://localhost:4321}"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/playwright-test-post-list-ui.js"
cd "C:/Users/broke/.claude/plugins/cache/ai-sdlc/sdd/1.14.0/skills/playwright-skill" && node run.js "$SCRIPT"
