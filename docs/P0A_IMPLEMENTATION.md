# PosePro V2.2 P0A 编码与验收记录

日期：2026-11-01  
需求：[PRD V2.2](../PosePro_AI_Camera_PRD_V2.2.md)  
阶段：P0A 首批原生工程代码；未达到内容、真机或效果发布门槛。

## 本轮实现

基于现有 SwiftUI 工程保留设计 Token、AppContainer 依赖注入和 Feature First 目录，入口改为 Camera / Templates / Me。用户主动启用相机，选择拍摄目标后把同一手机交给朋友；用户决定是否拍摄、保存、分享或继续。所有新 ViewModel 通过 action 修改私有状态。

| 模块 | 已写入的实现 | 当前限制 |
| --- | --- | --- |
| 导航与视觉 | 三 Tab、独立模板/设置路径、照片回看导航、安全区、系统字体、Light/Dark、离线 Preview | 尚未完成 iPhone、VoiceOver 与大字号视觉验收 |
| 相机 | AVFoundation 照片捕获、主动权限、后置默认、前后切换回滚、闪光、网格、默认关闭/3 秒定时、取消与中断 | iOS 17+、纵向；模拟器可能没有真实输入；实际分辨率/方向待设备核验 |
| 端侧感知 | Vision `VNDetectHumanBodyPoseRequest` Revision 1；最多 4Hz；只在唯一人体且点位有效时提供坐标；帧和骨架不持久化 | 无 CoreMotion 水平指导、裁脚推断、尺度、深度或光源识别 |
| 指导 | 正常模式为文字参考；Debug 提供明确标注的单条构图候选，稳定窗口/冷却、unknown、过期失效、Pause/Skip | 默认关闭；正式自动规则白名单为空；尚未通过 G1 |
| 内容 | Travel / Outfit / Everyday 三套、九目标，分开描述拍摄者、入镜者、光线与舒适替代 | 全部为待审核文字草稿；无真实复拍样片、摄影师实拍声明或 G0 通过记录 |
| 照片处理 | 默认 Original；Core Image 全分辨率亮度、对比度、色温；预览和输出使用同一定义 | 调整失败/未完成时不能保存与显示不一致的结果；无生产 LUT |
| 保存 | Photos `.addOnly`；真实系统回调后确认成功；输出幂等；照片成功/记录失败分开；仅补元数据的重试 | 进程终止时未决写入不能自动重试；真实权限/磁盘/系统失败需设备验收 |
| 分享 | 主动系统分享、临时文件与正常退出清理 | 不把分享面板关闭当成发布成功；进程被杀时临时文件可能等系统清理 |
| 本机记录 | 原子 JSON 元数据、系统照片引用、首存时间、收藏、喜欢成片、复用、清理、损坏保护 | 不保存照片字节；使用文字占位，不请求图库读取 |
| 商业与网络 | P0A 无购买/试用入口、无广告 SDK、无账号或云端推理 | P0B、真实订阅、Pro 内容不在本轮 |

旧 V1.6 页面继续留在源码中供历史参考，新入口不调用旧路由、模拟付费或旧 Camera。HTML Demo、兼容单文件及 ZIP 保持 V2.1 实际版本。

## 研究模式的操作与边界

默认拍照无需 AI、联网、订阅或完成指导。工程草稿可用于开发检查，不能以三套公开成品或已验证参考的名义发布。

Debug 构建中，从 Me → Settings 打开 `Experimental framing observations`。回 Camera 选择一个半身目标，在 Tools 主动开启 `Aim for a centered portrait`；需同时为 `I'm shooting`、Rear、Handheld，再主动启用相机。只有这些条件下才运行该候选规则。

候选仅根据有效肩部投影位置提示持机者调整所选居中构图；不推断手机物理高度、距离、人物承重或整张照片质量。它不显示绿色“合格”状态，不要求复制模特体形。未检出、多人、低置信度、观察过期、切目标、Pause 或 Skip 均撤销动态结论。Release 构建不提供研究开关。

这些数值是未验证实现参数，不是准确率或 G1 通过证明。光线、动作舒适程度和表情仍由现场用户确认。

