# MusePilot UX V1.7

日期：2026 年 10 月 16 日  
依据：[MusePilot PRD V1.7](MusePilot_PRD_V1.7.md)  
状态：供下一轮原型同步；现有 HTML 与 SwiftUI 仍展示 V1.6 交互

## 1 体验目标

用户先看到想拍的示例，选择一个拍法，然后在相机中得到简短帮助。界面用真实图片说明效果，用文字说明动作，不要求用户先学习 Shot Plan、权重或识别状态等内部概念。

产品界面继续使用英语。三个 Tab 保持 Home、Session、Style；相机全屏打开，Settings 从右上角进入。新能力使用现有导航与设计系统承载。

## 2 主流程

```text
Home 样片卡片
  → Try this shot
  → 首次相机说明与系统授权
  → Camera 当前拍法 + 一句提示 + 可用的手动快门
  → 快门或用户选择的 3 秒定时
  → Result 显示 Not saved yet
  → Save to Photos / Favorite & save
  → 必要时说明并请求系统保存权限
  → 保存成功
  → Done → Session
```

用户可从 Style 的拍法收藏、Session 的 Use this shot again，进入同一相机流程。拒绝相机权限后仍能浏览样片和拍法；拒绝保存权限后仍保留当前进程内的预览与重试入口。

## 3 Home

### 3.1 页面顺序

1. 导航栏：MusePilot 与 Settings。
2. 标题：Find a shot you like.；说明：We'll help you take it.
3. 紧凑角色选择：I'm in Frame / I'm Shooting；旁边可读地显示当前默认镜头。
4. 场景横向筛选：All、Cafe、Outfit、Travel、Dating、Professional。
5. Look 筛选：All、Natural、Editorial、Candid。
6. 精选拍法卡片列表；有历史时增加紧凑的 Recently used 区块。

主列表优先呈现大图与清楚的取景，不叠加宣传横幅。新用户首屏至少看到一个完整免费拍法及其 Try this shot 操作。筛选栏可以横滑，明确露出下一项边缘，避免误以为只有前三个场景。

### 3.2 拍法卡片

```text
示例图                         Save pose 书签
Cafe · Natural · Half-body
A quiet café moment
Rest one hand near your face.
[ Try this shot ]              [ Details ]
```

点击图片或 Details 打开完整拍法；Try this shot 直接使用当前角色与镜头偏好进入相机，不再要求确认四块计划。Pro 项在图上及操作旁显示 Pro。高级卡片的主操作为 Unlock to try，不把“先能用，点完才锁”的假象带给用户。

书签按钮使用 Save pose / Remove saved pose，可收藏高级拍法但保留 Pro 标记。取消收藏不影响任何已保存照片。样片使用 Example photo 标签，避免与用户自己的照片混淆。

### 3.3 页面状态

| 状态 | 呈现与恢复 |
| --- | --- |
| 初始加载 | 卡片占位，内容加载后替换，不先展示不匹配图片 |
| 无筛选结果 | No shots match these filters.；Clear filters |
| 内容缺失 | 隐藏缺失组合；局部错误提供 Retry，不让整页不可用 |
| 离线 | 内置内容正常使用；只有需要联网的动作提示网络状态 |
| 收藏写入失败 | 显示 Couldn't save this shot. Try again.；不显示成功书签 |

## 4 拍法详情

以半屏或可扩展面板呈现，内容为样片、名称、当前角色、Person、Phone、Avoid。底部固定 Try this shot，Pro 项显示解锁操作。

Phone 使用 Eye level、Medium distance、Portrait 等词，并配易懂的示意。界面不把计划中的建议机位写成已检测结论。示例动作较多时默认展示第一条，支持展开；不会在进入相机前要求用户读完。

详情页的角色切换只改变提示对象。镜头是独立控件，用 Front camera / Rear camera 明确表达。返回时保留列表筛选与滚动位置。

## 5 Camera

### 5.1 布局

| 区域 | 主要元素 |
| --- | --- |
| 顶部安全区 | Close、当前角色、Flip camera、More |
| 画面上部 | 可收起参考小图；Example / Reference pose 标签 |
| 画面主体 | 干净的取景画面，按需出现构图辅助 |
| 下部画面 | 一句当前提示、Pause / Resume、Next tip |
| 底部操作区 | 拍法入口、手动快门、最近结果入口或稳定占位 |
| More 面板 | Voice、Reference pose、Timer、Mirror 等次级操作 |

相机中不显示 Tab 栏。小图不能覆盖主体脸部与核心取景区域；可在预定义角落停靠，移动时不能挡住快门。关闭小图后有 Reference 按钮重新打开。

### 5.2 两种角色与镜头

