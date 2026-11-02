# MusePilot 产品需求文档（PRD V1.4）

Alpha 开发基线。本文合并 V1.3 的可执行规则、V1.4 草案里的 Choose the Look 与 Shot Plan 契约，以及本轮对 Look 用词、手机摆放、暂停、风格配置、会话缩略图、免费额度和回归样例的修订。旧的 V1.3 文件不再作为开发基线。

- 产品名：MusePilot。TestFlight 和界面使用这个名字。
- App Store 展示名、商标和域名在检索完成前不锁定。Bundle ID 在打出第一个 TestFlight 包之前确定。`com.company.musepilot` 不是正式标识。
- 日期：2026-09-27
- 平台：iPhone。不做网页产品，不做 Android。
- 产品语言：英语
- 第一轮样本：美国、澳洲分开记录。加拿大、英国不进第一轮。

## 1. 产品定位

MusePilot 是拍摄前的实时姿势与构图指导教练。它不是 AI 绘图/修图工具，不建人脸库，不打分，也不生成图像。

用户要完成的事：知道这一张身体怎么放、手机放在哪、哪一件事不要做，并且愿意把拍到的照片留在系统相册。

第一屏句子：Know how to stand, where the phone goes, and what to avoid.

Slogan：Pose guidance you can follow.

价值锚点（Paywall 商业包装）：“Get studio-quality solo portraits without hiring a $200 photographer.”（无需高价摄影师，自己也能拍出专业级单人照）

界面与付费界面严禁使用 Generate。付费文案统一使用：Unlock Pro to create unlimited shooting plans. 或 Start 7-day Free Trial

## 2. 第一版用户

只服务一个人能独立完成的拍摄。

- Weekly photos：咖啡馆、穿搭、旅行。痛点是不知道先做哪一个动作。
- Profile photo：Dating、Professional 头像。文案写 natural, like you。不打吸引力分数，不承诺匹配或面试。

两人帮拍、摄影师模式、双人姿势、多人姿势，都不在第一版界面里。

## 3. 原则

- 一次只给一个下一步。用户动了并且稳住，再给下一句。
- 优先级：人先完整进入画面，然后构图，然后身体，然后表情。
- 识别没把握时，请用户重新站位或保持不动。不猜测动作。
- 文字始终可见。语音默认关闭，拍摄中可以打开。打开后只朗读当前这一句。
- 轮廓默认关闭。只有当前动作标记了需要空间提示时，用户打开后才画。
- 用户暂停后，不再发出移动或姿势指令，直到用户继续。
- 直播画面、人体关键点、人脸数据只在本机内存里处理，不上传。
- 快门写入系统相册。应用不保存原图。会话可以引用系统相册里的那张照片来显示缩略图。
- 风格只由 Keep 和 Favorite 增加权重。权重数字放在配置里。Retake 和 Discard 不改变权重。用户可以清空。
- 完成率、误报率只做内部测试门，不写进广告和商店描述。

## 4. 范围

### 4.1 Alpha 必须交付

1. 先选场合和 Look，看到这一张 Shot Plan，再进入相机。相机权限在 Start coaching 之后才申请。
2. 12 个已授权模板：4 个场景各 3 个，每个 Look 各 1 个。没有姿势库页面。
3. Shot Plan 是指导引擎的唯一输入。每份计划都带 CameraPlacement。
4. 状态机一次一条指令。人未入画时不给姿态或表情指令。拍摄中可以 Pause，暂停期间不发指令。
5. 文字始终显示。语音开关默认关。轮廓开关默认关。
6. 照片写入系统相册。应用只存会话元数据和相册资源标识，不存图像字节。会话列表用 PhotoKit 显示缩略图。
7. 结果页：Keep、Retake、Discard、Favorite。
8. 前置预览的左右指令按用户看见的镜像画面计算。
9. 倒计时可见，随时可取消。取消后不拍照。
10. 感知在本机运行。没有用户参考图，没有云端看图。
11. 指导引擎附带至少 100 段已标注视频的回归集。换 Vision 或改阈值之前要跑过。

### 4.2 下一轮

1. 用户从相册选一张照片，在本机转成一个 Shot Plan。失败或拒绝时，仍使用已有模板。参考图只微调已有的 CameraPlacement，不从零决定手机放在哪。
2. 帮拍开关：「我在拍 / 我入镜」。提示仍是相对动作，不出现镜头倍数和英尺数。
3. 每个场景再增加到 6 个已授权模板。Alpha 不验收这一条。模板疲劳度要在那时产生区别。

