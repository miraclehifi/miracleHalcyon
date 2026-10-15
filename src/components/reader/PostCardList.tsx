// PostCardList（components.md"列表动效参数"）：读者端文章列表，底层 React Bits AnimatedList（bare）。
// 只借入场动效与选中行：悬停 / 键盘聚焦 / 方向键只改同一个选中行（PostCard/Hover）；服务端先输出完整卡片
import type { CardModel } from "../../lib/reader/types";
import AnimatedList from "../vendor/react-bits/AnimatedList";
import { PostCard } from "./PostCard";

export interface PostCardListProps {
  cards: CardModel[];
}

export function PostCardList({ cards }: PostCardListProps) {
  const items = cards.map((card) => ({ ...card, id: card.slug }));
  return (
    <AnimatedList
      bare
      aria-label="文章"
      items={items}
      renderItem={(card, _index, selected) => <PostCard card={card} active={selected} />}
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

export default PostCardList;
