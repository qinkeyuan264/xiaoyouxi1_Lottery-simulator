# 小游戏1（桌面版）- Lottery Simulator

这是一个基于 **Tauri + React + TypeScript + Vite** 的桌面版小游戏项目，包含抽奖/刮刮乐等玩法页面，并支持打包成 Windows/macOS/Linux 桌面应用（取决于你的构建环境）。

## 功能一览

- **桌面端应用**：Tauri 壳 + Web 前端渲染
- **多页面玩法**：包含抽奖/刮刮乐相关页面（详见 `src/features/`）
- **3D 场景**：基于 `three` / `@react-three/fiber` / `@react-three/drei`
- **状态管理**：`zustand`
- **样式**：`tailwindcss`

## 环境要求

- **Node.js**：建议 20+（本项目脚本里也使用了 Node 22 的发布构建方式）
- **Rust 工具链**（仅在打包桌面端时需要）：安装 Rust + Cargo
- **Tauri 依赖**：Windows 下通常还需要安装 WebView2、以及对应的构建工具（按 Tauri 官方文档配置即可）

## 快速开始（开发模式）

安装依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

以 Tauri 桌面模式启动（会自动启动 Vite 并打开桌面窗口）：

```bash
npm run tauri dev
```

## 构建与打包

构建前端静态资源：

```bash
npm run build
```

预览前端构建产物：

```bash
npm run preview
```

打包生成桌面安装包/可执行文件：

```bash
npm run tauri build
```

一键发布构建（先 build 再 tauri build）：

```bash
npm run release
```

## 项目结构

- `src/`：前端源码
  - `src/features/`：各玩法功能模块（推荐从这里开始看）
  - `src/pages/`：页面
  - `src/components/`：通用组件
- `src-tauri/`：Tauri（Rust）侧代码与配置
- `public/`：静态资源

## 注意事项

- **请勿提交私钥**：`.gitignore` 已忽略 `src-tauri/tauri-app.key`（仅公钥 `.pub` 可提交）
- **大目录不会进仓库**：`node_modules/`、`dist/` 已被忽略

## 推荐开发工具

- [VS Code](https://code.visualstudio.com/)
- [Tauri 插件](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
