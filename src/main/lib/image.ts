import fs from 'node:fs/promises'
import path from 'node:path'
import type { ImagePreviewResult } from '../../shared/types'

/** 允许预览的图片扩展名，与文件选择对话框的过滤器保持一致 */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif']

/** 单张图片的大小上限：32 MB */
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024

const MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif'
}

/** 校验路径确实是受支持的图片，返回对应 MIME 类型；不合法时抛错 */
const resolveImageMimeType = (filePath: string): string => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
        throw new Error('文件路径无效')
    }

    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext.slice(1))) {
        throw new Error(`不支持的文件类型：${ext || '无扩展名'}`)
    }

    return MIME_TYPES[ext]
}

/** 读取图片并转换为 data URL，供渲染进程直接用于 <img :src> */
export const readImageAsDataUrl = async (filePath: string): Promise<ImagePreviewResult> => {
    const mimeType = resolveImageMimeType(filePath)

    const stat = await fs.stat(filePath)
    if (!stat.isFile()) {
        throw new Error('目标不是文件')
    }
    if (stat.size > MAX_IMAGE_BYTES) {
        throw new Error(`图片过大（${(stat.size / 1024 / 1024).toFixed(1)} MB），上限 32 MB`)
    }

    const buffer = await fs.readFile(filePath)
    return {
        filePath,
        fileName: path.basename(filePath),
        dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
        size: stat.size,
        mimeType
    }
}
