<template>
  <view class="cup3d app-card">
    <view class="cup3d__head">
      <view class="cup3d__copy">
        <text class="cup3d__kicker">
          {{ kicker }}
        </text>
        <text class="cup3d__title">
          骰盅 · {{ count }} 颗
        </text>
        <text class="cup3d__subtitle">
          {{ subtitle || '手机摇一摇，骰子在盅里真碰撞，揭盅看点数。' }}
        </text>
      </view>
      <view class="cup3d__total" :class="{ 'is-hidden': !revealed || !settled }">
        <text>{{ revealed && settled ? settled.total : '??' }}</text>
        <text>点数</text>
      </view>
    </view>

    <view class="cup3d__count">
      <button
        v-for="item in countOptions"
        :key="item"
        class="cup3d__chip"
        :class="{ active: item === count }"
        hover-class="none"
        :disabled="rolling"
        @tap="changeCount(item)"
      >
        {{ item }} 颗
      </button>
    </view>

    <view class="cup3d__presets">
      <button
        v-for="item in presetOptions"
        :key="item.id"
        class="cup3d__preset"
        :class="{ active: item.id === dicePreset }"
        hover-class="none"
        @tap="changePreset(item.id)"
      >
        <text class="cup3d__preset-dot" :class="`is-${item.id}`" />
        <text>{{ item.label }}</text>
      </button>
    </view>

    <!-- 3D 舞台：scene-cmd 下指令，scene-gravity 送手机重力 -->
    <view
      class="cup3d__stage"
      :class="{ 'is-fullscreen': fullscreen }"
      :scene-cmd="sceneCmd"
      :change:scene-cmd="diceScene.onCommand"
      :scene-gravity="gravityPush"
      :change:scene-gravity="diceScene.onGravity"
    >
      <view class="cup3d__canvas" />
      <view v-if="!sceneReady" class="cup3d__loading">
        <text>{{ sceneError || '3D 场景准备中…' }}</text>
        <view v-if="sceneError" class="cup3d__loading-actions">
          <button class="cup3d__chip" hover-class="none" @tap="retryScene">
            重试 3D
          </button>
          <button class="cup3d__chip" hover-class="none" @tap="useFallback">
            用简易模式
          </button>
        </view>
        <text v-if="diagText" class="cup3d__diag">
          {{ diagText }}
        </text>
      </view>
      <text v-else-if="diagText" class="cup3d__diag cup3d__diag--corner">
        {{ diagText }}
      </text>

      <!-- 全屏时把关键操作浮在画面上 -->
      <view v-if="fullscreen" class="cup3d__fs-bar">
        <button
          class="cup3d__fs-btn cup3d__fs-btn--primary"
          hover-class="none"
          :disabled="rolling || !sceneReady"
          @tap="reveal"
        >
          {{ rolling ? '骰子还在滚…' : (rolled ? '揭 盅' : '摇一把并揭盅') }}
        </button>
        <button
          class="cup3d__fs-btn"
          hover-class="none"
          :disabled="rolling || !sceneReady"
          @tap="manualShake"
        >
          摇 盅
        </button>
        <button class="cup3d__fs-btn cup3d__fs-btn--ghost" hover-class="none" @tap="toggleFullscreen">
          退出全屏
        </button>
      </view>

      <view class="cup3d__meter">
        <view class="cup3d__level">
          <view class="cup3d__level-fill" :style="{ width: energyPercent }" />
        </view>
        <view class="cup3d__bubble">
          <view class="cup3d__bubble-dot" :style="bubbleStyle" />
        </view>
      </view>
    </view>

    <view class="cup3d__readout">
      <text class="cup3d__state" :class="{ live: rolling }">
        {{ stateText }}
      </text>
      <text class="cup3d__hint">
        {{ sensorHint }}
      </text>
    </view>

    <view v-if="revealed && settled" class="cup3d__summary">
      <view class="cup3d__values">
        <view v-for="(value, index) in settled.values" :key="`v-${index}`" class="cup3d__value">
          <text>{{ value }}</text>
          <text>第 {{ index + 1 }} 颗</text>
        </view>
      </view>
      <text class="cup3d__sum-text">
        {{ settled.values.join(' + ') }} = {{ settled.total }}
      </text>
      <text class="cup3d__sum-detail">
        {{ settled.summary }}
      </text>
    </view>

    <view class="cup3d__actions">
      <button
        v-if="!revealed"
        class="cup3d__btn cup3d__btn--primary"
        hover-class="none"
        :disabled="rolling || !sceneReady"
        @tap="reveal"
      >
        {{ rolling ? '骰子还在滚…' : (rolled ? '揭 盅' : '摇一把并揭盅') }}
      </button>
      <button
        v-else
        class="cup3d__btn cup3d__btn--primary"
        hover-class="none"
        @tap="cover"
      >
        再摇一次
      </button>
      <button
        class="cup3d__btn cup3d__btn--ghost"
        hover-class="none"
        :disabled="rolling"
        @tap="manualShake"
      >
        手动摇盅
      </button>
      <button
        class="cup3d__btn cup3d__btn--ghost cup3d__btn--icon"
        hover-class="none"
        @tap="requestResetView"
      >
        复位视角
      </button>
      <button
        class="cup3d__btn cup3d__btn--ghost cup3d__btn--icon"
        hover-class="none"
        @tap="toggleFullscreen"
      >
        全屏
      </button>
    </view>

    <view class="cup3d__note" @tap="enableSensor">
      {{ noteText }}
    </view>
  </view>
</template>

<script>
import { getDiceConfig, recordDiceResult, setDiceCount } from '@/utils/play-data'
import { useDeviceShake } from '@/utils/use-device-shake'

function clampNumber (value, min, max) {
  const number = Number(value) || 0
  return Math.min(Math.max(number, min), max)
}

