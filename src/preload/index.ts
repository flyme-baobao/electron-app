import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ImagePreviewResult, RevokeRootResult, RuntimeVersions } from '../shared/types'

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
     * 撤销某个 app-file 地址背后的根目录授权，之后该地址一律 404。
     * 用于清除预览、切换文件，以及源文件被删除或改名后的失效处理。
     */
    revokeAppFile: (url: string): Promise<RevokeRootResult> => ipcRenderer.invoke('app-file:revoke', url),

    /**
     * 获取拖拽进窗口的 File 对象对应的磁盘路径。
     * Electron 32 起 File.path 已被移除，必须通过 webUtils 获取。
     */
    getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