### 4.3 再往后

- 云端理解参考图。若开启，必须单独同意，拒绝后仍能用本机计划拍完。
- 应用内保存原图。
- 风格权重改成 1/2 或 1/5。只换 StyleWeightConfig，不改已存分数的结构。
- 把语音改成默认打开。
- 双人、多人、姿势库浏览、吸引力或身材分数、Android、网页产品。

## 5. 首次流程

从打开到点下 Start coaching，最多 3 次点击。不先要相机权限。

1. 一张卡片：Weekly 的 Cafe、Outfit、Travel，或 Profile 的 Dating、Professional。Profile 的场景固定为 Window light。
2. Choose the Look：Natural、Editorial、Candid。
3. 同一屏展示选中的 Shot Plan 和 Start coaching。Phone 区块来自 CameraPlacement。

点 Start coaching 后，先说明相机画面只在本机使用，再弹出系统相机权限。拒绝权限时留在计划页，计划文字仍可阅读。

没有「打开应用直接进相机」，也没有第一版的上传参考图。

从 Start coaching 到拍下照片的时间要记录。Alpha 不把「30 秒内必须拍完」写成通过条件。指导要等动作稳住，和限时拍完会互相打架。

## 6. Choose the Look

用户选的是这一张想要的感觉，不是姿势列表。

| Look | 界面说明 | 用户理解 |
| --- | --- | --- |
| Natural | Relaxed and everyday | 日常自然 |
| Editorial | Still, like an editorial | 杂志感 |
| Candid | As if you haven't noticed the camera | 像没有发现镜头 |

这三个词是模板上的标签，描述想要的感觉。不承诺成片达到杂志发表标准。匹配发生在本机已经写好的模板之间，不在拍摄时调用生成模型，也不上传画面。

某个场景如果没有这个 Look 的已授权模板，这个 Look 不显示。Alpha 的 12 个模板必须盖住 4 个场景乘 3 个 Look，每个组合正好 1 个。

## 7. Shot Plan

Shot Plan 是指导引擎唯一读取的计划。以后的参考图、本地分析和人工编写都先变成 Shot Plan，再进入相机。手机该放在哪写在计划里。以后的分析只微调这份摆放，不另写一套相机指令。

```text
ShotPlan
  id
  scene
  look
  framing
  cameraPlacement
  actions[]          有序。stage 为人入画、构图、姿态、表情
  avoid[]
  wireframe
  completionRule     人入画、构图、姿态都通过后才可倒计时。表情若存在，也要通过
  expressionLine     Profile 用。Dating 可以有一点笑意，Professional 更安静

CameraPlacement
  height             Eye level | Slightly above eye level | Slightly below eye level
  distance           Close | Medium
  orientation        Portrait | Landscape
```

示例：Window light 的一条计划可以是 height = Eye level，distance = Close，orientation = Portrait。Cafe 的一条半身计划可以是 height = Eye level，distance = Medium，orientation = Portrait。

计划页给用户看四块：You、Phone、Avoid、线稿。Phone 用上面三个字段写成简单英语，例如 Eye level、Medium distance、Portrait。不写英尺、焦段和镜头倍数。进入相机后拆成一条一条的指令，取景框上不再同时堆多句。

选择规则，按顺序：

1. 场景和 Look 必须相符，并且有授权记录。若只剩 1 个，就用它。
2. 若同组有多个模板，不选上一次会话用过的那一个。
3. 在剩下的里面，最近 3 天没用过的排在用过的前面。这是 templateFatigue，只降低优先级，不把唯一可选的模板藏起来。
4. 同一层里，`styleConfidence` 高的优先。分数按当前 StyleWeightConfig 累加。
5. 仍然相同则用稳定的模板 id 顺序，不用随机。

Alpha 每个场景加 Look 只有 1 个模板，所以上面的第 2 到第 5 步要在模板增加到 6 个之后才有区别。规则现在就写进引擎。

## 8. 信息架构

- Home：最近一套计划，或开始一次新的场合选择
- Session：场合、Look、时间、是否 Favorite、系统相册缩略图。缩略图是 PhotoKit 引用，不是应用里的图片副本
- Style：有权重的模板名称，以及 Reset style
- Settings：隐私说明、购买与恢复、删除本机会话和风格

拍摄中的控件：当前这一句文字、Pause、语音开关、轮廓开关、取消倒计时、快门。

没有 Pose Library、Gallery、参考图上传页、帮拍开关。Session 不是相册，不能浏览系统相册里的其他照片。

