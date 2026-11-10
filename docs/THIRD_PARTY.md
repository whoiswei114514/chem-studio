# 第三方依赖与许可

WTFPL v2 适用于本项目编写的代码、中文文档、`assets/apparatus` 器材图以及生化素材中的原创图。依赖项与第三方素材仍由各自作者持有权利，并按其许可提供。

| 依赖 | 用途 | 许可 / 条款 |
| --- | --- | --- |
| Qt 6 | 桌面界面、SVG、打印、测试 | LGPL / GPL / 商业许可，具体以使用模块为准 |
| Open Babel | 分子格式、化学数据、结构生成 | GPL v2；见附带许可和上游文件 |
| Three.js | 三维分子渲染 | MIT |
| Lucide | 界面图标 | ISC，部分图标继承 Feather 的 MIT 许可 |
| esbuild | 构建浏览器端代码 | MIT |
| Microsoft WebView2 | Windows 内嵌浏览器 | Microsoft SDK / Runtime 条款 |
| Boost | 编译时工具库 | Boost Software License 1.0 |
| Servier / Bioicons | 6 项生化器材 SVG，裁边与调色 | CC BY 3.0 |
| DBCLS / Bioicons | 3 项生化器材 SVG，裁边与调色 | CC BY 4.0 |

上游资料：[Qt 许可](https://doc.qt.io/qt-6/licensing.html)、[Open Babel](https://github.com/openbabel/openbabel)、[Three.js](https://github.com/mrdoob/three.js)、[Lucide](https://github.com/lucide-icons/lucide)、[esbuild](https://github.com/evanw/esbuild)、[WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)、[Boost](https://www.boost.org/users/license.html)。

仓库 `licenses` 目录保留所需的第三方许可文本；实际依赖版本由 CMake 使用的系统包、`package-lock.json` 和 SDK 下载脚本共同决定。

## 分发构建产物

源码中的 WTFPL 声明不代表带依赖的程序只受 WTFPL 约束。本项目链接 Open Babel；分发组合程序时，需要处理 GPL 对对应源码、许可文本等的要求，同时满足 Qt 和其他依赖的适用条款。当前仓库提供源码，不把完整依赖环境重新打包为安装程序。

用户自行导入的图片或外部素材包不自动获得本项目的 WTFPL 授权。请保留其自身许可信息。

内置生化素材的逐项作者、上游链接、修改说明和哈希见 [署名清单](../assets/biochemistry/ATTRIBUTION.md) 与 `manifest.json`。许可正文保存在 `licenses/CC-BY-3.0.txt` 和 `licenses/CC-BY-4.0.txt`。再分发相应图或含这些图的导出报告时，须保留对应署名和许可说明；不表示原作者认可本项目或实验结论。

全部 34 个源素材都是可编辑矢量 SVG。部分第三方图含复杂裁剪定义，导出 SVG 时沿用现有兼容路径，嵌入该图的栅格渲染；25 个原创新增图保持矢量路径。这不改变原素材的许可要求。
