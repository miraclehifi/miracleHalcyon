# F-006 前端单元测试规格

**最后更新**: 2026-10-16

> 组件隔离层（jsdom，不依赖后端）。端到端交互见 acceptance/。组件名在 design-ui 后以 [components.md](../../../../ui/components.md) 为准。

| UT ID | 对象 | 用例 | 来源 |
|-------|------|------|------|
| UT-01 | `formatBytes` | `0` → `0 MB`；`1` → `1 KB`；`1024` → `1 KB`；`1025` → `2 KB`；`1048575` → `1024 KB`；`1048576` → `1.0 MB`；`6000000` → `5.7 MB`；`26552460` → `25.3 MB` | shared-field-formats"文件体积" |
| UT-02 | 存储页统计组件 | 传入统计 → 三项数字与体积文本、"预计可释放"高亮；`protectedCount > 0` 显示"近 24 小时上传的 N 项不参与清理"，为 0 不显示 | SC-DETECT-01、09 |
| UT-03 | 存储页统计组件 | 未引用合计为 0 → 显示"存储状态良好，无未引用文件"，清理按钮 `disabled` | SC-DETECT-10、SC-CLEANUP-05 |
| UT-04 | 存储页统计组件 | `loading` → 统计区 `aria-busy="true"`、两个按钮禁用；`error` → `role="alert"`"检测失败，请重试"、清理按钮禁用、"重新检测"可用 | SC-DETECT-12、13 |
| UT-05 | 清理确认框文案 | `{images: 2, videos: 1, bytes: 6000000}` → "将清理 2 张图片、1 个实况视频，释放 5.7 MB。清理后无法恢复。"；只有视频时 → "将清理 1 个实况视频，…"；只有图片时 → "将清理 2 张图片，…" | SC-CLEANUP-03 |
| UT-06 | 清理结果提示文案 | `{removedImages: 2, removedVideos: 1, freedBytes: 15000}` → "已清理 3 项，释放 15 KB" | SC-CLEANUP-01 |
| UT-07 | 键盘与可访问性 | 确认框打开时焦点在"取消"；Tab 在框内循环；Esc 关闭后焦点回到"一键清理"；进行中 Esc 不关闭 | SC-CLEANUP-03、04 |