## 9. 十二个模板

| 场景 | 数量 | 取景 | Look | CameraPlacement |
| --- | --- | --- | --- | --- |
| Cafe | 3 | Half-body | Natural、Editorial、Candid 各 1 | Medium，Portrait。高度为 Eye level 或 Slightly above eye level |
| Outfit | 3 | Half-body | 同上 | 同上 |
| Travel | 3 | Half-body | 同上 | 同上 |
| Window light | 3 | Close-up | 同上 | Eye level，Close，Portrait |

每个模板入库时带齐 id、场景、Look、CameraPlacement、有序动作、线稿、授权记录。没有授权记录的不能进入这 12 个。凑不齐的场景或 Look 不出现在界面上。

Weekly 合在一起要覆盖：重心在一条腿上、身体微微侧开、一只手有事做、手机与眼睛差不多高或略高、视线看镜头或刚刚偏开。

Window light 的每条计划都写明：手机与眼睛平齐、身体微侧、下巴放松、光从窗户来、避开直闪和仰拍。Dating 与 Professional 共用站位，只更换表情那一句。

默认避开：Low angle、Wide-angle on face。文案用简单英语。不使用焦段、度数、英尺和镜头倍数。

## 10. 指导状态机

```text
IDLE
  → Start coaching → ACQUIRING
ACQUIRING
  → 稳定看到一个主体 → TRACKING
  → 超时 → 提示重新站位，留在 ACQUIRING
  → Pause → PAUSED
TRACKING
  → 计划里还有未完成动作 → COACHING
  → 置信度不足 → DEGRADED
  → Pause → PAUSED
COACHING
  → 选出一个动作 → INSTRUCTION
  → Pause → PAUSED
INSTRUCTION
  → 观察到用户在动 → VERIFYING
  → Pause → PAUSED
VERIFYING
  → 该动作稳住 → 下一个动作，或 READY
  → 没做到 → 换一句更简单的，回到 INSTRUCTION
  → 置信度不足 → DEGRADED
  → Pause → PAUSED
READY
  → 用户确认或快门 → COUNTDOWN
  → Pause → PAUSED
COUNTDOWN
  → 倒计时结束 → CAPTURED
  → 用户取消或 Pause → PAUSED，不拍照
CAPTURED
  → Retake → COACHING，仍算同一次计划
  → Keep / Discard / Favorite → 结束
DEGRADED
  → 重新稳定 → TRACKING
  → 超时 → 一句恢复提示，不给姿势指令
  → Pause → PAUSED
PAUSED
  → Resume → TRACKING
```

Pause 用于整理头发、换衣服、接电话，或应用进入后台。暂停期间不发 Move left 一类指令，不朗读，不画轮廓。画面可以保持。文案只留：Paused. Resume when you're ready.

Resume 进入 TRACKING。若当时没有稳定主体，沿用 TRACKING 的现有规则，不立刻发出姿态或表情指令。暂停和继续都不消耗 credit。

每一拍只做这些事，PAUSED 期间不做：

1. 看置信度。不够就进入 DEGRADED，不发出姿态或表情指令。
2. 在未完成动作里只选一条。人还没入画时，不选姿态和表情。
3. 同一句在冷却时间内不重复。
4. 确认有改进再前进。
5. 连续失败后缩短句子，不原样重复。

指令长度 3 到 8 个英文词。一句里最多两个变化。界面始终有这句文字。暂停时这句换成暂停文案。

恢复文案只用这些意思：

- Step back so I can see you.
- Take one small step back.
- Move a little to your left. 左右以预览镜像为准。
- Lower the phone slightly.
- Move into clearer light.
- Hold still for a moment.

轮廓开关打开，且当前动作标记了需要空间提示时，才画轮廓。手部关键点丢失只隐藏手线，头和躯干继续。光线不足、躯干被挡住、画面里有第二个人时，停止全部骨骼，顶部说明原因。

前置坐标按镜像后的画面计算。低端机如果预览掉帧，先降低感知频率。置信度仍然不够时走 DEGRADED。

阈值放在版本化配置里，不写进界面文案。

## 11. 拍摄与保存

就绪条件使用 Shot Plan 的 completionRule：人入画、构图、姿态都通过，表情若存在也通过，手机稳定一小段时间，并且不在 DEGRADED 或 PAUSED。构图是否通过，对照 CameraPlacement，仍用相对说法，不用量尺。

倒计时可见。取消或暂停立即停止，不写入照片。

