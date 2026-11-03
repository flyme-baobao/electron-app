import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { ImagePreviewResult } from '../../shared/types'
import { IMAGE_EXTENSIONS, readImageAsDataUrl } from '../lib/image'

/** 弹出系统文件选择框，用户选中后直接返回预览数据；取消则返回 null */
const pickImage = async (event: Electron.IpcMainInvokeEvent): Promise<ImagePreviewResult | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
        title: '选择图片',
        properties: ['openFile'],
        filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }]
    }

    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    return readImageAsDataUrl(result.filePaths[0])
}

export const registerImageHandlers = (): void => {
    ipcMain.handle('image:pick', pickImage)

    // 按路径读取图片，用于拖拽场景
    ipcMain.handle('image:read', (_event, filePath: string): Promise<ImagePreviewResult> =>
        readImageAsDataUrl(filePath)
    )
}
