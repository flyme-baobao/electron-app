import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import { APP_FILE_SCHEME } from '../../csp.constant'
import { resolveInsideRoot, revokeAllRoots } from './lib/workspace'

/** 允许发起 app-file 请求的页面 origin：开发态是 Vite dev server，生产态是 file:// */
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

/**
 * Electron 在协议处理器的 Request 上额外挂了 initiatorOrigin，
 * 但 tsconfig.node.json 的 lib 不含 DOM，GlobalRequest 解析到 Node 的 Request 类型，
 * 因此这里显式声明需要的字段。
 */
interface AppFileRequest extends Request {
    initiatorOrigin?: string
}

/** 协议处理器只接受由本应用页面发起的请求，拒绝来自 iframe / 其它文档的访问 */
const isTrustedInitiator = (initiatorOrigin: string | undefined): boolean => {
    if (!initiatorOrigin) return false
    if (DEV_SERVER_URL) return initiatorOrigin === new URL(DEV_SERVER_URL).origin
    return initiatorOrigin === 'file://' || initiatorOrigin === 'null'
}

/**
 * 必须在 app ready 之前、且只能调用一次。
 * 不开启 bypassCSP：放行 app-file 应该写在 CSP 里显式声明，避免留一条绕过通道。
 */
export const registerAppFileSchemePrivileges = (): void => {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: APP_FILE_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                // 让 <video> / pdf.js 可以使用 Range 请求，实现按需流式读取
                stream: true
            }
        }
    ])
}

/**
 * 注册 app-file 处理器。真正的文件 IO 交给 Chromium 的 net 模块，
 * 主进程只负责鉴权与路径解析，二进制内容不经过 IPC。
 */
export const registerAppFileProtocol = (): void => {
    protocol.handle(APP_FILE_SCHEME, async (request: AppFileRequest) => {
        if (!isTrustedInitiator(request.initiatorOrigin)) {
            return new Response('Forbidden', { status: 403 })
        }

        const url = new URL(request.url)
        const absolutePath = await resolveInsideRoot(url.host, decodeURIComponent(url.pathname))
        if (!absolutePath) {
            return new Response('Not Found', { status: 404 })
        }

        try {
            return await net.fetch(pathToFileURL(absolutePath).toString())
        } catch {
            return new Response('Not Found', { status: 404 })
        }
    })
}

export const disposeAppFileProtocol = (): void => {
    revokeAllRoots()
}