## 在 Mac 上打开与验收

1. 使用 Xcode 16+ 打开根目录 `MusePilot.xcodeproj`，选择共享 scheme `MusePilot`。App 名显示为 PosePro；模块、工程及 bundle identifier 继续使用 MusePilot，避免无关迁移。
2. 真机运行时，在 Signing 中选择自己的开发团队。选择运行目标 iPhone，不能以 Simulator 的相机状态代替设备验收。
3. 冷启动只浏览参考；主动 `Enable camera` 后允许权限。验证允许/拒绝、离开 Tab、后台与中断；回到 App 不应自动重开相机。
4. 选一个目标，试拍、Original 回看、调整、保存与分享。照片工具栏提供 Retake/Done；未保存离开必须确认。保存请求权限时的系统弹窗不得被误当成实际后台。
5. 在 Photos 检查方向、前置镜像选择、实际分辨率、调色一致性与照片数量；在 Me 检查文字历史和 Favorite。删除本机记录不删除 Photos。
6. 完成未订阅/断网、保存拒绝后恢复、重复 Save、记录失败仅补记录、倒计时取消、拍照中切换、授权迟到与进程中断等情境，逐项对照 PRD AC01–AC20。

项目自带测试 target。先查看当前可用的模拟器：

```bash
xcodebuild -showdestinations -project MusePilot.xcodeproj -scheme MusePilot
```

再选择本机确实存在的 Simulator ID 执行：

```bash
xcodebuild test -project MusePilot.xcodeproj -scheme MusePilot \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_ID' \
  CODE_SIGNING_ALLOWED=NO
```

测试覆盖规则边界、内容/角色、记录幂等/损坏恢复、实际保存后的元数据失败、拒绝权限、重复操作与迟到回调。测试替身只检验逻辑，不证明 AVFoundation、Vision 或 PhotoKit 的设备行为。

## 本轮检查证据

Windows 当前无 Swift、Xcode、XcodeGen。已执行 `python scripts/check_ios_sources.py --syntax`：

- 40 个 App Swift 文件和 4 个 XCTest 文件全部纳入对应 target，合计 44 个文件。
- Tree-sitter Swift 语法解析无错误；它不做 Swift 类型检查、宏展开、SDK 可用性或并发隔离编译。
- 工程引用、系统权限说明、纵向配置、隐私资源、共享 scheme 和测试关联检查通过。
- 21 个 XCTest 用例已加入源码；**尚未执行，不能报告为通过**。

`PrivacyInfo.xcprivacy` 声明无追踪/上传采集；本机分析节流使用 `systemUptime`，按 [Apple 必要原因 API 文档](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype) 声明 System Boot Time 的 `35F9.1` 计时用途。该文件不代替实际 App Store 隐私报告和发行检查。

项目源文件变化后可运行 `python scripts/sync_ios_project.py`，或在 Mac 使用 `xcodegen generate`。Python 同步脚本只覆盖本项目的工程与共享 scheme，按当前 `project.yml` 的双 target 配置生成；若修改签名、target 或构建设置，应同步维护两种配置。`check_ios_sources.py` 的项目检查仅需标准库，`--syntax` 还需已存在的 `tree_sitter_language_pack`，脚本不会自动安装依赖。

## 后续放行条件

1. **G0**：摄影人员和普通搭档真实复拍，补齐公开样片、授权、适用条件和失败替代；草稿不能靠布尔开关直接宣告通过。
2. **G1**：Mac 编译与 XCTest，之后在支持设备和条件矩阵完成相机、坐标、性能、存储、权限和逐条规则验收。需要继续实现并验证水平/更多可观察规则，不能把当前单条研究候选视为全套指导。
3. **G2**：按 PRD 招募真实搭档完成默认相机与直接竞品的对照，不使用原型、测试替身或内部人员代拍填报效果。
4. **P0B/G3**：G0/G1/G2A/G2B 均通过后，再完成合格 Pro 内容与 StoreKit，才开放真实限量收费。

此交付说明记录代码和证据的实际边界，不改变 PRD 的范围或放宽发布门槛。
