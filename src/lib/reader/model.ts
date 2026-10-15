// 构建期视图模型：标签分组与"标签 → 地址"映射按同一份数据只算一次，各页面共享
import { groupTags, tagSlugMap } from "./tags";
import type { ReaderData, ReaderPost, TagGroup } from "./types";

export interface ReaderModel {
  posts: ReaderPost[];
  groups: TagGroup[];
  slugOf: (tag: string) => string;
}

const cache = new WeakMap<ReaderData, ReaderModel>();

export function readerModel(data: ReaderData): ReaderModel {
  let model = cache.get(data);
  if (!model) {
    const groups = groupTags(data.posts);
    model = { posts: data.posts, groups, slugOf: tagSlugMap(groups) };
    cache.set(data, model);
  }
  return model;
}
