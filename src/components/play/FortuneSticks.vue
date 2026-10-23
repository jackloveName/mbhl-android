<template>
  <view class="lots-tool app-card">
    <view class="lots-head">
      <view class="lots-copy">
        <text class="lots-kicker">
          {{ kicker }}
        </text>
        <text class="lots-title">
          {{ activeTheme.title }}
        </text>
        <text class="lots-subtitle">
          {{ activeTheme.intro }}
        </text>
      </view>
      <view class="lots-count">
        <text>{{ poolCount }}</text>
        <text>支签</text>
      </view>
    </view>

    <view class="lots-themes">
      <button
        v-for="theme in themes"
        :key="theme.id"
        class="lots-theme"
        :class="{ active: theme.id === themeId }"
        hover-class="none"
        @tap="selectTheme(theme.id)"
      >
        {{ theme.title }}
      </button>
    </view>

    <view class="lots-stage">
      <view class="lots-stage__glow" />
      <view class="lots-shadow" />
      <view class="lots-shadow lots-shadow--contact" />

      <view class="lots-scene">
        <view class="lots-sway" :style="swayStyle">
          <view class="lots-jitter" :class="{ 'is-live': shakeLive }" :style="jitterStyle">
            <view class="lots-tube" :class="{ 'is-shaking': shaking }">
              <view
                v-for="slat in slats"
                :key="`slat-${slat.index}`"
                class="lots-slat"
                :style="{ transform: `rotateY(${slat.angle}deg) translateZ(${tubeRadius}rpx)`, background: slat.background }"
              />

              <view
                v-for="band in bands"
                :key="`band-${band.id}`"
                class="lots-band"
                :style="band.style"
              />

              <view class="lots-foot" />
              <view class="lots-inner" />
              <view class="lots-rim" />
              <view class="lots-hole" />

              <view class="lots-sticks">
                <view
                  v-for="stick in sticks"
                  :key="`stick-${stick.index}`"
                  class="lots-stick"
                  :class="{ 'is-out': stick.out }"
                  :style="stick.style"
                >
                  <view class="lots-stick__tip" />
                  <view class="lots-stick__ink" />
                  <view class="lots-stick__shade" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="lots-energy" :class="{ 'is-live': shakeLive }" @tap="enableSensor">
        <view class="lots-energy__bar">
          <view class="lots-energy__fill" :style="{ width: `${Math.round(energy * 100)}%` }" />
        </view>
        <text class="lots-energy__text">{{ energyHint }}</text>
      </view>
    </view>

    <view class="lots-pool-note" :class="{ warn: !poolCount }">
      {{ poolNote }}
    </view>

    <view class="lots-actions">
      <button
        class="lots-draw"
        hover-class="none"
        :disabled="shaking || !poolCount"
        @tap="draw"
      >
        {{ shaking ? '签筒摇动中…' : '摇 签' }}
      </button>
      <button class="lots-reset" hover-class="none" :disabled="shaking" @tap="reset">
        归位
      </button>
    </view>

    <view v-if="themeId === 'custom'" class="lots-editor">
      <text class="lots-editor__title">自己写签</text>
      <view class="lots-editor__row">
        <input
          v-model="customText"
          class="lots-editor__input"
          type="text"
          maxlength="24"
          placeholder="例如：今天先运动 20 分钟"
          placeholder-class="field-placeholder"
        >
        <button class="lots-editor__add" hover-class="none" @tap="addCustom">
          加签
        </button>
      </view>
      <view v-if="customLots.length" class="lots-editor__list">
        <view v-for="lot in customLots" :key="lot.id" class="lots-editor__item">
          <text
            class="lots-editor__level"
            :style="{ color: levelColor(lot.level), borderColor: levelColor(lot.level) }"
          >
            {{ lot.level }}
          </text>
          <text class="lots-editor__text">{{ lot.label }}</text>
          <button class="lots-editor__remove" hover-class="none" @tap="removeCustom(lot.id)">
            <Trash2 :size="14" />
          </button>
        </view>
      </view>
    </view>

    <view v-if="result" class="lot-card" :class="`is-${result.levelTone}`">
      <view class="lot-card__head">
        <view class="lot-card__badge" :style="{ background: result.levelColor }">
          {{ result.levelLabel }}
        </view>
        <text class="lot-card__theme">{{ result.themeTitle }}</text>
        <text v-if="result.number" class="lot-card__number">第 {{ result.number }} 签</text>
      </view>

      <text class="lot-card__title">
        {{ result.title }}
      </text>

      <view v-if="result.tale" class="lot-card__tale">
        <text class="lot-card__tale-label">典故</text>
        <text class="lot-card__tale-text">{{ result.tale }}</text>
      </view>

      <view v-if="result.poem.length" class="lot-card__poem">
        <text v-for="(line, index) in result.poem" :key="`line-${index}`">{{ line }}</text>
      </view>

      <view class="lot-card__reading">
        <text class="lot-card__reading-label">
          解签
        </text>
        <text class="lot-card__reading-text">
          {{ result.reading }}
        </text>
      </view>

      <button class="lot-card__again" hover-class="none" @tap="draw">
        再摇一支
      </button>
    </view>

    <view v-else class="lots-empty">
      <text>拿起手机摇一摇</text>
      <text>{{ shakeHint }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Trash2 } from '@/components/icons'
