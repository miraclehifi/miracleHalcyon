import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { badgeStatus, StatusBadge, type BadgeStatus } from "../../../src/components/ui/StatusBadge";

// StatusBadge（components.md"基础组件"，design-tokens"文章状态配色"）
afterEach(cleanup);

function look(status: BadgeStatus) {
  const { container } = render(<StatusBadge status={status} />);
  const badge = container.firstElementChild as HTMLElement;
  return { text: badge.textContent, classes: [...badge.classList].filter((c) => /^(bg|text)-/.test(c)).sort() };
}

describe("StatusBadge", () => {
  it("三种状态的文案与配色；badgeStatus 由发布状态与未发布修改推导", () => {
    expect({
      draft: look("draft"),
      published: look("published"),
      modified: look("modified"),
      derived: [badgeStatus("draft", false), badgeStatus("published", false), badgeStatus("published", true)],
    }).toEqual({
      draft: { text: "草稿", classes: ["bg-surface-sunken", "text-caption", "text-ink-muted"] },
      published: { text: "已发布", classes: ["bg-ok-soft", "text-caption", "text-ok"] },
      modified: { text: "已发布 · 有未发布修改", classes: ["bg-warn-soft", "text-caption", "text-warn"] },
      derived: ["draft", "published", "modified"],
    });
  });
});
