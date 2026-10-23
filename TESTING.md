# 战斗与机体升级验证记录

当前版本已接入五机出战，最新结果见文末「五机差异化玩法验收」。前面的数字是对应历史构建的独立快照。

日期：2026-10-23。Windows，Node.js 24.18.1，本机 Chrome，Intel Iris Xe，ANGLE / Direct3D 11。

## 自动检查

| 检查 | 结果 |
| --- | --- |
| `npm test` | 22/22 通过；包括航线、边界、闪避延迟和冷却、扫掠碰撞、机翼碰撞代理、旋转炮口、命中事件和顿帧输入保留 |
| `npm run build` | TypeScript 与生产构建通过；引擎主包约 643 KB，存在 Vite 默认 500 KB 提示 |
| `npm run test:browser` | 剧情、键盘移动、E/Q、暂停恢复、设置与最高分持久化、失焦暂停、Boss、胜利、失败和三次重开通过；页面错误为 0 |
| `npm run test:upgrade` | 六种模型的 UV、颜色/法线/粗糙度贴图、清漆材质及实际 GLB 命名炮口锚点通过；E 命中机动中的截击机 |
| 生产冒烟 | 标题进入战斗通过；无页面错误，无开发调试接口 |
| 资源回收 | 三次重开几何体均为 70；三次 Boss 连爆后几何体均为 86、纹理均为 58，没有持续增长 |
| 音效 | 实际输出 RMS 大于 0，并发上限 24，1.3 秒后活动音效归零 |

流程和压力场景使用开发接口设置阶段、充能或生命值；整关规则测试使用脚本瞄准和受击保护。这些检查验证流程，不代表真人完成难度评测。

## 无辅助战斗录像

`artifacts/upgrade/page@8bbce45e5cde79bd14d6888bace39f8c.webm` 是约 65 秒的键盘自动驾驶实战录像。没有修改生命、无敌、伤害、火力等级、关卡时间或敌机状态，未重试；保留正常开局及受击保护。最后一次日志采样在局内 57 秒，击破 47 个目标、剩余三格耐久。采样与说明见 `artifacts/upgrade/natural-combat.json`。

## 1080p 帧时间

1920×1080，每场景独立采样约 2.4 秒，Chrome 无头模式使用本机 Iris Xe 硬件加速。普通战斗、密集命中与 Q 大招分别设置固定压力场景。

| 画质 | 场景 | 中位数 | P95 | 末次 FPS |
| --- | --- | --- | --- | --- |
| 高 | 普通交战 | 16.7 ms | 16.9 ms | 55 |
| 高 | 密集命中 | 16.7 ms | 16.8 ms | 60 |
| 高 | Q 大招 | 16.7 ms | 16.9 ms | 60 |
| 流畅 | 普通交战 | 16.7 ms | 16.8 ms | 59 |
| 流畅 | 密集命中 | 16.7 ms | 16.8 ms | 60 |
| 流畅 | Q 大招 | 16.7 ms | 16.8 ms | 60 |

末次 FPS 为游戏自身采样，帧时间为 requestAnimationFrame 间隔，两者采样窗口不同。短时结果接近 60 FPS，不能推断所有设备和长时间战斗均稳定 60 FPS。完整数据、粒子峰值和图形后端见 `artifacts/upgrade/report.json`。流畅画质关闭阴影并减少烟雾、碎片和像素比，不修改战斗规则。

## 视觉检查

- `artifacts/upgrade/qingluan-close.png`、`qingluan-top.png`、`qingluan-side.png`、`qingluan-field-light.png`：近景、俯视、侧视及实际战场光照。设计基准为 `reference_resources/01_中国_青鸾/02_战机三视图.png`。
- `drone-close.png`、`interceptor-close.png`、`heavy-close.png`、`support-close.png`、`boss-close.png`：五种独立敌机模型。
- `four-archetypes-1366.png` 与 `four-archetypes-1920.png`：两种分辨率的四类机体轮廓和 HUD 检查。
- `missile-metal-shell.png`、`dense-hits.png`、`ultimate-new-model.png`：弹体方向、实体弹壳、命中反馈、大招演出；主要战场和敌弹仍可辨认。
- `artifacts/` 下另有标题、剧情、Boss、胜利、失败与生产构建截图。

模型预览仅在开发模式提供：`http://127.0.0.1:5180/?preview&model=qingluan`，支持拖动、缩放、切换视角和光照。六种可编辑 Blender 源、纹理与优化报告位于 `assets/source/`。

## 复现

```powershell
npm run dev
# 另开终端，依次执行，避免同时运行多个 GPU 测试：
npm test
npm run build
npm run test:browser
npm run test:upgrade
npm run test:record
# 生产构建在另一个终端启动后检查：
npm run preview -- --port 5181 --strictPort
node scripts/smoke-production.mjs
```

## 四架战机与机库验收

