# MusePilot UX 方案 V1.6

## 目标与范围

本方案把 MusePilot PRD V1.6 转成 iPhone 端的交互结构与页面规范。Home 将场景、Look 和 Shot Plan 摘要合并在一屏，标准路径从启动到点击 **Start coaching** 最多三次点击。相机角色、端侧隐私、订阅入口和照片权限提示都按 V1.6 重新梳理。

产品界面语言为英语。本文是 V1.6 SwiftUI UX 原型的设计基线，取代 V1.0 UX 中的 5 次付费额度、$6.99 单次购买和分散的启动流程。

## 体验方向

视觉上采用安静、克制的编辑部风格：暖中性色背景、衬线标题、清晰的实用文案和单一主操作。暖棕色强调选中状态与主按钮。颜色适配 Light / Dark Mode，文字使用系统语义层级并支持 Dynamic Type。避免美貌评分、AI 生成照片、复杂仪表盘和催促用户的倒计时文案。

产品只指导一位主体。两种拍摄角色为 **I'm in Frame** 与 **I'm Shooting**。切换角色时明确显示前后摄像头、镜像方式和指令视角。

## 信息架构

底部保留三个 Tab：

| Tab | 用途 |
| --- | --- |
| Home | 选择场景与 Look，预览计划并开始指导 |
| Session | 查看 MusePilot 会话记录及获授权的缩略图，不浏览系统相册 |
| Style | 查看仅保存在本机的风格偏好 |

Settings 从 Home 右上角进入。Settings 内可打开 Privacy、MusePilot Pro / Restore Purchases 和本机数据删除。点击 Pro 锁定的场景或 Look 时打开同一 Paywall。

## 主流程与点击数

Home 默认选中 Cafe、Natural 和 I'm in Frame，并直接显示完整的 Shot Plan 摘要。更换场景一次、选择 Look 一次、点击 **Start coaching** 一次，共三次。更换拍摄模式是可选操作，不属于标准路径。接受默认项后点击一次即可开始。

Home 摘要显示场景、Look、取景范围、手机高度/距离/方向、一句动作摘要和两项 Avoid 规则。点击 **Review full plan** 查看完整计划；这不会创建另一套计划或消耗额度。

## 页面与交互规范

### Home

1. 顶部显示 MusePilot 品牌、Settings 按钮和 PRD 标语：**“Know how to stand, where the phone goes, and what to avoid.”**
2. 场景分为 Weekly Photos 与 Profile Photo。Weekly Photos 包含 Cafe、Outfit、Travel；Profile Photo 包含 Dating、Professional，均使用 Window light 头像方案。
3. Look 展示 Natural、Editorial、Candid 及各自的一句说明。Pro 项显示锁形图标和 Pro 标记；点击后进入 Paywall，取消后保留当前选择。
4. 模式选择并列展示两种角色及其镜像/镜头说明。
5. Shot Plan 摘要始终位于 **Start coaching** 之前；主按钮固定在底部易触达区域。

本原型把 Cafe、Outfit、Travel + Natural 视为免费基础组合；Editorial、Candid、Dating、Professional 需要 Pro。PRD 将 Cafe、Outfit 作为免费场景示例，也把 Travel 列入 Weekly Photos，但未明确 Travel 的订阅归属。上线前需确认 Travel 权益。

### 相机隐私说明

在申请相机权限前先说明：**“Video frames and pose landmarks are processed in memory on this iPhone. MusePilot never uploads them.”** 用户继续后才请求系统相机权限。拒绝权限后返回仍可阅读的 Shot Plan，并提供前往系统 Settings 的恢复路径；不可显示空白相机页。

### Shot Plan

展示当前模式，以及 You、Phone、Avoid 三部分。手机摆位使用易懂的高度、距离、方向词。用户在此处和拍摄页都可以切换模式。即使用户拒绝相机权限，计划文字仍可查看。

### 实时指导

使用全屏相机画面，一次只显示一句指导。Pause 易于触达；Voice 和 Outline 作为次级控制，默认关闭。文字指导始终存在。暂停时立即冻结提示，显示 **“Paused. Resume when you're ready.”** 暂停期间不播报、不画轮廓、不继续发送姿势指令。指导顺序为主体完整入画、构图稳定、姿态调整、表情细节。

**I'm in Frame** 使用前置镜头与镜像坐标，文案直接指导用户，例如 **“Turn your shoulders slightly left.”** **I'm Shooting** 使用后置镜头且不镜像，文案指导持机者，例如 **“Ask them to turn slightly left.”** 或 **“Raise the phone to their eye level.”**

