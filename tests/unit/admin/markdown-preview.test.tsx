import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RenderRequest, RenderResponse } from "../../../src/lib/markdown/worker";

// 替身 Worker：记录收到的渲染请求，由测试逐条回 { seq, html } 或 { seq, error }
const workers: FakeWorker[] = [];

class FakeWorker {
  requests: RenderRequest[] = [];
  private listener: ((event: MessageEvent<RenderResponse>) => void) | null = null;
  constructor() {
    workers.push(this);
  }
  postMessage(request: RenderRequest) {
    this.requests.push(request);
  }
  addEventListener(_type: "message", listener: (event: MessageEvent<RenderResponse>) => void) {
    this.listener = listener;
  }
  terminate() {}
  respond(response: RenderResponse) {
    act(() => this.listener?.({ data: response } as MessageEvent<RenderResponse>));
  }
  get last() {
    return this.requests.at(-1)!;
  }
}

vi.mock("../../../src/lib/markdown/worker.ts?worker", () => ({ default: FakeWorker }));

const { MarkdownPreview } = await import("../../../src/components/admin/editor/MarkdownPreview");

afterEach(() => {
  cleanup();
  workers.length = 0;
});

// [TC-US04-15][SC-PREVIEW-09] 渲染出错：保留上次预览并提示"预览渲染失败，继续编辑会自动重试"；之后的输入照常渲染，成功后提示消失
describe("MarkdownPreview", () => {
  it("渲染出错时保留上次结果并提示，下次渲染成功后恢复", () => {
    const { rerender } = render(<MarkdownPreview title="T" body="a" />);
    const worker = workers[0]!;
    const preview = () => screen.getByTestId("md-preview");
    const alertText = () => screen.queryByRole("alert")?.textContent ?? null;

    worker.respond({ seq: worker.last.seq, html: "" }); // 预热完成，发出排队的 "a"
    worker.respond({ seq: worker.last.seq, html: "<p>a</p>" });
    const afterSuccess = { text: preview().querySelector(".prose")?.textContent, alert: alertText() };

    rerender(<MarkdownPreview title="T" body="b" />);
    worker.respond({ seq: worker.last.seq, error: true });
    const afterError = { text: preview().querySelector(".prose")?.textContent, alert: alertText() };

    rerender(<MarkdownPreview title="T" body="c" />);
    const retried = worker.last.source;
    worker.respond({ seq: worker.last.seq, html: "<p>c</p>" });
    const afterRecovery = { text: preview().querySelector(".prose")?.textContent, alert: alertText() };

    expect({ afterSuccess, afterError, retried, afterRecovery }).toEqual({
      afterSuccess: { text: "a", alert: null },
      afterError: { text: "a", alert: "预览渲染失败，继续编辑会自动重试" },
      retried: "c",
      afterRecovery: { text: "c", alert: null },
    });
  });
});
