/** 主进程与渲染进程共享的类型定义 */

export interface RuntimeVersions {
    node: string
    chrome: string
    electron: string
}

export interface ImagePreviewResult {
    /** 文件名（含扩展名），仅用于界面展示 */
    fileName: string
    /** 文件大小，单位字节 */
    size: number
    /** 图片 MIME 类型 */
    mimeType: string
    /**
     * `app-file://<rootId>/<文件名>` 形式的访问地址。
     * 由自定义协议在 Chromium 网络栈内直接读取磁盘，不经过 IPC 传输二进制，
     * 也不包含任何真实磁盘路径。可直接用于 <img :src>。
     */
    url: string
}