设备过热或指导质量下降时，优先保持预览流畅；只显示一条冷静、可执行的状态，不展示诊断分数。完成 Shot Plan 规定的就绪条件后才进入倒计时。倒计时可随时取消；取消后回到指导页，不生成新照片。

### 照片保存说明

首次快门保存前说明：**“MusePilot saves photos directly to your System Photos. We don't store copies on our servers.”** 用户继续后请求系统相册写入权限。拒绝权限时保留当前计划并说明如何恢复；不得暗示照片已经保存。

### Result

结果页提供照片预览和 Keep、Favorite、Retake、Discard。Retake 返回同一 Shot Plan 与当前模式；Favorite 是独立操作。不要加入分享、修图、滤镜、人脸评分或应用内相册。

产品需确认 Discard 的含义：是删除刚写入 System Photos 的照片，还是只放弃本次会话？未确认前不能静默删除用户照片；若删除相册照片，必须二次确认。

### Session

只列 MusePilot 会话，包含场景、Look、日期、Favorite 状态，以及权限允许时的照片缩略图引用。首次需要显示缩略图时，先解释读取用途再请求权限。用户拒绝或之后撤回权限时，仍显示场景、Look、日期，不显示缩略图。不得展示系统相册中的其他照片。

### Style

保持轻量并仅保存在本机。不提供美貌分数、不推断负面偏好、不承诺风格结果。V1.6 没有明确说明 Style 的记录规则和 Reset 语义；原型使用真实的空状态，避免先编造权重或偏好数据。

### Settings 与 Privacy

Settings 包含 Privacy、MusePilot Pro / Restore Purchases、Delete local sessions and style。删除确认需明确说明：删除本机会话、风格数据和 PhotoKit 引用；不会删除 System Photos 中的照片。

Privacy 说明视频帧和关键点仅在本机内存处理、不上传；照片保存在系统相册；应用只保留本地缩略图引用；Voice 与 Outline 默认关闭；Pause 会停止全部指导。

### Paywall

展示 PRD 的价值主张：**“Get studio-quality solo portraits without hiring a $200 photographer.”** 同时说明实际 Pro 权益：解锁 Editorial / Candid、Dating / Professional 方案、无限创建 Shot Plan。展示每周 $4.99、每年 $29.99、3 天试用、Restore Purchases、Terms 和 Privacy。禁止出现 **“Generate”**、credit 余额或按计划单次收费。

PRD 未定义免费用户创建 Shot Plan 的频次上限，也未明确 3 天试用适用周订阅还是年订阅。原型不显示虚构的免费次数，并暂将试用绑定年订阅；订阅商品配置前必须确认。

## 组件与视觉 Token

- **MPTopBar**：MusePilot 标题和 Home 的 Settings 入口。
- **MPButton**：每个阶段一个暖棕色主按钮；次级操作使用低对比度表面。
- **MPCard**：用圆角卡片承载计划信息和隐私说明。
- **MPBadge**：简洁呈现 Look 与 Pro 标识。
- **ChoiceTile**：有明确的选中、未选中、锁定状态；图标之外同时提供文字。
- **ModeSelector**：两种拍摄角色同等突出，不能只靠颜色表达选择。
- **InstructionBanner**：单句指导有足够对比度，暂停时展示独立状态。

使用 `MusePilot/Core/DesignSystem` 中的 Token。页面不直接写颜色值或随意设置圆角。图标控制提供 VoiceOver 名称，保证触控区域与文字对比度适用于两种外观。

## 原型范围

SwiftUI 页面用 Mock 状态展示布局、导航与代表性交互，不连接 Camera、Vision、Photos 授权/保存、StoreKit 或本机持久化。权限说明与结果按钮目前用于确认 UX 路径，相关系统能力接入后再完成运行时行为。

## 上线前待确认

1. Travel 是否属于免费版？本原型将其与 Weekly Photos 的 Natural 一起开放。
2. 免费版是否限制计划次数？若有限制，明确次数和重置周期；原型不虚构额度。
3. 3 天试用适用于年订阅还是周、年订阅都适用？本原型暂设为年订阅。
4. Discard 是否删除已保存到 System Photos 的照片？需要明确行为和确认交互。
5. 哪些用户动作更新 Style？存什么数据、Reset 删除什么？原型不显示数值评分。
6. 用户拒绝相机权限后，恢复界面需要怎样引导并链接到哪里？
7. “最多三次点击”是否包含用户切换拍摄模式？标准路径按选场景、选 Look、Start coaching 计算；切换可选模式会额外增加一次点击。
