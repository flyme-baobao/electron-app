<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ImagePreview from './components/ImagePreview.vue'
import type { RuntimeVersions } from '../shared/types'

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

        <ImagePreview />
    </main>
</template>

<style scoped>
.app {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.app h1 {
    margin: 0;
}

.intro {
    margin: 0;
    color: #4a5568;
    line-height: 1.8;
}

.version {
    font-family: ui-monospace, Consolas, monospace;
    color: #2b6cb0;
    font-weight: 600;
}

@media (prefers-color-scheme: dark) {
    .intro {
        color: #a0aec0;
    }

    .version {
        color: #63b3ed;
    }
}
</style>
