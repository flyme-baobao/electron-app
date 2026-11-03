# 项目文件说明

各文件与目录的职责，以及为什么需要它们。

---

## 目录总览

```
electron-app/
├── build/                    # 构建脚本
│   ├── node.mjs              # esbuild：编译主进程与预加载
│   └── dev-electron.mjs      # 等待条件并启动 Electron
├── docs/                     # 项目文档
│   ├── dev-startup.md        # 开发启动时序
│   ├── ipc.md                # IPC 通信
│   └── files.md              # 本文
├── src/
│   ├── shared/types.ts       # 主进程与渲染进程共享的类型
│   ├── main/                 # 主进程
│   │   ├── index.ts          # 入口：创建窗口、注册 IPC
│   │   ├── ipc/              # IPC 处理器
│   │   │   ├── versions.ts
│   │   │   └── image.ts
│   │   └── lib/              # 不依赖 electron 的纯逻辑
│   │       └── image.ts
│   ├── preload/              # 预加载脚本
│   │   ├── index.ts
│   │   └── global.d.ts
│   └── renderer/             # 渲染进程（Vue 3）
│       ├── main.ts
│       ├── App.vue
│       ├── components/
│       │   └── ImagePreview.vue
│       ├── style.css
│       └── env.d.ts
├── index.html                # Vite 入口 HTML
├── vite.config.ts
├── tsconfig.json             # 根配置，引用下面两个
├── tsconfig.node.json        # 主进程 / 预加载 / 构建脚本
├── tsconfig.web.json         # 渲染进程
├── .editorconfig
├── package.json
└── README.md

# 构建产物（已 gitignore）
├── out/                      # 主进程、预加载编译结果
└── dist/                     # 渲染进程打包结果
```

---

## 源码

### `src/shared/types.ts` — 共享类型

主进程、preload、渲染进程共同引用的类型定义（`RuntimeVersions`、`ImagePreviewResult`）。

渲染进程只从这里取类型，**不直接引用 preload 源码**，避免产生不必要的耦合。

### `src/main/index.ts` — 主进程入口

运行在 Node.js 环境，应用的唯一入口。

- 创建 `BrowserWindow`
- 开发模式加载 Vite dev server，生产模式加载 `dist/index.html`
- 管理应用生命周期（`whenReady`、`activate`、`window-all-closed`）
- 在 `whenReady` 中调用各模块的 `registerXxxHandlers()` 完成 IPC 注册

**为什么用 `show: false`**：窗口先隐藏，等 `ready-to-show` 再显示，避免用户看到白屏。

**为什么先注册再建窗口**：页面一加载就会调用 IPC，handler 未注册时 `invoke` 会直接失败。

### `src/main/ipc/` — IPC 处理器

| 文件 | 通道 | 职责 |
| --- | --- | --- |
| `versions.ts` | `get-versions` | 返回运行时版本信息 |
| `image.ts` | `image:pick` | 弹文件对话框读取图片 |
| `image.ts` | `image:read` | 按路径读取图片（拖拽场景） |

这一层依赖 electron（`ipcMain`、`dialog`、`BrowserWindow`）。

### `src/main/lib/` — 纯逻辑

| 文件 | 职责 |
| --- | --- |
| `image.ts` | 扩展名白名单校验、MIME 映射、大小限制、读取并转 data URL |

**不依赖 electron**，只用 `node:fs` 与 `node:path`，因此可以独立进行单元测试，无需 mock。

### `src/preload/index.ts` — 预加载脚本

运行在渲染进程的隔离上下文中，是主进程与页面之间唯一的通道。

```ts
contextBridge.exposeInMainWorld('electronAPI', {
    getVersions: () => ipcRenderer.invoke('get-versions')
})
```

暴露的 API：`getVersions`、`pickImage`、`readImage`、`getPathForFile`。

**为什么不能直接暴露 `ipcRenderer`**：那等于把任意 IPC 调用能力交给页面，失去隔离意义。只暴露白名单函数。

**为什么需要 `getPathForFile`**：Electron 32 起 `File.path` 已移除，拖拽文件必须使用
`webUtils.getPathForFile()`，而它只在 preload 世界可用。该函数不是 IPC，是本地同步调用。

