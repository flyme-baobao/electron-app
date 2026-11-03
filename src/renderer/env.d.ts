/// <reference types="vite/client" />

// 让 TypeScript（非 vue-tsc）也能识别 .vue 单文件组件的导入
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}