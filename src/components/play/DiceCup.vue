<template>
  <view class="cup-tool app-card">
    <view class="cup-head">
      <view class="cup-copy">
        <text class="cup-kicker">
          {{ kicker }}
        </text>
        <text class="cup-title">
          骰盅 · {{ count }} 颗
        </text>
        <text class="cup-subtitle">
          {{ subtitle || '拿起手机上下摇，摇完揭盅看点数。' }}
        </text>
      </view>
      <view class="cup-total" :class="{ 'is-hidden': !revealed }">
        <text>{{ revealed && result ? result.total : '??' }}</text>
        <text>点数</text>
      </view>
    </view>

    <view class="cup-count">
      <button
        v-for="item in countOptions"
        :key="item"
        class="cup-count__item"
        :class="{ active: item === count }"
        hover-class="none"
        :disabled="rattleLive"
        @tap="changeCount(item)"
      >
        {{ item }} 颗
      </button>
    </view>

    <view class="cup-stage">
      <view class="cup-floor-clip">
        <view class="cup-floor">
          <view class="cup-floor__grid" />
        </view>
      </view>

      <view class="cup-scene">
        <!-- 骰子先画，盅后画：盖着的时候盅自然遮住骰子 -->
        <view class="cup-layer" :style="swayStyle">
            <view class="cup-shadow" :style="shadowStyle" />

            <view class="cup-dice" :class="{ 'is-bounce': revealed }">
              <view
                v-for="(die, index) in dice"
                :key="`die-${index}`"
                class="die-wrap"
                :style="{
                  width: sizeStyle,
                  height: sizeStyle,
                  marginLeft: die.marginLeft,
                  marginTop: die.marginTop,
                  transform: die.place,
                  zIndex: die.z
                }"
              >
                <view class="die" :style="{ transform: die.transform }">
                  <view
                    v-for="face in faces"
                    :key="face.key"
                    class="die-face"
                    :style="{ transform: face.transform }"
                  >
                    <view class="die-face__pips">
                      <view v-for="cell in 9" :key="`${index}-${face.key}-${cell}`" class="die-pip-cell">
                        <view
                          v-if="face.pips.includes(cell)"
                          class="die-pip"
                          :class="{ 'is-red': face.value === 1 || face.value === 4 }"
                        />
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
        </view>

        <view class="cup-layer" :style="swayStyle">
          <view class="cup-jitter" :class="{ 'is-live': rattleLive }" :style="jitterStyle">
            <view class="cup-lift" :class="{ 'is-open': revealed }">
              <view class="cup">
                  <view
                    v-for="slat in slats"
                    :key="`slat-${slat.index}`"
                    class="cup-slat"
                    :style="{ transform: `rotateY(${slat.angle}deg) translateZ(${cupRadius}rpx)`, background: slat.background }"
                  />

                  <view
                    v-for="band in rimBands"
                    :key="`rim-${band.index}`"
                    class="cup-rim-slat"
                    :style="{ transform: `rotateY(${band.angle}deg) translateZ(${cupRadius + 2}rpx)`, background: band.background }"
                  />

                  <view class="cup-lid">
                    <view class="cup-lid__ring" />
                    <view class="cup-lid__boss" />
                  </view>
                </view>
            </view>
          </view>
        </view>
      </view>

      <view class="cup-energy" :class="{ 'is-live': rattleLive }" @tap="enableSensor">
        <view class="cup-energy__bar">
          <view class="cup-energy__fill" :style="{ width: `${Math.round(energy * 100)}%` }" />
        </view>
        <text class="cup-energy__text">{{ energyHint }}</text>
      </view>
    </view>

    <view class="cup-values">
      <view v-for="(value, index) in (revealed && result ? result.values : [])" :key="`v-${index}`" class="cup-value">
        <text>{{ value }}</text>
        <text>第 {{ index + 1 }} 颗</text>
      </view>
      <view v-if="!(revealed && result)" class="cup-values__empty">
        <text>{{ rattleLive ? '骰子在盅里滚动…' : '摇一摇手机，然后揭盅' }}</text>
      </view>
    </view>

    <view v-if="revealed && result" class="cup-summary">
      <text class="cup-summary__label">
        本局结果
      </text>
      <text class="cup-summary__value">
        {{ result.values.join(' + ') }} = {{ result.total }}
      </text>
      <text class="cup-summary__detail">
        {{ result.summary }}
      </text>
    </view>

    <view class="cup-actions">
      <button
        v-if="!revealed"
        class="cup-action cup-action--reveal"
        hover-class="none"
        :disabled="rattleLive"
        @tap="reveal"
      >
        {{ rattleLive ? '骰子还在滚…' : '揭 盅' }}
      </button>
      <button
        v-else
        class="cup-action cup-action--again"
        hover-class="none"
        @tap="cover"
      >
        再摇一次
      </button>
      <button
        class="cup-action cup-action--shake"
        hover-class="none"
        :disabled="rattleLive"
        @tap="manualShake"
      >
        手动摇盅
      </button>
    </view>

    <view class="cup-note">
      {{ sensorHint }}
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { cylinderSlatBackground, metalSlatBackground } from '@/utils/cylinder-shading'
import { getDiceConfig, rollDice, setDiceCount } from '@/utils/play-data'
import { useDeviceShake } from '@/utils/use-device-shake'

