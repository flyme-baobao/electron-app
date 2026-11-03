import { ipcMain } from 'electron'
import type { RuntimeVersions } from '../../shared/types'

export const registerVersionHandlers = (): void => {
    ipcMain.handle(
        'get-versions',
        (): RuntimeVersions => ({
            node: process.versions.node,
            chrome: process.versions.chrome,
            electron: process.versions.electron
        })
    )
}
