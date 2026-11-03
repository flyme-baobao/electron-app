import { build, context } from 'esbuild'
import { rm } from 'node:fs/promises'

const watch = process.argv.includes('--watch')
const dev = watch

// 项目 package.json 为 "type": "module"，故输出使用 .cjs 扩展名让 Electron 以 CommonJS 加载
const shared = {
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: dev ? 'inline' : false,
    external: ['electron'],
    logLevel: 'info',
    define: {
        'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production')
    }
}

const targets = [
    { entryPoints: ['src/main/index.ts'], outfile: 'out/main.cjs' },
    { entryPoints: ['src/preload/index.ts'], outfile: 'out/preload.cjs' }
]

if (!watch) {
    await rm('out', { recursive: true, force: true })
    for (const target of targets) await build({ ...shared, ...target })
} else {
    for (const target of targets) {
        const ctx = await context({ ...shared, ...target })
        await ctx.rebuild()
        await ctx.watch()
    }
    console.log('[esbuild] watching main/preload...')
}