详细机制见 [IPC 通信](./ipc.md)。

### `src/preload/global.d.ts` — 全局类型声明

为 `window.electronAPI` 提供类型，让渲染进程调用时获得补全与校验。

`ElectronAPI` 由 `typeof api` 推导，新增 preload 函数时无需手动维护类型。

### `src/renderer/main.ts` — Vue 应用入口

`createApp(App).mount('#app')`，被 `index.html` 以 ES Module 方式引入。

### `src/renderer/App.vue` — 根组件

挂载后调用 `window.electronAPI.getVersions()` 显示各运行时版本号，并挂载图片预览组件。

### `src/renderer/components/ImagePreview.vue` — 图片预览组件

- 「选择图片」按钮，触发系统文件对话框
- 支持拖拽图片进窗口
- 显示文件名、MIME 类型、大小
- 加载状态、错误提示、解码失败兜底

### `src/renderer/env.d.ts` — 渲染进程类型声明

- `vite/client` 类型（`import.meta.env`、静态资源导入等）
- `*.vue` 模块声明，让纯 `tsc` 也能识别 `.vue` 导入

> 没有 `.vue` 声明时，`vue-tsc` 能通过但 `tsc` 会报 `TS2307: Cannot find module './App.vue'`。

---

## 配置

### `index.html`

Vite 的入口 HTML，必须放在项目根目录。产物中会被复制到 `dist/`。

### `vite.config.ts`

- `base: './'`：Electron 以 `file://` 加载产物，必须是相对路径
- `@` 别名指向 `src/renderer`
- **端口探测**：从 5173 起找空闲端口，写入 `node_modules/.vite-dev-port`
- `build.outDir: 'dist'`

### `tsconfig.json`

只有 `references`，不写 `compilerOptions`。实际配置拆到下面两个文件，因为主进程（Node）与渲染进程（DOM）的 `lib`、`types` 完全不同。

### `tsconfig.node.json`

覆盖 `vite.config.ts`、`src/main/**`、`src/preload/**`，`types: ["node"]`，无 DOM。

### `tsconfig.web.json`

覆盖 `src/renderer/**` 与 `src/preload/**/*.d.ts`，含 `DOM` 相关 `lib`。

> TypeScript 6 中 `baseUrl` 已弃用，`paths` 采用相对 tsconfig 所在目录的写法。

### `.editorconfig`

统一缩进（4 空格）、换行符（LF）、编码（UTF-8）、行宽与末尾换行规则。

---

## 构建脚本

### `build/node.mjs`

用 esbuild 编译主进程与预加载。

| 输入 | 输出 |
| --- | --- |
| `src/main/index.ts` | `out/main.cjs` |
| `src/preload/index.ts` | `out/preload.cjs` |

**为什么输出 `.cjs`**：`package.json` 设置了 `"type": "module"`，而 Electron 主进程需要以 CommonJS 加载。
使用 `.cjs` 扩展名可绕过 `type: module` 的影响。

**为什么不用 Vite 打包主进程**：主进程不是浏览器环境，Vite 面向 Web。esbuild 轻量、快，且不引入额外框架依赖。

### `build/dev-electron.mjs`

开发模式启动器：

1. 等 `out/main.cjs` 生成
2. 等 `node_modules/.vite-dev-port` 写入
3. 读取端口，设置 `VITE_DEV_SERVER_URL`
4. `spawn` 启动 Electron

替代了原先写死端口的 `wait-on tcp:5173`，避免端口顺延后 Electron 连错地址。

---

## 产物

| 目录 | 何时生成 | 作用 |
| --- | --- | --- |
| `out/` | `dev:node` / `build:node` | 主进程与预加载，Electron 直接执行 |
| `dist/` | `build:renderer` | 渲染进程静态资源，生产模式由 `loadFile` 加载 |

两个目录都已在 `.gitignore` 中排除。

---

## 依赖放置约定

Vue 与全部构建工具放在 `devDependencies`：它们会被 Vite 打包进 `dist/`，运行时不需要 `node_modules`。

只有**主进程运行时真正 `require()` 的第三方包**（如原生模块）才放进 `dependencies`。