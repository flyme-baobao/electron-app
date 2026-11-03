import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const PORT_FILE = resolve(process.cwd(), 'node_modules/.vite-dev-port')
const MAIN_FILE = resolve(process.cwd(), 'out/main.cjs')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const waitFor = async (check, label, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (check()) return
        await sleep(100)
    }
    throw new Error(`Timeout waiting for ${label} (${timeoutMs}ms)`)
}

await waitFor(() => existsSync(MAIN_FILE), 'out/main.cjs')
await waitFor(() => {
    if (!existsSync(PORT_FILE)) return false
    return readFileSync(PORT_FILE, 'utf-8').trim().length > 0
}, 'vite dev port file')

const port = readFileSync(PORT_FILE, 'utf-8').trim()
const url = `http://localhost:${port}`
console.log(`[dev:electron] connecting to ${url}`)

const child = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_URL: url }
})

child.on('exit', (code) => process.exit(code ?? 0))
