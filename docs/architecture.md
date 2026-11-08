# 项目架构

独立站使用 MPA，游戏注册表为大厅和每款游戏生成独立 HTML。Toy 使用单入口 SPA、Hash 路由和相对资源路径。两套产物共享页面组件、游戏注册表和异步游戏入口。部署命令见 [README](../README.md#部署)。

## 站点层

每款游戏在 `src/games/<id>/index.ts` 导出一个 [`GameDefinition`](../src/core/game/types.ts)，提供唯一的 `id`、显示名称 `name`、分类 `category`、封面 `cover` 和异步组件入口 `load`。

[`registry.ts`](../src/core/game/registry.ts) 在构建时发现这些入口，按路径排序，并检查游戏 ID 是否重复。大厅用注册信息筛选和展示游戏。游戏页面使用 `/games/<id>/`（Web）或 `#/game/<id>`（Toy）查找注册项，页眉按注册名称显示「站点标题：当前游戏名」。点击站点 Logo 可返回大厅。新增游戏的注册项、组件和资源放在自己的目录中。

[`GamePlayer.vue`](../src/app/components/GamePlayer.vue) 在进入游戏时调用 `load`，然后挂载游戏组件。站点处理游戏不存在、加载中和加载失败的提示。离开或切换游戏时，Vue 卸载旧组件。加载在离开后才完成时，旧组件也不会被挂载。

## 游戏模块

每个游戏决定页眉下的布局、输入方式、规则和本局状态。难度、关卡、暂停、重开、计分、胜负和结算按玩法需要实现，选项和数据格式也由游戏定义。按钮、图标等通用界面组件可以复用，游戏行为留在游戏模块内。

以[《数字门》](number-gates.md)为例，`Game.vue` 管理本局循环和 HUD，`simulation/` 实现规则，`rendering/` 用 Three.js 绘制游戏画面。Three.js 随游戏入口异步加载。

游戏通过 Vue 的卸载钩子清理自己创建的全局事件监听、计时器、动画帧和引擎实例。异步操作完成后，游戏应确认结果仍属于当前局，再更新界面。

## 平台适配层

[`PlatformCapabilities`](../src/core/platform/types.ts) 定义可选的宿主服务，游戏通过 `platformKey` 获取。当前服务是成绩榜，按游戏 ID 和游戏自定义的榜单键查询。游戏决定榜单的含义、显示时机和提交内容。

[`core/platform/bilibili`](../src/core/platform/bilibili) 负责 Toy SDK 的能力检查、调用、榜位映射和错误识别。配置了榜位时，应用异步检测 SDK，读榜成功后才向游戏返回该榜的服务。默认配置为空。游戏仅在服务可用时显示榜单入口，游玩、结算和重开独立于榜单请求。