const props = defineProps({
  scope: {
    type: String,
    default: 'guest'
  },
  kicker: {
    type: String,
    default: 'DICE CUP'
  },
  subtitle: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['result', 'audio'])

const countOptions = [1, 2, 3, 4, 5, 6]
const cupRadius = 124

const pipMap = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
}

/**
 * 相对的两个面点数之和为 7：前 1 / 后 6、右 3 / 左 4、上 2 / 下 5。
 * axis 表示把该面转到正前方所需的角度。
 */
const faceLayout = [
  { key: 'front', value: 1, rotation: 'rotateX(0deg) rotateY(0deg)', axis: { x: 0, y: 0 } },
  { key: 'back', value: 6, rotation: 'rotateY(180deg)', axis: { x: 0, y: 180 } },
  { key: 'right', value: 3, rotation: 'rotateY(90deg)', axis: { x: 0, y: -90 } },
  { key: 'left', value: 4, rotation: 'rotateY(-90deg)', axis: { x: 0, y: 90 } },
  { key: 'top', value: 2, rotation: 'rotateX(90deg)', axis: { x: -90, y: 0 } },
  { key: 'bottom', value: 5, rotation: 'rotateX(-90deg)', axis: { x: 90, y: 0 } }
]

/** 骰子在盅里的站位 [左右, 前后]，做成固定队形，揭盅后画面才干净。 */
const formations = {
  1: [[0, 0]],
  2: [[-48, 0], [48, -12]],
  3: [[-54, -12], [0, 22], [54, -14]],
  4: [[-52, -28], [-50, 28], [52, -30], [54, 26]],
  5: [[-56, -24], [-54, 28], [0, 0], [55, -26], [56, 26]],
  6: [[-58, -24], [-60, 28], [0, -32], [2, 30], [58, -26], [60, 26]]
}

const count = ref(2)
const result = ref(null)
const revealed = ref(false)
const rattleLive = ref(false)
const rotations = ref([])
const settledValues = ref(null)

let rattleTimer = null
let lastHapticAt = 0

const {
  supported: sensorReady,
  energy,
  sway,
  start: startShake,
  stop: stopShake,
  retry: retryShake
} = useDeviceShake({
  onShake: () => rattle()
})

const size = computed(() => {
  if (count.value <= 1) return 152
  if (count.value <= 2) return 126
  if (count.value <= 3) return 108
  if (count.value <= 4) return 100
  if (count.value <= 5) return 90
  return 84
})

const sizeStyle = computed(() => `${size.value}rpx`)
const halfSize = computed(() => size.value / 2 + 4)

const faces = computed(() => faceLayout.map((face) => ({
  ...face,
  transform: `${face.rotation} translateZ(${halfSize.value}rpx)`,
  pips: pipMap[face.value]
})))