| 设置组合 | 指令示例 |
| --- | --- |
| I'm in Frame + Front | Relax your shoulders. |
| I'm in Frame + Rear | Turn slightly toward the window. |
| I'm Shooting + Rear | Keep their shoulders in frame. |
| I'm Shooting + Front | Ask them to relax their shoulders. |

角色决定谁执行动作，镜头决定画面与坐标。切角色时不自动翻转镜头。切镜头后保留角色并短暂显示 Rear camera / Front camera，重建参考和方向转换。暂停中完成这些操作后仍显示 Paused。

带方向的提示优先与画面箭头配对；镜像配置、方向变化后不保留旧箭头。前置自拍与后置三脚架均列为必测路径。

### 5.3 指导与快门

- 初始为 Follow the reference.，或当前内置动作；手动提示的推进按钮为 Next tip。
- 手动点击只切换示例提示，不出现“检测通过”动画。
- 真实检测可用且经过验证时，才显示对应的检测建议；静态轮廓保持 Reference pose 标记。
- 指导暂停显示 Paused. Resume when you're ready.；快门仍可拍摄，Next tip 禁用，只有 Resume 后才可推进提示。
- 低光、检测失效或多人干扰时，一次只给一个状态说明。关闭失效的动态骨骼，提供 Use reference only 或继续手动提示。
- 准备状态只表示建议，不作为必须完成的考试。快门是否可用由相机技术状态决定。

参考轮廓与 Voice 初始关闭。轮廓打开时可调整透明度；不显示身体匹配百分比或“标准身材”轮廓。静态参考与实时检测采用不同图例，不能用同一发光效果制造识别成功感。

### 5.4 更换拍法

点击当前拍法名称打开底部面板，背景保留相机预览，先取消倒计时并暂停指导。面板可以筛选场景和 Look，点击免费拍法立即更新参考；高级项进入同一订阅墙。

取消解锁返回原拍法。成功解锁后应用用户刚选择的拍法。关闭面板后指导保持暂停，用户点击 Resume 才继续；角色、镜头与定时偏好保留。

### 5.5 定时与中断

默认 Timer off；More 中可选 3 seconds。用户按快门后才开始倒计时。倒计时提供 Cancel，支持辅助功能焦点。用户若切角色、切镜头或打开拍法面板，先取消倒计时，再执行对应操作。取消、切后台或系统中断后无新增照片，回到暂停指导；capturing 与 saving 期间暂不执行参数切换。

非倒计时期间，未完成姿态、暂停或检测失败均不禁用手动快门。相机初始化、切镜头、正在捕获或系统不可用时显示具体原因，不使用“姿势未达标”的错误说明。

## 6 Result

### 6.1 未保存

标题 Your photo，状态 Not saved yet。照片完整展示，不用成片评分与自动美颜结果。

主操作 **Save to Photos**，次操作 **Favorite & save**；下方为 Retake 和 Discard。说明 Photos stay on your iPhone. 只用于已落实本机保存的原生流程；HTML 使用符合浏览器实际行为的说明。

Retake 直接返回同一拍法，释放当前未保存照片。Discard 放弃照片并返回来源。返回手势或 Close 需确认 Discard this unsaved photo?，提供 Continue previewing 与 Discard；“Keep”不单独用作保存按钮。

### 6.2 保存中与失败

Saving… 期间锁定重复提交，提供真实进度反馈，不允许第二次保存请求。失败后保留预览，说明 Permission needed / Not enough storage / Couldn't save，并提供对应恢复、Retry 与放弃操作。

保存失败时不会出现在 Session，也不展示成功打勾。相册保存成功但本机记录失败时，显示 Photo saved. Session details couldn't be saved.，提供 Retry session record；该重试保留原 Favorite 意图，只补一次本机记录与贡献，不得再次写入相册。也可选择 Done，确认离开后本次可能不出现在历史，但照片已经保存。

### 6.3 已保存

明确显示 Saved to Photos。主操作 Done，次操作 Take another；成片 Favorite 为独立标记，可撤销。返回不再提示丢弃未保存照片。

Take another 保留当前拍法、角色与镜头，上一张照片及 Session 仍保留。Retake / Take another 保留拍前的暂停状态；其他情况下重新准备指导，不复用旧检测结论。此页不提供含糊的 Discard，也不暗示删除系统相册里的照片。

## 7 Session

显示 All / Favorites 筛选、保存时间、场景、Look、Favorite 状态及有权限时的缩略图。只展示 MusePilot 记录，不浏览系统相册其他照片。

首次需要缩略图读取时解释用途。拒绝、有限授权未包含目标资源或资源删除时，保留文字与 Use this shot again。失败图片使用有意义的文字占位，不自动请求全图库访问。

