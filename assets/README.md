# Aircraft authoring assets

本目录说明本地制作流程。公开 Git 仓库保留建模脚本与 `public/assets/` 运行素材；下述 `source/` 和 `reference_resources/` 制作原件保留在本机，不随 Pages 发布上传，普通游戏构建不依赖它们。

`source/` 保存十种机体（五位机娘、四类敌机和 Boss）的高精度 Blender 源文件、程序化材质源贴图和优化报告。`.blend` 已打包贴图，网格可直接编辑；造型和材质也可通过脚本重新生成。原始概念图保持在 `reference_resources/`。

| 机体 | 近景三角面 | 战斗三角面 |
| --- | ---: | ---: |
| 青鸾 | 52,824 | 19,994 |
| 明璃 | 56,408 | 19,993 |
| 苍穹 | 54,940 | 20,056 |
| 星隼 | 52,000 | 20,048 |
| 霜翼 | 83,736 | 20,012 |
| 轻型编队机 | 6,792 | 6,016 |
| 高速截击机 | 8,568 | 6,050 |
| 重装攻击机 | 8,760 | 6,030 |
| 侦察支援机 | 6,100 | 5,994 |
| 长夜 | 13,984 | 13,984 |
| 棱镜 | 11,464 | 11,464 |
| 天幕 | 14,360 | 14,360 |

## 重建

需要 Blender 5.2 LTS、Python 3.10+、Pillow，以及项目 npm 依赖。游戏运行和普通前端构建不需要安装 Blender 或 Python。

```powershell
# 默认读取项目内便携版；也可指定自己的 Blender：
$env:BLENDER_PATH = 'C:\path\to\blender.exe'
python -m pip install Pillow
npm run assets
# 只重建明璃、苍穹、星隼、霜翼：
npm run assets:roster
```

流程：`author-textures.py` 生成颜色、切线空间法线及打包 ORM → `author-models.py` 制作原有六种机体、`author-roster.py` 制作其余四位机娘 → 保存源文件、保留 UV 与命名炮口/喷口、生成两个 LOD → `optimize-models.mjs` 进行 dedup/weld/prune 和颜色贴图 JPEG 压缩。法线及 ORM 保持无损；优化注册材质扩展并保留叶节点，防止丢失透明涂层和炮口锚点。优化报告记录最后一次构建的批次。Blender 脚本报错会使构建失败。

所有模型以 X 向右、Y 向上、-Z 向前的约定交付。`src/game/model-manifest.json` 由建模脚本导出，模拟与渲染共用炮口、喷口和缩放数据。浏览器验收逐个比较 GLB 内实际锚点与清单坐标。

开发服务器运行时打开 `/?preview&model=qingluan` 查看近景模型；model 可取 `drone`、`interceptor`、`heavy`、`support`、`boss`。预览可切换近景、俯视、侧视、前视及战场光照，只存在于开发构建。

## 五机机库

标题页的「战机机库」进入 `/?hangar&model=akari`。机库包含青鸾与其余四位机娘，开发和生产构建均可使用。支持拖动旋转、滚轮缩放、近景/俯视/侧视/后视、展示/战场光照、两个 LOD 和概念三视图对照。数字 1—5 切换机体。

| ID | 独立构型与设计识别点 | 源文件 |
| --- | --- | --- |
| `akari` | 明璃：单发、单垂尾、大翼；漆白、朱红、深蓝，内凹进气道与翼尖导轨 | `source/akari.blend` |
| `haneul` | 苍穹：双发、双斜垂尾、梯形翼；午夜蓝、银灰，共形青蓝传感器窗 | `source/haneul.blend` |
| `astra` | 星隼：单个大型喷口、低矮双斜垂尾、折角翼；石墨灰、钴蓝，DSI 鼓包与光电窗 | `source/astra.blend` |
| `snega` | 霜翼：宽体融合、分离发动机舱、双矢量喷口；霜白、钢蓝，喷口运动环与作动连杆 | `source/snega.blend` |

五架均可点击「确认出战」，以独立主炮、E/Q 技能、机动和台词体验现有关卡。机库按需加载并在切换后释放旧模型 GPU 资源；战斗启动仅加载所选机体和五种敌机，在标题页换机时缓存已加载的战斗 LOD，以便重用，缓存数量受五架上限约束。四张角色海报由 `scripts/prepare-pilot-portraits.mjs` 转换为运行用 WebP。

`npm run test:hangar` 验证 UV/PBR、实际炮口与喷口锚点、两种 LOD、概念图、键盘、快速连续切换、资源回收、加载失败重试与不同分辨率，截图和报告位于 `artifacts/hangar/`。

## 战役资产

`npm run assets:campaign` 调用 `scripts/author-campaign.py`，重做四类敌机、三个 Boss、两类补给舱、三类建筑、三类植被和三类军事设施，共 18 类资产。源文件保存为 `source/<id>.blend`，GLB 与高精度版本位于 `public/assets/models/`。建筑战斗 LOD 约 3500 三角面，树木 364–828，道具 576–864；小型资产两种导出可以相同。以 `artifacts/campaign/assets.json` 为准确统计。

Boss 的 `part_0`、`part_1` 为炮组，`part_2`、`part_3` 为引擎、雷达或护盾发生器。合并按材质及部件分别进行，保留可隐藏的独立父节点；炮口与喷口作为命名空节点导出。优化保留叶节点和 UV 属性，避免无贴图材质的 UV 被清理。运行 `node scripts/validate-campaign-assets.mjs` 验证 36 个 LOD 文件的 UV、法线、锚点坐标与部件层级。

运行时加载选定关卡环境和 Boss；场景模块以实例化批次绘制，切换关卡释放旧环境拥有的纹理、几何体和实例缓冲，公共 GLB 模板保留在有界缓存中。开发预览也支持 `model=power`、`repair`、`prism`、`canopy`、`building-residential`、`tree-broadleaf` 等清单 ID。