快门保存当前预览帧到系统相册。第一次保存前说明照片进入系统相册，应用不另存一份。然后才请求相册新增权限。拒绝新增权限时，预览和文字指导仍可用，快门不可用。

保存成功后记下该照片的 PhotoKit localIdentifier。第一次需要在会话里显示缩略图时，再说明缩略图来自系统相册、应用不复制原图，然后请求读取权限。拒绝读取时，会话仍显示场合、Look 和时间，只是没有缩略图。用户稍后在系统相册删除该照片，或收回授权时，同样只去掉缩略图。

会话元数据存在本机：session id、时间、scene、look、template id、photoAssetId、指令结果、keep / retake / discard / favorite、语音是否曾打开。不包含图像字节、关键点、人脸描述。

删除本机数据时，删除会话、Style 和 photoAssetId。系统相册里的照片不删。

## 12. Style

权重记在模板上，只在本机。数字来自 StyleWeightConfig，不写进数据库结构。

```text
StyleWeightConfig
  version     Alpha 为 1
  keep        1
  favorite    3
  retake      0
  discard     0
```

| 行为 | Alpha 配置下的变化 |
| --- | --- |
| Keep | + keep |
| Favorite | + favorite。同一会话里不再另加 keep |
| Retake | + retake，即为 0 |
| Discard | + discard，即为 0。不减少已有权重 |

以后把 favorite 改成 2 或 5，只发布新的配置版本。已有 styleConfidence 保留，不按新权重重算历史。新的 Keep 和 Favorite 才使用新配置。

Reset style 把全部分数清零。不清 templateFatigue。疲劳度是最近使用时间，不是偏好。

分数只用来在同一场景和 Look 里排列已有模板。不用来推断用户讨厌什么，也不写出新的风格描述。

templateFatigue 存在本机：template id 和 usedAt。选择时看最近 3 天。删除本机数据时一起删除。

## 13. 隐私与测试记录

隐私政策写明：摄像头画面只在本机处理，不上传服务器。

- 直播帧：内存中使用，不上传，不落成帧序列
- 关键点和人脸：不上传，不建身份库，不做吸引力或身材分数
- 原图：只进系统相册。应用不复制图像文件
- 缩略图：通过 PhotoKit 读取用户自己的那张照片。保存的是资源标识
- 会话、Style、templateFatigue：只在本机
- 分析事件可以有场合、Look、耗时、指令类型、是否保留、语音是否打开、是否暂停。不可以有画面、关键点或图像描述

内部记录、不写进市场材料：第一次会话是否走到结果页、从 Start coaching 到拍下的时间、指令是否被做完、就绪误报、崩溃、有没有把画面传出设备。这些数字在第一轮封闭测试后修订。

隐私标签按美国和澳洲先准备。

## 15. 模块

```text
相机画面
  → 本机感知快照（关键点与置信度）
  → Shot Plan Engine 选出一个计划
  → Coach Engine 根据快照和计划返回一条指令，或在 PAUSED 时不返回
  → 界面显示文字、可选语音、可选轮廓、倒计时和快门
```

指导规则的测试不依赖相机界面。固定快照样例和 Golden Dataset 都要能回归。

```text
PoseTemplate
  id, scene, look, framing, cameraPlacement, orderedActions[], wireframe, licenseRef

ShotPlan
  由一个 PoseTemplate 在本次会话中组成。含 expressionLine 和 cameraPlacement

CameraPlacement
  height, distance, orientation

CoachAction
  id, stage (enterFrame | composition | pose | expression)
  text, requiresSpatialHint

CoachingSession
  id, templateId, scene, look, startedAt, endedAt
  photoAssetId
  instructionResults[], outcome, favorited, voiceUsed

StyleMark
  templateId, styleConfidence, savedAt

StyleWeightConfig
  version, keep, favorite, retake, discard

TemplateUse
  templateId, usedAt
```

第一版没有自建服务器，没有参考图上传接口。购买用 StoreKit 2。实时计算都在本机。

## 16. 验收

