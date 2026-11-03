import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'node:net'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const PREFERRED_PORT = 5173
const rootDir = import.meta.dirname
const PORT_FILE = resolve(rootDir, 'node_modules/.vite-dev-port')

/**
 * 生产环境 CSP：去掉 'unsafe-eval'，并禁止任何远程连接。
 * 开发环境的 CSP 写在 index.html 中（Vite HMR 需要 eval 与 WebSocket）。
 */
const PRODUCTION_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
].join('; ')

/** 构建时把 index.html 中的开发版 CSP 替换为生产版 */
const productionCspPlugin = () => ({
    name: 'inject-production-csp',
    apply: 'build' as const,
    transformIndexHtml: (html: string): string =>
        html.replace(
            /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
            `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`
        )
})

/**
 * 从 preferred 开始向上探测第一个可用的 TCP 端口。
 * 这样 5173 被占用时会自动顺延，而不是直接启动失败。
 */
const findFreePort = (preferred: number, maxOffset = 50): Promise<number> =>
    new Promise((resolvePort, reject) => {
        const attempt = (port: number): void => {
            if (port > preferred + maxOffset) {
                reject(new Error(`No free port found in range ${preferred}-${preferred + maxOffset}`))
                return
            }
            const probe = createServer()
            probe.once('error', () => {
                probe.close()
                attempt(port + 1)
            })
            probe.once('listening', () => {
                probe.close(() => resolvePort(port))
            })
            // 与 Vite 默认监听行为保持一致
            probe.listen(port, 'localhost')
        }
        attempt(preferred)
    })

export default defineConfig(async () => {
    const port = await findFreePort(PREFERRED_PORT)

    // 把实际端口写入文件，供 dev:electron 读取
    mkdirSync(resolve(rootDir, 'node_modules'), { recursive: true })
    writeFileSync(PORT_FILE, String(port), 'utf-8')

    return {
        plugins: [vue(), productionCspPlugin()],
        // Electron 通过 file:// 加载打包产物，必须使用相对路径
        base: './',
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src/renderer', import.meta.url))
            }
        },
        server: {
            port,
            // 端口已由 findFreePort 保证可用，仍开启 strictPort 防止被抢占后静默换端口
            strictPort: true
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true
        }
    }
})
