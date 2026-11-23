# Android Radmin Remote

[Русский](README.md) · [Português](README.PT-BR.md) · **中文**

**稳定版 1.0.0：** 单个 Android APK，内置本地 HTML 界面、OpenRad 引擎和内置 Xray，支持 **VLESS + Reality（TCP 与 gRPC）**，并可通过 **Veyon** 查看和控制电脑。

Android 8.0+（API 26）。支持 DIRECT、外部 SOCKS5，或从 Xray/Happ JSON 导入服务器。唯一的 VpnService 会创建一条路由为 `26.0.0.0/8`、MTU 1500 的 TUN。手机的其他互联网流量不会经过这条 TUN。

> 汉化说明：本分支已完成中文汉化。新增 `app/src/main/res/values-zh/strings.xml`（174 条字符串），WebView 界面（`assets/www/index.html`、`app.js`、`classroom.js`）和 Kotlin 中的俄文报错信息已译为中文，设置中可选择中文（`zh`）。构建已配置为仅 arm64-v8a，见下文“构建”。

## 稳定版应用 1.0.0

主 APK：`android-radmin-remote-1.0.0.apk`，名称 **Radmin Remote**，包名 `ru.meshcheryakov.androidradminremote`，为无调试信息的 release 构建。已包含验证过的 TCP/gRPC、Happ JSON 导入、中继和 Xray 重启修复。OpenRad 协议和 26.0.0.0/8 路由限制保持不变。用户已在测试版 0.2.1 上通过 gRPC 配置确认注册、加入网络、四条中继连接和到电脑的 RTT；这并不保证任何服务器在任何运营商下都可用。

从主版本 0.3.x / 0.4.x 更新会保留包名、证书、VPN 身份和设置。首次连接 Veyon 需要在“设置”中配置访问权限。要从历史 debug/test 安装迁移，需要单独安装主 APK，并重新导入代理配置文件 / 重新加入 Radmin 网络；旧的安装可以保留。

