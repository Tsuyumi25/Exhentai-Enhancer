<template>
  <div v-if="state.isActive" class="magnifier-debug">
    <!-- 所有調試層級統一管理 -->
    <div class="debug-layers">
      <!-- 基礎圖層 -->
      <div class="debug-layer base-layer">
        <div 
          class="debug-box original-image"
          :style="originalImageStyle"
          :data-label="`原圖 ${imageSize.width}x${imageSize.height}`"
          data-position="left"
        />
        <div 
          class="debug-box current-image"
          :style="currentImageStyle"
          :data-label="`當前尺寸 ${currentScale}%`"
          data-position="right"
        />
      </div>

      <!-- 映射圖層 -->
      <div class="debug-layer mapping-layer">
        <div 
          class="debug-box mapping-area"
          :style="mappingAreaStyle"
          data-label="映射區域"
          data-position="top"
        />
      </div>

      <!-- 放大鏡圖層 -->
      <div class="debug-layer magnifier-layer">
        <div 
          class="debug-box ideal-size"
          :style="idealImageStyle"
          data-label="理想尺寸"
          data-position="bottom"
        />
        <div 
          class="debug-box magnified-image"
          :style="magnifiedImageStyle"
          :data-label="`放大圖片 ${state.scale}x`"
          data-position="top"
        />
        <div 
          class="debug-box magnifier-viewport"
          :style="magnifierViewportStyle"
          data-label="可視區域"
          data-position="right"
        >
          <div 
            class="debug-point magnifier-center"
            :style="magnifierCenterStyle"
            data-label="放大鏡中心"
            data-position="left"
          />
        </div>
      </div>

      <!-- 互動圖層 -->
      <div class="debug-layer interaction-layer">
        <div 
          class="debug-point mouse-point"
          :style="mousePointStyle"
          :data-label="`滑鼠 (${Math.round(state.position.x)}, ${Math.round(state.position.y)})`"
          data-position="top"
        />
      </div>
    </div>

    <!-- 資訊面板 -->
    <div class="debug-panel">
      <div class="panel-content">
        <div>圖片尺寸: {{ imageSize.width }}x{{ imageSize.height }}</div>
        <div>當前比例: {{ currentScale }}%</div>
        <div>放大倍率: {{ state.scale }}x</div>
        <div>滑鼠位置: ({{ Math.round(state.position.x) }}, {{ Math.round(state.position.y) }})</div>
        <div>相對位置: {{ relativePosition.x.toFixed(2) }}, {{ relativePosition.y.toFixed(2) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MagnifierConfig, MagnifierState } from './Magnifier.vue'
import { useMagnifierStyle } from '@/composables/MultiPageViewerEnhancer/useMagnifierStyle'

const props = defineProps<{
  state: MagnifierState
  config: MagnifierConfig
}>()

// 使用放大鏡樣式計算
const {
  getImageSizeScale,
  getNormalizedRect,
  getCenterPoint,
  getMappingArea,
  getRelativePosition
} = useMagnifierStyle(props.state, props.config)

// 基礎數據計算
const imageSize = computed(() => ({
  width: props.state.currentImage?.naturalWidth || 0,
  height: props.state.currentImage?.naturalHeight || 0
}))

const currentScale = computed(() => {
  const img = props.state.currentImage
  if (!img) return 100
  return Math.round((img.getBoundingClientRect().height / img.naturalHeight) * 100)
})

// 區域計算
const areas = computed(() => {
  const img = props.state.currentImage
  if (!img) return null

  const currentImageBounds = img.getBoundingClientRect()
  const normalizedRect = getNormalizedRect(currentImageBounds)
  const centerPoint = getCenterPoint(currentImageBounds)
  const mappingArea = getMappingArea(currentImageBounds, normalizedRect)

  return {
    current: currentImageBounds,
    normalized: normalizedRect,
    center: centerPoint,
    mapping: mappingArea
  }
})

// 位置計算（相對於 mappingArea）
const relativePosition = computed(() => {
  if (!areas.value) return { x: 0, y: 0 }
  return getRelativePosition(props.state.position, areas.value.mapping)
})

// 樣式計算
const originalImageStyle = computed(() => {
  const bounds = areas.value?.current
  if (!bounds) return {}
  return {
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`
  }
})

const currentImageStyle = computed(() => originalImageStyle.value)

const mappingAreaStyle = computed(() => {
  const area = areas.value?.mapping
  if (!area) return {}
  return {
    left: `${area.left}px`,
    top: `${area.top}px`,
    right: `${area.right}px`,
    bottom: `${area.bottom}px`
  }
})

const idealImageStyle = computed(() => {
  const bounds = areas.value?.normalized
  if (!bounds) return {}
  return {
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`
  }
})

const magnifiedImageStyle = computed(() => {
  const bounds = areas.value
  if (!bounds) return {}

  const scale = props.state.scale * getImageSizeScale()
  const finalTranslate = {
    x: bounds.center.x - (bounds.normalized.width * relativePosition.value.x) * scale,
    y: bounds.center.y - (bounds.normalized.height * relativePosition.value.y) * scale
  }

  // 加入滑鼠位置的偏移
  const mouseOffset = {
    x: props.state.position.x - bounds.center.x,
    y: props.state.position.y - bounds.center.y
  }

  return {
    width: `${bounds.normalized.width * scale}px`,
    height: `${bounds.normalized.height * scale}px`,
    transform: `translate(${finalTranslate.x + mouseOffset.x}px, ${finalTranslate.y + mouseOffset.y}px)`
  }
})

/*
  重新計算新的可視區域：
  1. 根據瀏覽器視窗大小與目前縮放比例，計算原始圖片上視窗的尺寸。
  2. 利用 mappingArea 的範圍與 relativePosition（於 mappingArea 中的位置百分比）計算出可視區域中心。
  3. 最後以中心減去半個視窗尺寸，得到左上角位置。
*/
const magnifierViewportStyle = computed(() => {
  const bounds = areas.value
  if (!bounds || !bounds.mapping) return {}

  const scale = props.state.scale * getImageSizeScale()
  const viewportWidth = window.innerWidth / scale
  const viewportHeight = window.innerHeight / scale

  // 利用 mappingArea 計算在原始圖片上的中心位置
  const mapping = bounds.mapping
  const rel = relativePosition.value // 0～1的百分比位置
  const centerX = mapping.left + rel.x * (mapping.right - mapping.left)
  const centerY = mapping.top + rel.y * (mapping.bottom - mapping.top)

  return {
    left: `${centerX - viewportWidth / 2}px`,
    top: `${centerY - viewportHeight / 2}px`,
    width: `${viewportWidth}px`,
    height: `${viewportHeight}px`,
    transform: 'none'
  }
})

const magnifierCenterStyle = computed(() => ({
  left: '50%',
  top: '50%'
}))

const mousePointStyle = computed(() => ({
  left: `${props.state.position.x}px`,
  top: `${props.state.position.y}px`
}))
</script>

<style scoped>
.magnifier-debug {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

.debug-layers {
  position: relative;
  width: 100%;
  height: 100%;
}

.debug-layer {
  position: absolute;
  inset: 0;
  transition: opacity 0.2s ease;
}

.debug-box {
  position: absolute;
  border: 3px solid;
  box-sizing: border-box;
  transition: all 0.2s ease-out;
}

.debug-box::after {
  content: attr(data-label);
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  transition: all 0.2s ease-out;
}

.debug-box[data-position="top"]::after { top: -25px; left: 50%; transform: translateX(-50%); }
.debug-box[data-position="bottom"]::after { bottom: -25px; left: 50%; transform: translateX(-50%); }
.debug-box[data-position="left"]::after { left: -5px; top: 0; transform: translateX(-100%); }
.debug-box[data-position="right"]::after { right: -5px; top: 0; transform: translateX(100%); }

.debug-point {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease-out;
}

.debug-point::after {
  content: attr(data-label);
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}

.debug-point[data-position="top"]::after { top: -25px; left: 50%; transform: translateX(-50%); }
.debug-point[data-position="left"]::after { left: -5px; top: 0; transform: translateX(-100%); }

/* 圖層樣式 */
.base-layer { z-index: 1; }
.mapping-layer { z-index: 2; }
.magnifier-layer { z-index: 3; }
.interaction-layer { z-index: 4; }

/* 元素樣式 */
.original-image {
  border-color: rgba(0, 100, 255, 0.8);
  background: rgba(0, 100, 255, 0.05);
}

.current-image {
  border-color: rgba(0, 200, 100, 0.8);
  background: rgba(0, 200, 100, 0.05);
}

.mapping-area {
  border-color: rgba(255, 255, 0, 0.8);
  border-style: dashed;
  background: rgba(255, 255, 0, 0.05);
}

.ideal-size {
  border-color: rgba(0, 255, 255, 0.8);
  border-style: dotted;
  background: rgba(0, 255, 255, 0.05);
}

.magnified-image {
  border-color: rgba(128, 0, 128, 0.8);
  border-style: dashed;
  background: rgba(128, 0, 128, 0.05);
}

.magnifier-viewport {
  border-color: rgba(255, 165, 0, 0.8);
  background: rgba(255, 165, 0, 0.05);
  pointer-events: none;
}

.magnifier-center {
  background: rgba(255, 0, 0, 0.8);
  border: 2px solid rgba(255, 0, 0, 0.4);
}

.mouse-point {
  background: rgba(255, 165, 0, 0.8);
  border: 2px solid rgba(255, 165, 0, 0.4);
}

.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 5;
}

.panel-content > div {
  margin: 2px 0;
}
</style> 