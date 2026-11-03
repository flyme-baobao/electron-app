import { app, BrowserWindow, session } from 'electron'
import path from 'node:path'
import { PRODUCTION_CSP } from '../../csp.constant'
import { registerAppFileHandlers } from './ipc/appFile'
import { registerImageHandlers } from './ipc/image'
import { registerVersionHandlers } from './ipc/versions'
import {
    disposeAppFileProtocol,
    registerAppFileProtocol,
    registerAppFileSchemePrivileges
} from './protocol'

// 由构建脚本注入：开发模式为 Vite dev server 地址，生产模式为空
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !app.isPackaged && !!DEV_SERVER_URL

// 必须在 app ready 之前执行，因此放在模块顶层
registerAppFileSchemePrivileges()

/**
 * 开发模式下使用独立的数据目录，避免多个实例同时运行时
 * 争抢同一个 Cache 目录，产生 "Unable to create cache: 拒绝访问" 报错。
 * 生产环境仍使用默认目录。
 */
if (isDev) {
    app.setPath('userData', path.join(app.getPath('appData'), `${app.getName()}-dev`))
}

/**
 * 生产环境下通过响应头下发 CSP。
 * 相比 <meta>，响应头能覆盖 frame-ancestors 等 meta 无法设置的指令，
 * 也能避免开发版 CSP 残留到打包产物中。
 */
const applyProductionCsp = (): void => {
    if (isDev) return

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [PRODUCTION_CSP]
            }
        })
    })
}

const createWindow = (): void => {
    const win = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    })

    win.once('ready-to-show', () => win.show())

    // 窗口销毁即回收根目录授权，已下发的 app-file URL 随之失效
    win.on('closed', disposeAppFileProtocol)

    if (isDev) {
        win.loadURL(DEV_SERVER_URL)
        win.webContents.openDevTools({ mode: 'detach' })
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    registerVersionHandlers()
    registerImageHandlers()
    registerAppFileHandlers()
    registerAppFileProtocol()
    applyProductionCsp()

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    disposeAppFileProtocol()
    if (process.platform !== 'darwin') app.quit()
})