export default {
  name: 'DiceCup3D',
  props: {
    scope: {
      type: String,
      default: 'guest'
    },
    kicker: {
      type: String,
      default: 'DICE CUP 3D'
    },
    subtitle: {
      type: String,
      default: ''
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  emits: ['result', 'unavailable'],
  setup () {
    const sensor = useDeviceShake()
    return {
      sensor,
      energy: sensor.energy,
      gravity: sensor.gravity,
      sensorReady: sensor.supported,
      startSensor: sensor.start,
      stopSensor: sensor.stop,
      retrySensor: sensor.retry
    }
  },
  data () {
    return {
      countOptions: [1, 2, 3, 4, 5, 6],
      presetOptions: [
        { id: 'ruby', label: '红宝石' },
        { id: 'ivory', label: '象牙白' }
      ],
      dicePreset: 'ivory',
      count: 2,
      sceneCmd: { id: 0, type: '', payload: {} },
      gravityPush: { x: 0, y: 0, z: 0 },
      cmdId: 0,
      sceneReady: false,
      sceneError: '',
      glInfo: null,
      fps: 0,
      flatness: 0,
      fullscreen: false,
      rolling: false,
      revealed: false,
      rolled: false,
      pendingReveal: false,
      // 结果是否已经"公布"（写进最近结果 + 抛给页面）。
      // 必须等真的掀盅才算公布，否则骰子一停稳下面就已经出结果了。
      published: false,
      settled: null,
      pushTimer: null,
      lastPushAt: 0,
      // 兜底看门狗：3D 层万一没回报停稳，这里也会把界面从"摇骰中"里救出来
      rollWatchdog: null
    }
  },
  computed: {
    energyPercent () {
      return `${Math.round((this.energy || 0) * 100)}%`
    },
    bubbleStyle () {
      const g = this.gravity || { x: 0, y: 0 }
      const x = clampNumber(g.x, -1.1, 1.1) * 16
      const y = clampNumber(g.y, -1.1, 1.1) * 16
      return { transform: `translate(${x.toFixed(1)}rpx, ${y.toFixed(1)}rpx)` }
    },
    stateText () {
      if (!this.sceneReady) return '3D 场景准备中'
      if (this.rolling) return '骰子在盅里碰撞'
      if (this.revealed) return '已揭盅'
      if (this.settled) return '骰子已停稳，可以揭盅'
      return '拿起手机摇一摇'
    },
    sensorHint () {
      if (!this.sceneReady) return this.sceneError || '正在准备 three.js 场景'
      if (this.sensorReady) return '拖动画面可 360° 换视角，双指缩放；手机怎么倾，骰子就往哪边滚。'
      return '没读到重力感应：点一下下面那行字可以重试，或直接用「手动摇盅」。'
    },
    noteText () {
      if (this.sceneError) return '3D 场景不可用，可以切到简易模式继续玩。'
      if (this.revealed) return '点数是物理模拟停稳后从骰子朝向读出来的真实结果。'
      return 'three.js 实时渲染 + 刚体物理：骰子会真正翻滚、碰撞、停稳。'
    },
    /** 诊断行：手机上一眼就能看出跑的是 3D 还是降级、什么渲染器、多少帧 */
    diagText () {
      if (!this.sceneReady || !this.glInfo) return ''
      const parts = ['3D 已启用', this.glInfo.version, this.glInfo.mobile ? '移动画质' : '桌面画质']
      if (this.fps) parts.push(`${this.fps}fps`)
      if (this.glInfo.pips !== undefined) parts.push(`点 ${this.glInfo.pips}/顶点 ${this.glInfo.pipVertices}`)
      if (this.flatness) parts.push(`平躺 ${this.flatness}`)
      return parts.join(' · ')
    }
  },
  watch: {
    active (value) {
      if (value) this.startSensor()
      else this.stopSensor()
    }
  },
  mounted () {
    this.count = getDiceConfig(this.scope).count
    this.sensor.setShakeHandler(() => this.onDeviceShake())
    if (this.active) this.startSensor()
    this.$nextTick(() => this.sendCommand('init', { count: this.count }))
    this.pushTimer = setInterval(() => this.pushGravity(), 90)
    // 兜底：App 端 renderjs 挂载时机不确定，超时没就绪就再推一次 init
    this.sceneWatchdog = 0
    this.initTimer = setInterval(() => {
      if (this.sceneReady) {
        clearInterval(this.initTimer)
        this.initTimer = null
        return
      }
      this.sceneWatchdog += 1
      if (this.sceneWatchdog <= 4) {
        this.sendCommand('init', { count: this.count })
      } else {
        clearInterval(this.initTimer)
        this.initTimer = null
        if (!this.sceneReady && !this.sceneError) this.sceneError = '3D 场景启动超时，可以点「重试 3D」'
      }
    }, 1500)
  },
  beforeUnmount () {
    if (this.pushTimer) clearInterval(this.pushTimer)
    this.pushTimer = null
    if (this.initTimer) clearInterval(this.initTimer)
    this.initTimer = null
    this.clearRollWatchdog()
    this.setPageScrollLocked(false)
    this.stopSensor()
    this.sendCommand('dispose')
  },
  methods: {
    /**
     * 摇骰看门狗：3D 层该在 4.5 秒内收尾，这里多给 1 秒。
     * 万一跨层通道掉了消息，先命令 3D 强制收尾；再没回音就把界面解锁，
     * 绝不让用户卡在"骰子还在滚"里出不来。
     */
    armRollWatchdog () {
      this.clearRollWatchdog()
      this.rollWatchdog = setTimeout(() => {
        this.rollWatchdog = null
        if (!this.rolling) return
        this.sendCommand('force-settle', {})
        this.rollWatchdog = setTimeout(() => {
          this.rollWatchdog = null
          if (!this.rolling) return
          this.rolling = false
          uni.showToast({ title: '骰盅没停稳，请再摇一次', icon: 'none' })
        }, 1500)
      }, 5500)
    },
    clearRollWatchdog () {
      if (this.rollWatchdog) clearTimeout(this.rollWatchdog)
      this.rollWatchdog = null
    },
    sendCommand (type, payload = {}) {
      this.cmdId += 1
      this.sceneCmd = { id: this.cmdId, type, payload }
    },
    pushGravity () {
      if (!this.sceneReady || !this.sensorReady) return
      const now = Date.now()
      if (now - this.lastPushAt < 80) return
      this.lastPushAt = now
      const g = this.gravity || { x: 0, y: 0, z: 0 }
      const next = {
        x: Number(clampNumber(g.x, -2, 2).toFixed(3)),
        y: Number(clampNumber(g.y, -2, 2).toFixed(3)),
        z: Number(clampNumber(g.z, -2, 2).toFixed(3))
      }
      const prev = this.gravityPush
      if (Math.abs(next.x - prev.x) < 0.008 &&
        Math.abs(next.y - prev.y) < 0.008 &&
        Math.abs(next.z - prev.z) < 0.008) return
      this.gravityPush = next
    },
    onSceneEvent (payload) {
      const data = payload || {}
      if (data.type === 'ready') {
        this.sceneReady = true
        this.sceneError = ''
        if (data.info) this.glInfo = data.info
        this.pushGravity()
        return
      }
      if (data.type === 'error') {
        this.sceneError = data.message || '3D 初始化失败'
        this.sceneReady = false
        return
      }
      if (data.type === 'fps') {
        this.fps = data.fps || 0
        return
      }
      if (data.type === 'context-lost') {
        this.sceneError = '3D 上下文丢失，正在恢复…'
        this.sceneReady = false
        setTimeout(() => this.sendCommand('rebuild'), 400)
        return
      }
      if (data.type === 'rebuild') {
        this.sendCommand('rebuild')
        return
      }
      if (data.type === 'rolling') {
        this.rolling = true
        this.settled = null
        this.armRollWatchdog()
        return
      }
      if (data.type === 'settled') {
        this.clearRollWatchdog()
        this.rolling = false
        this.rolled = true
        this.flatness = data.flatness
        this.settled = {
          values: data.values || [],
          total: data.total || 0,
          summary: data.summary || ''
        }
        // 这里先不公布结果：骰子停稳但盅还盖着，
        // 提前写进"最近结果"等于剧透，用户没掀盅就知道点数了。
        // 用户点"揭盅"时还没摇过：摇完自动开盅，一次点击完成
        if (this.pendingReveal) {
          this.pendingReveal = false
          this.revealed = true
          this.sendCommand('reveal')
          this.publishResult()
        }
      }
    },

    /** 真的掀盅之后才把结果写进历史、抛给页面。 */
    publishResult () {
      if (this.published || !this.settled) return
      this.published = true
      this.recordResult(this.settled.values)
      this.$emit('result', this.settled)
    },
    onDeviceShake () {
      if (!this.sceneReady || this.rolling || this.revealed) return
      this.sendCommand('shake', { power: 1 })
    },
    manualShake () {
      if (!this.sceneReady || this.rolling) return
      // 已揭盅时先盖上再摇，而不是"按钮没反应"
      if (this.revealed) this.cover()
      this.sendCommand('shake', { power: 1.15 })
    },
    reveal () {
      if (this.rolling) return
      if (!this.rolled) {
        this.pendingReveal = true
        this.sendCommand('shake', { power: 1 })
        return
      }
      this.revealed = true
      this.sendCommand('reveal')
      this.publishResult()
    },
    cover () {
      this.revealed = false
      this.settled = null
      this.rolled = false
      this.pendingReveal = false
      this.published = false
      this.sendCommand('cover')
    },
    changeCount (value) {
      if (this.rolling) return
      this.count = setDiceCount(this.scope, value)
      this.revealed = false
      this.settled = null
      this.rolled = false
      this.pendingReveal = false
      this.published = false
      // 3D 层收到后会把盅盖回去、把骰子重新摆好，等用户再摇
      this.sendCommand('count', { count: this.count })
    },
    changePreset (preset) {
      if (this.dicePreset === preset) return
      this.dicePreset = preset
      this.sendCommand('preset', { preset })
    },
    /*
     * 不能叫 resetView：H5 里 renderjs 与逻辑层共用实例，
     * renderjs 里也有 resetView（真正复位相机），同名会被这个覆盖，
     * 于是 onCommand → resetView(逻辑层) → sendCommand → sceneCmd 变化 → onCommand……
     * 点「复位视角」会死循环把页面卡死。
     */
    requestResetView () {
      this.sendCommand('reset-view')
    },
    /**
     * 全屏：用"固定定位铺满屏幕"实现，各端一致（iOS 的 WebView 不支持元素级全屏 API）。
     * 桌面浏览器如果支持系统全屏，再顺手调一次，视觉更彻底。
     */
    toggleFullscreen () {
      this.fullscreen = !this.fullscreen
      // 全屏期间禁止页面滚动：不锁的话在全屏画面上滑动会让下面整页跟着滚，
      // 退出全屏时页面位置就乱了
      this.setPageScrollLocked(this.fullscreen)
      try {
        if (typeof document === 'undefined') throw new Error('no dom')
        if (this.fullscreen && document.documentElement.requestFullscreen) {
          const request = document.documentElement.requestFullscreen()
          if (request && request.catch) request.catch(() => {})
        } else if (!this.fullscreen && document.exitFullscreen) {
          const exit = document.exitFullscreen()
          if (exit && exit.catch) exit.catch(() => {})
        }
      } catch (error) {
        // iOS / App WebView 不支持就算了，CSS 全屏已经铺满
      }
      // 布局变化后让 3D 重新取景（做两次，兼容地址栏动画导致的延时）
      setTimeout(() => this.sendCommand('resize'), 120)
      setTimeout(() => this.sendCommand('resize'), 460)
      // iOS 地址栏收起/展开是动画的，等它稳定后再量一次
      setTimeout(() => this.sendCommand('resize'), 900)
    },

    /** 全屏时锁页面滚动；不依赖任何 API，拿不到 document 就静默跳过。 */
    setPageScrollLocked (locked) {
      if (typeof document === 'undefined') return
      try {
        const value = locked ? 'hidden' : ''
        document.documentElement.style.overflow = value
        if (document.body) document.body.style.overflow = value
      } catch (error) {
        // 锁不住也不影响全屏本身
      }
    },
    recordResult (values) {
      try {
        recordDiceResult(this.scope, values)
      } catch (error) {
        // 记录失败不影响玩法
      }
    },
    retryScene () {
      this.sceneError = ''
      this.sendCommand('rebuild')
    },
    useFallback () {
      this.$emit('unavailable')
    },
    enableSensor () {
      if (this.sensorReady) return
      this.retrySensor()
      uni.showToast({ title: '正在开启重力感应，摇一摇试试', icon: 'none' })
    }
  }
}
</script>

<script module="diceScene" lang="renderjs">
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 真实尺寸对照：常见骰盅内径约 85mm、高约 100mm，标准骰子 16mm。
// 场景里 1 单位 ≈ 4cm，所以骰子 0.40、盅口内径 2.12、盅高 2.25，
// 骰子只占盅口直径的约 19%，和真的一样。
const DIE_SIZE = 0.34
const DIE_HALF = DIE_SIZE / 2
const CUP_INNER_R = 1.06
// 盅内壁的"碰撞面"半径：要略小于看得见的皮面（1.02），骰子才不会陷进壁里
const CUP_COLLIDE_R = 0.99
const CUP_HEIGHT = 2.25
const FLOOR_Y = 0
// 按上面的尺度换算，等效真实重力约 60 单位/秒²，落下来才不飘
const GRAVITY = 60
const CUP_WALLS = 28

// 一轮摇骰的硬性上限：到点必须收尾。
// 真实手感大概 2~3 秒就停稳，留到 4.5 秒是给"骰子卡在盅壁、互相叠着"留余量。
// 有这条上限，就绝不允许出现"摇不完"的状态。
const ROLL_MAX_MS = 4500

/** 骰子六个面的局部法线与切向，相对两面点数和为 7。 */
const FACES = [
  { value: 1, normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { value: 6, normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { value: 2, normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { value: 5, normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { value: 3, normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { value: 4, normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] }
]

/** 3×3 网格点位，和真实骰子排布一致。 */
const PIP_GRID = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
}

function clampNumber (value, min, max) {
  const number = Number(value) || 0
  return Math.min(Math.max(number, min), max)
}

function describeDice (values) {
  const counts = values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1
    return result
  }, {})
  const unique = Object.keys(counts).map(Number)
  if (values.length > 2 && unique.length === 1) return `${values.length} 个 ${values[0]} 点，豹子`
  if (values.length > 1 && unique.length === 1) return `对子 ${values[0]} 点`
  if (values.length >= 3 && unique.length === values.length &&
    Math.max(...values) - Math.min(...values) === values.length - 1) return '顺子，手气不错'
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total >= values.length * 5) return '点数偏高，宜进攻'
  if (total <= values.length * 2) return '点数偏低，宜保守'
  return '点数平稳，正常发挥'
}

/** 程序化皮质凹凸，省掉外部贴图。 */
function leatherBumpTexture () {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 9000; i += 1) {
    const shade = Math.round(118 + Math.random() * 74)
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.36)`
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.9, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 3)
  return texture
}

/** 桌面绒布：细颗粒 + 中间略亮，让骰子投影有层次。 */
function feltTexture () {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.64)
  gradient.addColorStop(0, '#7b5866')
  gradient.addColorStop(0.55, '#5c3b49')
  gradient.addColorStop(1, '#33202a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 24000; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 由高度图求法线图：细划痕与指纹感都靠它转成真实的凹凸。 */
function heightToNormal (sourceCanvas, size, strength) {
  const data = sourceCanvas.getContext('2d').getImageData(0, 0, size, size).data
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const ctx = out.getContext('2d')
  const image = ctx.createImageData(size, size)
  const height = (x, y) => data[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * strength
      const dy = (height(x, y + 1) - height(x, y - 1)) * strength
      const length = Math.sqrt(dx * dx + dy * dy + 1)
      const index = (y * size + x) * 4
      image.data[index] = Math.round((-dx / length * 0.5 + 0.5) * 255)
      image.data[index + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255)
      image.data[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255)
      image.data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return out
}

/** 微表面贴图：细颗粒 + 指纹雾感 + 极浅划痕，同时产出 roughness 与 normal。 */
function createMicroSurfaceMaps (size) {
  const heightCanvas = document.createElement('canvas')
  heightCanvas.width = size
  heightCanvas.height = size
  const ctx = heightCanvas.getContext('2d')

  ctx.fillStyle = '#d9d9d9'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < size * 26; i += 1) {
    const value = Math.round(200 + Math.random() * 46)
    ctx.fillStyle = `rgba(${value},${value},${value},0.55)`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
  }
  for (let i = 0; i < 14; i += 1) {
    const cx = Math.random() * size
    const cy = Math.random() * size
    const radius = 10 + Math.random() * 26
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.16)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const length = 6 + Math.random() * 52
    const angle = Math.random() * Math.PI
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(238,238,238,0.34)' : 'rgba(168,168,168,0.3)'
    ctx.lineWidth = 0.5 + Math.random() * 0.8
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }

  const roughnessMap = new THREE.CanvasTexture(heightCanvas)
  roughnessMap.wrapS = THREE.RepeatWrapping
  roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2.5, 2.5)

  const normalMap = new THREE.CanvasTexture(heightToNormal(heightCanvas, size, 0.45))
  normalMap.wrapS = THREE.RepeatWrapping
  normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(2.5, 2.5)

  return { roughnessMap, normalMap }
}

/** 程序化真皮：颗粒 + 褶皱，输出 roughness / normal。 */
/**
 * 影棚环境贴图：顶部柔光箱 + 左右冷暖侧光板 + 背光。
 * 骰子表面的高光和倒影都来自它，这比单靠直射光像"市面上的产品图"。
 */
function createStudioEnvironment (renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  const panel = (color, intensity) => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    side: THREE.DoubleSide
  })
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 12), panel(0x2a2026, 0.6))
  room.material.side = THREE.BackSide
  envScene.add(room)

  const softbox = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), panel(0xfff2e2, 2.4))
  softbox.position.set(0, 4.4, 0)
  softbox.rotation.x = Math.PI / 2
  envScene.add(softbox)

  const coolSide = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5), panel(0xcfe0ff, 0.95))
  coolSide.position.set(-5.4, 1.4, 0.4)
  coolSide.rotation.y = Math.PI / 2
  envScene.add(coolSide)

  const warmSide = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5), panel(0xffdcc4, 1.15))
  warmSide.position.set(5.4, 1.6, -0.4)
  warmSide.rotation.y = -Math.PI / 2
  envScene.add(warmSide)

  const backLight = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.4), panel(0xffffff, 0.85))
  backLight.position.set(0, 2.2, -5.6)
  envScene.add(backLight)

  const texture = pmrem.fromScene(envScene, 0.02).texture
  pmrem.dispose()
  return texture
}

/** 骰子脚下的接触阴影贴图（径向渐变）。 */
function createContactShadowTexture () {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size * 0.5)
  gradient.addColorStop(0, 'rgba(20,6,12,0.75)')
  gradient.addColorStop(0.45, 'rgba(20,6,12,0.34)')
  gradient.addColorStop(1, 'rgba(20,6,12,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** 程序化真皮：颗粒 + 褶皱，输出 roughness / normal。 */
function createLeatherMaps (size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#8a8a8a'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 5200; i += 1) {
    const shade = Math.round(116 + Math.random() * 62)
    ctx.fillStyle = `rgba(${shade},${shade},${shade},0.5)`
    ctx.beginPath()
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      1.6 + Math.random() * 3.2,
      1.2 + Math.random() * 2.8,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.strokeStyle = 'rgba(66,66,66,0.26)'
    ctx.lineWidth = 0.7
    ctx.stroke()
  }
  for (let i = 0; i < 26; i += 1) {
    const cx = Math.random() * size
    const cy = Math.random() * size
    const radius = 30 + Math.random() * 90
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius)
    gradient.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(40,40,40,0.16)')
    gradient.addColorStop(1, 'rgba(128,128,128,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const roughnessMap = new THREE.CanvasTexture(canvas)
  roughnessMap.wrapS = THREE.RepeatWrapping
  roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(4, 2)

  const normalMap = new THREE.CanvasTexture(heightToNormal(canvas, size, 2.6))
  normalMap.wrapS = THREE.RepeatWrapping
  normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(4, 2)

  return { roughnessMap, normalMap }
}

/** 六个面上所有点数的世界位置与朝向。 */
function buildPipLayout (size) {
  const half = size / 2
  const step = size * 0.252
  const layout = []
  FACES.forEach((face) => {
    const normal = new THREE.Vector3(face.normal[0], face.normal[1], face.normal[2])
    const u = new THREE.Vector3(face.u[0], face.u[1], face.u[2])
    const v = new THREE.Vector3(face.v[0], face.v[1], face.v[2])
    PIP_GRID[face.value].forEach(([px, py]) => {
      layout.push({
        value: face.value,
        normal,
        point: new THREE.Vector3().copy(normal).multiplyScalar(half)
          .addScaledVector(u, px * step)
          .addScaledVector(v, py * step)
      })
    })
  })
  return layout
}

/** 把点数位置的面顶点沿法线方向压下去，形成真实的内凹刻槽。 */
function recessPips (geometry, size, pipRadius, pipDepth) {
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()
  const influence = pipRadius * 1.8
  const faceThreshold = size * 0.5 - size * 0.128
  const pips = buildPipLayout(size)

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i)
    let offset = 0
    let normal = null
    for (let f = 0; f < pips.length; f += 1) {
      const pip = pips[f]
      if (vertex.dot(pip.normal) < faceThreshold) continue
      const distance = Math.sqrt(
        (vertex.x - pip.point.x) ** 2 +
        (vertex.y - pip.point.y) ** 2 +
        (vertex.z - pip.point.z) ** 2
      )
      if (distance > influence) continue
      const candidate = pipDepth * Math.cos((distance / influence) * Math.PI * 0.5)
      if (candidate > offset) {
        offset = candidate
        normal = pip.normal
      }
    }
    if (!normal) continue
    position.setXYZ(
      i,
      vertex.x - normal.x * offset,
      vertex.y - normal.y * offset,
      vertex.z - normal.z * offset
    )
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
}

/** 构建共享资源：几何 + 材质（六颗骰子只做一次）。 */
function createDiceAssets (presetName, size, segments, pipSegments) {
  const preset = DICE_PRESETS[presetName] || DICE_PRESETS.ivory
  const bevel = size * 0.08
  const pipRadius = size * 0.1
  const pipDepth = size * 0.032
  const maps = createMicroSurfaceMaps(256)

  const geometry = new RoundedBoxGeometry(size, size, size, segments || 32, bevel)
  recessPips(geometry, size, pipRadius, pipDepth)

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: preset.bodyColor,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness,
    transmission: preset.transmission,
    ior: preset.ior,
    thickness: preset.thickness,
    attenuationColor: new THREE.Color(preset.attenuationColor),
    attenuationDistance: preset.transmission > 0 ? 3.6 : 1000,
    envMapIntensity: preset.envMapIntensity,
    roughnessMap: maps.roughnessMap,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.12, 0.12)
  })

  const pipBase = new THREE.CylinderGeometry(pipRadius * 0.94, pipRadius * 0.9, pipDepth * 0.75, pipSegments || 30)
  const upAxis = new THREE.Vector3(0, 1, 0)
  const primaryGeos = []
  const secondaryGeos = []
  buildPipLayout(size).forEach((pip) => {
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upAxis, pip.normal)
    // 点面与骰面齐平、略微露出；位置必须用 pip.point（含面内的 3×3 网格偏移），
    // 否则所有点都会堆在面中心，看起来就永远只有"1 点"。
    const position = pip.point.clone().addScaledVector(pip.normal, -(pipDepth * 0.12))
    const geo = pipBase.clone()
    geo.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1)))
    if (pip.value === 1 || pip.value === 4) primaryGeos.push(geo)
    else secondaryGeos.push(geo)
  })

  // 点数用哑光深色：不反射环境、不高光，任何屏幕亮度下都不会被"烤白"
  const pipMaterial = (color) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    envMapIntensity: 0.1
  })

  let primaryGeometry = mergeGeometries(primaryGeos, false)
  let secondaryGeometry = mergeGeometries(secondaryGeos, false)
  // 移动端万一合并失败，就退回一组小网格，绝不能出现"没有点数"
  let pipFallbackGeos = null
  if (!primaryGeometry || !secondaryGeometry) {
    pipFallbackGeos = { primary: primaryGeos, secondary: secondaryGeos }
    primaryGeometry = null
    secondaryGeometry = null
  }
  const pipVertexCount = pipFallbackGeos
    ? [...pipFallbackGeos.primary, ...pipFallbackGeos.secondary].reduce((sum, geo) => sum + (geo.attributes.position ? geo.attributes.position.count : 0), 0)
    : (primaryGeometry.attributes.position.count + secondaryGeometry.attributes.position.count)

  return {
    preset,
    geometry,
    primaryGeometry,
    secondaryGeometry,
    pipFallbackGeos,
    pipCount: primaryGeos.length + secondaryGeos.length,
    pipVertexCount,
    bodyMaterial,
    primaryMaterial: pipMaterial(preset.pipPrimary),
    secondaryMaterial: pipMaterial(preset.pipSecondary)
  }
}

/**
 * 对外主函数：构建一颗写实骰子模型。
 * @param {object} options
 *   size    骰子边长
 *   preset  'ruby' | 'ivory'
 *   assets  复用已有资源（六颗骰子共用几何与材质）
 * @returns {THREE.Group} 可直接 add 到场景的骰子
 */
function initRealisticDice (options = {}) {
  const size = options.size || DIE_SIZE
  const assets = options.assets || createDiceAssets(options.preset || 'ivory', size)
  const group = new THREE.Group()
  group.name = 'realistic-dice'

  const body = new THREE.Mesh(assets.geometry, assets.bodyMaterial)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  if (assets.pipFallbackGeos) {
    assets.pipFallbackGeos.primary.forEach((geo) => group.add(new THREE.Mesh(geo, assets.primaryMaterial)))
    assets.pipFallbackGeos.secondary.forEach((geo) => group.add(new THREE.Mesh(geo, assets.secondaryMaterial)))
  } else {
    group.add(new THREE.Mesh(assets.primaryGeometry, assets.primaryMaterial))
    group.add(new THREE.Mesh(assets.secondaryGeometry, assets.secondaryMaterial))
  }

  group.userData.assets = assets
  group.userData.size = size
  return group
}

/* =====================================================================
 * 真实感骰子模型
 * - 圆角倒角几何（不是硬角立方体）
 * - 点数做成真正的内凹刻槽（顶点位移），不是平面贴图
 * - MeshPhysicalMaterial：亚克力清漆 + 可选透光（红宝石） / 象牙白
 * - 程序化微表面：细微划痕与指纹感，同时给出 roughness / normal
 * ===================================================================== */

const DICE_PRESETS = {
  // 赌馆级红宝石亚克力：clearcoat 0.8 / transmission 0.6 / ior 1.52
  ruby: {
    bodyColor: 0x7d1a2e,
    attenuationColor: 0xa81c33,
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transmission: 0.6,
    ior: 1.52,
    thickness: 1.2,
    envMapIntensity: 0.85,
    pipPrimary: 0xfbf7ee,
    pipSecondary: 0xe6c67a,
    pipPrimaryRoughness: 0.08,
    pipSecondaryRoughness: 0.14
  },
  // 经典象牙白：深朱红 1/4 点 + 深墨蓝其余点
  ivory: {
    bodyColor: 0xf6f1e6,
    attenuationColor: 0xf6f1e6,
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transmission: 0,
    ior: 1.52,
    thickness: 0,
    envMapIntensity: 0.8,
    pipPrimary: 0xc8102e,
    pipSecondary: 0x0f172a,
    pipPrimaryRoughness: 0.12,
    pipSecondaryRoughness: 0.12
  }
}

export default {
  data () {
    return {
      ready: false,
      disposed: false,
      // 'ruby' 红宝石亚克力（赌馆级透光） / 'ivory' 经典象牙白
      dicePreset: 'ivory',
      /*
       * 摇骰的时间轴状态必须声明在 data 里才会真正挂到实例上。
       * 只写 this.xxx = ... 的话赋值不落地，stopAt 之类的超时判断
       * 永远读不到值，就会出现"摇了很久都不停"。
       */
      rolling: false,
      settledReported: false,
      stillSince: 0,
      lastKickAt: 0,
      rollDeadlineAt: 0,
      lastTiltKickAt: 0,
      lastTiltX: 0,
      lastTiltZ: 0,
      rattleEnergy: 0,
      cupOpening: false,
      // 当前场景里的骰子数量。init 指令会带过来，必须存住，
      // 否则场景会按默认值建，界面显示的数量和实际玩的对不上。
      currentCount: 2
    }
  },
  mounted () {
    this.startScene()
  },
  beforeDestroy () {
    this.disposeScene()
  },
  beforeUnmount () {
    this.disposeScene()
  },
  methods: {
    notify (ownerInstance, payload) {
      const target = ownerInstance || this.$ownerInstance
      try {
        if (target && target.callMethod) target.callMethod('onSceneEvent', payload)
      } catch (error) {
        // 逻辑层销毁后忽略
      }
    },

    onCommand (newValue, oldValue, ownerInstance) {
      const cmd = newValue || {}
      const payload = cmd.payload || {}
      if (cmd.type === 'init') {
        /*
         * init 会把界面上当前选中的骰子数量带过来。
         * 之前这里完全忽略了 payload.count，场景一律按默认的 2 颗建，
         * 于是界面显示"6 颗"、实际玩的却是 2 颗。
         */
        const wanted = clampNumber(payload.count, 1, 6) | 0
        if (wanted) this.currentCount = wanted
        if (!this.scene) this.startScene(ownerInstance)
        else if (wanted && this.dice && this.dice.length !== wanted) this.rebuildDice(wanted)
        return
      }
      if (!this.scene) return
      if (ownerInstance) this.owner = ownerInstance
      if (cmd.type === 'shake') this.shake(payload.power || 1)
      else if (cmd.type === 'force-settle') this.forceSettle()
      else if (cmd.type === 'reveal') this.openCup()
      else if (cmd.type === 'cover') this.closeCup()
      else if (cmd.type === 'count') this.rebuildDice(payload.count || 2)
      else if (cmd.type === 'preset') this.applyPreset(payload.preset)
      else if (cmd.type === 'reset-view') this.resetView()
      else if (cmd.type === 'resize') this.handleResize()
      else if (cmd.type === 'rebuild') this.rebuildScene(ownerInstance)
      else if (cmd.type === 'dispose') this.disposeScene()
    },

    /** WebGL 上下文丢失后重建整场景（手机切后台回来会用到）。 */
    rebuildScene (ownerInstance) {
      const host = this.host
      if (!host) return
      this.disposeScene()
      this.disposed = false
      this.ready = false
      this.host = host
      this.startScene(ownerInstance)
    },

    onGravity (newValue) {
      const g = newValue || {}
      this.deviceGravity = {
        x: Number(g.x) || 0,
        y: Number(g.y) || 0,
        z: Number(g.z) || 0
      }
      this.gravityFromLogicAt = Date.now()
    },

    /* --------------------------- 初始化 --------------------------- */

    startScene (ownerInstance) {
      if (this.scene || this.disposed) return
      if (ownerInstance) this.owner = ownerInstance
      this.buildRetry = 0
      this.tryBuild()
    },

    /**
     * 找渲染容器。
     * App 端 renderjs 的 mounted 可能早于 DOM 就绪，$el 也可能是普通对象，
     * 所以这里同时走 $el.querySelector 和 document 两条路，并配合重试。
     */
    resolveHost () {
      const root = this.$el
      if (root && root.querySelector) {
        const found = root.querySelector('.cup3d__canvas')
        if (found) return found
        if (root.appendChild) return root
      }
      if (typeof document !== 'undefined' && document.querySelector) {
        const found = document.querySelector('.cup3d__canvas')
        if (found) return found
      }
      return null
    },

    tryBuild () {
      const host = this.host || this.resolveHost()
      if (!host) {
        if (this.buildRetry < 40) {
          this.buildRetry += 1
          setTimeout(() => this.tryBuild(), 100)
          return
        }
        const rootType = this.$el ? String(this.$el.tagName || typeof this.$el) : 'null'
        this.notify(null, { type: 'error', message: `找不到 3D 容器（$el: ${rootType}）` })
        return
      }
      this.host = host
      const width = host.clientWidth || 0
      const height = host.clientHeight || 0
      if ((width < 40 || height < 40) && this.buildRetry < 40) {
        this.buildRetry += 1
        setTimeout(() => this.tryBuild(), 100)
        return
      }
      try {
        this.build(width || 320, height || 320)
        this.ready = true
        this.notify(null, { type: 'ready', info: this.glInfo })
      } catch (error) {
        this.notify(null, {
          type: 'error',
          message: String(error && error.message ? error.message : error)
        })
      }
    },

    build (width, height) {
      // 移动端降一档画质，保证帧率（帧率一掉，手感就完全不同）
      const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua) ||
        width < 430 || height < 430
      this.quality = isMobile
        ? { pixelRatio: 1.6, shadowSize: 768, diceSegments: 18, pipSegments: 16, physicsStep: 1 / 90, substeps: 3, antialias: true }
        : { pixelRatio: 2, shadowSize: 1024, diceSegments: 32, pipSegments: 30, physicsStep: 1 / 120, substeps: 6, antialias: true }
      this.diceSegments = this.quality.diceSegments
      this.pipSegments = this.quality.pipSegments

      const scene = new THREE.Scene()
      this.scene = scene

      const renderer = new THREE.WebGLRenderer({
        antialias: this.quality.antialias,
        alpha: true,
        powerPreference: 'high-performance'
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio))
      renderer.setSize(width, height, false)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.95
      renderer.outputColorSpace = THREE.SRGBColorSpace
      // 红宝石材质要吃透射渲染，降一半分辨率省性能
      if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      this.renderer = renderer
      this.host.appendChild(renderer.domElement)

      // 上下文丢失（手机切后台再回来最容易发生）要能自恢复，否则画面会变黑
      renderer.domElement.addEventListener('webglcontextlost', (event) => {
        if (event.cancelable) event.preventDefault()
        this.contextLost = true
        this.notify(null, { type: 'context-lost' })
      }, false)
      renderer.domElement.addEventListener('webglcontextrestored', () => {
        this.contextLost = false
        this.notify(null, { type: 'rebuild' })
      }, false)

      // 把真实渲染信息报给界面，手机上一眼能看出跑的是哪条路
      let rendererName = 'unknown'
      try {
        const gl = renderer.getContext()
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        rendererName = String(
          (debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || 'unknown'
        )
      } catch (error) {
        rendererName = 'unknown'
      }
      this.rendererName = rendererName

      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
      this.camera = camera
      this.cameraTarget = new THREE.Vector3(0, 0.95, 0)
      this.baseDistance = this.fitDistance(width / height)
      // 球坐标视角：可以拖动旋转、双指缩放
      this.orbit = {
        azimuth: 0,
        elevation: 0.88,
        distance: this.baseDistance,
        targetAzimuth: 0,
        targetElevation: 0.88,
        targetDistance: this.baseDistance,
        velocityAzimuth: 0,
        velocityElevation: 0,
        dragging: false,
        pointerId: null,
        lastX: 0,
        lastY: 0,
        lastAt: 0,
        pinchStart: 0,
        pinchDistance: 0
      }
      this.updateCamera(1)

      // 影棚环境反射：顶部柔光箱 + 冷暖侧光，骰子才有产品图那种高光
      scene.environment = createStudioEnvironment(renderer)

      scene.add(new THREE.HemisphereLight(0xfff6ec, 0x33202a, 0.28))

      const key = new THREE.DirectionalLight(0xfff7ef, 1.25)
      key.position.set(3.4, 6.2, 3.6)
      key.castShadow = true
      key.shadow.mapSize.set(this.quality.shadowSize, this.quality.shadowSize)
      key.shadow.camera.left = -4.5
      key.shadow.camera.right = 4.5
      key.shadow.camera.top = 4.5
      key.shadow.camera.bottom = -4.5
      key.shadow.camera.near = 0.5
      key.shadow.camera.far = 26
      key.shadow.bias = -0.0009
      key.shadow.radius = 2.2
      scene.add(key)

      const fill = new THREE.DirectionalLight(0xffe9ee, 0.22)
      fill.position.set(-4.2, 3.2, -2.6)
      scene.add(fill)

      const rim = new THREE.PointLight(0xffc6d6, 3, 14, 2)
      rim.position.set(-1.4, 2.6, -3.2)
      scene.add(rim)

      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(7, 7, 0.36, 72),
        new THREE.MeshPhysicalMaterial({
          map: feltTexture(),
          roughness: 0.92,
          metalness: 0,
          clearcoat: 0.06,
          clearcoatRoughness: 0.9
        })
      )
      table.position.y = FLOOR_Y - 0.18
      table.receiveShadow = true
      scene.add(table)

      this.buildCup()

      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) })
      world.broadphase = new CANNON.SAPBroadphase(world)
      world.allowSleep = true
      world.solver.iterations = 22
      world.solver.tolerance = 0.0008
      this.world = world

      this.diceMaterial = new CANNON.Material('dice')
      this.floorMaterial = new CANNON.Material('floor')
      world.addContactMaterial(new CANNON.ContactMaterial(this.diceMaterial, this.floorMaterial, {
        friction: 0.42,
        restitution: 0.12
      }))
      world.addContactMaterial(new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
        friction: 0.32,
        restitution: 0.1
      }))

      const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: this.floorMaterial })
      ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
      ground.position.set(0, FLOOR_Y, 0)
      world.addBody(ground)

      this.buildCupBodies()
      this.rebuildDice(this.currentCount || 2)

      // 骰子（含点数）建好之后再记录渲染信息，诊断行里的点数才是准的
      this.glInfo = {
        version: renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
        renderer: String(this.rendererName || 'unknown').slice(0, 48),
        size: `${width}x${height}`,
        mobile: isMobile,
        pips: this.diceAssets ? this.diceAssets.pipCount : 0,
        pipVertices: this.diceAssets ? this.diceAssets.pipVertexCount : 0
      }

      this.bindDeviceMotion()
      // 视角手势绑定失败不能影响骰子本身，兜一层
      try {
        this.bindOrbitControl(renderer.domElement)
      } catch (error) {
        // 没有手势也照样能摇骰盅
      }
      if (typeof window !== 'undefined') {
        this.resizeHandler = () => this.handleResize()
        window.addEventListener('resize', this.resizeHandler, { passive: true })
        window.addEventListener('orientationchange', this.resizeHandler, { passive: true })
      }

      this.clock = new THREE.Clock()
      this.rolling = false
      this.stillSince = 0
      this.settledReported = false
      const animate = () => {
        if (this.disposed) return
        this.frame = requestAnimationFrame(animate)
        this.tick()
      }
      animate()
    },

    /**
     * 3D 视角：单指拖动旋转、双指缩放、滚轮缩放，松手带惯性。
     * 相机是球坐标绕着骰子转，所以看的是真三维空间。
     */
    /**
     * 按画面比例算相机的"装得下"距离：
     * 手机比桌面窄，如果只按竖直视角取景，盅和骰子会被裁掉，
     * 所以这里同时按横向和纵向计算，取更远的那个，保证各端构图一致。
     */
    fitDistance (aspect) {
      const vFov = (36 * Math.PI) / 180
      const base = 5.35
      // 只在画面特别窄（横屏小窗等）时后退，保证盅不被裁掉；
      // 正常手机和桌面都保持同一个机位，构图才会一致。
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 0.35))
      const neededForWidth = 1.35 / Math.tan(hFov / 2)
      return Math.max(base, neededForWidth)
    },

    /** 屏幕尺寸/方向变化：同步相机比例与取景距离。 */
    handleResize () {
      if (!this.renderer || !this.camera || !this.host) return
      const width = this.host.clientWidth || 0
      const height = this.host.clientHeight || 0
      if (width < 40 || height < 40) return
      this.renderer.setSize(width, height, false)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      const previousBase = this.baseDistance || this.orbit.targetDistance
      this.baseDistance = this.fitDistance(width / height)
      if (this.orbit) {
        const ratio = this.baseDistance / previousBase
        this.orbit.targetDistance *= ratio
        this.orbit.distance *= ratio
      }
    },

    bindOrbitControl (canvas) {
      const orbit = this.orbit
      if (!orbit || !canvas) return
      const clampElevation = (value) => Math.min(1.28, Math.max(0.16, value))

      const onDragStart = (x, y) => {
        orbit.dragging = true
        orbit.lastX = x
        orbit.lastY = y
        orbit.lastAt = Date.now()
        orbit.velocityAzimuth = 0
        orbit.velocityElevation = 0
      }
      const onDragMove = (x, y) => {
        if (!orbit.dragging) return
        const now = Date.now()
        const dt = Math.max(0.008, (now - orbit.lastAt) / 1000)
        const dx = x - orbit.lastX
        const dy = y - orbit.lastY
        orbit.targetAzimuth -= dx * 0.0072
        orbit.targetElevation = clampElevation(orbit.targetElevation - dy * 0.005)
        orbit.velocityAzimuth = -(dx * 0.0072) / dt
        orbit.velocityElevation = -(dy * 0.005) / dt
        orbit.lastX = x
        orbit.lastY = y
        orbit.lastAt = now
      }
      const onDragEnd = () => {
        orbit.dragging = false
      }

      const handleTouchStart = (event) => {
        if (event.touches.length >= 2) {
          const [a, b] = event.touches
          orbit.pinchStart = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
          orbit.pinchDistance = orbit.targetDistance
          orbit.dragging = false
          return
        }
        onDragStart(event.touches[0].clientX, event.touches[0].clientY)
      }
      const handleTouchMove = (event) => {
        if (event.cancelable) event.preventDefault()
        if (event.touches.length >= 2) {
          const [a, b] = event.touches
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
          if (orbit.pinchStart > 0) {
            const ratio = orbit.pinchStart / Math.max(1, distance)
            orbit.targetDistance = this.clampZoom(orbit.pinchDistance * ratio)
          }
          return
        }
        if (!orbit.dragging) return
        onDragMove(event.touches[0].clientX, event.touches[0].clientY)
      }
      const handleTouchEnd = () => {
        orbit.pinchStart = 0
        onDragEnd()
      }
      const handleMouseDown = (event) => onDragStart(event.clientX, event.clientY)
      const handleMouseMove = (event) => onDragMove(event.clientX, event.clientY)
      const handleWheel = (event) => {
        if (event.cancelable) event.preventDefault()
        orbit.targetDistance = this.clampZoom(orbit.targetDistance + event.deltaY * 0.0035)
      }

      // App 端 WebView 的 style 实现各不相同，直接赋值有可能抛异常，
      // 抛出来会把整个 3D 场景带崩，所以这里必须容错。
      try {
        canvas.style.touchAction = 'none'
      } catch (error) {
        try {
          canvas.style.setProperty('touch-action', 'none')
        } catch (innerError) {
          // 设不了就算了，拖动时照旧 preventDefault
        }
      }
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
      canvas.addEventListener('touchend', handleTouchEnd, { passive: true })
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true })
      canvas.addEventListener('mousedown', handleMouseDown, { passive: true })
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        window.addEventListener('mouseup', onDragEnd, { passive: true })
      }

      this.orbitListeners = [
        [canvas, 'touchstart', handleTouchStart], [canvas, 'touchmove', handleTouchMove],
        [canvas, 'touchend', handleTouchEnd], [canvas, 'touchcancel', handleTouchEnd],
        [canvas, 'mousedown', handleMouseDown], [canvas, 'wheel', handleWheel]
      ]
      this.orbitWindowListeners = typeof window === 'undefined'
        ? []
        : [[window, 'mousemove', handleMouseMove], [window, 'mouseup', onDragEnd]]
    },

    /** 缩放范围跟着取景距离走，保证各端手感一致。 */
    clampZoom (value) {
      const base = this.baseDistance || 5.2
      return Math.min(base * 1.8, Math.max(base * 0.6, value))
    },

    /** 球坐标 → 相机位置（带阻尼与惯性）。 */
    updateCamera (dt) {
      const orbit = this.orbit
      if (!orbit || !this.camera) return
      const step = Math.max(dt, 0.008)
      if (!orbit.dragging) {
        orbit.targetAzimuth += orbit.velocityAzimuth * step * 0.18
        orbit.targetElevation = Math.min(1.28, Math.max(0.16, orbit.targetElevation + orbit.velocityElevation * step * 0.18))
        const decay = Math.pow(0.02, step)
        orbit.velocityAzimuth *= decay
        orbit.velocityElevation *= decay
      }
      const smooth = 1 - Math.pow(0.0016, step)
      orbit.azimuth += (orbit.targetAzimuth - orbit.azimuth) * smooth
      orbit.elevation += (orbit.targetElevation - orbit.elevation) * smooth
      orbit.distance += (orbit.targetDistance - orbit.distance) * smooth

      const target = this.cameraTarget
      const horizontal = Math.cos(orbit.elevation) * orbit.distance
      this.camera.position.set(
        target.x + Math.sin(orbit.azimuth) * horizontal,
        target.y + Math.sin(orbit.elevation) * orbit.distance,
        target.z + Math.cos(orbit.azimuth) * horizontal
      )
      this.camera.lookAt(target)
    },

    /** 回到默认视角。 */
    resetView () {
      const orbit = this.orbit
      if (!orbit) return
      orbit.targetAzimuth = 0
      orbit.targetElevation = 0.88
      orbit.targetDistance = this.baseDistance || 5.35
      orbit.velocityAzimuth = 0
      orbit.velocityElevation = 0
    },

    /** 自己监听 devicemotion：H5 上它带重力，比 uni 的加速度计更准。 */
    bindDeviceMotion () {
      if (typeof window === 'undefined' || !window.addEventListener || !window.DeviceMotionEvent) return
      const handler = (event) => {
        const acc = event.accelerationIncludingGravity
        if (!acc || acc.x === null || acc.x === undefined) return
        this.deviceGravity = {
          x: acc.x / GRAVITY,
          y: acc.y / GRAVITY,
          z: acc.z / GRAVITY
        }
        this.gravityFromDeviceAt = Date.now()
      }
      window.addEventListener('devicemotion', handler, false)
      this.motionHandler = handler
    },

    /* --------------------------- 盅 --------------------------- */

    buildCup () {
      const cup = new THREE.Group()
      const h = CUP_HEIGHT
      const leatherMaps = createLeatherMaps(512)
      // 真皮：细颗粒法线 + sheen，光下有皮子那种柔和高光
      const leather = new THREE.MeshPhysicalMaterial({
        color: 0x59202a,
        roughness: 0.62,
        metalness: 0.02,
        clearcoat: 0.18,
        clearcoatRoughness: 0.62,
        sheen: 0.4,
        sheenRoughness: 0.75,
        sheenColor: new THREE.Color(0xd88a9a),
        normalMap: leatherMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: leatherMaps.roughnessMap,
        envMapIntensity: 0.7,
        side: THREE.FrontSide
      })
      const brass = new THREE.MeshPhysicalMaterial({
        color: 0xd9b465,
        roughness: 0.18,
        metalness: 1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.35
      })
      // 内衬：深色毡，揭开时能看到盅里
      const felt = new THREE.MeshPhysicalMaterial({
        color: 0x241018,
        roughness: 0.95,
        metalness: 0,
        side: THREE.BackSide
      })

      // 车削轮廓（按盅高取比例）：口略外翻、盅身收、顶部圆肩
      const profile = [
        [1.02, 0], [1.07, 0.033 * h], [1.06, 0.105 * h], [1.01, 0.224 * h],
        [0.96, 0.395 * h], [0.92, 0.592 * h], [0.9, 0.75 * h], [0.88, 0.855 * h],
        [0.82, 0.934 * h], [0.66, 0.987 * h], [0.42, 1.02 * h], [0.2, 1.033 * h], [0.045, 1.036 * h]
      ].map(([radius, y]) => new THREE.Vector2(radius, y))
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), leather)
      body.castShadow = true
      body.receiveShadow = true
      cup.add(body)

      // 内衬
      const innerProfile = profile.map((point) => new THREE.Vector2(point.x * 0.955, point.y))
      const inner = new THREE.Mesh(new THREE.LatheGeometry(innerProfile, 64), felt)
      cup.add(inner)

      // 黄铜包口（两道：主包口 + 细缝线）
      const cupRim = new THREE.Mesh(new THREE.TorusGeometry(1.048, 0.042, 20, 80), brass)
      cupRim.rotation.x = Math.PI / 2
      cupRim.position.y = 0.033 * h
      cupRim.castShadow = true
      cup.add(cupRim)

      const rimLip = new THREE.Mesh(new THREE.TorusGeometry(1.062, 0.018, 16, 80), brass)
      rimLip.rotation.x = Math.PI / 2
      rimLip.position.y = 0.012 * h
      cup.add(rimLip)

      const bandA = new THREE.Mesh(new THREE.TorusGeometry(0.965, 0.016, 12, 72), brass)
      bandA.rotation.x = Math.PI / 2
      bandA.position.y = 0.395 * h
      cup.add(bandA)

      const bandB = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.014, 12, 72), brass)
      bandB.rotation.x = Math.PI / 2
      bandB.position.y = 0.72 * h
      cup.add(bandB)

      // 手缝线：一圈小线段，让皮面立刻有工艺感
      const stitchGeo = new THREE.BoxGeometry(0.028, 0.008, 0.01)
      const stitchMat = new THREE.MeshStandardMaterial({ color: 0xe8d9b5, roughness: 0.75 })
      const stitchCount = 96
      const stitches = new THREE.InstancedMesh(stitchGeo, stitchMat, stitchCount)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < stitchCount; i += 1) {
        const angle = (i / stitchCount) * Math.PI * 2
        const radius = 1.038
        dummy.position.set(Math.cos(angle) * radius, 0.085 * h, Math.sin(angle) * radius)
        dummy.rotation.set(0, -angle, 0.34)
        dummy.updateMatrix()
        stitches.setMatrixAt(i, dummy.matrix)
      }
      stitches.instanceMatrix.needsUpdate = true
      cup.add(stitches)

      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 18), brass)
      knob.position.y = 1.052 * h
      knob.castShadow = true
      cup.add(knob)

      cup.position.set(0, FLOOR_Y, 0)
      this.scene.add(cup)
      this.cup = cup
      this.cupRest = { x: 0, y: FLOOR_Y, z: 0, rot: 0 }
      this.cupOpening = false
    },

    buildCupBodies () {
      const bodies = []
      // 墙做厚（0.4），避免骰子高速旋转时穿墙跑出去
      const halfThickness = 0.28
      const radius = CUP_COLLIDE_R + halfThickness
      const segmentWidth = (Math.PI * 2 * radius) / CUP_WALLS
      for (let i = 0; i < CUP_WALLS; i += 1) {
        const angle = (i / CUP_WALLS) * Math.PI * 2
        const shape = new CANNON.Box(new CANNON.Vec3(segmentWidth * 0.7, CUP_HEIGHT / 2, halfThickness))
        const body = new CANNON.Body({ mass: 0, shape, material: this.floorMaterial })
        body.position.set(Math.cos(angle) * radius, FLOOR_Y + CUP_HEIGHT / 2, Math.sin(angle) * radius)
        body.quaternion.setFromEuler(0, -angle, 0)
        this.world.addBody(body)
        bodies.push(body)
      }
      const lid = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(CUP_INNER_R + 0.24, 0.18, CUP_INNER_R + 0.24)),
        material: this.floorMaterial
      })
      // 盖子底面压在盅口上沿，别留缝
      lid.position.set(0, FLOOR_Y + CUP_HEIGHT + 0.14, 0)
      this.world.addBody(lid)
      bodies.push(lid)
      this.cupBodies = bodies
      this.cupBodiesActive = true
    },

    setCupBodies (active) {
      if (!this.cupBodies || this.cupBodiesActive === active) return
      this.cupBodiesActive = active
      this.cupBodies.forEach((body) => {
        if (active) this.world.addBody(body)
        else this.world.removeBody(body)
      })
    },

    /* --------------------------- 骰子 --------------------------- */

    buildDiceAssets () {
      if (!this.diceAssets || this.diceAssetsPreset !== this.dicePreset) {
        this.diceAssets = createDiceAssets(this.dicePreset, DIE_SIZE, this.diceSegments, this.pipSegments)
        this.diceAssetsPreset = this.dicePreset
      }
      return this.diceAssets
    },

    spawnDie () {
      const assets = this.buildDiceAssets()
      const group = initRealisticDice({ size: DIE_SIZE, assets })

      // 接触阴影：产品图里骰子"落在地上"的关键
      if (!this.contactTexture) this.contactTexture = createContactShadowTexture()
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry(DIE_SIZE * 2.1, DIE_SIZE * 2.1),
        new THREE.MeshBasicMaterial({
          map: this.contactTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.9
        })
      )
      contact.rotation.x = -Math.PI / 2
      contact.renderOrder = -1
      this.scene.add(contact)

      const physics = new CANNON.Body({
        mass: 0.08,
        shape: new CANNON.Box(new CANNON.Vec3(DIE_HALF, DIE_HALF, DIE_HALF)),
        material: this.diceMaterial,
        linearDamping: 0.2,
        angularDamping: 0.36,
        allowSleep: true,
        sleepSpeedLimit: 0.3,
        sleepTimeLimit: 0.25
      })
      this.world.addBody(physics)
      this.scene.add(group)
      return { group, physics, contact }
    },

    /** 切换骰子材质（红宝石 / 象牙白）：重建共享资源再换掉现有骰子的网格。 */
    applyPreset (preset) {
      const next = preset === 'ivory' ? 'ivory' : 'ruby'
      if (next === this.dicePreset && this.diceAssets) return
      this.dicePreset = next
      this.diceAssets = null
      this.diceAssetsPreset = null
      if (!this.dice) return
      const assets = this.buildDiceAssets()
      this.dice.forEach((die) => {
        this.scene.remove(die.group)
        const group = initRealisticDice({ size: DIE_SIZE, assets })
        group.position.copy(die.group.position)
        group.quaternion.copy(die.group.quaternion)
        die.group = group
        this.scene.add(group)
      })
      this.syncMeshes()
    },

    rebuildDice (count) {
      const total = clampNumber(count, 1, 6) | 0
      this.currentCount = total
      /*
       * 换骰子数量等于重开一局：盅必须先盖上、盅壁碰撞体必须装回去。
       * 之前"已揭盅"状态下换数量，盅还是开着的（没有壁），新骰子又被 burst 推一把，
       * 于是直接从盅里散到桌面上。现在不管当前是不是掀开，一律回到"盖着、待摇"。
       */
      this.rolling = false
      this.rollDeadlineAt = 0
      this.rattleEnergy = 0
      this.snapCupClosed()
      if (this.dice) {
        this.dice.forEach((die) => {
          this.world.removeBody(die.physics)
          this.scene.remove(die.group)
          if (die.contact) this.scene.remove(die.contact)
        })
      }
      this.dice = Array.from({ length: total }, () => this.spawnDie())
      this.layoutDice()
      // 这一把还没摇，先别让停稳判定回报结果；摇的时候 shake() 会重置
      this.settledReported = true
      this.stillSince = 0
      this.lastKickAt = 0
    },

    /** 立刻把盅摆回"盖着"的位置（不做补间），用于换骰子数量这类重开一局的操作。 */
    snapCupClosed () {
      this.cupOpening = false
      this.setCupBodies(true)
      const rest = this.cupRest
      if (this.cup && rest) {
        this.cup.position.set(rest.x, rest.y, rest.z)
        this.cup.rotation.set(0, 0, 0)
      }
      this.lastOffsetX = undefined
      this.lastOffsetZ = undefined
      this.syncCupBodies(0, 0)
    },

    layoutDice () {
      if (!this.dice) return
      const total = this.dice.length
      // 固定队形（间距大于骰子边长），保证初始绝不重叠
      const formations = {
        1: [[0, 0]],
        2: [[-0.35, 0], [0.35, 0]],
        3: [[-0.36, -0.2], [0.36, -0.2], [0, 0.36]],
        4: [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]],
        5: [[-0.42, 0], [0.42, 0], [0, -0.42], [0, 0.42], [0, 0]],
        6: [[-0.42, -0.21], [0, -0.21], [0.42, -0.21], [-0.42, 0.21], [0, 0.21], [0.42, 0.21]]
      }
      const formation = formations[total] || formations[6]
      this.dice.forEach((die, index) => {
        // 队形按骰子边长缩放，改大改小都不会互相压住
        const scale = DIE_SIZE / 0.34
        const [ox, oz] = (formation[index] || [0, 0]).map((value) => value * scale)
        const body = die.physics
        body.position.set(
          ox + (Math.random() - 0.5) * 0.04,
          FLOOR_Y + DIE_HALF + 0.06 + Math.random() * 0.18,
          oz + (Math.random() - 0.5) * 0.04
        )
        /*
         * 初始朝向用 SO(3) 上的均匀采样（Shoemake 方法）。
         * 之前用三个均匀欧拉角 setFromEuler，在旋转空间里并不均匀，
         * 会让某些面出现得明显偏多——这是随机性"不对"的另一个来源。
         */
        const u1 = Math.random()
        const u2 = Math.random()
        const u3 = Math.random()
        const r1 = Math.sqrt(1 - u1)
        const r2 = Math.sqrt(u1)
        body.quaternion.set(
          r1 * Math.sin(2 * Math.PI * u2),
          r1 * Math.cos(2 * Math.PI * u2),
          r2 * Math.sin(2 * Math.PI * u3),
          r2 * Math.cos(2 * Math.PI * u3)
        )
        body.velocity.set(0, 0, 0)
        body.angularVelocity.set(0, 0, 0)
        body.wakeUp()
      })
    },

    /* --------------------------- 交互 --------------------------- */

    shake (power) {
      if (!this.dice) return
      if (this.cupOpening) this.closeCup()
      this.rolling = true
      this.settledReported = false
      this.stillSince = 0
      this.lastKickAt = Date.now()
      // 硬性截止时间：到点一定收尾，不依赖"骰子自己停下来"
      this.rollDeadlineAt = Date.now() + ROLL_MAX_MS
      this.notify(null, { type: 'rolling' })
      this.burst(power)
      // 连续几波，模拟手里连续晃动
      const waves = [110, 220]
      waves.forEach((delay, index) => {
        setTimeout(() => {
          if (this.disposed || !this.rolling) return
          this.burst(power * (0.88 - index * 0.2))
        }, delay)
      })
    },

    burst (power) {
      if (!this.dice) return
      const strength = clampNumber(power, 0.4, 2)
      // 冲量按骰子大小缩放：骰子越小，同样的冲量相对体积越猛，越小越容易穿墙
      const scale = DIE_SIZE / 0.44
      this.lastKickAt = Date.now()
      this.rattleEnergy = 1
      this.dice.forEach((die) => {
        const body = die.physics
        body.wakeUp()
        body.applyImpulse(
          new CANNON.Vec3(
            (Math.random() - 0.5) * 0.95 * strength * scale,
            (0.45 + Math.random() * 0.7) * 0.95 * strength * scale,
            (Math.random() - 0.5) * 0.95 * strength * scale
          ),
          new CANNON.Vec3(
            (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 0.12
          )
        )
        // 转速要给够：真骰子在盅里是翻滚很多圈才停的，
        // 转不够圈数就会被"扶正"逻辑按回原来那一面
        body.angularVelocity.set(
          (Math.random() - 0.5) * 26 * strength * scale,
          (Math.random() - 0.5) * 26 * strength * scale,
          (Math.random() - 0.5) * 26 * strength * scale
        )
      })
    },

    openCup () {
      this.cupOpening = true
      this.setCupBodies(false)
    },

    closeCup () {
      this.cupOpening = false
      this.setCupBodies(true)
      this.rolling = true
      this.settledReported = false
      this.stillSince = 0
      this.lastKickAt = Date.now()
      this.rollDeadlineAt = Date.now() + ROLL_MAX_MS
      this.notify(null, { type: 'rolling' })
      this.layoutDice()
    },

    /* --------------------------- 每帧 --------------------------- */

    tick () {
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.rattleEnergy = (this.rattleEnergy || 0) * Math.exp(-dt / 0.34)
      this.flattenDt = dt
      this.applyGravity()
      this.assistSettle()
      this.assistFlatten()
      if (this.world) {
        const quality = this.quality || { physicsStep: 1 / 120, substeps: 6 }
        // 骰子多的时候接触对变多，多给两档子步，避免穿墙和重叠
        const extra = (this.dice && this.dice.length >= 5) ? 2 : 0
        this.world.step(quality.physicsStep, dt, quality.substeps + extra)
      }
      this.keepDiceInside()
      this.syncMeshes()
      this.updateCamera(dt)
      this.updateCupMotion(dt)
      this.checkSettled()
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera)
      this.trackFps()
    },

    /** 帧率上报：手机上帧率掉了，手感会和桌面完全不同 */
    trackFps () {
      const now = Date.now()
      this.fpsFrames = (this.fpsFrames || 0) + 1
      if (!this.fpsSince) this.fpsSince = now
      if (now - this.fpsSince < 1000) return
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsSince))
      this.fpsSince = now
      this.fpsFrames = 0
      if (fps !== this.lastFps) {
        this.lastFps = fps
        this.notify(null, { type: 'fps', fps })
      }
    },

    /**
     * 收干阻尼 + 硬性收尾。
     *
     * 这里以前用 `since < 7000` / `since < 8000` 当超时保护，但两个分支都会把
     * lastKickAt 往回拨（since 被重置成 1.5~1.8 秒），于是 since 永远长不到阈值，
     * 保护自己把自己废掉了。只要有一粒骰子斜靠在盅壁上，就会一直摇下去——
     * 真机上（尤其 iPhone，重力数据持续在变）很容易复现。
     *
     * 现在改成看绝对截止时间 rollDeadlineAt，到点强制收尾，一定会停。
     */
    assistSettle () {
      if (!this.rolling || !this.dice || this.settledReported) return
      const now = Date.now()
      if (this.rollDeadlineAt && now >= this.rollDeadlineAt) {
        this.forceSettle()
        return
      }
      const since = now - (this.lastKickAt || 0)
      // 前 0.6 秒完全不干预，让骰子真正翻起来；之后再逐步收干
      if (since <= 620) return
      const damp = Math.min(0.13, ((since - 620) / 1400) * 0.13)
      this.dice.forEach((die) => {
        const body = die.physics
        body.velocity.scale(1 - damp, body.velocity)
        body.angularVelocity.scale(1 - damp * 1.5, body.angularVelocity)
      })
      if (since <= 2200) return
      // 绝不允许把还在空中的骰子"冻住"：先把它压下来，继续模拟。
      // 「飞在空中」= 离地且有明显垂直速度；叠在别的骰子上不算（那是正常的）
      const airborne = this.dice.filter((die) => (
        die.physics.position.y > FLOOR_Y + DIE_HALF + 0.12 &&
        Math.abs(die.physics.velocity.y) > 0.8
      ))
      if (airborne.length) {
        airborne.forEach((die) => {
          die.physics.wakeUp()
          die.physics.velocity.y -= 3.5
          die.physics.angularVelocity.scale(0.5, die.physics.angularVelocity)
        })
        return
      }
      // 还立着（棱朝下）的骰子交给 assistFlatten 扶正，实在扶不正就到点强制收尾
      const standing = this.dice.some((die) => this.flatnessOf(die.physics) < 0.96)
      if (standing) return
      this.finishRoll()
    },

    /** 硬性收尾：清速度并贴地，然后交给 finishRoll 扶正、读点数。 */
    forceSettle () {
      if (!this.dice || this.settledReported) return
      this.dice.forEach((die) => {
        const body = die.physics
        body.wakeUp()
        body.velocity.set(0, 0, 0)
        body.angularVelocity.set(0, 0, 0)
        body.force.set(0, 0, 0)
        body.torque.set(0, 0, 0)
        if (body.position.y < FLOOR_Y + DIE_HALF) body.position.y = FLOOR_Y + DIE_HALF
      })
      this.finishRoll()
    },

    /**
     * 把骰子摆成"某一个面严格朝上"。
     * 真实骰子不会用棱立着，收尾时统一扶正，顺带保证读到的点数和看到的朝向一致。
     */
    snapToNearestFace (body) {
      const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
      const up = new THREE.Vector3(0, 1, 0)
      const n = new THREE.Vector3()
      const best = new THREE.Vector3()
      const axis = new THREE.Vector3()
      let bestDot = -2
      FACES.forEach((face) => {
        n.set(face.normal[0], face.normal[1], face.normal[2]).applyQuaternion(q)
        if (n.y > bestDot) {
          bestDot = n.y
          best.copy(n)
        }
      })
      if (best.lengthSq() < 1e-8) return
      best.normalize()
      axis.crossVectors(best, up)
      if (axis.lengthSq() > 1e-8) {
        axis.normalize()
        const angle = Math.acos(clampNumber(bestDot, -1, 1))
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle))
      }
      body.quaternion.set(q.x, q.y, q.z, q.w)
    },

    /**
     * 手机姿态 → 世界重力：
     * 屏幕左右倾斜 → 场景 X，屏幕上下倾斜 → 场景 Z，竖直分量随倾斜减弱。
     */
    applyGravity () {
      if (!this.world) return
      const now = Date.now()
      const fresh = (this.gravityFromDeviceAt && now - this.gravityFromDeviceAt < 1200) ||
        (this.gravityFromLogicAt && now - this.gravityFromLogicAt < 1200)
      const g = this.deviceGravity
      if (!fresh || !g) {
        this.world.gravity.set(0, -GRAVITY, 0)
        this.livePower = 0
        return
      }
      // 用进入场景时的握姿做基准：手机是斜着拿还是平着拿都不影响，
      // 只有"相对这个姿势的变化"才会变成重力，否则骰子会一直贴边。
      if (!this.gravityBaseline) this.gravityBaseline = { x: g.x, y: g.y }
      const tiltX = clampNumber((g.x - this.gravityBaseline.x) * 1.15, -0.45, 0.45)
      const tiltZ = clampNumber((g.y - this.gravityBaseline.y) * 1.15, -0.45, 0.45)
      const strength = Math.min(1, Math.hypot(tiltX, tiltZ) * 2)
      const vertical = -GRAVITY * (1 - strength * 0.3)
      this.world.gravity.set(tiltX * GRAVITY * 1.2, vertical, -tiltZ * GRAVITY * 1.2)
      this.livePower = strength
      if (strength <= 0.16 || !this.rolling) {
        this.lastTiltX = tiltX
        this.lastTiltZ = tiltZ
        return
      }
      /*
       * 只有手真的在晃才给冲量，而且限流。
       * 原来只要倾斜超过阈值就每帧给一次冲量：手机拿在手里，相对"进入场景时
       * 的基准姿势"稍微歪着，就相当于每一帧都在打骰子，骰子永远静不下来。
       */
      const moved = Math.abs(tiltX - (this.lastTiltX || 0)) + Math.abs(tiltZ - (this.lastTiltZ || 0)) > 0.02
      this.lastTiltX = tiltX
      this.lastTiltZ = tiltZ
      const nowTilt = Date.now()
      // 收尾阶段不再施加外力，否则阻尼刚压下去又被推起来
      const beforeDeadline = !this.rollDeadlineAt || nowTilt < this.rollDeadlineAt - 1000
      if (!moved || !beforeDeadline || nowTilt - (this.lastTiltKickAt || 0) < 90) return
      this.lastTiltKickAt = nowTilt
      this.dice.forEach((die) => {
        const body = die.physics
        body.wakeUp()
        body.applyImpulse(
          new CANNON.Vec3(
            (Math.random() - 0.5) * 0.16 * strength,
            (0.2 + Math.random() * 0.45) * 0.16 * strength,
            (Math.random() - 0.5) * 0.16 * strength
          ),
          new CANNON.Vec3(0.05, 0.05, 0.05)
        )
      })
    },

    syncMeshes () {
      if (!this.dice) return
      this.dice.forEach((die) => {
        die.group.position.set(die.physics.position.x, die.physics.position.y, die.physics.position.z)
        die.group.quaternion.set(
          die.physics.quaternion.x,
          die.physics.quaternion.y,
          die.physics.quaternion.z,
          die.physics.quaternion.w
        )
        // 接触阴影：骰子越高越淡、越大，落地时最实
        if (die.contact) {
          const height = Math.max(0, die.physics.position.y - DIE_HALF)
          const spread = 1 + Math.min(1.6, height * 1.5)
          die.contact.position.set(die.physics.position.x, FLOOR_Y + 0.004, die.physics.position.z)
          die.contact.scale.set(spread, spread, 1)
          die.contact.material.opacity = Math.max(0.12, 0.82 - height * 0.55)
        }
      })
    },

    /**
     * 兜底约束：盖着的时候骰子必须待在盅里。
     * 刚体求解偶尔会让高速旋转的盒子穿出去，这里把逃逸的骰子拉回来，
     * 保证揭盅看到的结果永远成立。
     */
    keepDiceInside () {
      if (!this.dice || this.cupOpening) return
      const limit = CUP_COLLIDE_R - DIE_HALF - 0.02
      // 速度上限：一步走的距离不超过骰子边长的 1/4，物理上就不可能穿墙
      const maxSpeed = DIE_SIZE * 4
      const maxSpin = DIE_SIZE * 60
      this.dice.forEach((die) => {
        const body = die.physics
        const speed = Math.sqrt(body.velocity.lengthSquared())
        if (speed > maxSpeed) body.velocity.scale(maxSpeed / speed, body.velocity)
        const spin = Math.sqrt(body.angularVelocity.lengthSquared())
        if (spin > maxSpin) body.angularVelocity.scale(maxSpin / spin, body.angularVelocity)
        const distance = Math.hypot(body.position.x, body.position.z)
        // 贴回盅壁（保留原来的角度）+ 反弹速度，绝不"随机传送"到别的骰子上
        if (distance > limit && distance > 0.0001) {
          const nx = body.position.x / distance
          const nz = body.position.z / distance
          body.position.x = nx * limit
          body.position.z = nz * limit
          const radial = body.velocity.x * nx + body.velocity.z * nz
          if (radial > 0) {
            body.velocity.x -= radial * nx * 1.5
            body.velocity.z -= radial * nz * 1.5
          }
          body.wakeUp()
        }
        if (body.position.y < -0.25) {
          body.position.y = FLOOR_Y + DIE_HALF
          body.velocity.y = 0
          body.wakeUp()
        }
        if (body.position.y > CUP_HEIGHT + 0.35) {
          body.position.y = CUP_HEIGHT - 0.25
          body.velocity.y = Math.min(0, body.velocity.y)
          body.wakeUp()
        }
      })
    },

    updateCupMotion (dt) {
      if (!this.cup) return
      const rest = this.cupRest
      const target = this.cupOpening
        ? { x: rest.x + 0.88, y: rest.y + CUP_HEIGHT * 0.66, z: rest.z - 0.4, rotZ: -0.26, rotY: 0.5 }
        : { x: rest.x, y: rest.y, z: rest.z, rotZ: 0, rotY: 0 }
      // 摇动时盅跟着手一起晃；位移同步给碰撞体，骰子是被盅壁撞飞的
      const rattleAmp = 0.009 + 0.055 * Math.max(this.rattleEnergy || 0, this.livePower || 0)
      if (!this.cupOpening && rattleAmp > 0.011) {
        const t = Date.now() / 1000
        target.x += Math.sin(t * 26) * rattleAmp
        target.z += Math.cos(t * 22) * rattleAmp
        target.rotZ += Math.sin(t * 18) * rattleAmp * 1.5
        target.rotY += Math.cos(t * 15) * rattleAmp
      }
      const k = 1 - Math.pow(0.0012, dt)
      this.cup.position.x += (target.x - this.cup.position.x) * k
      this.cup.position.y += (target.y - this.cup.position.y) * k
      this.cup.position.z += (target.z - this.cup.position.z) * k
      this.cup.rotation.z += (target.rotZ - this.cup.rotation.z) * k
      this.cup.rotation.y += (target.rotY - this.cup.rotation.y) * k
      // 死区收敛：逼近到目标就锁死，避免碰撞体持续微动把骰子一直叫醒
      if (Math.abs(target.x - this.cup.position.x) < 0.0004) this.cup.position.x = target.x
      if (Math.abs(target.y - this.cup.position.y) < 0.0004) this.cup.position.y = target.y
      if (Math.abs(target.z - this.cup.position.z) < 0.0004) this.cup.position.z = target.z
      if (Math.abs(target.rotZ - this.cup.rotation.z) < 0.0004) this.cup.rotation.z = target.rotZ
      if (Math.abs(target.rotY - this.cup.rotation.y) < 0.0004) this.cup.rotation.y = target.rotY
      this.syncCupBodies(this.cup.position.x - rest.x, this.cup.position.z - rest.z)
    },

    syncCupBodies (offsetX, offsetZ) {
      if (!this.cupBodiesActive || !this.cupBodies) return
      const lastX = this.lastOffsetX === undefined ? null : this.lastOffsetX
      const lastZ = this.lastOffsetZ === undefined ? null : this.lastOffsetZ
      if (lastX !== null && Math.abs(offsetX - lastX) < 0.0006 && Math.abs(offsetZ - lastZ) < 0.0006) return
      this.lastOffsetX = offsetX
      this.lastOffsetZ = offsetZ
      this.cupBodies.forEach((body) => {
        body.position.x = body.baseX + offsetX
        body.position.z = body.baseZ + offsetZ
      })
    },

    /** 停稳判定：所有骰子都安静一段时间后，从朝向读出真实点数。 */
    /** 当前最朝上的面与竖直方向的贴合度：1 = 完全平躺，0.7 左右 = 棱/角朝下。 */
    flatnessOf (body) {
      const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
      const n = new THREE.Vector3()
      let best = -1
      FACES.forEach((face) => {
        n.set(face.normal[0], face.normal[1], face.normal[2]).applyQuaternion(q)
        if (n.y > best) best = n.y
      })
      return best
    },

    /**
     * 扶正：真实骰子不会用棱立着。
     * 慢速滚动时给一个朝最近面倒下的力矩，把它"推"成平躺。
     */
    assistFlatten () {
      if (!this.dice || !this.rolling) return
      const up = new THREE.Vector3(0, 1, 0)
      const q = new THREE.Quaternion()
      const n = new THREE.Vector3()
      const best = new THREE.Vector3()
      const axis = new THREE.Vector3()
      const dt = Math.min(0.05, Math.max(0.008, this.flattenDt || 0.0167))
      this.dice.forEach((die) => {
        const body = die.physics
        // 只有在接近桌面时才扶正，空中的翻滚不干预
        if (body.position.y > FLOOR_Y + DIE_HALF * 2.4) return
        /*
         * 关键：只有骰子快停下来时才扶正。
         * 原来不看角速度，每帧都往"最近的面"加一次角速度，而且没有乘帧时间，
         * 等于骰子刚被扔出去就被强行按回原来的朝向——点数是初始摆放决定的，
         * 物理完全没参与，随机性自然不够。
         */
        const spin = Math.sqrt(body.angularVelocity.lengthSquared())
        if (spin > 1.2) return
        const flat = this.flatnessOf(body)
        if (flat > 0.985) return
        q.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
        let bestDot = -2
        FACES.forEach((face) => {
          n.set(face.normal[0], face.normal[1], face.normal[2]).applyQuaternion(q)
          if (n.y > bestDot) {
            bestDot = n.y
            best.copy(n)
          }
        })
        axis.crossVectors(best, up)
        if (axis.lengthSq() < 1e-6) return
        axis.normalize()
        const angle = Math.acos(Math.min(1, Math.max(-1, bestDot)))
        body.wakeUp()
        // 按帧时间缩放，避免高帧率设备上"一帧推到位"
        const torque = angle * 22 * dt
        body.angularVelocity.x += axis.x * torque
        body.angularVelocity.y += axis.y * torque
        body.angularVelocity.z += axis.z * torque
      })
    },

    checkSettled () {
      if (!this.dice || !this.rolling || this.settledReported) return
      // 至少滚满 0.7 秒再考虑停稳：一扔下去就判停会让点数退化成"初始朝向"
      if (Date.now() - (this.lastKickAt || 0) < 700) {
        this.stillSince = 0
        return
      }
      const moving = this.dice.some((die) => {
        const v = die.physics.velocity
        const w = die.physics.angularVelocity
        // 正在下坠/上抛的骰子不算停稳（避免揭盅时看到骰子飘着）
        const flying = die.physics.position.y > FLOOR_Y + DIE_HALF + 0.12 &&
          Math.abs(die.physics.velocity.y) > 0.8
        // 立着（棱/角朝下）不算停稳：真实骰子最终一定是一面朝下
        const standing = this.flatnessOf(die.physics) < 0.985
        return flying || standing || v.lengthSquared() > 0.5 || w.lengthSquared() > 1
      })
      if (moving) {
        this.stillSince = 0
        return
      }
      if (!this.stillSince) {
        this.stillSince = Date.now()
        return
      }
      if (Date.now() - this.stillSince < 260) return
      this.finishRoll()
    },

    finishRoll () {
      if (this.settledReported) return
      this.settledReported = true
      this.rolling = false
      this.rollDeadlineAt = 0
      this.dropUnsupportedDice()
      // 收尾统一扶正：保证最终一定是"面朝下"，不会出现棱朝下立着的情况，
      // 读到的点数也和看到的朝向一致
      if (this.dice) {
        this.dice.forEach((die) => {
          const body = die.physics
          body.velocity.set(0, 0, 0)
          body.angularVelocity.set(0, 0, 0)
          body.force.set(0, 0, 0)
          body.torque.set(0, 0, 0)
          this.snapToNearestFace(body)
          // 必须休眠：不收速度的话物理引擎会继续把它们推倒，
          // 于是"报出来的点数"和"屏幕上看到的朝向"会对不上
          body.sleep()
        })
        this.syncMeshes()
      }
      const values = this.dice.map((die) => this.readTopValue(die.physics))
      const total = values.reduce((sum, value) => sum + value, 0)
      const flatness = Math.min(...this.dice.map((die) => Number(this.flatnessOf(die.physics).toFixed(3))))
      this.notify(null, { type: 'settled', values, total, summary: describeDice(values), flatness })
    },

    /**
     * 收尾前把"悬空又没有支撑"的骰子放回地面。
     * 叠在别的骰子上是正常的，不算悬空；真的浮在半空的要落下来，
     * 否则揭盅时能看到一粒骰子停在半空。
     */
    dropUnsupportedDice () {
      if (!this.dice) return
      const restY = FLOOR_Y + DIE_HALF
      this.dice.forEach((die) => {
        const body = die.physics
        if (body.position.y <= restY + 0.06) {
          body.position.y = Math.max(body.position.y, restY)
          return
        }
        const supported = this.dice.some((other) => {
          if (other === die) return false
          const dx = other.physics.position.x - body.position.x
          const dz = other.physics.position.z - body.position.z
          if (Math.hypot(dx, dz) > DIE_SIZE * 0.95) return false
          return other.physics.position.y < body.position.y - DIE_SIZE * 0.75
        })
        if (!supported) body.position.y = restY
      })
    },

    readTopValue (body) {
      const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
      let best = { dot: -2, value: 1 }
      FACES.forEach((face) => {
        const n = new THREE.Vector3(face.normal[0], face.normal[1], face.normal[2]).applyQuaternion(q)
        if (n.y > best.dot) best = { dot: n.y, value: face.value }
      })
      return best.value
    },

    /* --------------------------- 收尾 --------------------------- */

    disposeScene () {
      if (this.disposed) return
      this.disposed = true
      if (this.frame) cancelAnimationFrame(this.frame)
      this.frame = null
      if (this.motionHandler && typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', this.motionHandler, false)
        this.motionHandler = null
      }
      if (this.orbitListeners) {
        this.orbitListeners.forEach(([target, name, handler]) => target.removeEventListener(name, handler))
        this.orbitListeners = null
      }
      if (this.orbitWindowListeners && typeof window !== 'undefined') {
        this.orbitWindowListeners.forEach(([target, name, handler]) => target.removeEventListener(name, handler))
        this.orbitWindowListeners = null
      }
      if (this.resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeHandler)
        window.removeEventListener('orientationchange', this.resizeHandler)
        this.resizeHandler = null
      }
      if (this.renderer) {
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
      }
      this.scene = null
      this.renderer = null
      this.world = null
      this.dice = null
    }
  }
}
</script>

<style lang="scss" scoped>
.cup3d {
  padding: 22rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 244, 248, 0.98));
}

.cup3d__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.cup3d__copy {
  min-width: 0;
  flex: 1;
}

.cup3d__kicker {
  display: block;
  color: #8c2f4a;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.cup3d__title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.08;
}

.cup3d__subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.45;
}

.cup3d__total {
  flex: 0 0 auto;
  min-width: 112rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.12);
  text-align: center;
}

.cup3d__total text {
  display: block;
}

.cup3d__total text:first-child {
  color: #8c2f4a;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.05;
}

.cup3d__total text:last-child {
  margin-top: 2rpx;
  color: #9a6a79;
  font-size: 18rpx;
  font-weight: 800;
}

.cup3d__total.is-hidden text:first-child {
  color: #b9a3ad;
}

.cup3d__count {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 16rpx;
}

.cup3d__chip {
  min-height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(140, 47, 74, 0.18);
  background: #fff;
  color: #8c5a6b;
  font-size: 21rpx;
  font-weight: 750;
}

.cup3d__chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, #8c2f4a, #b8496a);
  color: #fff;
}

.cup3d__presets {
  display: flex;
  gap: 8rpx;
  margin-top: 10rpx;
}

.cup3d__preset {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  min-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(140, 47, 74, 0.16);
  background: #fff;
  color: #8c5a6b;
  font-size: 21rpx;
  font-weight: 700;
}

.cup3d__preset.active {
  border-color: rgba(140, 47, 74, 0.5);
  background: rgba(140, 47, 74, 0.08);
  color: #8c2f4a;
}

.cup3d__preset-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1rpx rgba(0, 0, 0, 0.18), 0 2rpx 4rpx rgba(0, 0, 0, 0.14);
}

.cup3d__preset-dot.is-ruby {
  background: radial-gradient(60% 60% at 34% 30%, #d24a63, #7c1024 70%, #4a0614);
}

.cup3d__preset-dot.is-ivory {
  background: radial-gradient(60% 60% at 34% 30%, #ffffff, #f0e9db 72%, #d8cfbe);
}

.cup3d__stage {
  position: relative;
  /* 固定成接近 4:3 的画面，手机和桌面的取景比例才一致 */
  height: 500rpx;
  margin-top: 14rpx;
  border-radius: 14rpx;
  overflow: hidden;
  touch-action: none;
  background:
    radial-gradient(70% 60% at 50% 22%, rgba(255, 214, 226, 0.16), rgba(255, 214, 226, 0) 62%),
    linear-gradient(180deg, #2b1620 0%, #1b0d14 62%, #150a10 100%);
}

.cup3d__canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.cup3d__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  color: rgba(255, 233, 240, 0.72);
  font-size: 22rpx;
  text-align: center;
}

.cup3d__loading-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 6rpx;
}

.cup3d__loading .cup3d__chip {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffe9f0;
}

.cup3d__diag {
  color: rgba(255, 233, 240, 0.5);
  font-size: 18rpx;
}

.cup3d__diag--corner {
  position: absolute;
  left: 16rpx;
  top: 12rpx;
  color: rgba(255, 233, 240, 0.42);
}

/* 沉浸模式：铺满整屏，关键按钮浮在画面上 */
.cup3d__stage.is-fullscreen {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9000;
  /*
   * 不要写 height: 100vh —— iOS Safari 的 100vh 是"地址栏收起时"的高度，
   * 工具栏展开时底部按钮会被顶到看不见的地方。
   * 100dvh 会跟着地址栏收起/展开实时变；不支持的浏览器会忽略这一行，
   * 退回上面的 inset 撑开，同样铺满。
   */
  width: auto;
  height: 100dvh;
  margin: 0;
  border-radius: 0;
}

.cup3d__fs-bar {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 16rpx;
  z-index: 20;
}

.cup3d__fs-btn {
  flex: 1;
  min-height: 92rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  border: 1rpx solid rgba(255, 255, 255, 0.28);
  color: #ffe9f0;
  font-size: 26rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  backdrop-filter: blur(6rpx);
}

.cup3d__fs-btn--primary {
  flex: 1.4;
  background: linear-gradient(135deg, #8c2f4a, #d8455f);
  border-color: transparent;
  color: #fff;
}

.cup3d__fs-btn--ghost {
  flex: 0 0 auto;
  min-width: 180rpx;
  font-size: 22rpx;
}

.cup3d__fs-btn[disabled] {
  opacity: 0.55;
}

.cup3d__meter {
  position: absolute;
  left: 18rpx;
  right: 18rpx;
  bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.cup3d__level {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.cup3d__level-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #f0c163, #e0607c);
  transition: width 0.12s linear;
}

.cup3d__bubble {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 1rpx solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
}

.cup3d__bubble-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin: -8rpx 0 0 -8rpx;
  border-radius: 50%;
  background: #ffd9a0;
  box-shadow: 0 0 10rpx rgba(255, 205, 140, 0.8);
  transition: transform 0.1s linear;
}

.cup3d__readout {
  margin-top: 14rpx;
}

.cup3d__state {
  display: block;
  color: var(--color-text);
  font-size: 24rpx;
  font-weight: 850;
}

.cup3d__state.live {
  color: #b8456a;
}

.cup3d__hint {
  display: block;
  margin-top: 4rpx;
  color: var(--color-muted);
  font-size: 20rpx;
  line-height: 1.45;
}

.cup3d__summary {
  margin-top: 16rpx;
  padding: 18rpx;
  border-radius: 10rpx;
  background: linear-gradient(135deg, rgba(140, 47, 74, 0.12), rgba(184, 73, 106, 0.1));
}

.cup3d__values {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.cup3d__value {
  flex: 0 0 auto;
  min-width: 104rpx;
  padding: 12rpx 10rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.cup3d__value text {
  display: block;
}

.cup3d__value text:first-child {
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.cup3d__value text:last-child {
  margin-top: 2rpx;
  color: var(--color-muted);
  font-size: 17rpx;
}

.cup3d__sum-text {
  display: block;
  margin-top: 12rpx;
  color: var(--color-text);
  font-size: 32rpx;
  font-weight: 900;
}

.cup3d__sum-detail {
  display: block;
  margin-top: 4rpx;
  color: var(--color-muted);
  font-size: 20rpx;
}

.cup3d__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.cup3d__btn {
  flex: 1;
  min-height: 92rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.cup3d__btn--primary {
  /*
   * 主按钮独占一行。
   * 原来写的是 flex: 1（flex-basis 为 0），和三个 min-width 固定的按钮同排时
   * 会被挤成 29px 一条缝，文字「摇一把并揭盅」直接截断。
   */
  flex: 1 0 100%;
  background: linear-gradient(135deg, #8c2f4a, #d8455f);
  color: #fff;
  box-shadow: 0 16rpx 30rpx rgba(140, 47, 74, 0.3);
}

.cup3d__btn--ghost {
  flex: 0 0 auto;
  min-width: 210rpx;
  background: rgba(140, 47, 74, 0.1);
  color: #8c2f4a;
  font-size: 24rpx;
  letter-spacing: 1rpx;
}

.cup3d__btn--icon {
  min-width: 170rpx;
  background: rgba(140, 47, 74, 0.06);
  color: #8c5a6b;
  font-size: 22rpx;
}

.cup3d__btn[disabled] {
  opacity: 0.58;
}

.cup3d__note {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
  background: rgba(140, 47, 74, 0.06);
  color: #8c5a6b;
  font-size: 19rpx;
  line-height: 1.45;
}
</style>