const dice = computed(() => {
  const formation = formations[count.value] || formations[2]
  return Array.from({ length: count.value }, (unused, index) => {
    const [x, depth] = formation[index] || [0, 0]
    const rotation = rotations.value[index] || { x: -18, y: 26, z: 0 }
    return {
      // 用负 margin 做居中与抬高：骰子底面正好落在桌面线上。
      // 内联样式里的 calc() 会被 rpx 转换丢掉，所以这里不用 calc。
      marginLeft: `${-size.value / 2}rpx`,
      marginTop: `${-size.value}rpx`,
      place: `translate3d(${x}rpx, 0rpx, ${depth}rpx)`,
      transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
      z: 20 + Math.round(depth)
    }
  })
})

const slats = computed(() => {
  const total = 36
  return Array.from({ length: total }, (unused, index) => {
    return {
      index,
      angle: index * (360 / total),
      background: cylinderSlatBackground({
        index,
        total,
        hue: 350,
        saturation: 60,
        lightness: 8,
        range: 22,
        specular: 16,
        grain: 0.16
      })
    }
  })
})

/** 盅口那圈黄铜箍：做成竖向的圆柱带，才不会被视角压成一条线。 */
const rimBands = computed(() => {
  const total = 36
  return Array.from({ length: total }, (unused, index) => ({
    index,
    angle: index * (360 / total),
    background: metalSlatBackground({ index, total })
  }))
})

const swayStyle = computed(() => {
  const x = sway.value.x
  const y = sway.value.y
  return {
    // 14deg 是相机俯角（放在最外层），后面的偏移才是手机摇动的反馈
    transform: `rotateX(${(14 + y * 30).toFixed(2)}deg) rotateZ(${(-x * 24).toFixed(2)}deg) translate3d(${(x * 46).toFixed(1)}rpx, ${(y * -18).toFixed(1)}rpx, 0)`
  }
})

const jitterStyle = computed(() => ({
  '--shake-amp': `${(3 + energy.value * 18).toFixed(1)}rpx`,
  '--shake-speed': `${Math.max(0.06, 0.18 - energy.value * 0.1).toFixed(3)}s`
}))

const shadowStyle = computed(() => ({
  opacity: revealed.value ? 0.1 : 1,
  transform: `translate3d(0, 0, 0) scale(${revealed.value ? 0.72 : 1})`
}))

const energyHint = computed(() => {
  if (rattleLive.value) return '盅里有骰子碰撞'
  if (energy.value > 0.05) return `力度 ${Math.round(energy.value * 100)}%`
  return sensorReady.value ? '上下摇手机，越猛骰子越乱' : '点「手动摇盅」也能玩'
})

const sensorHint = computed(() => {
  if (!props.active) return '切到这个玩法就能摇。'
  if (sensorReady.value) {
    return revealed.value
      ? '揭开后就是最终点数，点「再摇一次」可以盖上重来。'
      : '拿住手机上下晃动，松手后骰子会自己在盅里停稳，再点揭盅。'
  }
  return '没读到重力感应：H5 需要用 HTTPS 打开，App 端直接可用；这里可以先用「手动摇盅」。'
})

function buildRotation (index) {
  return {
    x: -16 + ((index * 23) % 32),
    y: 8 + ((index * 17) % 18),
    z: 0
  }
}

function resetDice (total) {
  rotations.value = Array.from({ length: total }, (unused, index) => buildRotation(index))
}

function initStates () {
  count.value = getDiceConfig(props.scope).count
  resetDice(count.value)
  result.value = null
  revealed.value = false
  settledValues.value = null
}

function haptic () {
  // #ifdef APP-PLUS
  try {
    uni.vibrateShort({ fail: () => {} })
  } catch (error) {
    // 忽略不支持震动的机型
  }
  // #endif
}

/** 点一下力度条：在用户手势里重新申请重力感应（iOS Safari 必须这么做）。 */
function enableSensor () {
  if (sensorReady.value) return
  retryShake()
  uni.showToast({ title: '正在开启重力感应，摇一摇试试', icon: 'none' })
}

/** 让目标角度落在「当前角度 + 至少 n 圈」之后，同时保持点面一致。 */
function fitTarget (current, base, spins) {
  const min = current + 360 * spins
  return base + 360 * Math.ceil((min - base) / 360)
}

