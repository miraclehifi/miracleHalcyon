// 条目变化钩子（shelf domain-model §3，ADR-012 §5）：路由层适配为 Deploy Hook 触发读者页重建
export interface ShelfHooks {
  onShelfChanged(): Promise<void>;
}

export const noopShelfHooks: ShelfHooks = {
  async onShelfChanged() {},
};
