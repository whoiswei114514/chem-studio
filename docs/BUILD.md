# 构建与测试

## 环境

目前支持 Windows x64，使用 C++20、Qt 6 Widgets、Open Babel、WebView2 和 Node.js。Office 集成采用 Windows COM，暂未适配 macOS 或 Linux。

1. 安装 [MSYS2](https://www.msys2.org/)，建议默认位置 `C:\msys64`。
2. 打开 **MSYS2 UCRT64** 终端，更新包索引并安装依赖：

```bash
pacman -Syu
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-ninja mingw-w64-ucrt-x86_64-qt6-base mingw-w64-ucrt-x86_64-qt6-svg mingw-w64-ucrt-x86_64-openbabel mingw-w64-ucrt-x86_64-boost
```

如果更新要求关闭终端，请重开 UCRT64 后继续更新。

3. 安装 Node.js 24.14.1 或更高版本，以及 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。
4. 打开 PowerShell，进入项目根目录。

## 编译

```powershell
npm ci
.\scripts\setup-deps.ps1
.\scripts\build.ps1
.\scripts\run.ps1
```

`setup-deps.ps1` 下载指定版本的 WebView2 SDK；SDK 与运行时是两件事。JS 依赖版本由 `package-lock.json` 锁定。器材 SVG 已提交在仓库中，编译时会打包进程序，不必下载额外素材。

结构绘制使用 Ketcher 3.18.0 和 Indigo WASM 1.46.0。构建脚本生成 `build/structure-editor`，包含 JS、样式、Worker、WASM 和依赖许可。运行时无需联网或启动端口服务；部署时必须复制整个目录，不能只复制 EXE。默认依赖与 Three.js 共用 `node_modules`，也可通过 CMake `CHEM_EDITOR_MODULES` 指定独立位置。

默认构建目录为 `build`，默认使用 `C:\msys64\ucrt64`。自定义位置：

```powershell
.\scripts\build.ps1 -ToolchainDirectory 'D:\msys2\ucrt64' -BuildDirectory 'D:\build\chem-studio' -Jobs 2
.\scripts\run.ps1 -ToolchainDirectory 'D:\msys2\ucrt64' -BuildDirectory 'D:\build\chem-studio'
```

也可设置 `MSYS2_UCRT64` 环境变量。内存较小的机器建议保持 `-Jobs 2`。

## 测试

```powershell
$env:PATH = 'C:\msys64\ucrt64\bin;' + $env:PATH
ctest --test-dir build --output-on-failure
```

默认测试包括化学核心、编辑与撤销、图片文字、整库 SVG 渲染、器材接口、探头和柔性端点连接、倍率与保存恢复、示例图和画布几何。测试报告位于 `build/Testing`。

需要检查 WebView2、窗口和页面导出时，开启桌面测试，在已解锁的交互桌面执行：

```powershell
.\scripts\build.ps1 -WithDesktopTests
ctest --test-dir build --output-on-failure -j 1
```

`-WithLocalArtworkTests` 用于外部素材适配的开发回归，需要相应资源，不属于默认测试。部分完整桌面回归会移动鼠标，执行时请预留桌面。

桌面测试中的 `physics_workspace` 使用内置 SVG 验证大小窗口、探头本体转向及三端接线，不需要私人 PNG 素材包。若原生鼠标测试提示无法取得前台窗口，请将测试窗口切到前台后重跑；不要跳过失败断言。

## 常见问题

- **找不到 Qt / Open Babel**：确认安装的是 UCRT64 包，并把 `-ToolchainDirectory` 指向同一套工具链，不要混用 MINGW64。
- **缺少 Lucide 图标或 esbuild**：在仓库根目录运行 `npm ci`。
- **找不到 WebView2.h**：运行 `scripts/setup-deps.ps1`；若自定义依赖目录，构建时使用相同的 `-DependencyDirectory`。
- **三维窗口无法启动**：检查 WebView2 Runtime 是否安装，以及应用数据目录是否可写。
- **双击 EXE 提示 DLL 缺失**：开发构建请通过 `run.ps1` 启动，它会设置 Qt 和 Open Babel 的运行路径。

程序数据默认位于 Windows 应用数据目录；可用 `CHEM_DATA_DIR` 覆盖。Open Babel 的数据和插件可分别通过 `BABEL_DATADIR`、`BABEL_LIBDIR` 指定。单独复制 EXE 不等于完整部署。