import { getLotLevel, LOT_THEMES } from '@/utils/lots-library'
import { cylinderSlatBackground } from '@/utils/cylinder-shading'
import { addCustomLot, drawLot, getLotPool, removeCustomLot } from '@/utils/play-data'
import { useDeviceShake } from '@/utils/use-device-shake'

const props = defineProps({
  scope: {
    type: String,
    default: 'guest'
  },
  kicker: {
    type: String,
    default: 'FORTUNE STICKS'
  },
  active: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['result', 'audio'])

const themes = LOT_THEMES
const themeId = ref('yuelao')
const shaking = ref(false)
const result = ref(null)
const drawnIndex = ref(-1)
const customText = ref('')
const customVersion = ref(0)

let shakeTimer = null

const tubeRadius = 118
const tubeHeight = 372

const activeTheme = computed(() => themes.find((item) => item.id === themeId.value) || themes[0])

/** 新增 / 删除自定义签后版本号会变，签筒在这里跟着重新取值。 */
const poolKey = computed(() => `${props.scope}#${customVersion.value}`)

const poolCount = computed(() => {
  const key = poolKey.value
  return key ? getLotPool(props.scope, themeId.value).length : 0
})

const customLots = computed(() => {
  const key = poolKey.value
  return key ? getLotPool(props.scope, 'custom') : []
})

const poolNote = computed(() => {
  if (themeId.value === 'custom') {
    return poolCount.value ? `自定义签共 ${poolCount.value} 支，摇出的签就是你的选项。` : '这个签筒还是空的，先加几支签。'
  }
  return '签文按上上 / 上 / 中 / 下 分布，摇到的角度越大越吉。'
})

/* --------------------------- 手势 / 重力 --------------------------- */

const {
  supported: sensorReady,
  energy,
  sway,
  start: startShake,
  stop: stopShake,
  retry: retryShake
} = useDeviceShake({
  onShake: () => {
    if (!shaking.value) draw()
  }
})

const shakeLive = computed(() => energy.value > 0.12)

const shakeHint = computed(() => {
  if (!props.active) return '切到这个玩法就能摇。'
  return sensorReady.value
    ? '拿起手机左右上下晃，签筒会跟着手一起动。'
    : '当前设备读不到重力感应（H5 需要 HTTPS），点下面的按钮也能摇。'
})

const energyHint = computed(() => {
  if (shaking.value) return '正在摇签…'
  if (energy.value > 0.05) return `力度 ${Math.round(energy.value * 100)}%`
  return sensorReady.value ? '摇一摇手机，力度满了自动抽签' : '点按钮手动摇签'
})

const swayStyle = computed(() => {
  const x = sway.value.x
  const y = sway.value.y
  return {
    transform: `rotateX(${(20 + y * 46).toFixed(2)}deg) rotateZ(${(-3 - x * 40).toFixed(2)}deg) translate3d(${(x * 60).toFixed(1)}rpx, ${(y * -26).toFixed(1)}rpx, 0)`
  }
})

const jitterStyle = computed(() => ({
  '--shake-amp': `${(4 + energy.value * 16).toFixed(1)}rpx`,
  '--shake-speed': `${Math.max(0.07, 0.2 - energy.value * 0.11).toFixed(3)}s`
}))

const bands = computed(() => [
  {
    id: 'top',
    style: { top: '-104rpx', transform: `rotateX(90deg) translateZ(${-(tubeHeight * 0.18)}rpx)` }
  },
  {
    id: 'low',
    style: { top: '-104rpx', transform: `rotateX(90deg) translateZ(${-(tubeHeight * 0.86)}rpx)` }
  }
])

/** 签筒由 40 片木片围成圆柱，亮度按朝向变化，做出柱面明暗。 */
const slats = computed(() => {
  const count = 40
  return Array.from({ length: count }, (unused, index) => {
    return {
      index,
      angle: index * (360 / count),
      background: cylinderSlatBackground({
        index,
        total: count,
        hue: 356,
        saturation: 58,
        lightness: 10,
        range: 27,
        specular: 15,
        grain: 0.13
      })
    }
  })
})

/** 筒里的竹签，用固定公式打散，保证每次渲染位置一致。 */
const sticks = computed(() => {
  const count = 14
  return Array.from({ length: count }, (unused, index) => {
    const spread = (index * 41) % 152
    const x = -76 + spread
    const z = -68 + ((index * 59) % 136)
    const lift = -66 - ((index * 27) % 84)
    const tilt = -9 + ((index * 19) % 18)
    const height = 244 + ((index * 31) % 96)
    const depth = (z + 68) / 136
    const out = drawnIndex.value === index
    const scale = 0.86 + depth * 0.16
    return {
      index,
      out,
      style: {
        height: `${height}rpx`,
        transform: out
          ? `translate3d(${(x * 0.36).toFixed(1)}rpx, ${(lift - 244).toFixed(1)}rpx, 120rpx) rotateZ(${tilt - 13}deg) scale(${(scale + 0.06).toFixed(2)})`
          : `translate3d(${x}rpx, ${lift}rpx, ${z}rpx) rotateZ(${tilt}deg) scale(${scale.toFixed(2)})`,
        zIndex: out ? 120 : 20 + Math.round(z)
      }
    }
  })
})

function levelColor (level) {
  return getLotLevel(level).color
}

function selectTheme (id) {
  if (shaking.value) return
  themeId.value = id
  result.value = null
  drawnIndex.value = -1
}

function reset () {
  if (shaking.value) return
  result.value = null
  drawnIndex.value = -1
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

function draw () {
  if (shaking.value) return
  if (!poolCount.value) {
    uni.showToast({ title: themeId.value === 'custom' ? '先加几支签' : '签筒是空的', icon: 'none' })
    return
  }

  emit('audio')
  shaking.value = true
  result.value = null
  drawnIndex.value = -1
  haptic()

  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => {
    try {
      const picked = drawLot(props.scope, themeId.value)
      result.value = picked
      drawnIndex.value = (Number(picked.number) || Math.ceil(Math.random() * sticks.value.length)) % sticks.value.length
      emit('result', picked)
      haptic()
    } catch (error) {
      uni.showToast({ title: error?.message || '暂时不能抽签', icon: 'none' })
    } finally {
      shaking.value = false
      shakeTimer = null
    }
  }, 1500)
}

function addCustom () {
  const text = String(customText.value || '').trim()
  if (!text) {
    uni.showToast({ title: '请输入签词', icon: 'none' })
    return
  }
  addCustomLot(props.scope, text, '中')
  customText.value = ''
  customVersion.value += 1
  result.value = null
}

function removeCustom (id) {
  removeCustomLot(props.scope, id)
  customVersion.value += 1
  result.value = null
}

/** 摇动过程中按力度给短震动，手感接近签筒里的碰撞。 */
let lastHapticAt = 0
watch(energy, (value) => {
  if (value < 0.22) return
  const now = Date.now()
  if (now - lastHapticAt < 150) return
  lastHapticAt = now
  haptic()
})

watch(() => props.active, (value) => {
  if (value) startShake()
  else stopShake()
}, { immediate: true })

watch(() => props.scope, () => {
  customVersion.value += 1
  result.value = null
  drawnIndex.value = -1
})

onBeforeUnmount(() => {
  if (shakeTimer) clearTimeout(shakeTimer)
  stopShake()
})

defineExpose({ draw, reset })
</script>

<style lang="scss" scoped>
.lots-tool {
  padding: 22rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 248, 244, 0.98));
}

