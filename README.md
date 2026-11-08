# 2333沙雕小游戏

> [!WARNING]
> **许可证与使用限制**
>
> 本项目中由作者有权授权的代码、美术资源、音效和文档等采用 [CC BY-NC-SA 4.0 国际许可协议](LICENSE)。
>
> 「2333沙雕小游戏」的品牌标识，包括名称作为品牌标识的使用、Logo、图形标识及其他识别项目来源的品牌元素，均排除在授权范围之外。本许可不授权以可能混淆来源、暗示官方关联或认可的方式使用这些标识。依法合理提及项目名称或履行署名义务不受此声明限制。
>
> 1. 允许非商业使用、修改和分发。分发时须按许可保留署名及许可声明，并注明所作修改。
> 2. 商业使用须另行取得权利人授权。
> 3. 分享修改版时，须继续采用相同的许可条件。该许可不要求公开或提供修改后的源代码。
> 4. 该许可不授予任何可能涉及的软件专利权。 [官方许可条款](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.zh-hans)
> 5. CC BY-NC-SA 4.0 并非专门针对软件设计，与部分软件许可证可能存在兼容性问题。使用或组合第三方代码时，应遵守各自的版权声明、许可通知和分发条件。涉及 GPL 等 Copyleft 许可证时，应特别核实相关条款是否允许组合及再分发。 [Creative Commons 关于软件许可的说明](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software)
> 6. 授权仅涵盖项目作者有权授权的内容。项目使用的第三方组件、依赖和素材各自适用其原有许可证。 [第三方授权说明](THIRD_PARTY_NOTICES.md)

2333沙雕小游戏致力于将广告中常见的小游戏复现出来，让大家能免费、无广告地游玩。

本项目只参考玩法，游戏代码和美术资源均为独立制作，与所参考的广告、游戏及其开发者没有官方关联。

## 当前游戏

[《数字门（测试版）》](docs/number-gates.md)是一款结合四则运算和军团战的 3D 跑酷游戏。玩家带领一支小队，在跑道上穿过数字门，迎战沿途的敌军。一扇乘法门能让小队迅速壮大，一次选错也可能让队伍在下一场战斗中全灭。

## 本地开发

需要 Node.js 22.12+（22.x）或 24+，以及 pnpm 10。项目锁定了 pnpm 和依赖版本。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm dev` 启动带热更新的 Hash 版。用 `pnpm build` 同时生成 `dist/web` 和 `dist/toy`，也可以分别运行 `pnpm build:web` 和 `pnpm build:toy`。端到端测试使用构建产物验证两种入口。

## 部署

### Cloudflare Workers Static Assets

```sh
pnpm build:web
pnpm exec wrangler dev
```

本地可访问 `/` 和 `/games/number-gates/`。Web 构建从游戏注册表生成独立 HTML，所有静态文件位于 `dist/web`。Wrangler 对已存在的目录入口使用尾斜杠，对未知路径返回 404。

发布时先运行 `pnpm exec wrangler login`，再运行 `pnpm deploy:web`。在 Cloudflare 后台的 Workers & Pages 选择 `2333-game`，进入 Settings → Domains & Routes → Add → Custom Domain，绑定同一账户下的 `2333game.top`。 [静态资源配置](https://developers.cloudflare.com/workers/static-assets/binding/) · [自定义域名](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

也可以将 `dist/web` 放在 Nginx 站点根目录，启用 `index index.html;`、`mime.types` 和 `error_page 404 /404.html;`。目录按实际文件提供服务。

### BilibiliToy

运行 `pnpm build:toy`，上传 `dist/toy` 的内容或打成 ZIP，确保包根目录有 `index.html`。该版本使用相对资源路径和 `#/game/<id>` 路由，可放在 Toy 页面目录或静态站点子目录。用 `pnpm preview` 可在本地预览 Toy 产物。 [官方发布指南](https://www.bilibili.com/toy/publish/guide) · [官方打包清单](https://github.com/bilibili/toy/blob/main/skills/toy/references/content-checklist.md)

## 添加游戏

在 `src/games/<id>/` 添加 `index.ts`、游戏组件和封面。注册表按目录路径排序，自动发现各游戏的 `index.ts`。元数据会随大厅加载，游戏组件及其规则由 `load` 在进入游戏时加载。

```ts
// src/games/example/index.ts
import type { GameDefinition } from '../../core/game/types'
import cover from './cover.png'

export default {
  id: 'example',
  name: '示例游戏',
  category: '益智',
  cover,
  load: () => import('./Game.vue'),
} satisfies GameDefinition
```

```vue
<!-- src/games/example/Game.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const score = ref(0)
</script>

<template>
  <button type="button" @click="score++">得分 {{ score }}</button>
</template>
```

站点页眉显示注册名称，页眉下的布局、难度和本局状态由游戏组件定义。离开页面时，站点会卸载游戏组件。游戏可用 Vue 的 `onBeforeUnmount` 清理外部监听器、计时器、动画帧和引擎实例。

`PlatformCapabilities` 提供可选的游戏成绩榜服务，可通过 `platformKey` 注入。宿主检测和 SDK 调用位于适配层。

站点、游戏模块和平台适配层的职责见[项目架构](docs/architecture.md)。
