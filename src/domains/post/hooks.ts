// 发布状态变化钩子（post domain-model §4）：F-002 实现为触发读者页重建（Deploy Hook），F-001 内为空实现
export interface PublicationChange {
  kind: "published" | "updated" | "unpublished" | "deleted";
  slug: string;
  prevSlug?: string; // 发布更新改了 slug 时为旧 slug
}

export interface PublicationHooks {
  onPublicationChanged(change: PublicationChange): Promise<void>;
}

export const noopHooks: PublicationHooks = {
  async onPublicationChanged() {},
};
