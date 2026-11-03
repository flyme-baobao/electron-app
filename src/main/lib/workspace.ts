import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/** 每个根目录在协议 URL 中暴露的标识：8 字节随机数，反向不可推出真实路径 */
type RootId = string

/** rootId → 根目录真实绝对路径。仅存在于主进程内存中 */
const roots = new Map<RootId, string>()

/** rootId → 原始大小写路径。Windows 上 realpath 结果被转成小写，回读文件时要用原始形态 */
const displayPaths = new Map<RootId, string>()

/** 使用 realpath 消除符号链接与 `..`，Windows 下同时统一大小写与分隔符 */
const canonicalize = async (target: string): Promise<string> => {
    try {
        const resolved = await fs.realpath(target)
        return process.platform === 'win32' ? resolved.toLowerCase() : resolved
    } catch {
        // 路径尚不存在（例如刚被删除）时退化为字面量解析
        const resolved = path.resolve(target)
        return process.platform === 'win32' ? resolved.toLowerCase() : resolved
    }
}

/**
 * 授权一个目录，返回可安全下发到渲染进程的 rootId。
 * 同一目录重复授权会复用已有 id，避免根目录表无限增长。
 */
export const authorizeRoot = async (dirPath: string): Promise<RootId> => {
    const stat = await fs.stat(dirPath)
    if (!stat.isDirectory()) {
        throw new Error('只能授权目录')
    }

    const canonical = await canonicalize(dirPath)
    for (const [id, root] of roots) {
        if (root === canonical) return id
    }

    const id = randomBytes(8).toString('hex')
    roots.set(id, canonical)
    displayPaths.set(id, (await fs.realpath(dirPath)))
    return id
}

/**
 * 把「rootId + 相对路径」解析为绝对路径。
 * 任何越出根目录的请求（`..`、绝对路径、符号链接逃逸）都返回 null。
 */
export const resolveInsideRoot = async (rootId: string, relativePath: string): Promise<string | null> => {
    const root = roots.get(rootId)
    const displayRoot = displayPaths.get(rootId)
    if (!root || !displayRoot) return null

    // 协议 URL 的 pathname 以 / 开头；Windows 上还要先去掉盘符式的前导斜杠
    const normalized = relativePath.replace(/^\/+/, '')
    if (normalized.length === 0) return null

    const absolute = await canonicalize(path.resolve(root, normalized))
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
        return null
    }

    // 校验用规范化路径，回读用原始大小写路径（相对关系已确认安全）
    return path.join(displayRoot, normalized)
}

/** 回收全部授权记录。窗口关闭或应用退出时调用，避免已下发的 URL 长期有效 */
export const revokeAllRoots = (): void => {
    roots.clear()
    displayPaths.clear()
}