.lots-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.lots-copy {
  min-width: 0;
  flex: 1;
}

.lots-kicker {
  display: block;
  color: #b8452f;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.lots-title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.08;
}

.lots-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.45;
}

.lots-count {
  flex: 0 0 auto;
  min-width: 104rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: rgba(184, 69, 47, 0.1);
  text-align: center;
}

.lots-count text {
  display: block;
}

.lots-count text:first-child {
  color: #a83c2c;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.05;
}

.lots-count text:last-child {
  margin-top: 2rpx;
  color: #a9644f;
  font-size: 18rpx;
  font-weight: 800;
}

.lots-themes {
  display: flex;
  gap: 10rpx;
  margin-top: 18rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.lots-theme {
  flex: 0 0 auto;
  min-height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(184, 69, 47, 0.18);
  background: #fff;
  color: #8d5a49;
  font-size: 22rpx;
  font-weight: 700;
}

.lots-theme.active {
  border-color: transparent;
  background: linear-gradient(135deg, #b8452f, #d97a45);
  color: #fff;
  box-shadow: 0 10rpx 20rpx rgba(184, 69, 47, 0.24);
}

/* ------------------------- 3D 签筒 ------------------------- */

.lots-stage {
  position: relative;
  height: 600rpx;
  margin-top: 6rpx;
}

.lots-stage__glow {
  position: absolute;
  left: 50%;
  top: 40rpx;
  width: 560rpx;
  height: 560rpx;
  margin-left: -280rpx;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(255, 214, 186, 0.55), rgba(255, 214, 186, 0) 70%);
}

.lots-shadow {
  position: absolute;
  left: 50%;
  bottom: 96rpx;
  width: 400rpx;
  height: 92rpx;
  margin-left: -200rpx;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(122, 60, 38, 0.28), rgba(122, 60, 38, 0) 72%);
  filter: blur(8rpx);
}

