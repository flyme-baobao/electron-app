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
├── src/
│   ├── main/index.ts         # 主进程
│   ├── preload/              # 预加载脚本
│   │   ├── index.ts
│   │   └── global.d.ts
│   └── renderer/             # 渲染进程（Vue 3）
│       ├── main.ts
│       ├── App.vue
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

### `src/main/index.ts` — 主进程

运行在 Node.js 环境，应用的唯一入口。

- 创建 `BrowserWindow`
- 开发模式加载 Vite dev server，生产模式加载 `dist/index.html`
- 管理应用生命周期（`whenReady`、`activate`、`window-all-closed`）
- 通过 `ipcMain.handle` 向渲染进程提供数据

**为什么用 `show: false`**：窗口先隐藏，等 `ready-to-show` 再显示，避免用户看到白屏。

### `src/preload/index.ts` — 预加载脚本

运行在渲染进程的隔离上下文中，是主进程与页面之间唯一的通道。

```ts
contextBridge.exposeInMainWorld('electronAPI', {
    getVersions: () => ipcRenderer.invoke('get-versions')
})
```

**为什么不能直接暴露 `ipcRenderer`**：那等于把任意 IPC 调用能力交给页面，失去隔离意义。只暴露白名单函数。

### `src/preload/global.d.ts` — 全局类型声明

为 `window.electronAPI` 提供类型，让渲染进程调用时获得补全与校验。

### `src/renderer/main.ts` — Vue 应用入口

`createApp(App).mount('#app')`，被 `index.html` 以 ES Module 方式引入。

### `src/renderer/App.vue` — 根组件

示例根组件：挂载后调用 `window.electronAPI.getVersions()` 显示各运行时版本号。

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