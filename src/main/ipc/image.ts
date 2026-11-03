import { BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'node:path'
import type { ImagePreviewResult } from '../../shared/types'
import { IMAGE_EXTENSIONS, describeImage } from '../lib/image'

const buildDialogOptions = (): Electron.OpenDialogOptions => ({
    title: '选择图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }]
})

/** 弹出系统文件选择框，用户选中后返回预览描述；取消则返回 null */
const pickImage = async (event: Electron.IpcMainInvokeEvent): Promise<ImagePreviewResult | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = buildDialogOptions()

    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    return describeImage(result.filePaths[0])
}

/**
 * 拖拽 / 截图中得到的绝对路径，只用于换取 app-file URL。
 * 校验逻辑与「选择文件」走同一条路径，渲染进程拿不到任何原始路径回程。
 */
const describeByPath = (
    _event: Electron.IpcMainInvokeEvent,
    filePath: string
): Promise<ImagePreviewResult> => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
        throw new Error('文件路径无效')
    }
    return describeImage(filePath)
}

export const registerImageHandlers = (): void => {
    ipcMain.handle('image:pick', pickImage)
    ipcMain.handle('image:describe', describeByPath)
}
