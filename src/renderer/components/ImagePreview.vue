<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ImagePreviewResult } from '../../shared/types'

const image = ref<ImagePreviewResult | null>(null)
const loading = ref(false)
const error = ref('')
const dragActive = ref(false)
const brokenImage = ref(false)

const hasImage = computed(() => image.value !== null)

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const clearError = (): void => {
    error.value = ''
}

/** 通过系统对话框选择图片 */
const pickImage = async (): Promise<void> => {
    clearError()
    loading.value = true
    try {
        const result = await window.electronAPI.pickImage()
        if (result) {
            applyImage(result)
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err)
    } finally {
        loading.value = false
    }
}

const applyImage = (result: ImagePreviewResult): void => {
    brokenImage.value = false
    image.value = result
}

/** 拖拽释放：取第一个文件，交给主进程换取 app-file 地址 */
const onDrop = async (event: DragEvent): Promise<void> => {
    event.preventDefault()
    dragActive.value = false

    const file = event.dataTransfer?.files?.[0]
    if (!file) return

    const filePath = window.electronAPI.getPathForFile(file)
    if (!filePath) {
        error.value = '无法获取文件路径，请改用「选择图片」按钮'
        return
    }

    clearError()
    loading.value = true
    try {
        applyImage(await window.electronAPI.describeImage(filePath))
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err)
    } finally {
        loading.value = false
    }
}

const onDragOver = (event: DragEvent): void => {
    event.preventDefault()
    dragActive.value = true
}

const onDragLeave = (): void => {
    dragActive.value = false
}

const reset = (): void => {
    image.value = null
    brokenImage.value = false
    clearError()
}
</script>

<template>
    <section class="preview">
        <header class="preview__header">
            <h2>图片预览</h2>
            <div class="preview__actions">
                <button class="btn btn--primary" :disabled="loading" @click="pickImage">
                    {{ loading ? '读取中…' : '选择图片' }}
                </button>
                <button v-if="hasImage" class="btn" :disabled="loading" @click="reset">清除</button>
            </div>
        </header>

        <p v-if="error" class="preview__error">{{ error }}</p>

        <div
            class="preview__dropzone"
            :class="{ 'preview__dropzone--active': dragActive, 'preview__dropzone--filled': hasImage }"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
        >
            <template v-if="hasImage && image">
                <div class="preview__canvas">
                    <img
                        v-if="!brokenImage"
                        :src="image.url"
                        :alt="image.fileName"
                        class="preview__image"
                        @error="brokenImage = true"
                    />
                    <p v-else class="preview__placeholder">图片无法解析，可能已损坏</p>
                </div>
                <div class="preview__meta">
                    <span class="preview__name">{{ image.fileName }}</span>
                    <span class="preview__info">{{ image.mimeType }} · {{ formatSize(image.size) }}</span>
                </div>
            </template>

            <p v-else class="preview__placeholder">
                点击「选择图片」或在下方拖入图片文件
            </p>
        </div>
    </section>
</template>

<style scoped>
.preview {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.preview__header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.preview__actions {
    display: flex;
    gap: 0.5rem;
}

.btn {
    padding: 0.45rem 0.9rem;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    background: #f7fafc;
    color: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s ease;
}

.btn:hover:not(:disabled) {
    background: #edf2f7;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn--primary {
    border-color: #3182ce;
    background: #3182ce;
    color: #ffffff;
}

.btn--primary:hover:not(:disabled) {
    background: #2b6cb0;
}

.preview__error {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    background: #fff5f5;
    color: #c53030;
    font-size: 0.875rem;
}

.preview__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 260px;
    padding: 1rem;
    border: 2px dashed #cbd5e0;
    border-radius: 10px;
    background: #fafafa;
    transition: border-color 0.15s ease, background 0.15s ease;
}

.preview__dropzone--active {
    border-color: #3182ce;
    background: #ebf8ff;
}

.preview__dropzone--filled {
    justify-content: flex-start;
    padding: 0.75rem;
}

.preview__canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 200px;
    overflow: auto;
    border-radius: 6px;
    background: #ffffff;
}

.preview__image {
    max-width: 100%;
    max-height: 340px;
    object-fit: contain;
    border-radius: 4px;
}

.preview__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.8125rem;
}

.preview__name {
    font-weight: 600;
    word-break: break-all;
}

.preview__info {
    color: #718096;
    font-family: ui-monospace, Consolas, monospace;
}

.preview__placeholder {
    margin: 0;
    color: #a0aec0;
    font-size: 0.875rem;
}

@media (prefers-color-scheme: dark) {
    .btn {
        border-color: #4a5568;
        background: #2d3748;
    }

    .btn:hover:not(:disabled) {
        background: #4a5568;
    }

    .preview__error {
        background: #4c1d1d;
        color: #feb2b2;
    }

    .preview__dropzone {
        border-color: #4a5568;
        background: #232a35;
    }

    .preview__dropzone--active {
        border-color: #63b3ed;
        background: #1a3040;
    }

    .preview__canvas {
        background: #1a202c;
    }
}
</style>