- 界面上的产品名是 MusePilot。
- Look 只有 Natural、Editorial、Candid。
- 从打开到 Start coaching 最多 3 次点击。拒绝相机权限后，计划仍在。
- 每个可见的场景和 Look 都能得到 1 个已授权计划。计划页 Phone 区块能读出 height、distance、orientation。不会抽到没有这个 Look 的模板。
- 取景框上同时只有一条文字指令。人未入画时不出现姿态或表情指令。
- 点 Pause 后不再出现移动或姿势指令。Resume 后回到 TRACKING。应用进入后台再回来时仍是暂停。
- 语音第一次进入相机时为关。轮廓第一次进入相机时为关。
- 手部关键点丢失时，头和躯干仍可显示，手上没有残留连线。
- 左右提示和前置预览一致。文案中不出现度数、英尺和镜头倍数。
- 倒计时可以取消，取消后相册没有新照片。
- 保存后系统相册有照片。会话缩略图来自 PhotoKit。应用沙盒里没有图像文件。拒绝读取权限时，会话仍有场合、Look 和时间。
- Favorite 使该模板的 styleConfidence 增加 StyleWeightConfig 里的 favorite。Alpha 这个值是 3。Discard 不改变分数。Reset 后分数为 0，最近使用记录还在。
- 断网时，计划、指导和保存到相册仍然可用。
- 第一版没有参考图选择、云端分析开关和应用内原图。
- Golden Dataset 的 6 类样例都返回第 18 节的期望。换 Vision 前，100 段回归通过。

## 17. 相对 V1.4 草案和 V1.3 的取舍

采纳草案里的这些决定：

- 先选 Look，再进入已经写好的 Shot Plan。
- Shot Plan 作为以后参考图和现场指导之间的契约。
- Keep 与 Favorite 加分，Retake 和 Discard 不加不减。分值放在 StyleWeightConfig，Alpha 为 1 和 3。
- MusePilot 用于 TestFlight。商店展示名在商标检索完成前不另做承诺。

不采纳草案里的这些写法：

- Alpha 不交付 24 套模板。12 套盖住每个场景和每个 Look。6 套一场的目标放到下一轮，并且仍然要有授权记录。
- 不把「30 秒内拍完」写成通过条件。3 次点击只计算到 Start coaching。
- 模板选择不随机。先匹配场景和 Look，再避开刚用过的，再用疲劳度和权重。
- 「AI 匹配风格」写成模板标签过滤，不在拍摄时调用生成模型。
- 补回 V1.3 里草案漏掉的规则：语音和轮廓默认关、镜像、可取消倒计时、手部丢失只藏手线、照片只进系统相册、完整状态机。状态机在此之上增加 PAUSED。

本轮修订：

- Casual 改为 Candid。
- Shot Plan 增加 CameraPlacement。
- 增加 PAUSED。暂停期间不发指令。
- 风格权重改为 StyleWeightConfig。
- 会话用系统相册引用显示缩略图，不复制原图。
- 选择规则增加最近 3 天的 templateFatigue。
- 增加第 18 节 Golden Dataset。

## 18. Golden Dataset

指导引擎每次更换 Vision 或调整阈值，都要用这套样例回归。样例放在开发测试中，不打进用户安装包，不上传产品服务器。出镜内容使用已同意的内部素材。

至少 100 段视频。每段标注期望结果。下面 6 类都必须覆盖，并且包含不同光线、距离和入镜位置。左右类样例要按前置镜像标注。

| 情况 | 期望 |
| --- | --- |
| 人未入画 | Step back。不给姿态或表情指令 |
| 头太低 | Lift your chin |
| 手机太高 | Lower the phone |
| 身体过正 | Turn slightly left。左右以该段视频的镜像标注为准 |
| 光太暗 | Move into clearer light |
| 第二个人进入 | DEGRADED。不给姿势指令 |

另外两类也要有样例：

| 情况 | 期望 |
| --- | --- |
| 用户点 Pause，或应用进入后台 | 不再发出移动或姿势指令，直到 Resume |
| 手部关键点丢失，头和躯干仍在 | 继续头和躯干。手上没有残留连线 |

100 段全部通过，才可以更换感知实现。失败的样例留在集合里，不删掉来换通过率。

2. 商业模式与付费策略（Business Model）
2.1 变现架构：Freemium + 订阅制
为顺应欧美用户对相机与 Productivity 类应用的付费习惯，采用订阅制（Subscription）：   
Free（免费基础版）：可免费使用基础场景（如 Cafe、Outfit 的 Natural Look）。
包含全套端侧感知、实时指导、镜像算法与相册保存功能。

MusePilot Pro（订阅高级版）：价格：$6.99 / 月 或 $29.99 / 年（附带 7 天 Free Trial）。
权益：解锁全部高级 Look（Editorial、Candid）。   
解锁高价值专用场景（Dating、Professional Window Light 头像方案）。   
无限次创建与使用 Shot Plan。   

未来优先解锁“相册参考图一键转 Shot Plan”（V2.0 规划）。 