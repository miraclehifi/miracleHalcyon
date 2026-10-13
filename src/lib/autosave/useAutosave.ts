// useAutosave：把自动保存控制器接到 React（状态机见 controller.ts）
// 内容通过 getContent 回调在保存时读取，因此调用方每次编辑只需调用 edit()；edit / flush 引用稳定
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DraftInput } from "../../domains/post/content";
import type { PostView } from "../../domains/post/service";
import { createAutosaveController, type AutosaveController, type AutosaveState } from "./controller";

export interface UseAutosaveOptions {
  postId: string | null;
  getContent(): DraftInput;
  onCreated?(id: string): void;
  onSaved?(post: PostView): void;
}

export interface UseAutosaveResult extends AutosaveState {
  edit(): void;
  flush(): Promise<boolean>;
}

export function useAutosave(options: UseAutosaveOptions): UseAutosaveResult {
  const optionsRef = useRef(options);
  const controllerRef = useRef<AutosaveController | null>(null);
  const [state, setState] = useState<AutosaveState>({ status: "idle", savedAt: null, error: null });

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const controller = createAutosaveController({
      postId: optionsRef.current.postId,
      getContent: () => optionsRef.current.getContent(),
      onCreated: (id) => optionsRef.current.onCreated?.(id),
      onSaved: (post) => optionsRef.current.onSaved?.(post),
      onChange: setState,
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const edit = useCallback(() => controllerRef.current?.edit(), []);
  const flush = useCallback(() => controllerRef.current?.flush() ?? Promise.resolve(true), []);

  return { ...state, edit, flush };
}
