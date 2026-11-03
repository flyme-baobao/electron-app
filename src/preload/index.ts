import { contextBridge, ipcRenderer } from 'electron'

export interface RuntimeVersions {
    node: string
    chrome: string
    electron: string
}

const api = {
    getVersions: (): Promise<RuntimeVersions> => ipcRenderer.invoke('get-versions')
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api