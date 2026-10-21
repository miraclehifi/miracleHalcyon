// 首页与读者端外链配置（reader-home.md"内容来源"）。占位内容，真实文案由作者提供；改完推送即重建
import { normalizeSiteConfig, type SiteConfigInput } from "../lib/reader/site-config";

const input: SiteConfigInput = {
  name: "Halcyon",
  avatar: "/avatar.png",
  bio: [
    "前端开发者，住在海边的城市。白天写界面，晚上写字。",
    "这个站点记录我在做的东西：技术笔记、读过的书、看过的电影，还有偶尔拍的照片。文章都是在线写的——这本身就是这个博客的第一个项目。",
    "我关心阅读体验：字体、留白、图片怎么排。如果你也喜欢这些，欢迎写信给我。",
  ],
  footerTagline: "写字，写代码，慢慢来。",
  github: "https://github.com/example",
  photo: "",
  email: "me@example.com",
  afilmory: {
    site: "https://miraclehalcyon.afilmory.art",
    storage: "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/",
  },
};

export const site = normalizeSiteConfig(input);
