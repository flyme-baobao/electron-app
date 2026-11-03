/** 主进程与渲染进程共享的类型定义 */

export interface RuntimeVersions {
    node: string
    chrome: string
    electron: string
}

export interface ImagePreviewResult {
    /** 图片在磁盘上的绝对路径 */
    filePath: string
    /** 文件名（含扩展名） */
    fileName: string
    /** data URL，可直接用于 <img :src> */
    dataUrl: string
    /** 文件大小，单位字节 */
    size: number
    /** 图片 MIME 类型 */
    mimeType: string
}