.lots-shadow--contact {
  bottom: 118rpx;
  width: 300rpx;
  height: 56rpx;
  margin-left: -150rpx;
  background: radial-gradient(50% 50% at 50% 50%, rgba(96, 44, 28, 0.4), rgba(96, 44, 28, 0) 70%);
  filter: blur(3rpx);
}

.lots-scene {
  position: absolute;
  inset: 0;
  perspective: 1300rpx;
  perspective-origin: 50% 30%;
}

.lots-sway {
  position: absolute;
  left: 50%;
  top: 176rpx;
  width: 236rpx;
  height: 372rpx;
  margin-left: -118rpx;
  transform-style: preserve-3d;
  transition: transform 0.12s linear;
}

.lots-jitter {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.lots-jitter.is-live {
  animation: lotsJitter var(--shake-speed, 0.12s) linear infinite;
}

@keyframes lotsJitter {
  0% {
    margin-top: 0;
  }
  25% {
    margin-top: calc(var(--shake-amp, 10rpx) * -1);
  }
  50% {
    margin-top: 0;
  }
  75% {
    margin-top: var(--shake-amp, 10rpx);
  }
  100% {
    margin-top: 0;
  }
}

.lots-tube {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.lots-tube.is-shaking {
  animation: lotsShake 0.2s linear 8;
}

@keyframes lotsShake {
  0% {
    transform: rotateZ(0deg) translateX(0);
  }
  20% {
    transform: rotateZ(-4deg) translateX(-12rpx);
  }
  45% {
    transform: rotateZ(3.6deg) translateX(12rpx);
  }
  70% {
    transform: rotateZ(-2.6deg) translateX(-8rpx);
  }
  100% {
    transform: rotateZ(0deg) translateX(0);
  }
}

.lots-slat {
  position: absolute;
  left: 50%;
  top: 0;
  width: 22rpx;
  height: 372rpx;
  margin-left: -11rpx;
  backface-visibility: hidden;
}

.lots-band {
  position: absolute;
  left: 50%;
  width: 236rpx;
  height: 236rpx;
  margin-left: -118rpx;
  border-radius: 50%;
  border: 10rpx solid #d9b45f;
  box-shadow:
    0 0 12rpx rgba(120, 70, 20, 0.4),
    inset 0 0 6rpx rgba(90, 50, 10, 0.5);
}

.lots-foot {
  position: absolute;
  left: 50%;
  top: -124rpx;
  width: 260rpx;
  height: 260rpx;
  margin-left: -130rpx;
  border-radius: 50%;
  transform: rotateX(90deg) translateZ(-372rpx);
  border: 16rpx solid #4b1418;
  background: radial-gradient(60% 60% at 50% 50%, #2a0b0e, #451318 70%, #5c1d22 100%);
}

.lots-inner {
  position: absolute;
  left: 50%;
  top: -101rpx;
  width: 202rpx;
  height: 202rpx;
  margin-left: -101rpx;
  border-radius: 50%;
  transform: rotateX(90deg) translateZ(-36rpx);
  background: radial-gradient(60% 60% at 50% 40%, #1a0609, #3a0f14 72%, #571a20 100%);
}

.lots-rim {
  position: absolute;
  left: 50%;
  top: -118rpx;
  width: 236rpx;
  height: 236rpx;
  margin-left: -118rpx;
  border-radius: 50%;
  transform: rotateX(90deg);
  border: 17rpx solid #7c2730;
  background: transparent;
  box-shadow:
    inset 0 0 0 2rpx rgba(255, 220, 200, 0.28),
    0 0 14rpx rgba(60, 12, 18, 0.5);
}

.lots-hole {
  position: absolute;
  left: 50%;
  top: -101rpx;
  width: 202rpx;
  height: 202rpx;
  margin-left: -101rpx;
  border-radius: 50%;
  transform: rotateX(90deg);
  background:
    radial-gradient(70% 60% at 50% 16%, rgba(255, 186, 150, 0.22), rgba(255, 186, 150, 0) 60%),
    radial-gradient(60% 60% at 50% 46%, #150507, #2f0c11 66%, #4a151b 100%);
}

.lots-sticks {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.lots-stick {
  position: absolute;
  left: 50%;
  top: 0;
  width: 17rpx;
  margin-left: -8.5rpx;
  border-radius: 9rpx 9rpx 3rpx 3rpx;
  background: linear-gradient(90deg, #b7945f, #f6e7c8 40%, #dcc195 76%, #9d7c50);
  box-shadow: 0 5rpx 10rpx rgba(56, 26, 10, 0.3);
  transition: transform 0.55s cubic-bezier(0.22, 1.4, 0.34, 1), filter 0.4s ease;
}

.lots-stick__tip {
  position: absolute;
  left: -1rpx;
  right: -1rpx;
  top: 0;
  height: 42rpx;
  border-radius: 9rpx 9rpx 2rpx 2rpx;
  background: linear-gradient(180deg, #cf4436, #a02a22 62%, #7d1c18);
  box-shadow: inset 0 -3rpx 4rpx rgba(60, 10, 8, 0.4);
}

.lots-stick__ink {
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  top: 62rpx;
  height: 52rpx;
  border-radius: 2rpx;
  background: linear-gradient(180deg, rgba(46, 22, 10, 0.72), rgba(46, 22, 10, 0.5));
}

.lots-stick__shade {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  border-radius: 0 9rpx 3rpx 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(70, 38, 14, 0.35));
}

.lots-stick.is-out {
  filter: drop-shadow(0 16rpx 18rpx rgba(90, 46, 20, 0.36));
}

/* ------------------------- 力度条 ------------------------- */

.lots-energy {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.lots-energy__bar {
  flex: 1;
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(184, 69, 47, 0.14);
  overflow: hidden;
}

.lots-energy__fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #e6a33f, #c2543f);
  transition: width 0.12s linear;
}

.lots-energy.is-live .lots-energy__fill {
  background: linear-gradient(90deg, #f0b64f, #e0432f);
}

.lots-energy__text {
  flex: 0 0 auto;
  color: #a9644f;
  font-size: 19rpx;
  font-weight: 700;
}

.lots-pool-note {
  margin-top: 10rpx;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
  background: rgba(184, 69, 47, 0.07);
  color: #8d5a49;
  font-size: 19rpx;
  line-height: 1.4;
}

.lots-pool-note.warn {
  background: rgba(184, 69, 47, 0.16);
  color: #b8452f;
  font-weight: 700;
}

.lots-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.lots-draw {
  flex: 1;
  min-height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #b8452f, #e8913f);
  color: #fff;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
  box-shadow: 0 14rpx 26rpx rgba(184, 69, 47, 0.3);
}

.lots-draw[disabled] {
  opacity: 0.6;
}

.lots-reset {
  flex: 0 0 auto;
  min-width: 132rpx;
  min-height: 88rpx;
  border-radius: 999rpx;
  background: rgba(184, 69, 47, 0.1);
  color: #a95340;
  font-size: 24rpx;
  font-weight: 800;
}

.lots-editor {
  margin-top: 18rpx;
  padding: 16rpx;
  border-radius: 10rpx;
  background: rgba(184, 69, 47, 0.06);
}

.lots-editor__title {
  display: block;
  color: var(--color-muted);
  font-size: 20rpx;
  font-weight: 700;
}

.lots-editor__row {
  display: flex;
  gap: 10rpx;
  margin-top: 10rpx;
}

.lots-editor__input {
  flex: 1;
  min-width: 0;
  height: 74rpx;
  padding: 0 16rpx;
  border: 1rpx solid rgba(184, 69, 47, 0.2);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  font-size: 24rpx;
}

.lots-editor__add {
  flex: 0 0 auto;
  min-width: 128rpx;
  min-height: 74rpx;
  padding: 0 18rpx;
  border-radius: 8px;
  background: rgba(184, 69, 47, 0.12);
  color: #b8452f;
  font-size: 22rpx;
  font-weight: 800;
}

.lots-editor__list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 12rpx;
}

.lots-editor__item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 12rpx;
  border-radius: 8px;
  background: #fff;
}

.lots-editor__level {
  flex: 0 0 auto;
  padding: 2rpx 8rpx;
  border: 1rpx solid currentColor;
  border-radius: 6rpx;
  font-size: 18rpx;
  font-weight: 800;
}

.lots-editor__text {
  min-width: 0;
  flex: 1;
  color: var(--color-text);
  font-size: 22rpx;
}

.lots-editor__remove {
  flex: 0 0 auto;
  width: 56rpx;
  height: 56rpx;
  border-radius: 8px;
  background: rgba(184, 69, 47, 0.1);
  color: #b8452f;
}

/* ------------------------- 签文卡片 ------------------------- */

.lot-card {
  margin-top: 18rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  border: 1rpx solid rgba(184, 69, 47, 0.18);
  background: linear-gradient(180deg, #fffdf8, #fff4ea);
  box-shadow: 0 14rpx 28rpx rgba(160, 96, 60, 0.12);
}

.lot-card__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.lot-card__badge {
  flex: 0 0 auto;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.lot-card__theme {
  color: var(--color-muted);
  font-size: 20rpx;
}

.lot-card__number {
  margin-left: auto;
  color: var(--color-muted);
  font-size: 20rpx;
}

.lot-card__title {
  display: block;
  margin-top: 14rpx;
  color: var(--color-text);
  font-size: 40rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}

.lot-card__tale {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  margin-top: 12rpx;
}

.lot-card__tale-label {
  flex: 0 0 auto;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(184, 69, 47, 0.12);
  color: #b8452f;
  font-size: 18rpx;
  font-weight: 900;
}

.lot-card__tale-text {
  color: #5a3a2e;
  font-size: 24rpx;
  font-weight: 700;
}

.lot-card__poem {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 10rpx;
  background: rgba(184, 69, 47, 0.06);
  border-left: 6rpx solid rgba(184, 69, 47, 0.5);
}

.lot-card__poem text {
  color: #4a2c22;
  font-size: 27rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
  line-height: 1.5;
}

.lot-card__reading {
  margin-top: 16rpx;
}

.lot-card__reading-label {
  display: block;
  color: #b8452f;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.lot-card__reading-text {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 24rpx;
  line-height: 1.6;
}

.lot-card__again {
  margin-top: 18rpx;
  min-height: 76rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #b8452f, #e8913f);
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
}

.lots-empty {
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 10rpx;
  background: rgba(184, 69, 47, 0.05);
  color: var(--color-muted);
  text-align: center;
}

.lots-empty text {
  display: block;
}

.lots-empty text:first-child {
  color: var(--color-text);
  font-size: 24rpx;
  font-weight: 800;
}

.lots-empty text:last-child {
  margin-top: 6rpx;
  font-size: 20rpx;
}
</style>
