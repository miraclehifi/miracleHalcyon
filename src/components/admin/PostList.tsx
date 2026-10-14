// PostList（components.md"列表动效参数"，admin-post-list.md"入场与选中"）：后台文章列表，底层为 React Bits AnimatedList（bare）。
// 只借动效与交互：卡片逐行弹入（错开 50ms，减弱动效时只渐显）；悬停 / 键盘聚焦 / 方向键都只改同一个选中行（PostCard/Hover）。
// 外层用筛选条件 + 页码作 key，筛选、搜索、翻页后整页重新入场
import type { PostListItem as PostListItemData } from "../../domains/post/service";
import AnimatedList from "../vendor/react-bits/AnimatedList";
import { PostListItem } from "./PostListItem";

export interface PostListProps {
  posts: PostListItemData[];
  now?: Date;
  timeZone?: string;
}

export function PostList({ posts, now, timeZone }: PostListProps) {
  return (
    <AnimatedList
      bare
      aria-label="文章"
      items={posts}
      renderItem={(post, _index, selected) => <PostListItem post={post} active={selected} now={now} timeZone={timeZone} />}
      initialSelectedIndex={-1}
      selectOnHover
      enableArrowNavigation
      loop={false}
      animation="pop"
      animateOnce
      stagger={0.05}
      frame={false}
      showGradients={false}
      displayScrollbar={false}
      maxHeight="none"
      width="100%"
      gap={20}
      radius={12}
    />
  );
}