/** 把骰子摆到最终点数对应的朝向（盅盖着，看不见，揭盅瞬间就是静止的）。 */
function settleDice (values) {
  rotations.value = values.map((value, index) => {
    const face = faceLayout.find((item) => item.value === value)
    const current = rotations.value[index] || { x: 0, y: 0, z: 0 }
    return {
      x: fitTarget(current.x, face.axis.x, 2 + (index % 2)),
      y: fitTarget(current.y, face.axis.y, 2 + ((index + 1) % 2)),
      z: fitTarget(current.z, 0, 1)
    }
  })
}

/** 摇动：真机摇动会不断刷新这个窗口，手动按钮给一段固定时长。 */
function rattle () {
  if (revealed.value) return
  rattleLive.value = true
  haptic()
  if (rattleTimer) clearTimeout(rattleTimer)
  rattleTimer = setTimeout(() => {
    rattleTimer = null
    rattleLive.value = false
    hold()
  }, 1300)
}

/** 骰子停稳：这一刻点数就已经确定，只是还盖着。 */
function hold () {
  if (revealed.value) return
  const outcome = rollDice(props.scope, count.value)
  settledValues.value = outcome.values
  settleDice(outcome.values)
  result.value = outcome
  haptic()
  emit('result', outcome)
}

function reveal () {
  if (rattleLive.value) return
  if (!settledValues.value) hold()
  revealed.value = true
  emit('audio')
  haptic()
}

function cover () {
  revealed.value = false
  result.value = null
  settledValues.value = null
  resetDice(count.value)
}

function manualShake () {
  if (rattleLive.value || revealed.value) return
  rattle()
}

function changeCount (value) {
  if (rattleLive.value) return
  count.value = setDiceCount(props.scope, value)
  cover()
}

watch(energy, (value) => {
  if (value < 0.24 || revealed.value) return
  const now = Date.now()
  if (now - lastHapticAt < 160) return
  lastHapticAt = now
  haptic()
})

watch(() => props.active, (value) => {
  if (value) startShake()
  else stopShake()
}, { immediate: true })

watch(() => props.scope, () => {
  initStates()
})

onBeforeUnmount(() => {
  if (rattleTimer) clearTimeout(rattleTimer)
  stopShake()
})

defineExpose({ reveal, cover, manualShake })
</script>

<style lang="scss" scoped>
.cup-tool {
  padding: 22rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(252, 246, 250, 0.98));
}

.cup-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.cup-copy {
  min-width: 0;
  flex: 1;
}

.cup-kicker {
  display: block;
  color: #8c2f4a;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.cup-title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.08;
}

.cup-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.45;
}

.cup-total {
  flex: 0 0 auto;
  min-width: 112rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.12);
  text-align: center;
}

.cup-total text {
  display: block;
}

.cup-total text:first-child {
  color: #8c2f4a;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.05;
}

.cup-total text:last-child {
  margin-top: 2rpx;
  color: #9a6a79;
  font-size: 18rpx;
  font-weight: 800;
}

.cup-total.is-hidden text:first-child {
  color: #b9a3ad;
}

.cup-count {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 16rpx;
}

.cup-count__item {
  min-height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(140, 47, 74, 0.18);
  background: #fff;
  color: #8c5a6b;
  font-size: 21rpx;
  font-weight: 750;
}

.cup-count__item.active {
  border-color: transparent;
  background: linear-gradient(135deg, #8c2f4a, #b8496a);
  color: #fff;
}

/* ------------------------- 3D 骰盅 ------------------------- */

.cup-stage {
  position: relative;
  height: 640rpx;
  margin-top: 10rpx;
}

.cup-floor-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  perspective: 1400rpx;
  perspective-origin: 50% 26%;
}

.cup-floor {
  position: absolute;
  left: 50%;
  top: 400rpx;
  width: 1100rpx;
  height: 900rpx;
  margin-left: -550rpx;
  transform-origin: 50% 0;
  transform: rotateX(74deg);
  background:
    radial-gradient(58% 44% at 50% 6%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, #f8e6ee 0%, #efd6e2 46%, #e3c4d5 100%);
  box-shadow: 0 -18rpx 40rpx rgba(190, 120, 160, 0.22);
}

.cup-floor__grid {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(160, 96, 138, 0.09) 0 2rpx, rgba(160, 96, 138, 0) 2rpx 96rpx),
    repeating-linear-gradient(90deg, rgba(160, 96, 138, 0.09) 0 2rpx, rgba(160, 96, 138, 0) 2rpx 96rpx);
}

