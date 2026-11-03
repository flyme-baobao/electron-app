<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface RuntimeVersions {
    node: string
    chrome: string
    electron: string
}

const versions = ref<RuntimeVersions>({ node: '-', chrome: '-', electron: '-' })

const items = [
    { key: 'node', label: 'Node.js' },
    { key: 'chrome', label: 'Chromium' },
    { key: 'electron', label: 'Electron' }
] as const

onMounted(async () => {
    versions.value = await window.electronAPI.getVersions()
})
</script>

<template>
    <main class="app">
        <h1>你好!</h1>
        <p class="intro">
            我们正在使用
            <template v-for="(item, i) in items" :key="item.key">
                {{ item.label }} <span class="version">{{ versions[item.key] }}</span><template v-if="i < items.length - 1">,</template>
            </template>
        </p>

        <button class="counter" @click="versions = { ...versions }">
            Vue 3 + Vite + TypeScript 已就绪
        </button>
    </main>
</template>

<style scoped>
.app {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    padding: 2rem;
}

.intro {
    color: #4a5568;
    line-height: 1.8;
}

.version {
    font-family: ui-monospace, Consolas, monospace;
    color: #2b6cb0;
    font-weight: 600;
}

.counter {
    margin-top: 1.5rem;
    padding: 0.6rem 1.2rem;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    background: #f7fafc;
    cursor: pointer;
    font-size: 0.95rem;
}

.counter:hover {
    background: #edf2f7;
}
</style>