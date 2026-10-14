// useAutosave：把自动保存控制器接到 React（状态机见 controller.ts）
// 内容通过 getContent 回调在保存时读取，因此调用方每次编辑只需调用 edit()；edit / flush / disable / enable 引用稳定
// 控制器在第一次 edit / flush 时创建（而不是在 effect 里）：水合后、effect 运行前的输入也不会丢
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DraftInput } from "../../domains/post/content";
import type { PostView } from "../../domains/post/service";
import { createAutosaveController, type AutosaveController, type AutosaveState, type SaveError } from "./controller";
import { createLocalDraftStash } from "./local-draft";

export interface UseAutosaveOptions {
  postId: string | null;
  getContent(): DraftInput;
  onCreated?(id: string): void;
  onSaved?(post: PostView): void;
  onError?(error: SaveError): void;
}

export interface UseAutosaveResult extends AutosaveState {
  edit(): void;
  flush(): Promise<boolean>;
  disable(): Promise<void>;
  enable(): void;
  clearStash(): void;
}

export function useAutosave(options: UseAutosaveOptions): UseAutosaveResult {
  const optionsRef = useRef(options);
  const postIdRef = useRef(options.postId); // 新建文章首次保存后记下 id，重建控制器时沿用
  const controllerRef = useRef<AutosaveController | null>(null);
  const [state, setState] = useState<AutosaveState>({ status: "idle", savedAt: null, error: null });

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const controller = useCallback(() => {
    controllerRef.current ??= createAutosaveController({
      postId: postIdRef.current,
      getContent: () => optionsRef.current.getContent(),
      onCreated: (id) => {
        postIdRef.current = id;
        optionsRef.current.onCreated?.(id);
      },
      onSaved: (post) => optionsRef.current.onSaved?.(post),
      onError: (error) => optionsRef.current.onError?.(error),
      onChange: setState,
      stash: createLocalDraftStash(),
    });
    return controllerRef.current;
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    },
    [],
  );

  const edit = useCallback(() => controller().edit(), [controller]);
  const flush = useCallback(() => controller().flush(), [controller]);
  const disable = useCallback(() => controller().disable(), [controller]);
  const enable = useCallback(() => controller().enable(), [controller]);
  const clearStash = useCallback(() => controller().clearStash(), [controller]);

  return { ...state, edit, flush, disable, enable, clearStash };
}