.cup-scene {
  position: absolute;
  inset: 0;
  perspective: 1400rpx;
  perspective-origin: 50% 26%;
}

.cup-layer {
  position: absolute;
  inset: 0;
  transition: transform 0.12s linear;
  transform-style: preserve-3d;
}

/* 桌面线：盅底和骰子都落在这里 */
.cup-shadow {
  position: absolute;
  left: 50%;
  top: 528rpx;
  width: 368rpx;
  height: 112rpx;
  margin-left: -184rpx;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(104, 40, 70, 0.42), rgba(104, 40, 70, 0) 72%);
  filter: blur(6rpx);
  transition: transform 0.55s ease, opacity 0.55s ease;
}

.cup-dice {
  position: absolute;
  left: 50%;
  top: 580rpx;
  width: 0;
  height: 0;
}

.cup-dice.is-bounce {
  animation: diceBounce 0.5s cubic-bezier(0.24, 1.4, 0.36, 1) 1;
}

@keyframes diceBounce {
  0% {
    margin-top: 0;
  }
  35% {
    margin-top: -16rpx;
  }
  68% {
    margin-top: 4rpx;
  }
  100% {
    margin-top: 0;
  }
}

.die-wrap {
  position: absolute;
  left: 0;
  top: 0;
  transform-style: preserve-3d;
}

