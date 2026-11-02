MusePilot 产品需求文档（PRD V1.6 - 商业、性能与帮拍模式修订版）
日期：2026-09-28

平台：iPhone（iOS 专属，不做 Android，不做网页端）

目标市场：第一轮仅限美国、澳洲分开记录

产品语言：英语

1. 产品定位与商业包装
1.1 产品定位
MusePilot 是拍摄前的实时姿势与构图指导教练。它不是 AI 绘图/修图工具，不建人脸库，不打分，也不生成图像。

第一屏标语：Know how to stand, where the phone goes, and what to avoid.

Slogan：Pose guidance you can follow.

价值锚点（Paywall 商业包装）：“Get studio-quality solo portraits without hiring a $200 photographer.”（无需高价摄影师，自己或朋友帮拍也能出影楼级单人照）

1.2 文案规范
商店名不使用 FrameCoach，不带 AI Coach。

界面与付费界面严禁使用 Generate。付费文案统一使用：Unlock Pro to create unlimited shooting plans. 或 Start 3-day Free Trial。

2. 商业模式与付费策略（Business Model）
2.1 变现架构：Freemium + 订阅制（取消单次 Credit 计费）
为顺应欧美用户对相机与 Productivity 类应用的付费习惯，取消单次 $6.99 消耗型计费，改为订阅制（Subscription）：

Free（免费基础版）：

可免费使用基础场景（如 Cafe、Outfit 的 Natural Look，含自拍与帮拍模式）。

包含全套端侧感知、实时指导、镜像算法与相册保存功能。

MusePilot Pro（订阅高级版）：

价格：$4.99 / 周 或 $29.99 / 年（附带 3 天 Free Trial）。

权益：

解锁全部高级 Look（Editorial、Candid）。

解锁高价值专用场景（Dating、Professional Window Light 头像方案）。

无限次创建与使用 Shot Plan。

未来优先解锁“相册参考图一键转 Shot Plan”（V2.0 规划）。

3. 用户与场景范围（修改版）
服务单人主体拍摄，涵盖以下两种拍摄角色：

Solo Self-Shoot（单人独立自拍）：使用三脚架/前置镜头。

1-on-1 Assist Shoot（单人被帮拍/摄影师模式）：朋友/伴侣持手机帮拍。

适用场景：

Weekly Photos：咖啡馆（Cafe）、日常穿搭（Outfit）、旅行（Travel）。

Profile Photo：Dating、Professional 头像（自然光 Window light）。

双人姿势（Couples/Duo）、多人姿势（Group）因端侧骨骼遮挡算法复杂度问题，均不在第一版交付范围内，规划在 V2.0 推出。

4. 核心原则与隐私承诺
单一步骤指导：一次只给一个下一步指令，动作稳住后再给下一句。

优先级：人先完整入画 → 构图稳定 → 姿态调整 → 表情细节。

极致隐私与端侧安全（欧美营销核心点）：

视频帧、人体骨骼关键点、人脸特征数据仅在手机内存中即时处理，绝对不上云。

应用沙盒不保存照片原图字节，仅将拍摄成品保存至系统相册，并保存 PhotoKit localIdentifier 用于界面缩略图展示。

开关默认配置：文字指令始终显示，语音（TTS）与骨骼轮廓（Wireframe）默认关闭。

暂停机制（Pause）：用户暂停后不发出任何移动或姿势指令，直至继续。

5. 模式切换与 Shot Plan 契约
5.1 拍摄模式切换（Mode Switch）
计划页与拍摄页提供模式开关：

I'm in Frame（自拍模式）：前置/三脚架视角，坐标按前置预览镜像计算，指令以第一人称（You）输出。

I'm Shooting（帮拍模式）：后置/持机视角，取消镜像计算，指令以帮拍视角简单英语输出（如：“Ask them to turn slightly left.” 或 “Raise the phone to their eye level.”）。

5.2 Choose the Look 规范
Natural：Relaxed and everyday（日常自然）

Editorial：Still, like an editorial（杂志高级感）

Candid：As if you haven't noticed the camera（抓拍氛围感）
(严禁使用 Casual，避免语义误解)

5.3 Shot Plan 结构
Plaintext
ShotPlan
  id, scene, look, framing
  mode (inFrame | shooting)
  cameraPlacement (height: Eye/Above/Below level | distance: Close/Medium | orientation: Portrait/Landscape)
  actions[] (有序指令)
  avoid[]
  wireframe
  completionRule
6. 指导状态机与硬件性能保护
6.1 状态机流转
IDLE → ACQUIRING → TRACKING → COACHING → INSTRUCTION → VERIFYING → READY → COUNTDOWN → CAPTURED。

PAUSED 状态：在切换后台、接电话、整理头发或点击 Pause 时触发，画面保持，停止发送任何移动指令，不朗读，不画轮廓，文案显示：“Paused. Resume when you're ready.”

6.2 设备发热与帧率保护（Thermal & Performance Strategy）
低端机/发热降级策略：

默认感知推理频率降至 15 FPS（渲染保持 30/60 FPS）。

监听 iOS ProcessInfo.thermalState，若设备进入 serious 或 critical 过热状态，自动降低 Vision 推理频率至 10 FPS 或进入 DEGRADED 降级模式，优先保障相机画面流畅度，防止卡顿崩溃。

7. 权限体验与系统保存
相机权限：点击 Start coaching 后先弹出应用内隐私说明，再请求系统相机权限；被拒绝时留在计划页，计划文案仍可阅读。

PhotoKit 保存与读取（Pre-prompt 机制）：

首次保存：点击快门前弹出预告屏：“MusePilot saves photos directly to your System Photos. We don't store copies on our servers.”，随后请求相册写入权限。

缩略图展示：第一次展示 Session 缩略图前说明读取目的并请求读取权限，拒绝时仅展示场合与时间文字。

8. Alpha 验收标准
商业与支付：

免费用户可正常试用基础场景模板（包含自拍与帮拍切换）。

尝试使用 Pro 专属场景/Look 时弹出订阅 Paywall（含 3 天试用与 $4.99/wk、$29.99/yr 选项），购买文案不含 Generate。

帮拍与镜像逻辑：

I'm in Frame 模式下，左右指令与前置镜像画面保持一致。

I'm Shooting 模式下，左右指令与后置真实视角保持一致，文案切换为帮拍提示语。

体验与控制：

从打开应用到点下 Start coaching 最多 3 次点击。

点击 Pause 后立即停止指令提示，Resume 后平滑恢复。

倒计时可随时取消，取消后相册无新照片。

算法与回归：

满足 100 段 Golden Dataset 标注视频回归测试（含自拍/帮拍视角、人未入画、多人干扰、手部丢失、弱光等测试样例）。

纯断网环境下，计划查看、指导与拍照保存功能完全可用。