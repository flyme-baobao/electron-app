import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ImagePreviewResult, RuntimeVersions } from '../shared/types'

const api = {
    getVersions: (): Promise<RuntimeVersions> => ipcRenderer.invoke('get-versions'),

    /** 打开系统文件选择框，返回选中图片的预览描述；用户取消时返回 null */
    pickImage: (): Promise<ImagePreviewResult | null> => ipcRenderer.invoke('image:pick'),

    /**
     * 按绝对路径换取 app-file 预览地址，用于拖拽场景。
     * 返回值中不含该路径，渲染进程无法反向获得真实磁盘位置。
     */
    describeImage: (filePath: string): Promise<ImagePreviewResult> =>
        ipcRenderer.invoke('image:describe', filePath),

    /**
     * 获取拖拽进窗口的 File 对象对应的磁盘路径。
     * Electron 32 起 File.path 已被移除，必须通过 webUtils 获取。
     */
    getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