同日完成明璃、苍穹、星隼、霜翼的独立模型和生产机库。本轮保持青鸾为唯一可出战角色，未增加其他四位的战斗规则。

- `npm test`：22/22 通过；`npm run build`：通过，机库脚本与样式按路由分包。
- `npm run test:browser`：原有青鸾剧情、E/Q、暂停、胜负、三次重开及设置持久化继续通过，无页面错误。
- `npm run test:hangar`：五架高精度模型均保留 UV、PBR 与清漆材质；实际 GLB 炮口和喷口锚点逐点匹配清单，误差小于 0.001。
- 每架均验证近景/战斗 LOD 切换；四架新机体分别约 5.2–8.4 万与 2 万三角面，准确数量见 `assets/README.md`。
- 截图检查四架的近景、俯视、侧视、后视和战场光照；检查 1920×1080、1366×768 及 390×844。窄屏按长宽比调整取景，保持完整机体可见。
- 概念图弹窗、Esc 关闭、数字键切换、未知 ID 回退通过；机库不安装战斗按键监听。
- 快速连续切换三轮，最终模型身份正确，几何体与纹理数量分别保持 11 / 11。
- 故意令一架模型请求返回 HTTP 503，重试后成功恢复；该预期错误单独记录，其余页面错误为 0。
- `node scripts/smoke-hangar-production.mjs`：正式包内四架可切换，返回标题后可进入青鸾战斗，没有机库或战斗开发调试接口。

完整结果见 `artifacts/hangar/report.json`，同目录保留机体多视角、概念图对照、移动端和生产构建截图。源文件为 `assets/source/akari.blend`、`haneul.blend`、`astra.blend`、`snega.blend`，重建命令为 `npm run assets:roster`。

## 五机差异化玩法验收

日期：2026-10-23。保留同一城市关卡、两阶段 Boss、五格耐久、E 小技能和 Q 充能大招；五架现在均可从标题页或机库确认出战。

| 检查 | 当前结果 |
| --- | --- |
| `npm test` | 39/39 通过，包含五架各自的整关通关模拟 |
| 明璃 | 六枚导弹集中锁定，独立炮口；贯穿航线命中与航线外敌弹保留通过 |
| 苍穹 | 诱饵吸引新一轮瞄准、拦截高速敌弹；七秒干扰对新入场目标生效，减速、延迟开火和增伤通过 |
| 星隼 | 双僚机从对应可见位置发射，限时结束；十二枚协同导弹分配目标，六秒标记增伤通过 |
| 霜翼 | 根据当前输入冲刺、边界限制与有限免伤；一帧扫过多个目标的贯穿顺序、同一目标不重复受伤、五发有限连射通过 |
| 存档 | 旧存档兼容，所选角色与各机体最高分分别保存；错误角色 ID 和异常分数回退通过 |
| `npm run test:pilots` | 五架的模型、HUD、E/Q、角色海报、技能特写、暂停、胜负、同角色重开、最高分与选择持久化通过；页面错误为 0 |
| 三轮连续换机与技能 | 每轮遍历五架并释放 E/Q，几何体均为 106、纹理均为 67，特效、拖尾与粒子回落至 0 |
| `npm run test:browser` | 原有青鸾剧情、技能、Boss、胜负、三次重开、设置持久化与失焦暂停继续通过；页面错误为 0 |
| `npm run build` | TypeScript 和生产构建通过，保留 Vite 默认主包体积提示 |
| `node scripts/smoke-pilots-production.mjs` | 五架正式包出战、机库确认出战、对应 HUD、切换后刷新保持角色与返回标题通过；没有开发调试接口或页面错误 |

截图保存在 `artifacts/pilots/`，覆盖 1366×768 的各角色 E/Q、剧情、失败与标题，以及 1920×1080 的各角色生产战斗。机库构型、角色海报、大招渐隐边缘和 HUD 均已查看。实际战斗使用各自 GLB 的战斗 LOD，模拟和渲染共用模型缩放、倾斜和炮口锚点。

明璃另录制约 65 秒墙钟时间的键盘自动驾驶实战，不修改生命、无敌、伤害、等级、关卡时间或敌机状态。没有重试，最终局内时间约 60.1 秒，48 击破、9250 分、五格耐久，末次 FPS 为 60；这只是该场景的末次采样，不作为持续性能保证。录像与逐段记录位于 `artifacts/pilots/natural-akari/`，页面错误为 0。

整关测试使用脚本瞄准和受击保护；浏览器技能与结算使用开发场景设置。真实战斗录像仅发送键盘输入。这些结果验证功能与可完成性，尚未替代真人对五架长期强度和平衡的评价。

```powershell
npm test
npm run test:pilots
# 开发服务器运行时，录制指定角色：
$env:PILOT = 'akari'
$env:OUTPUT_DIR = 'artifacts/pilots/natural-akari'
npm run test:record
# 生产预览在 5181 启动后：
node scripts/smoke-pilots-production.mjs
```