.die {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.die-face {
  position: absolute;
  inset: -4rpx;
  border-radius: 14rpx;
  border: 1rpx solid rgba(178, 148, 104, 0.5);
  background: radial-gradient(circle at 30% 24%, #fffdf7, #f7eedb 56%, #e3d2b2 100%);
  box-shadow:
    inset 0 0 0 2rpx rgba(255, 255, 255, 0.7),
    inset 0 -8rpx 16rpx rgba(176, 142, 96, 0.28),
    inset 0 8rpx 14rpx rgba(255, 255, 255, 0.72);
  backface-visibility: hidden;
}

.die-face__pips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  padding: 9%;
}

.die-pip-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.die-pip {
  width: 74%;
  height: 74%;
  max-width: 24rpx;
  max-height: 24rpx;
  border-radius: 50%;
  background: radial-gradient(60% 60% at 34% 30%, #6d5a63, #2c1d24 62%, #140d12 100%);
  box-shadow: inset 0 2rpx 3rpx rgba(255, 255, 255, 0.28), 0 1rpx 2rpx rgba(255, 255, 255, 0.5);
}

.die-pip.is-red {
  background: radial-gradient(60% 60% at 34% 30%, #ff8f7d, #cf2f37 62%, #8e1620 100%);
}

.cup-jitter {
  position: absolute;
  left: 50%;
  top: 280rpx;
  width: 248rpx;
  height: 300rpx;
  margin-left: -124rpx;
  transform-style: preserve-3d;
  pointer-events: none;
}

.cup-jitter.is-live {
  animation: cupJitter var(--shake-speed, 0.1s) linear infinite;
}

@keyframes cupJitter {
  0% {
    margin-top: 0;
  }
  20% {
    margin-top: calc(var(--shake-amp, 8rpx) * -1);
    margin-left: calc(-124rpx + var(--shake-amp, 8rpx));
  }
  45% {
    margin-top: calc(var(--shake-amp, 8rpx) * 0.6);
    margin-left: calc(-124rpx - var(--shake-amp, 8rpx) * 0.6);
  }
  70% {
    margin-top: calc(var(--shake-amp, 8rpx) * -0.5);
    margin-left: calc(-124rpx + var(--shake-amp, 8rpx) * 0.5);
  }
  100% {
    margin-top: 0;
    margin-left: -124rpx;
  }
}

.cup-lift {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.58s cubic-bezier(0.22, 0.9, 0.24, 1);
}

.cup-lift.is-open {
  transform: translate3d(128rpx, -258rpx, 0) rotateZ(-9deg) rotateX(-7deg);
}

.cup {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.cup-slat {
  position: absolute;
  left: 50%;
  top: 0;
  width: 23rpx;
  height: 300rpx;
  margin-left: -11.5rpx;
  backface-visibility: hidden;
}

.cup-lid {
  position: absolute;
  left: 50%;
  top: -124rpx;
  width: 248rpx;
  height: 248rpx;
  margin-left: -124rpx;
  border-radius: 50%;
  transform: rotateX(90deg);
  background: radial-gradient(60% 60% at 42% 34%, #a63b56, #7d2740 62%, #5c1a2c 100%);
  box-shadow: inset 0 0 0 3rpx rgba(255, 214, 226, 0.28);
}

.cup-lid__ring {
  position: absolute;
  inset: 22rpx;
  border-radius: 50%;
  border: 6rpx solid rgba(226, 178, 92, 0.72);
}

.cup-lid__boss {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 62rpx;
  height: 62rpx;
  margin: -31rpx 0 0 -31rpx;
  border-radius: 50%;
  background: radial-gradient(60% 60% at 36% 30%, #f6e3a8, #d0a340 62%, #966c1c 100%);
  box-shadow: 0 6rpx 12rpx rgba(70, 20, 34, 0.5), inset 0 -3rpx 6rpx rgba(90, 54, 8, 0.5);
}

.cup-rim-slat {
  position: absolute;
  left: 50%;
  top: 254rpx;
  width: 23rpx;
  height: 46rpx;
  margin-left: -11.5rpx;
  backface-visibility: hidden;
  box-shadow: inset 0 0 6rpx rgba(70, 40, 6, 0.45);
}

/* ------------------------- 力度与结果 ------------------------- */

.cup-energy {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cup-energy__bar {
  flex: 1;
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(140, 47, 74, 0.14);
  overflow: hidden;
}

.cup-energy__fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #e0a63f, #b8496a);
  transition: width 0.12s linear;
}

.cup-energy.is-live .cup-energy__fill {
  background: linear-gradient(90deg, #f0b64f, #d8455f);
}

.cup-energy__text {
  flex: 0 0 auto;
  color: #96606f;
  font-size: 19rpx;
  font-weight: 700;
}

.cup-values {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 8rpx;
}

.cup-value {
  flex: 0 0 auto;
  min-width: 104rpx;
  padding: 12rpx 10rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.08);
  text-align: center;
}

.cup-value text {
  display: block;
}

.cup-value text:first-child {
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.cup-value text:last-child {
  margin-top: 2rpx;
  color: var(--color-muted);
  font-size: 17rpx;
}

.cup-values__empty {
  flex: 1;
  padding: 14rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.06);
  color: var(--color-muted);
  font-size: 20rpx;
  text-align: center;
}

.cup-summary {
  margin-top: 14rpx;
  padding: 18rpx;
  border-radius: 10rpx;
  background: linear-gradient(135deg, rgba(140, 47, 74, 0.12), rgba(184, 73, 106, 0.1));
}

.cup-summary__label {
  display: block;
  color: var(--color-muted);
  font-size: 18rpx;
}

.cup-summary__value {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 32rpx;
  font-weight: 900;
}

.cup-summary__detail {
  display: block;
  margin-top: 4rpx;
  color: var(--color-muted);
  font-size: 20rpx;
}

.cup-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}

.cup-action {
  flex: 1;
  min-height: 92rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.cup-action--reveal {
  background: linear-gradient(135deg, #8c2f4a, #d8455f);
  color: #fff;
  box-shadow: 0 16rpx 30rpx rgba(140, 47, 74, 0.3);
}

.cup-action--again {
  background: linear-gradient(135deg, #8c2f4a, #b8496a);
  color: #fff;
}

.cup-action--shake {
  flex: 0 0 auto;
  min-width: 210rpx;
  background: rgba(140, 47, 74, 0.1);
  color: #8c2f4a;
  font-size: 24rpx;
  letter-spacing: 1rpx;
}

.cup-action[disabled] {
  opacity: 0.58;
}

.cup-note {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.06);
  color: #8c5a6b;
  font-size: 19rpx;
  line-height: 1.45;
}
</style>
