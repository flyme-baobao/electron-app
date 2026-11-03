import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

// 由构建脚本注入：开发模式为 Vite dev server 地址，生产模式为空
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !app.isPackaged && !!DEV_SERVER_URL

const createWindow = (): void => {
    const win = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    })

    win.once('ready-to-show', () => win.show())

    if (isDev) {
        win.loadURL(DEV_SERVER_URL)
        win.webContents.openDevTools({ mode: 'detach' })
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// 暴露给渲染进程的运行时版本信息
ipcMain.handle('get-versions', () => ({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
}))