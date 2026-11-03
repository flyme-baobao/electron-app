# my-electron-app

一个 Electron 桌面应用示例项目。

基于 Electron 开发的桌面客户端，使用 Node.js + Chromium 技术栈，可跨平台打包运行（Windows / macOS / Linux）。

当前 Electron 版本：`latest`（安装时为 Electron 45，内置 Chromium 156 / Node.js 24）

启动后会打开一个窗口，页面中会显示当前运行环境的 Node.js、Chromium 和 Electron 版本号 —— 这是 Electron 官方快速入门教程的标准示例。

## 环境要求

- Node.js 推荐版本：`v20+`（Electron 45 内置 Node 24；宿主 Node 仅用于运行 npm 与构建脚本，但版本过低时部分依赖会安装失败）
- 包管理器：`npm` / `yarn` / `pnpm`

## 安装依赖

```bash
# 安装项目依赖
npm install

# 或安装 / 升级到 Electron 最新稳定版
npm install --save-dev electron@latest
```

> `electron@latest` 会解析到当前最新的稳定大版本（撰写时为 Electron 45）。Electron 官方只维护最新 3 个稳定大版本，大版本约 8 周发布一次，升级前建议查看 [发布页](https://releases.electronjs.org/) 与迁移说明。
>
> 国内网络环境下安装 Electron 若卡在下载二进制包，可配置镜像：
> `npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/`

## 运行

```bash
npm start
```

等同于 `electron .`，Electron 会读取 `package.json` 中的 `main` 字段（即 `main.js`）作为主进程入口。

## 项目结构

```
my-electron-app/
├── main.js           # 主进程：创建窗口、管理应用生命周期
├── preload.js        # 预加载脚本：在页面加载前注入版本信息
├── index.html        # 渲染进程页面
├── package.json      # 项目配置，main 字段指向主进程入口
└── README.md
```

## 核心文件说明

### main.js —— 主进程

运行在 Node.js 环境中，负责创建窗口与控制应用生命周期：

- `createWindow()`：创建一个 `800 x 600` 的 `BrowserWindow`，通过 `preload` 选项挂载预加载脚本，并加载 `index.html`。
- `app.whenReady()`：应用就绪后创建窗口；在 macOS 上监听 `activate` 事件，当 Dock 图标被点击且没有窗口时重新创建窗口。
- `window-all-closed`：所有窗口关闭后退出应用，但 macOS 下保持应用常驻（符合平台惯例）。

### preload.js —— 预加载脚本

运行在渲染进程的上下文中、页面脚本执行之前，可以安全地访问部分 Node.js API：

- 监听 `DOMContentLoaded` 事件；
- 读取 `process.versions` 中的 `chrome`、`node`、`electron` 版本号；
- 将版本号写入页面中对应的 `<span>` 元素，同时打印到控制台。

### index.html —— 渲染进程页面

纯粹的 HTML 页面，包含用于显示各运行时版本号的占位元素（`#node-version`、`#chrome-version`、`#electron-version`）。

## 进程模型

```
主进程 (main.js, Node.js)
   │  创建
   ▼
BrowserWindow
   └── 渲染进程 (index.html, Chromium)
         ▲
         │ 在页面加载前注入
      预加载脚本 (preload.js)
```

- **主进程**：整个应用只有一个，是应用的入口，拥有完整的 Node.js 能力。
- **渲染进程**：每个窗口一个，运行网页，默认只能使用浏览器 API。
- **预加载脚本**：运行于渲染进程但拥有 Node.js 能力，是主进程与渲染进程之间安全的桥梁（常配合 `contextBridge` 暴露受控 API）。

## 安全建议

当前示例的 `webPreferences` 未显式配置安全选项，若在此基础上开发真实应用，建议：

```js
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,   // 默认值，隔离预加载与页面上下文
  nodeIntegration: false,   // 默认值，页面中不直接暴露 Node.js
  sandbox: true
}
```

并通过 `contextBridge.exposeInMainWorld()` 只暴露必要的 API，避免直接向页面开放 `require` 或 `ipcRenderer`。

## 打包发布

项目目前未配置打包工具。可选用 [Electron Forge](https://www.electronforge.io/) 或 [electron-builder](https://www.electron.build/)：

```bash
# 以 electron-builder 为例
npm install --save-dev electron-builder
```

在 `package.json` 中添加 `build` 配置与脚本后执行：

```bash
npx electron-builder --win --x64
```

产物默认输出到 `dist/` 目录。

## 常见问题

| 现象 | 排查方向 |
| --- | --- |
| 窗口打开但页面空白 | 确认 `win.loadFile('index.html')` 路径正确，打开开发者工具查看报错 |
| 页面中版本号为空 | 打开 DevTools（`Ctrl + Shift + I`）检查 `preload.js` 是否加载成功 |
| 启动报原生模块错误 | 宿主 Node.js 与 Electron 内置 Node 主版本不一致，使用 `20+` 或通过 `electron-rebuild` 重建原生模块 |
| `npm install` 卡在 electron 二进制下载 | 配置 `ELECTRON_MIRROR` 镜像，或删除 `node_modules` 后重装 |

## 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [Electron 快速入门教程](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model)

## License

ISC
