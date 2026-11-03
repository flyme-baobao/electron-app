/**
 * 生产环境 CSP 的单一来源，供主进程与 vite.config.ts 共同引用。
 * 开发环境的 CSP 写在 index.html 里（Vite HMR 需要 eval 与 WebSocket），不走这里。
 */

/** 自定义文件协议，用于让 Chromium 直接读取磁盘文件 */
export const APP_FILE_SCHEME = 'app-file'

export const PRODUCTION_CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${APP_FILE_SCHEME}:`,
    `media-src 'self' ${APP_FILE_SCHEME}:`,
    "font-src 'self' data:",
    `connect-src 'self' ${APP_FILE_SCHEME}:`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
]

export const PRODUCTION_CSP = PRODUCTION_CSP_DIRECTIVES.join('; ')
