# my-electron-app

一个 Electron + Vue 3 + Vite + TypeScript 桌面应用示例项目。

基于 Electron 的桌面客户端，使用 Node.js + Chromium 技术栈，可跨平台打包运行（Windows / macOS / Linux）。

启动后会打开一个窗口，页面中会显示当前运行环境的 Node.js、Chromium 和 Electron 版本号。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [开发启动时序](./docs/dev-startup.md) | `npm run dev` 的完整启动过程、时序图、各类改动如何生效 |
| [IPC 通信](./docs/ipc.md) | 主进程与渲染进程的通信机制、通道配对、参数与错误处理 |
| [项目文件说明](./docs/files.md) | 各文件与目录的职责、配置项含义、依赖放置约定 |


## 环境要求

- Node.js 推荐版本：`v20+`（Electron 45 内置 Node 24；宿主 Node 仅用于运行 npm 与构建脚本）
- 包管理器：`npm`

## 安装依赖

```bash
npm install
```

> 国内网络环境下安装 Electron 若卡在下载二进制包，可配置镜像：
> `npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/`

## 开发

```bash
npm run dev
```

同时启动三个进程：

| 进程 | 作用 |
| --- | --- |
| `dev:renderer` | Vite dev server（默认 5173，被占用时自动顺延），渲染进程热更新 |
| `dev:node` | esbuild 监听编译 `src/main`、`src/preload` 到 `out/` |
| `dev:electron` | 读取 Vite 实际端口后启动 Electron，加载 dev server |

改动主进程/预加载脚本后 esbuild 会重新编译，但 **Electron 主进程不会自动重启**，需要手动结束进程后再 `npm run dev`。

详细的启动过程与时序图见 [开发启动时序](./docs/dev-startup.md)。

## 构建

```bash
npm run build
```

依次执行类型检查（`vue-tsc` + `tsc`）、渲染进程打包（Vite → `dist/`）、主进程/预加载编译（esbuild → `out/`）。

```bash
npm run preview   # 构建后以生产模式启动，验证产物
```

## 项目结构

```
electron-app/
├── build/
│   ├── node.mjs              # esbuild 构建脚本（主进程 / 预加载）
│   └── dev-electron.mjs      # 开发模式启动器（读端口后拉起 Electron）
├── docs/
│   ├── dev-startup.md        # 开发启动时序说明
│   ├── ipc.md                # IPC 通信说明
│   └── files.md              # 项目文件说明
├── src/
│   ├── main/
│   │   ├── index.ts          # 主进程入口：创建窗口、注册 IPC
│   │   ├── ipc/              # IPC 处理器（versions、image）
│   │   └── lib/              # 不依赖 electron 的纯逻辑
│   ├── preload/
│   │   ├── index.ts          # 预加载脚本，contextBridge 暴露 API
│   │   └── global.d.ts       # window.electronAPI 类型声明
│   ├── shared/
│   │   └── types.ts          # 主进程与渲染进程共享的类型
│   └── renderer/             # 渲染进程（Vue 3）
│       ├── main.ts           # Vue 应用入口
│       ├── App.vue           # 根组件
│       ├── components/
│       │   └── ImagePreview.vue  # 图片预览组件
│       ├── style.css
│       └── env.d.ts
├── index.html                # Vite 入口 HTML
├── vite.config.ts
├── tsconfig.json             # 引用下面两个
├── tsconfig.node.json        # 主进程 / 预加载 / vite.config
├── tsconfig.web.json         # 渲染进程
├── .editorconfig
└── package.json
```

构建产物：

- `out/main.cjs`、`out/preload.cjs` —— 主进程与预加载（CommonJS，供 Electron 加载）
- `dist/` —— 渲染进程静态资源

> `package.json` 使用 `"type": "module"`，而 Electron 主进程需以 CommonJS 运行，因此 esbuild 输出 `.cjs` 扩展名，`main` 字段指向 `out/main.cjs`。

## 核心文件说明

### src/main/index.ts —— 主进程

运行在 Node.js 环境中，负责创建窗口与控制应用生命周期：

- `createWindow()`：创建 `900 x 670` 的 `BrowserWindow`，挂载预加载脚本，开发模式加载 Vite dev server，生产模式加载 `dist/index.html`。
- `app.whenReady()`：应用就绪后创建窗口；macOS 上监听 `activate` 事件，Dock 图标被点击且无窗口时重新创建。
- `window-all-closed`：所有窗口关闭后退出应用，macOS 下保持常驻。
- `ipcMain.handle('get-versions')`：向渲染进程提供运行时版本信息。

### src/preload/index.ts —— 预加载脚本

通过 `contextBridge.exposeInMainWorld` 只暴露白名单 API：

```ts
contextBridge.exposeInMainWorld('electronAPI', {
  getVersions: () => ipcRenderer.invoke('get-versions')
})
```

渲染进程中通过 `window.electronAPI.getVersions()` 调用，类型由 `global.d.ts` 声明。

### src/renderer/ —— 渲染进程

Vue 3 应用，`main.ts` 挂载 `App.vue`，`onMounted` 时调用 `window.electronAPI.getVersions()` 渲染版本号。

## 进程模型

```
主进程 (src/main/index.ts → out/main.cjs, Node.js)
   │  创建
   ▼
BrowserWindow
   └── 渲染进程 (Vue 3 + Vite → dist/, Chromium)
         ▲
         │ 在页面加载前注入
      预加载脚本 (src/preload/index.ts → out/preload.cjs)
```

## 依赖放置约定

Vue 及相关构建工具全部放在 `devDependencies`：它们会被 Vite 打包进 `dist/`，运行时不需要 `node_modules`。
只有**主进程运行时真正 `require()` 的第三方包**（如原生模块）才需要放进 `dependencies`。

## 安全配置

```ts
webPreferences: {
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,   // 隔离预加载与页面上下文
  nodeIntegration: false,   // 页面中不暴露 Node.js
  sandbox: true             // 沙箱模式下 preload 仍可用 require('electron')
}
```

主进程与渲染进程的通信机制见 [IPC 通信](./docs/ipc.md)。如需在 IPC 中访问本地文件，务必对路径做白名单校验，避免路径穿越。

## 常见问题

| 现象 | 排查方向 |
| --- | --- |
| `npm run dev` 报 `Port 5173 is already in use` | 有其他 Vite 进程占用端口，结束对应进程或修改 `vite.config.ts` 的 `server.port` |
| Electron 打开是白屏 | 确认 Vite dev server 已就绪；生产模式检查 `dist/index.html` 是否存在 |
| `window.electronAPI` undefined | 检查 preload 是否编译成功（`out/preload.cjs`），以及窗口是否在 preload 改动前就已打开 |
| 改了主进程代码没生效 | 主进程不热重载，需重启 `npm run dev` |
| 页面中版本号为空 | 打开 DevTools（`Ctrl + Shift + I`）查看 preload 与 IPC 报错 |

## 打包发布

项目目前未配置打包工具。可选用 [Electron Forge](https://www.electronforge.io/) 或
[electron-builder](https://www.electron.build/)。注意打包配置需包含 `out/` 与 `dist/`，入口指向 `out/main.cjs`。

```bash
npm install --save-dev electron-builder
npx electron-builder --win --x64
```

## 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [Vue 3 文档](https://cn.vuejs.org/)
- [Vite 文档](https://cn.vite.dev/)
- [进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model)

## License

ISC