主版本使用固定的长期证书；SHA-256 见 `release-signing-certificate.sha256`。密钥本身不存放在 git 中。GitHub Actions 仅在配置好密钥后才会发布[正式版 v1.0.0](https://github.com/meshcheryakovaa/android_radmin_remote/releases/tag/v1.0.0)。如果没有密钥，只会构建检查项和 debug 产物，不会发布主 APK。说明见[签名与发布](docs/RELEASE-SIGNING.ru.md)。

历史[测试版 0.2.1](https://github.com/meshcheryakovaa/android_radmin_remote/releases/tag/v0.2.1-test)仍然可用。

## 第二阶段：通过 Veyon 管理

**课堂 → 电脑 ▾**：带复选框的下拉列表，可按名称/IP 搜索，有“全部”/“全部取消”按钮。选择保存在设备上。被隐藏的电脑不会收到缩略图请求，也不会进入批量命令。网络筛选和“仅已启用的电脑”筛选继续生效。

**课堂**：自适应的 16:9 缩略图和较小的电脑名称。所有行（包括最后一行）都占满整行宽度。5 台电脑比 30 台显示得更大；平板上可容纳 30 个缩略图。顶部是批量命令：关机、重启、锁定/解锁、打开网站、传输文件。命令发给当前显示的分组，并显示收件人列表和每台电脑的结果。画面按顺序自动轮流更新。电脑较多时可以滚动。点击打开菜单：查看、管理、锁定 / 解锁 Veyon。查看或管理期间缩略图队列会暂停；返回网格后恢复。

**设置 → 已安装 Veyon 的访问权限**：密钥 / 登录方式、端口、更新间隔 250–60000 毫秒、宽度 160–480 像素、JPEG 质量 25–80%、网络和“仅已启用的电脑”筛选。间隔是指同一台电脑两次更新之间的最短画面间隔；完整一轮取决于网速。锁定后会额外请求真实画面并继续常规更新。内存中只保存一帧完整画面和网格用的小图。网络快照使用 RGB332 + zlib；宽度和 JPEG 质量指的是收到画面后生成的缩略图。

电脑上需要 Veyon Service（TCP 11100）并允许访问。如果使用密钥登录，且 Veyon 规则不要求指定用户名，用户名字段可以留空。用户已确认 0.4.2 的功能可用并要求发布稳定版。1.0.0 新增了保存的显示电脑选择；检查说明见 docs/VALIDATION.md。

[电脑配置、管理、限制和第二阶段检查](docs/REMOTE-0.4.ru.md)。

## 首次使用 VLESS / Reality

1. 安装 APK。关闭 Happ 和其他 VPN 应用。
2. 打开 **代理 → 从 Happ / Xray 导入**。
3. 粘贴导出的 JSON 并点击**导入 JSON**。或者点击**选择文件**，打开不超过 512 KB 的 `.json` / `.txt` 文件。
4. 选择模式 **VLESS + Reality · 内置于 APK**，再从列表中选择需要的服务器，点击**保存**。
5. 在主页点击**连接**，并允许 Android VPN。先启动 Xray 并检查其内部 SOCKS5 入口，然后启动 OpenRad。
6. 等待出现 `CONNECTED`、地址 `26.x.x.x`、“TUN 就绪”和传输方式 **VLESS / Reality**。在代理 / 诊断中，Xray 应为 `READY`。
7. 在**网络**中加入已有的 Radmin VPN 网络。在**设备**中等待节点显示 `CONNECTED`，然后点击 **PING**。该模式下应为 `RELAY`，并测得 RTT。

仅支持 `vless` + `reality` + `tcp` / `raw` / `grpc` 的 outbound。Happ 的负载均衡和路由规则暂不导入。应用会显示已导入的配置文件数量和跳过的其他条目数量。重新导入会替换代理配置文件列表，不影响 Radmin 网络和身份。要更改配置文件，请先断开 VPN。

导入不会原样执行源配置：只使用所选配置文件中经过验证的字段。应用会创建自己的 loopback SOCKS5（临时密码），不使用额外的 TUN，也不单独依赖 Happ。

## 使用白名单的移动网络

通过 Happ AUTO 能打开网站，并不能证明本应用中选定的服务器可用：AUTO 可能会切换到另一个 TCP 或 gRPC 节点。请在 Happ 中手动选择具体服务器，并在同一个热点下验证它。然后关闭 Happ，再在这里选择该服务器。两个 VPN 不要同时运行。

从 0.2.0 更新后请重新导入 JSON：以前 gRPC 条目会被跳过。对于两个 TCP 和三个 gRPC 节点的配置，应得到五个配置文件。如果不知道哪个节点可用，请逐个检查 gRPC 配置：断开 → 选择 → 保存 → 连接。AUTO 和 fallback 不会复现。

从家庭 Wi-Fi 切换到热点时，请断开后重新连接。在 0.2.1 中，新启动会先关闭之前的 engine/TUN/Xray 并更新 native DNS。这可以防止残留的 READY 内核被重复启动（`IllegalStateException`）。`Connection reset` 本身不能说明是谁重置了连接；在受限条件下，服务器是否可用需要在设备上验证。

## DIRECT 与外部 SOCKS5

DIRECT 模式：选择对应模式并连接。外部 SOCKS5：填写服务器/端口，必要时填写登录名/密码。在 SOCKS5 和 Xray 模式下，OpenRad 使用 TCP 中继；直连的节点 TCP/UDP 已关闭。DIRECT 保留 OpenRad 上游策略：Wi-Fi 下直连 TCP/UDP，其他连接使用中继。

Xray 的“测试”按钮评估的是已经建立、经过身份验证的 OpenRad control 会话。它不会把本地 SOCKS5 的一次响应当作 VLESS 服务器可用的证明。完整标准是：`CONNECTED`、TUN 就绪、到电脑的 PING 正常。对于外部 SOCKS5，测试的是到协调器的 CONNECT；测试本身不执行 Radmin 登录。

## 构建

需要 JDK 17、Python 3、curl、Android SDK 34 / build-tools 34.0.0：

```bash
./scripts/setup-android-sdk.sh  # Linux，如果还没有 SDK
python3 scripts/setup-xray.py  # 官方 AAR，会校验 SHA-256
./gradlew :app:testDebugUnitTest :app:assembleDebug --no-build-cache
```

AAR 的下载也会由 Gradle 任务 `setupXray` 自动完成。AAR 不存放在 git 中；URL、版本和 SHA-256 已固定在脚本里。Android Studio 可直接打开项目根目录；Windows 使用 Python 3、curl 和 `gradlew.bat`。产物：`app/build/outputs/apk/debug/app-debug.apk`。要构建主 release 版本，请配置 OPENRAD_SIGNING_PROPERTIES 并执行 :app:assembleRelease。

本汉化分支的构建已配置为仅 arm64-v8a（`app/build.gradle.kts` 中 `ndk { abiFilters += "arm64-v8a" }`），产物为 arm64 版 APK，适用于 Redmi K70 等 arm64 设备。

GitHub Actions 会构建 APK、运行 JVM 测试和 loopback 上的 native 冒烟测试，在配置好密钥后发布签名的正式版，并为开发提供 debug 产物。DEX 构建缓存已关闭：在 AGP 8.5 下，更换 native classpath 时本地曾出现过时的 R 类归档。增量 / up-to-date 检查仍然可用。

## 检查与限制

注册、加入网络、直连 TCP 通道和 RTT 已由用户在 0.1.1 上确认。新的 Xray 集成通过合成 JVM 测试、Android 构建、HTML 检查，以及用同一 Kotlin 配置编译器生成的配置运行 native Linux 内核来验证。这**不能代替在真实 Android 设备和运营商服务器上验证 VLESS/Reality**。自动测试不使用用户的服务器和访问数据。

Happ 的自动负载均衡和通过 URL 更新订阅尚未实现。远程桌面通过 Veyon 提供（见第二阶段）。代理密码、UUID 和配置文件参数通过 Android Keystore / EncryptedSharedPreferences 保存，不会返回给 HTML，也不会进入诊断导出。导入成功后，原始 JSON 输入框会被清空。

## 文档与代码来源

- [Xray 0.2：架构、导入、套接字保护、验收](docs/XRAY-0.2.ru.md)
- [历史架构 0.1](docs/ARCHITECTURE.ru.md)
- [Android ↔ Windows 手动检查](docs/TESTING.ru.md)
- [自动检查结果](docs/VALIDATION.md)
- [原生依赖、版本与许可证](docs/NATIVE-DEPENDENCIES.md)

基础：[OpenRad](https://github.com/gringoestrangeiro/openrad) @ `47eb54f6b051aadc37260d405681b2111b50b7cc`，MIT 协议。协议/加密/身份/成员关系/L3Bridge 保持不变。内置内核：[XTLS/libXray](https://github.com/XTLS/libXray) v26.10.10，API 3；Xray-core v26.10.10。本项目与官方 Radmin 或 Happ 无关。
