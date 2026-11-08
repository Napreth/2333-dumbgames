# 第三方授权说明

以下组件用于网站和游戏。它们各自适用上游许可证。

| 组件 | 用途 | 许可证 |
| --- | --- | --- |
| Vue 及其运行时子包 | 页面与游戏界面 | [MIT](https://github.com/vuejs/core/blob/main/LICENSE) |
| Vue Router | BilibiliToy 版 Hash 路由 | [MIT](https://github.com/vuejs/router/blob/main/LICENSE) |
| Three.js | 数字门的 3D 渲染 | [MIT](https://github.com/mrdoob/three.js/blob/r180/LICENSE) |

Web 和 Toy 构建目录各自包含 `THIRD_PARTY_NOTICES.txt`，其中记录该次构建实际打包的依赖版本、版权声明及许可文本。分发构建产物时，请一并保留该文件及相关许可声明。开发和构建工具的许可证随各自的软件包提供。

BilibiliToy 版的可选平台功能可以使用宿主提供的 Toy SDK，或在启用相关配置时从哔哩哔哩加载。SDK 由平台提供，使用条件见 [BilibiliToy SDK 文档](https://www.bilibili.com/toy/publish/sdk)。
