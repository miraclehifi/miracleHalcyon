import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

async function openPost(page: Page, baseURL: string, title: string, body: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

const select = (page: Page, start: number, end: number) =>
  page.getByRole("textbox", { name: "正文" }).evaluate((el: HTMLTextAreaElement, [s, e]) => {
    el.focus();
    el.setSelectionRange(s, e);
  }, [start, end] as const);

// [TC-US10-03][SC-TOOLBAR-01][SC-TOOLBAR-06] 点击"加粗"包裹选中文字，焦点与选区留在源码区；Mod+Z 撤销还原
test("[TC-US10-03] 点击加粗后撤销还原", async ({ page, baseURL }, testInfo) => {
  const body = await openPost(page, baseURL!, `T${Date.now().toString(36)}${testInfo.project.name[0]} 工具栏`, "写作是思考");
  await select(page, 3, 5);

  await page.getByRole("button", { name: "加粗" }).click();
  await expect(body).toHaveValue("写作是**思考**");
  expect(
    await body.evaluate((el: HTMLTextAreaElement) => ({
      focused: document.activeElement === el,
      selected: el.value.slice(el.selectionStart, el.selectionEnd),
    })),
  ).toEqual({ focused: true, selected: "思考" });

  await page.keyboard.press("ControlOrMeta+z");
  await expect(body).toHaveValue("写作是思考");
});

// [TC-US10-04][SC-TOOLBAR-04] 6 个快捷键各自生效且 keydown 被 preventDefault；焦点在标题框时不响应
test("[TC-US10-04] 快捷键执行命令并拦截默认行为", async ({ page, baseURL }, testInfo) => {
  const title = `K${Date.now().toString(36)}${testInfo.project.name[0]} 快捷键`;
  const body = await openPost(page, baseURL!, title, "思考");
  await page.evaluate(() => {
    const w = window as unknown as { lastPrevented: boolean | null };
    w.lastPrevented = null;
    window.addEventListener("keydown", (event) => (w.lastPrevented = event.defaultPrevented));
  });
  const cases: [string, string][] = [
    ["ControlOrMeta+b", "**思考**"],
    ["ControlOrMeta+i", "*思考*"],
    ["ControlOrMeta+k", "[思考](url)"],
    ["ControlOrMeta+e", "`思考`"],
    ["ControlOrMeta+Shift+Digit8", "- 思考"],
    ["ControlOrMeta+Shift+Period", "> 思考"],
  ];
  for (const [keys, expected] of cases) {
    await body.fill("思考");
    await select(page, 0, 2);
    await page.keyboard.press(keys);
    await expect(body, keys).toHaveValue(expected);
    expect(await page.evaluate(() => (window as unknown as { lastPrevented: boolean }).lastPrevented), keys).toBe(true);
  }

  await body.fill("思考");
  const titleBox = page.getByRole("textbox", { name: "标题" });
  await titleBox.focus();
  await page.keyboard.press("ControlOrMeta+b");
  await expect(titleBox).toHaveValue(title);
  await expect(body).toHaveValue("思考");
});

// [TC-US10-05][SC-TOOLBAR-05] 输入法组字期间（isComposing）的快捷键不执行、不拦截
test("[TC-US10-05] 组字期间快捷键不触发", async ({ page, baseURL }, testInfo) => {
  const body = await openPost(page, baseURL!, `C${Date.now().toString(36)}${testInfo.project.name[0]} 组字`, "思考");
  await select(page, 0, 2);
  const prevented = await body.evaluate((el: HTMLTextAreaElement) => {
    const isMac = /mac/i.test(navigator.platform);
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    const event = new KeyboardEvent("keydown", { key: "b", code: "KeyB", metaKey: isMac, ctrlKey: !isMac, isComposing: true, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await expect(body).toHaveValue("思考");
});
