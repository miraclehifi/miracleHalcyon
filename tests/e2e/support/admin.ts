import { expect, type Page } from "@playwright/test";
import { waitForHydration } from "./hydration";

// E2E 测试账号（wrangler.jsonc env.e2e，仅本地）
export const USERNAME = "test-admin";
export const PASSWORD = "Test-Passw0rd!";

export async function login(page: Page) {
  await page.goto("/admin/login");
  await waitForHydration(page);
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export interface DraftFields {
  title: string;
  slug?: string;
  body?: string;
}

// 经接口造数据：写操作需带同源 Origin（middleware 校验）
export function adminApi(page: Page, baseURL: string) {
  const headers = { Origin: new URL(baseURL).origin };
  const draft = ({ title, slug = "", body = "" }: DraftFields) => ({ title, slug, tags: [], summary: "", body, publishedAt: null });
  return {
    async create(fields: DraftFields): Promise<string> {
      const response = await page.request.post("/api/admin/posts", { headers, data: draft(fields) });
      expect(response.status()).toBe(201);
      return ((await response.json()) as { id: string }).id;
    },
    async save(id: string, fields: DraftFields) {
      expect((await page.request.put(`/api/admin/posts/${id}`, { headers, data: draft(fields) })).status()).toBe(200);
    },
    async publish(id: string) {
      expect((await page.request.post(`/api/admin/posts/${id}/publish`, { headers })).status()).toBe(200);
    },
  };
}
