# ADR-004: 源码区使用原生 textarea

## 状态
Accepted（2026-10-12）

## 背景
US-10 要求格式命令可以被原生 ⌘Z 撤销，并且手机上不能收起键盘。UI 规格中源码区是纯等宽文本，没有语法着色。

## 决策
- 用 `<textarea>` 承载源码。格式命令是纯函数 `(text, selection, command) → { replaceRange, insert, newSelection }`，便于单元测试。
- 写入时先选中替换范围，再执行 `document.execCommand('insertText', false, insert)`。这样改动进入浏览器的原生撤销栈。如果浏览器返回 false，退回 `setRangeText`，此时无法原生撤销。
- 快捷键在 `keydown` 中处理：`e.isComposing` 时跳过；命中时调用 `preventDefault`。
- 同步滚动：渲染结果的块级元素带 `data-line`。用隐藏的镜像元素计算 textarea 各行的像素偏移，在两者之间做线性插值映射。

## 后果
- 正面：几乎零体积；输入法和移动端最稳；撤销行为与系统一致。
- 负面：`execCommand` 已被标记为废弃（主流浏览器仍支持）；同步滚动需要自己实现。
