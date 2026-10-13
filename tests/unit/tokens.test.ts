import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// define-design-token-styles：design-tokens.md"颜色"（含图片浮层）"其他"表 ↔ src/styles/tokens.css
const doc = readFileSync("specs/ui/design-tokens.md", "utf8").replace(/\r\n/g, "\n");
const css = readFileSync("src/styles/tokens.css", "utf8");

type Theme = "light" | "dark";
type Expected = Record<string, Record<Theme, string>>;

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  const end = markdown.indexOf("\n## ", start + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}

// 表格行：首列是反引号令牌名（多个令牌以 / 分隔），返回各列原文
function tokenRows(markdown: string): string[][] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

// "`#FFFFFF` 4%" → "rgb(255 255 255 / 4%)"；"`#8B6238`" → "#8b6238"；"8px" → "8px"
function normalize(value: string): string {
  const color = value.match(/`?(#[0-9A-Fa-f]{6})`?(?:\s+(\d+)%)?/);
  if (!color) return value.replace(/`/g, "").trim();
  const [, hex, alpha] = color;
  if (!alpha) return hex.toLowerCase();
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${alpha}%)`;
}

function names(cell: string): string[] {
  return cell.split("/").map((name) => name.replace(/`/g, "").trim());
}

function expectedTokens(): Expected {
  const expected: Expected = {};
  const colors = section(doc, "颜色");
  for (const [name, light, dark] of tokenRows(colors).filter((row) => row.length === 4)) {
    const lights = light.split(" / ");
    const darks = dark.split(" / ");
    names(name).forEach((token, i) => (expected[token] = { light: normalize(lights[i]), dark: normalize(darks[i]) }));
  }
  // 图片浮层与"其他"：亮暗取值相同
  const sameInBothThemes = [...tokenRows(colors).filter((row) => row.length === 3), ...tokenRows(section(doc, "其他"))];
  for (const [name, value] of sameInBothThemes) {
    const values = value.split(" / ");
    names(name).forEach((token, i) => {
      const v = normalize(values[i].split("；")[0]);
      expected[token] = { light: v, dark: v };
    });
  }
  return expected;
}

// tokens.css 的 :root 中 `--x: light-dark(A, B)` 或 `--x: V`
function actualTokens(): Expected {
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const actual: Expected = {};
  for (const [, name, value] of root.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    const pair = value.match(/^light-dark\((.+),\s*(.+)\)$/);
    actual[name] = pair ? { light: pair[1].trim(), dark: pair[2].trim() } : { light: value.trim(), dark: value.trim() };
  }
  return actual;
}

describe("设计令牌", () => {
  it("颜色与其他令牌在亮 / 暗主题下的取值与 design-tokens.md 一致", () => {
    const expected = expectedTokens();
    const actual = actualTokens();
    const picked = Object.fromEntries(Object.keys(expected).map((name) => [name, actual[name]]));

    expect({ count: Object.keys(expected).length >= 30, tokens: picked }).toEqual({ count: true, tokens: expected });
  });
});
