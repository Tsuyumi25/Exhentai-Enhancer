import { ref } from 'vue'

import { getElement } from '@/utils/commons'
import { MagnifierConfig, MagnifierState } from '@/components/MultiPageViewerEnhancer/ImageMagnifier.vue'

import { useMultiPageViewerElements } from '../useMultiPageViewerElements'

import { useMagnifierGesture } from './useMagnifierGesture'
import { useMagnifierImageLoader } from './useMagnifierImageLoader'

export function useMagnifierEvents(
  state: MagnifierState,
  config: MagnifierConfig,
) {
  const { paneImagesDiv } = useMultiPageViewerElements()

  const gesture = useMagnifierGesture(config)
  const imageLoader = useMagnifierImageLoader(state)
  const navigation = useMagnifierNavigation(state, config)

  // 模式相關狀態
  const isWaitingForToggleEnd = ref(false)

  // ========== 啟動/關閉邏輯 ==========
  function handlePress(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    gesture.updateButtonState(e)

    if (!gesture.isPrimaryButton.value) {
      return
    }

    gesture.startLongPressTimer(() => {
      imageLoader.findImageAtPosition(e.pageY)

      if (!state.currentImage) {
        return
      }

      state.isOriginalMode = gesture.isPrimaryButton.value && gesture.isSecondaryButton.value

      if (state.isOriginalMode) {
        imageLoader.loadOriginal(state.currentImage)
      }

      activateMagnifier(e)
    })
  }

  function handleRelease(e: MouseEvent) {
    gesture.updateButtonState(e)
    gesture.clearTimer()

    if (!state.isActive) {
      return
    }

    if (config.toggleMode) {
      handleToggleModeRelease(e)
    } else {
      handleHoldModeRelease()
    }
  }

  function handleToggleModeRelease(e: MouseEvent) {
    if (!gesture.isPrimaryButtonEvent(e)) {
      return
    }

    if (isWaitingForToggleEnd.value) {
      // 第二次放開: 關閉放大鏡
      deactivateMagnifier()
      isWaitingForToggleEnd.value = false
    } else {
      // 第一次放開: 標記等待第二次點擊
      isWaitingForToggleEnd.value = true
    }
  }

  function handleHoldModeRelease() {
    if (state.isOriginalMode) {
      // 原圖模式: 使用 setTimeout 確保兩個 mouseup 事件都處理完
      if (!gesture.isPrimaryButton.value && !gesture.isSecondaryButton.value) {
        // 延遲 deactivate，防止 click/contextmenu 事件觸發父組件的翻頁功能
        // 確保 preventDefaultHandler 在事件發生時仍能攔截 (state.isActive 仍為 true)
        setTimeout(() => {
          deactivateMagnifier()
        }, 0)
      }
    } else {
      // 普通模式: 主鍵放開即關閉
      if (!gesture.isPrimaryButton.value) {
        deactivateMagnifier()
      }
    }
  }

  function activateMagnifier(e: MouseEvent) {
    state.isActive = true
    state.position = {
      x: e.pageX,
      y: e.pageY,
    }
    state.lastPosition = {
      x: e.pageX,
      y: e.pageY,
    }
    state.scale = config.scale.default

    // currentImage 已在 handlePress 中設定
    if (state.currentImage) {
      navigation.updatePosition(e)
      paneImagesDiv.dataset.magnifierActive = 'true'
      document.body.classList.add('hide-cursor')

      const style = document.createElement('style')
      style.id = 'magnifier-style'
      style.textContent = `
        #pane_thumbs {
          display: none !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  function deactivateMagnifier() {
    delete paneImagesDiv.dataset.magnifierActive
    state.isActive = false
    state.currentImage = null
    state.isOriginalMode = false
    state.isLoadingOriginal = false
    document.body.classList.remove('hide-cursor')
    getElement('#magnifier-style')?.remove()
  }

  // ========== 事件處理器 ==========

  function handleWheel(e: WheelEvent) {
    if (!state.isActive) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    navigation.updateScale(-Math.sign(e.deltaY) * config.scale.step)
  }

  // ========== 事件綁定 ==========

  function handleMouseDown(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.mbar')) {
      handlePress(e)
    }
  }

  function preventDefaultHandler(e: Event) {
    if (state.isActive && !(e.target as HTMLElement).closest('.mbar')) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function bindEvents() {
    paneImagesDiv.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleRelease)
    window.addEventListener('mousemove', navigation.updatePosition)

    const preventDefaultEvents = ['mousedown', 'click', 'contextmenu']
    preventDefaultEvents.forEach(eventName => {
      paneImagesDiv.addEventListener(eventName, preventDefaultHandler, { capture: true })
    })
  }

  function unbindEvents() {
    paneImagesDiv.removeEventListener('mousedown', handleMouseDown)
    window.removeEventListener('mouseup', handleRelease)
    window.removeEventListener('mousemove', navigation.updatePosition)

    const preventDefaultEvents = ['mousedown', 'click', 'contextmenu']
    preventDefaultEvents.forEach(eventName => {
      paneImagesDiv.removeEventListener(eventName, preventDefaultHandler, { capture: true })
    })
  }

  return {
    bindEvents,
    unbindEvents,
    handleWheel,
  }
}

// ========== 導航邏輯 ==========

function useMagnifierNavigation(state: MagnifierState, config: MagnifierConfig) {
  function updatePosition(e: MouseEvent) {
    if (!state.isActive) {
      return
    }

    const movementX = e.pageX - state.lastPosition.x
    const movementY = e.pageY - state.lastPosition.y

    state.position = {
      x: state.position.x + (movementX * config.sensitivity.x),
      y: state.position.y + (movementY * config.sensitivity.y),
    }

    // 限制移動範圍
    state.position = {
      x: Math.max(0, Math.min(window.innerWidth, state.position.x)),
      y: Math.max(0, Math.min(window.innerHeight, state.position.y)),
    }

    state.lastPosition = {
      x: e.pageX,
      y: e.pageY,
    }
  }

  function updateScale(delta: number) {
    if (!state.isActive) {
      return
    }
    state.scale = Math.min(
      Math.max(state.scale + delta, config.scale.min),
      config.scale.max,
    )
  }

  return {
    updatePosition,
    updateScale,
  }
}