成片详情中的 Use this shot again 解析到可用模板版本，保留记录里的场景用途；模板已不可用时说明原因，提供其他拍法。Pro 到期不会删除历史；重新使用高级拍法时解释当前权益。

空历史：Your next photo starts here.，按钮 Find a shot。空 Favorite：No favorite photos yet.，说明收藏成片后在这里查看。

## 8 Style

页面首区为 Saved poses，文案 Your saved ways to take a photo.，复用 Home 的拍法卡片。用户可使用、查看或取消拍法收藏。空状态：Save a pose you'd like to try.，按钮 Explore shots。Dating / Professional 的收藏分别保留用途，复用时恢复对应表情，不只恢复共同站位。

内部偏好只用于排序，不画分数柱、不显示身体或颜值评价。可保留轻量的常用 Look 摘要；样本不足就不显示。Reset preferences 放在次级菜单，确认文案说明会重置推荐偏好，保留拍法收藏与照片记录。

拍法收藏使用书签，成片 Favorite 使用心形。无障碍名称分别为 Save pose 与 Favorite photo，避免图标之外无法区分。

## 9 订阅墙

由用户主动尝试高级拍法，或从 Settings 的 MusePilot Pro 进入。显示触发的拍法、实际权益与当前商品价格。主标题建议 More shots to make your own.，不使用影楼级效果或保证省下摄影师费用的承诺。

| 商品 | 价格与试用呈现 |
| --- | --- |
| 月订阅 | $6.99/month；没有确认商品配置前不附加试用承诺 |
| 年订阅 | $29.99/year；符合实际商品与资格时显示 7-day free trial |

价格为用户确认的美元配置；原生读取商店实际价格与资格。用户应先看清选中方案，再执行购买；关闭按钮、Restore Purchases、Terms、Privacy 清楚可见。

取消或失败保留原拍法；pending 显示处理中，不伪装解锁；恢复无记录给出明确反馈。离线时解释购买或恢复需要网络，同时提供继续使用免费拍法。不得在已开始的拍摄中非用户主动触发订阅墙；预览中主动选择高级拍法可暂停后打开，倒计时、捕获与保存期间不打开。

## 10 Settings 与隐私

Settings 包含角色与镜头默认值、镜像、外观、Privacy、Pro、恢复购买、Reset preferences 与 Delete local data。

隐私说明区分相机处理、未保存预览、系统照片保存、本机记录与缩略图读取。删除确认说明将删除拍法收藏、Session、偏好和资源引用；不会删除 System Photos，也不会取消订阅。

权限说明遵循动作发生时再解释：选拍法后需要相机，点 Save 时需要保存，显示缩略图时需要读取。用户拒绝时说明可恢复的路径，不循环弹窗，也不将浏览样片与相册权限绑定。

## 11 视觉与操作规范

延续现有暖中性色与摄影样片语言，使用系统 SF 字体层级、语义 Token、Light / Dark、Dynamic Type 与足够对比度。重点从大段计划文字移到可辨认的人物姿势与机位示意。

导航、底部操作面板可使用模糊材质；参考图、照片与正文保持清楚。布局适配安全区，操作区域至少 44pt，按钮点击态与加载态明确，禁止把仅靠颜色表达的选中状态作为唯一线索。

面板支持收起、返回手势与减少动态效果；VoiceOver 读出角色、当前镜头、参考示意性质、快门可用性与保存状态。短暂 Toast 不能替代保存失败的持续恢复入口。

## 12 对现有原型的调整清单

| 区域 | 下一轮具体调整 |
| --- | --- |
| Home | 样片列表与卡片直达开拍，场景/Look 变为筛选，完整计划移入详情 |
| Style | 新增拍法书签与复用；移除面向用户的权重柱状图 |
| Camera | 角色/镜头解耦，手动快门独立，加入参考小图与换拍法面板 |
| 指导 | Next practice step 改为 Next tip，真实检测与手动示意分开 |
| Timer | 默认关闭，用户可选 3 秒；切换与面板操作有取消规则 |
| Result | Keep 改 Save，新增未保存/保存中/已保存/失败/记录失败状态 |
| Session | 只从成功保存创建记录，支持同拍法复用与丢失缩略图回退 |
| Paywall | 月付/年付/7 天口径一致，读取商品资格，取消不改变原拍法 |
| Demo 文案 | 清楚标注 Sample、Reference pose、模拟购买与浏览器下载 |

完整验收以 PRD V1.7 第 14 节为准。实现时继续使用 Feature First、MVVM、依赖注入与 Mock 可替换接口；本轮不修改现有工程源代码或把文档状态当成运行结果。
