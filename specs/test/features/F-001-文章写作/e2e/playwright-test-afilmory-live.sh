#!/usr/bin/env bash
# 用法：bash playwright-test-afilmory-live.sh [PLAYWRIGHT_ENV=<base URL>] [HEADLESS=1]
# 默认测本地 preview（http://localhost:4321）；需先以 CLOUDFLARE_ENV=e2e 构建并启动（见 playwright.config.ts webServer）。
# 访问真实的 Afilmory 与 GitHub raw；浏览器为完整版 Chromium（channel "chromium"）
export PLAYWRIGHT_ENV="${PLAYWRIGHT_ENV:-http://localhost:4321}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/playwright-test-afilmory-live.js"
export SHOTS_DIR="${SHOTS_DIR:-$HERE/../validation/screenshots}"
cd "C:/Users/broke/.claude/plugins/cache/ai-sdlc/sdd/1.14.0/skills/playwright-skill" && node run.js "$SCRIPT"
