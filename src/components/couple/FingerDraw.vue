<template>
  <view class="finger-tool app-card">
    <view class="finger-head">
      <view class="finger-copy">
        <text class="finger-kicker">
          {{ kicker }}
        </text>
        <text class="finger-title">
          {{ title }}
        </text>
        <text class="finger-subtitle">
          {{ subtitle || '同时按住 2 秒，系统会随机高亮其中一个手指。' }}
        </text>
      </view>
      <view class="finger-badge">
        <text>{{ activeCount }}</text>
        <text>根手指</text>
      </view>
    </view>

    <view
      class="finger-stage"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <view class="finger-grid">
        <view
          v-for="slot in slotPreview"
          :key="slot.id"
          class="finger-slot"
          :class="{ active: activeTouches.some((item) => item.identifier === slot.id), selected: selectedSpot?.identifier === slot.id }"
        >
          <text>{{ slot.label }}</text>
        </view>
      </view>

      <view
        v-for="spot in activeTouches"
        :key="spot.identifier"
        class="finger-spot"
        :class="{ selected: selectedSpot?.identifier === spot.identifier }"
        :style="spot.style"
      >
        <text>{{ spot.label }}</text>
      </view>

      <view class="finger-tip">
        <text>按住 2 指以上才会开始随机</text>
      </view>
    </view>

    <view class="finger-result" :class="{ visible: !!selectedSpot }">
      <text class="finger-result__label">
        指尖结果
      </text>
      <text class="finger-result__value">
        {{ selectedSpot ? selectedSpot.label : '还没有开始' }}
      </text>
      <text class="finger-result__detail">
        {{ selectedSpot ? '已随机高亮一根手指，继续按住可重新抽。' : '把两个或更多手指放上来试试。' }}
      </text>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

defineProps({
  title: {
    type: String,
    default: '双人指尖抽签'
  },
  subtitle: {
    type: String,
    default: ''
  },
  kicker: {
    type: String,
    default: 'FINGER LUCK'
  }
})

const emit = defineEmits(['result'])

const activeTouches = ref([])
const selectedSpot = ref(null)
const holdTimer = ref(null)
const stageRect = reactive({ width: 0, height: 0 })
const slotPreview = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' }
]

const activeCount = computed(() => activeTouches.value.length)

function getStageRect () {
  try {
    const query = uni.createSelectorQuery()
    query.select('.finger-stage').boundingClientRect((rect) => {
      if (rect) {
        stageRect.width = rect.width || 0
        stageRect.height = rect.height || 0
      }
    }).exec()
  } catch (error) {}
}

function clearHoldTimer () {
  if (holdTimer.value) {
    clearTimeout(holdTimer.value)
    holdTimer.value = null
  }
}

function randomSpot () {
  if (!activeTouches.value.length) return
  const index = Math.floor(Math.random() * activeTouches.value.length)
  selectedSpot.value = activeTouches.value[index]
  emit('result', selectedSpot.value)
  uni.showToast({ title: `选中 ${selectedSpot.value.label}`, icon: 'none' })
}

function schedulePick () {
  clearHoldTimer()
  if (activeTouches.value.length < 2) {
    selectedSpot.value = null
    return
  }
  holdTimer.value = setTimeout(() => {
    randomSpot()
  }, 2000)
}

function updateTouches (event) {
  const list = Array.from(event.touches || event.changedTouches || []).map((touch, index) => {
    const id = touch.identifier ?? index
    const clientX = touch.clientX || touch.pageX || 0
    const clientY = touch.clientY || touch.pageY || 0
    const left = stageRect.width ? Math.max(8, Math.min(clientX - 40, stageRect.width - 96)) : 0
    const top = stageRect.height ? Math.max(8, Math.min(clientY - 40, stageRect.height - 96)) : 0
    return {
      identifier: id,
      label: `指尖 ${index + 1}`,
      clientX,
      clientY,
      style: {
        left: `${left}px`,
        top: `${top}px`
      }
    }
  })
  activeTouches.value = list
}

function handleTouchStart (event) {
  updateTouches(event)
  schedulePick()
}

function handleTouchMove (event) {
  updateTouches(event)
}

function handleTouchEnd (event) {
  const touchedIds = new Set(Array.from(event.touches || []).map((touch, index) => touch.identifier ?? index))
  activeTouches.value = activeTouches.value.filter((item) => touchedIds.has(item.identifier))
  if (activeTouches.value.length < 2) {
    clearHoldTimer()
  }
  if (!activeTouches.value.length) {
    selectedSpot.value = null
  }
}

onMounted(() => {
  setTimeout(getStageRect, 0)
})

onBeforeUnmount(() => {
  clearHoldTimer()
})
</script>

<style lang="scss" scoped>
.finger-tool {
  padding: 22rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 246, 249, 0.98));
}

.finger-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.finger-copy {
  min-width: 0;
  flex: 1;
}

.finger-kicker {
  display: block;
  color: #ea6f8d;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.finger-title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 32rpx;
  font-weight: 900;
}

.finger-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
}

.finger-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 88rpx;
  min-height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 111, 145, 0.16), rgba(255, 138, 91, 0.12));
  color: #d05273;
}

.finger-badge text:first-child {
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1;
}

.finger-badge text:last-child {
  margin-top: 3rpx;
  font-size: 18rpx;
}

.finger-stage {
  position: relative;
  min-height: 420rpx;
  margin-top: 20rpx;
  padding: 18rpx;
  border-radius: 8px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 111, 145, 0.14), transparent 28%),
    radial-gradient(circle at 80% 24%, rgba(123, 97, 255, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 247, 250, 0.96));
  overflow: hidden;
}

.finger-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.finger-slot {
  min-height: 120rpx;
  border-radius: 8px;
  border: 1rpx dashed rgba(255, 111, 145, 0.22);
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.finger-slot.active {
  border-style: solid;
  color: #d05273;
  background: rgba(255, 111, 145, 0.08);
}

.finger-slot.selected {
  border-color: #ff6f91;
  color: #ff6f91;
  background: rgba(255, 111, 145, 0.14);
}

.finger-spot {
  position: absolute;
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 111, 145, 0.8);
  background: rgba(255, 255, 255, 0.92);
  color: #d05273;
  box-shadow: 0 12rpx 24rpx rgba(255, 111, 145, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.finger-spot.selected {
  transform: scale(1.18);
  background: linear-gradient(135deg, #ff6f91, #ff8a5b);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 16rpx 28rpx rgba(255, 111, 145, 0.28);
}

.finger-tip {
  position: absolute;
  left: 18rpx;
  right: 18rpx;
  bottom: 16rpx;
  text-align: center;
  color: var(--color-muted);
  font-size: 20rpx;
}

.finger-result {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 111, 145, 0.12), rgba(123, 97, 255, 0.08));
}

.finger-result__label {
  display: block;
  color: var(--color-muted);
  font-size: 18rpx;
}

.finger-result__value {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.finger-result__detail {
  display: block;
  margin-top: 4rpx;
  color: var(--color-muted);
  font-size: 20rpx;
}
</style>
