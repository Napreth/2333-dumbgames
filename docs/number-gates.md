# 数字门

在封面按键或点击开始，队伍随后自动奔跑。用方向键、A/D、鼠标或触屏拖动调整队伍位置。队伍中心穿过门面时触发该侧运算，中心线归右门。每组门只生效一次。战斗按累计通过的门组数安排，每第五场为大型军团战。双方以等效战力一比一抵消，剩余军队继续奔跑，战力归零即结束。

## 游戏代码

- [`config.ts`](../src/games/number-gates/config.ts) 定义战斗间隔、运算概率、比例系数、倍率、速度及渲染预算。
- [`simulation/economy.ts`](../src/games/number-gates/simulation/economy.ts) 调度军团战，抽取门的运算符和倍率，并用 BigInt 定点运算计算加减操作数与敌军战力。
- [`simulation/track.ts`](../src/games/number-gates/simulation/track.ts) 开局发布两组各以敌军结尾的路线，每次战斗胜利后追加更远的一组。下一组沿用原有门值、敌军战力和世界坐标。只有堵死最佳路线的门对需要重抽，最多重试 64 次，再用加法保留可达侧。
- [`simulation/routes.ts`](../src/games/number-gates/simulation/routes.ts) 检查横移时间，为每个可达侧保留最大战力。敌军是固定减法事件。若玩家先前的选择已使锁定的下一组无解，后方地图按之前验证过的路线延伸。
- [`rendering/`](../src/games/number-gates/rendering) 管理 Three.js 场景、对象池和程序动画。士兵按八进制展开并按模型零件批量绘制，超出显示预算的单位汇总在战力旁。道路和门组在局部坐标中循环复用。
- [`Game.vue`](../src/games/number-gates/Game.vue) 封面复用场景资源，以独立镜头渲染展示队伍。正式对局在开始操作后创建，并按固定步长推进模拟。页面隐藏时停止帧循环，离开游戏时释放 WebGL、输入监听和音频。

天空、道路、地表、护甲、阴影和粒子贴图由 [`assets/textures.ts`](../src/games/number-gates/assets/textures.ts) 生成。士兵模型由 [`assets/characters.ts`](../src/games/number-gates/assets/characters.ts) 生成，动作由渲染器驱动。音效由 [`assets/audio.ts`](../src/games/number-gates/assets/audio.ts) 合成，经玩家交互后激活。这些素材随游戏代码分发。

## 数值生成

左右门分别抽取运算家族和符号。加减家族占 75%，其中 60% 为加法。乘除家族占 25%，其中 20% 为乘法。乘法倍率的条件权重为 ×2 占 80%、×3 占 12%、×4 占 5%、×5～×20 合计占 3%。

加减操作数以该门前最佳可达战力为基数，常规系数为 3%。每扇门独立抽取 `U`，用 `8^tanh(0.7 × log(U / (1 − U)))` 缩放后取整，至少为 1。加法有 3% 的机会采用稀有分布，系数改为 35%，随机倍率范围改为 1/4～4。

两类敌军都以预测最佳战前战力乘以三角分布抽取的比例，范围为 20%～80%，中心为 50%。敌军战力向下取整且至少为 1，生成后固定。实际损耗比例取决于玩家入场时的战力。

## 平衡模拟

```sh
pnpm balance:number-gates 10000 1000
```

两个参数分别为种子数和单局最多通过的门数。可追加 `optimal`、`strong`、`ordinary` 或 `random` 单独运行一种策略。模拟器复用正式游戏的地图生成、横移、接触判定和战斗规则。JSON 记录已发布的运算与倍率、选中的乘法、加法实得、双负门和军团损耗、战力分位数、死亡原因及重抽次数。采样门后若紧接战斗，记录战后战力。检测到无效路线或遭遇时，命令以失败退出。
