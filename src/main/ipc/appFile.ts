import { ipcMain } from 'electron'
import { APP_FILE_SCHEME } from '../../../csp.constant'
import type { RevokeRootResult } from '../../shared/types'
import { revokeRoot } from '../lib/workspace'

/** rootId 由主进程用 randomBytes(8).toString('hex') 生成，只接受这个形态 */
const ROOT_ID_PATTERN = /^[0-9a-f]{16}$/

/**
 * 从 app-file URL 中取出 rootId。
 * 渲染进程持有的是完整 URL，这里只解析 host 段，不接触也不回传任何磁盘路径。
 */
const extractRootId = (url: string): string | null => {
    if (typeof url !== 'string') return null
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== `${APP_FILE_SCHEME}:`) return null
        return ROOT_ID_PATTERN.test(parsed.host) ? parsed.host : null
    } catch {
        return null
    }
}

/**
 * 撤销某个 URL 背后的根目录授权。
 * 用于「清除」按钮、切换文件，以及文件被删除 / 改名后让旧 URL 立即失效。
 */
const revokeAppFile = (_event: Electron.IpcMainInvokeEvent, url: string): RevokeRootResult => {
    const rootId = extractRootId(url)
    if (!rootId) {
        throw new Error('无效的 app-file 地址')
    }
    return { revoked: revokeRoot(rootId) }
}

export const registerAppFileHandlers = (): void => {
    ipcMain.handle('app-file:revoke', revokeAppFile)
}
