<template>
  <view class="sticks3d app-card">
    <view class="sticks3d__head">
      <view class="sticks3d__copy">
        <text class="sticks3d__kicker">
          {{ kicker }}
        </text>
        <text class="sticks3d__title">
          {{ activeTheme.title }}
        </text>
        <text class="sticks3d__subtitle">
          {{ activeTheme.intro }}
        </text>
      </view>
      <view class="sticks3d__seal">
        <text class="sticks3d__seal-num">{{ poolCount }}</text>
        <text class="sticks3d__seal-unit">支</text>
      </view>
    </view>

    <view class="sticks3d__themes">
      <button
        v-for="theme in themes"
        :key="theme.id"
        class="sticks3d__theme"
        :class="{ active: theme.id === themeId }"
        hover-class="none"
        @tap="selectTheme(theme.id)"
      >
        <text class="sticks3d__theme-text">{{ theme.title }}</text>
        <view class="sticks3d__theme-bar" />
      </button>
    </view>

    <view
      class="sticks3d__stage"
      :class="{ 'is-fullscreen': fullscreen }"
      :data-signs="signsAttr"
      :scene-cmd="sceneCmd"
      :change:scene-cmd="stickScene.onCommand"
      :scene-gravity="gravityPush"
      :change:scene-gravity="stickScene.onGravity"
      :scene-shake="shakeToken"
      :change:scene-shake="stickScene.onShakeToken"
    >
      <view class="sticks3d__canvas" />
      <view class="sticks3d__glow" />

      <!-- 唯一结果牌：抽签后只保留这一张，飞出的竹签本体在同帧隐藏。 -->
      <view
        v-if="result && !shaking"
        :key="`reveal-${result.number}-${result.title}`"
        class="sticks3d__reveal-card"
        aria-label="抽签结果展示牌"
      >
        <view class="sticks3d__reveal-string" />
        <view class="sticks3d__reveal-hole" />
        <view class="sticks3d__reveal-body">
          <text class="sticks3d__reveal-title">{{ revealTitle }}</text>
          <text class="sticks3d__reveal-level">{{ result.levelLabel || result.level }}</text>
        </view>
        <view class="sticks3d__reveal-foot">
          <text v-if="result.number" class="sticks3d__reveal-number">第{{ result.number }}签</text>
          <view class="sticks3d__reveal-seal">签</view>
        </view>
      </view>

      <!-- 常驻全屏浮标（唯一入口） -->
      <button class="sticks3d__fs-float" hover-class="none" @tap="toggleFullscreen">
        {{ fullscreen ? '退出' : '全屏' }}
      </button>

      <view v-if="!sceneReady" class="sticks3d__loading">
        <text class="sticks3d__loading-text">{{ sceneError || '正在铺开签筒' }}</text>
        <text v-if="!sceneError" class="sticks3d__loading-sub">3D 场景准备中…</text>
        <view v-if="sceneError" class="sticks3d__loading-actions">
          <button class="sticks3d__chip" hover-class="none" @tap="retryScene">
            重试 3D
          </button>
          <button class="sticks3d__chip" hover-class="none" @tap="useFallback">
            用简易模式
          </button>
        </view>
        <text v-if="sceneError && diagText" class="sticks3d__diag">
          {{ diagText }}
        </text>
      </view>

      <!-- 唯一主操作：位置固定，状态变化只换文案 -->
      <view v-else-if="!fullscreen" class="sticks3d__cta">
        <text v-if="ctaTitle" class="sticks3d__cta-title">{{ ctaTitle }}</text>
        <button
          class="sticks3d__cta-btn"
          hover-class="none"
          :disabled="shaking || charging || !poolCount"
          @tap="startRitual"
        >
          {{ primaryLabel }}
        </button>
        <view v-if="charging" class="sticks3d__cta-progress">
          <view class="sticks3d__cta-progress-fill" :style="{ width: `${chargeProgress}%` }" />
        </view>
      </view>

      <view v-if="fullscreen" class="sticks3d__fs-bar">
        <button
          class="sticks3d__fs-btn sticks3d__fs-btn--primary"
          hover-class="none"
          :disabled="shaking || charging || !sceneReady || !poolCount"
          @tap="startRitual"
        >
          {{ shaking ? '摇签中…' : (result ? '再摇一支' : '摇 签') }}
        </button>
        <button
          class="sticks3d__fs-btn"
          hover-class="none"
          :disabled="!sceneReady"
          @tap="resetView"
        >
          复位视角
        </button>
        <button class="sticks3d__fs-btn sticks3d__fs-btn--ghost" hover-class="none" @tap="toggleFullscreen">
          退出
        </button>
      </view>
    </view>

    <view class="sticks3d__readout">
      <text class="sticks3d__state" :class="{ live: shaking }">
        {{ stateText }}
      </text>
      <text class="sticks3d__hint">
        {{ sensorHint }}
      </text>
    </view>

    <!-- 签文全文：签级、典故、四句签诗、白话签解 -->
    <view v-if="result && !shaking" class="sticks3d__lot">
      <view class="sticks3d__lot-head">
        <view class="sticks3d__lot-badge" :style="levelBadgeStyle(result.level)">
          {{ result.levelLabel || result.level }}
        </view>
        <text class="sticks3d__lot-theme">{{ result.themeTitle }}</text>
        <text v-if="result.number" class="sticks3d__lot-number">第 {{ result.number }} 签</text>
      </view>
      <text class="sticks3d__lot-title">{{ result.title }}</text>
      <text v-if="result.tale" class="sticks3d__lot-tale">典故 · {{ result.tale }}</text>
      <view v-if="result.poem && result.poem.length" class="sticks3d__lot-poem">
        <text
          v-for="(line, index) in result.poem"
          :key="`poem-${index}`"
          class="sticks3d__lot-line"
        >
          {{ line }}
        </text>
      </view>
      <view v-if="result.reading" class="sticks3d__lot-reading">
        <text class="sticks3d__lot-reading-label">签解</text>
        <text class="sticks3d__lot-reading-text">{{ result.reading }}</text>
      </view>
    </view>

    <view v-if="themeId === 'custom'" class="sticks3d__editor">
      <text class="sticks3d__editor-title">自己写签</text>
      <view class="sticks3d__editor-row">
        <input
          v-model="customText"
          class="sticks3d__editor-input"
          type="text"
          maxlength="24"
          placeholder="例如：今天先运动 20 分钟"
          placeholder-class="field-placeholder"
        >
        <button class="sticks3d__editor-add" hover-class="none" @tap="addCustom">加签</button>
      </view>
      <view v-if="customLots.length" class="sticks3d__editor-list">
        <view v-for="lot in customLots" :key="lot.id" class="sticks3d__editor-item">
          <text class="sticks3d__editor-level" :style="{ color: levelColor(lot.level) }">{{ lot.level }}</text>
          <text class="sticks3d__editor-label">{{ lot.label }}</text>
          <button class="sticks3d__editor-remove" hover-class="none" @tap="removeCustom(lot.id)">×</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { addCustomLot, drawLot, getLotPool, removeCustomLot } from '@/utils/play-data'
import { getLotLevel, LOT_THEMES } from '@/utils/lots-library'
import { useDeviceShake } from '@/utils/use-device-shake'

export default {
  name: 'LuckySticks3D',
  props: {
    scope: {
      type: String,
      default: 'guest'
    },
    kicker: {
      type: String,
      default: 'LUCKY STICKS 3D'
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
      gravity: sensor.gravity,
      sensorReady: sensor.supported,
      startSensor: sensor.start,
      stopSensor: sensor.stop,
      retrySensor: sensor.retry
    }
  },
  data () {
    return {
      themes: LOT_THEMES,
      themeId: 'yuelao',
      customText: '',
      customVersion: 0,
      sceneCmd: { id: 0, type: '', payload: {} },
      shakeToken: 0,
      gravityPush: { x: 0, y: 0, z: 0 },
      cmdId: 0,
      sceneReady: false,
      sceneError: '',
      sceneFailures: 0,
      glInfo: null,
      fps: 0,
      slipState: null,
      shaking: false,
      charging: false,
      chargeProgress: 0,
      ritualDone: false,
      result: null,
      // 每一轮抽签只允许结算一次。3D 完成回调和兜底计时器可能先后到达，
      // 用轮次令牌把后到的重复回调丢掉，避免“先出一张、里面又出一张”。
      drawCycle: 0,
      resultCycle: -1,
      fullscreen: false,
      pushTimer: null,
      lastPushAt: 0
    }
  },
  computed: {
    activeTheme () {
      return this.themes.find((item) => item.id === this.themeId) || this.themes[0]
    },
    poolKey () {
      return `${this.scope}#${this.customVersion}`
    },
    poolCount () {
      const key = this.poolKey
      return key ? getLotPool(this.scope, this.themeId).length : 0
    },
    customLots () {
      const key = this.poolKey
      return key ? getLotPool(this.scope, 'custom') : []
    },
    /** 主按钮文案：同一个位置只承担一个动作。 */
    primaryLabel () {
      if (this.charging) return '正在起卦…'
      if (this.shaking) return '摇签中…'
      if (this.result) return '再摇一支'
      return '开始求签'
    },
    /** 主按钮上方的一句话提示。 */
    ctaTitle () {
      if (this.charging) return '心诚则灵 · 请稳住手'
      if (this.shaking) return '签筒摇动中'
      if (this.result) return ''
      return '静心默念所求之事'
    },
    /** 签面只放短签题；自定义签最多 24 字，全文在下方签文区展示。 */
    revealTitle () {
      const text = String((this.result && this.result.title) || '所求皆遂')
      return text.length > 5 ? `${text.slice(0, 5)}…` : text
    },
    stateText () {
      if (!this.sceneReady) return '3D 场景准备中'
      if (this.shaking) return '签筒摇动中…'
      if (this.result) return `已求得 · ${this.result.title}`
      return '静心默念所求之事'
    },
    sensorHint () {
      if (!this.sceneReady) return this.sceneError || '正在准备 3D 场景'
      if (this.sensorReady) return '拖动画面换视角，双指缩放；拿起手机摇一摇也行。'
      return '点下方按钮就能摇；拖动画面可以换视角。'
    },
    diagText () {
      if (!this.sceneReady || !this.glInfo) return ''
      const parts = ['3D 已启用', this.glInfo.version, this.glInfo.mobile ? '移动画质' : '桌面画质']
      if (this.fps) parts.push(`${this.fps}fps`)
      if (this.slipState !== undefined && this.slipState !== null) parts.push(this.slipState < 0 ? '牌已收' : `牌 ${this.slipState}%`)
      return parts.join(' · ')
    },
    /**
     * 把签文写到舞台元素的 data-signs 属性上。
     * App 端的 :change 指令通道偶尔会丢包，3D 层可以从 DOM 属性里再读一遍，
     * 保证筒里的签面写的字和下方解签面板一致。
     */
    signsAttr () {
      try {
        return JSON.stringify(this.signPayload())
      } catch (error) {
        return '[]'
      }
    }
  },
  watch: {
    active (value) {
      if (value) this.startSensor()
      else this.stopSensor()
    }
  },
  mounted () {
    try {
      this.ritualDone = uni.getStorageSync('MiBeiHileRitualDoneV1') === '1'
    } catch (error) {
      this.ritualDone = false
    }
    this.sensor.setShakeHandler(() => this.onDeviceShake())
    if (this.active) this.startSensor()
    // 把当前签种的签级与签题带给 3D 层：签面上写的内容必须和抽签结果完全对应
    this.$nextTick(() => this.sendCommand('init', { signs: this.signPayload() }))
    this.pushTimer = setInterval(() => this.pushGravity(), 90)
    this.sceneWatchdog = 0
    this.initTimer = setInterval(() => {
      if (this.sceneReady) {
        clearInterval(this.initTimer)
        this.initTimer = null
        return
      }
      this.sceneWatchdog += 1
      if (this.sceneWatchdog <= 4) this.sendCommand('init', {})
      else {
        clearInterval(this.initTimer)
        this.initTimer = null
        if (!this.sceneReady && !this.sceneError) this.sceneError = '3D 场景启动超时，可以点「重试 3D」'
      }
    }, 1500)
  },
  beforeUnmount () {
    if (this.pushTimer) clearInterval(this.pushTimer)
    if (this.initTimer) clearInterval(this.initTimer)
    if (this.drawWatchdog) clearTimeout(this.drawWatchdog)
    if (this.chargeTimer) clearInterval(this.chargeTimer)
    this.pushTimer = null
    this.initTimer = null
    this.drawWatchdog = null
    this.chargeTimer = null
    this.setPageScrollLocked(false)
    this.stopSensor()
    this.sendCommand('dispose')
  },
  methods: {
    sendCommand (type, payload = {}) {
      this.cmdId += 1
      // App/WebView 里 :change 只在首次生效，所以把指令搭在持续推送的重力通道上
      this.pendingCmd = { seq: this.cmdId, type, payload }
      this.pendingLeft = 3
      this.sceneCmd = { id: this.cmdId, type, payload }
    },
    signPayload () {
      try {
        return getLotPool(this.scope, this.themeId)
          .map((item) => ({ level: item.level, title: item.title }))
      } catch (error) {
        return []
      }
    },
    pushGravity () {
      if (!this.sceneReady) return
      const now = Date.now()
      if (now - this.lastPushAt < 80) return
      this.lastPushAt = now
      const hasPending = this.pendingLeft > 0 && Boolean(this.pendingCmd)
      // 抽签指令是搭在这条通道上送进 3D 层的。没读到重力感应时也必须继续推送，
      // 否则真机上点按钮 3D 完全不动，只能干等兜底计时器出结果。
      if (!this.sensorReady && !hasPending) return
      const g = this.gravity || { x: 0, y: 0, z: 0 }
      const next = {
        x: Number((g.x || 0).toFixed(3)),
        y: Number((g.y || 0).toFixed(3)),
        z: Number((g.z || 0).toFixed(3))
      }
      if (hasPending) {
        next.seq = this.pendingCmd.seq
        next.cmd = this.pendingCmd.type
        next.payload = this.pendingCmd.payload
        this.pendingLeft -= 1
        if (this.pendingLeft <= 0) this.pendingCmd = null
      }
      this.gravityPush = next
    },
    onSceneEvent (payload) {
      const data = payload || {}
      if (data.type === 'ready') {
        this.sceneReady = true
        this.sceneError = ''
        if (data.info) this.glInfo = data.info
        return
      }
      if (data.type === 'error') {
        this.sceneError = data.message || '3D 初始化失败'
        this.sceneReady = false
        // 3D 层自己会重试几次；连着都失败就认了，交给页面切轻量签筒
        this.sceneFailures += 1
        if (this.sceneFailures >= 5) this.$emit('unavailable')
        return
      }
      if (data.type === 'fps') {
        this.fps = data.fps || 0
        this.slipState = data.slip
        this.shakeState = data.shaking
        return
      }
      if (data.type === 'drawn') {
        if (this.resultCycle === this.drawCycle) return
        // 3D 层把签弹出来之后，再把签文交出来
        this.shaking = false
        this.drawLotText(data.stickNumber)
        return
      }
      if (data.type === 'shake-request') {
        // 3D 画面上的轻点也必须走逻辑层的 draw()，这样旧结果会先清掉，
        // 并且和按钮、重力感应共用同一套“单轮只结算一次”保护。
        this.draw()
      }
    },
    onDeviceShake () {
      if (!this.sceneReady || this.shaking) return
      this.draw()
    },
    draw () {
      if (this.shaking || !this.sceneReady) return
      if (!this.poolCount) {
        uni.showToast({ title: this.themeId === 'custom' ? '先加几支签' : '签筒是空的', icon: 'none' })
        return
      }
      this.drawCycle += 1
      this.resultCycle = -1
      this.shaking = true
      // 新一轮开始时，先把上一轮舞台签牌清掉，再让 3D 层开始摇动。
      // 这样不会出现旧签和新签短暂叠在一起，也避免 WebView 保留旧的展示纹理。
      this.result = null
      this.sendCommand('clear-reveal', {})
      // 数字这类原始值在 App 的 :change 通道里最可靠，和 cmd 一起发
      this.shakeToken += 1
      this.sendCommand('shake', { duration: 1500 })
      // 兜底：跨层通道在某些端不稳定，万一 3D 没回消息，这里也把签文交出来，
      // 保证「摇签」永远有结果，不会卡在"摇动中"
      clearTimeout(this.drawWatchdog)
      this.drawWatchdog = setTimeout(() => {
        if (!this.shaking) return
        this.shaking = false
        this.drawLotText()
      }, 2800)
    },
    /** 求签仪式：默念 → 蓄势 2.2 秒 → 自动开始摇签 */
    startRitual () {
      if (this.charging || this.shaking || !this.sceneReady) return
      // 第一次求签走完整仪式；之后直接摇，别让老用户每次等 2 秒（这是"懒得玩"的主因）
      if (this.ritualDone) {
        this.draw()
        return
      }
      this.charging = true
      this.chargeProgress = 0
      clearInterval(this.chargeTimer)
      this.chargeTimer = setInterval(() => {
        this.chargeProgress = Math.min(100, this.chargeProgress + 9)
        if (this.chargeProgress < 100) return
        clearInterval(this.chargeTimer)
        this.chargeTimer = null
        this.charging = false
        try {
          uni.setStorageSync('MiBeiHileRitualDoneV1', '1')
        } catch (error) {
          // 忽略存储失败
        }
        this.ritualDone = true
        this.draw()
      }, 100)
    },
    drawLotText (stickNumber) {
      if (this.resultCycle === this.drawCycle) return
      clearTimeout(this.drawWatchdog)
      this.drawWatchdog = null
      try {
        const picked = drawLot(this.scope, this.themeId, stickNumber)
        this.resultCycle = this.drawCycle
        this.result = picked
        this.$emit('result', picked)
      } catch (error) {
        uni.showToast({ title: error?.message || '暂时不能抽签', icon: 'none' })
      }
    },
    selectTheme (id) {
      if (this.shaking) return
      this.themeId = id
      this.result = null
      this.sendCommand('clear-reveal', {})
      this.sendCommand('reset', {})
    },
    levelColor (level) {
      return getLotLevel(level).color
    },
    /** 签级配色：用朱砂 / 赭石 / 青灰 / 墨蓝表达吉凶，比原来的荧光色更耐看。 */
    levelBadgeStyle (level) {
      const tones = {
        上上: { background: 'rgba(163, 39, 32, 0.10)', color: '#A3271F', borderColor: 'rgba(163, 39, 32, 0.34)' },
        上: { background: 'rgba(160, 106, 32, 0.12)', color: '#8A5A14', borderColor: 'rgba(160, 106, 32, 0.34)' },
        中: { background: 'rgba(43, 104, 96, 0.11)', color: '#2C655C', borderColor: 'rgba(43, 104, 96, 0.32)' },
        下: { background: 'rgba(80, 92, 112, 0.11)', color: '#4B5768', borderColor: 'rgba(80, 92, 112, 0.32)' }
      }
      return tones[level] || tones['中']
    },
    addCustom () {
      const text = String(this.customText || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入签词', icon: 'none' })
        return
      }
      addCustomLot(this.scope, text, '中')
      this.customText = ''
      this.customVersion += 1
      this.result = null
      this.sendCommand('clear-reveal', {})
    },
    removeCustom (id) {
      removeCustomLot(this.scope, id)
      this.customVersion += 1
      this.result = null
      this.sendCommand('clear-reveal', {})
    },
    retryScene () {
      this.sceneError = ''
      this.sendCommand('rebuild', {})
    },
    useFallback () {
      this.$emit('unavailable')
    },
    resetView () {
      this.sendCommand('reset-view', {})
    },
    toggleFullscreen () {
      this.fullscreen = !this.fullscreen
      // 全屏期间禁止页面滚动，退出时页面位置不会乱
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
        // iOS / App WebView 不支持就靠 CSS 全屏
      }
      setTimeout(() => this.sendCommand('resize', {}), 120)
      setTimeout(() => this.sendCommand('resize', {}), 460)
      setTimeout(() => this.sendCommand('resize', {}), 900)
    },

    /** 全屏时锁页面滚动；拿不到 document 就静默跳过。 */
    setPageScrollLocked (locked) {
      if (typeof document === 'undefined') return
      try {
        const value = locked ? 'hidden' : ''
        document.documentElement.style.overflow = value
        if (document.body) document.body.style.overflow = value
      } catch (error) {
        // 锁不住不影响全屏
      }
    }
  }
}
</script>

<script module="stickScene" lang="renderjs" src="./LuckySticks3D.renderjs.js"></script>

<style lang="scss" scoped>
.sticks3d {
  padding: 24rpx;
  background:
    radial-gradient(120% 58% at 50% 0%, rgba(206, 158, 84, 0.12), rgba(206, 158, 84, 0) 62%),
    linear-gradient(180deg, #fffdf8 0%, #fbf5ec 100%);
}

.sticks3d__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.sticks3d__copy {
  min-width: 0;
  flex: 1;
}

.sticks3d__kicker {
  display: block;
  color: rgba(150, 108, 48, 0.94);
  font-size: 17rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
}

.sticks3d__title {
  display: block;
  margin-top: 8rpx;
  color: #2a1d16;
  font-size: 38rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}

.sticks3d__subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(90, 70, 58, 0.74);
  font-size: 21rpx;
  line-height: 1.5;
}

/* 右上角签数：一方小印，替代原来的色块 */
.sticks3d__seal {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 3rpx;
  padding: 8rpx 14rpx;
  box-sizing: border-box;
  border: 2rpx solid rgba(163, 39, 32, 0.4);
  border-radius: 8rpx;
  background: rgba(163, 39, 32, 0.06);
}

.sticks3d__seal-num {
  color: #A3271F;
  font-size: 28rpx;
  font-weight: 900;
}

.sticks3d__seal-unit {
  color: rgba(163, 39, 32, 0.7);
  font-size: 17rpx;
  font-weight: 800;
}

/* 签种：文字标签 + 下划线指示，去掉胶囊按钮 */
.sticks3d__themes {
  display: flex;
  gap: 6rpx;
  margin-top: 20rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.sticks3d__theme {
  position: relative;
  flex: 0 0 auto;
  min-height: 62rpx;
  padding: 0 18rpx;
  border: 0;
  border-radius: 0;
  background: transparent;
  line-height: 62rpx;
}

.sticks3d__theme::after {
  border: none;
}

.sticks3d__theme-text {
  color: rgba(88, 68, 56, 0.6);
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.sticks3d__theme.active .sticks3d__theme-text {
  color: #A3271F;
  font-weight: 900;
}

.sticks3d__theme-bar {
  position: absolute;
  left: 50%;
  bottom: 2rpx;
  width: 0;
  height: 4rpx;
  border-radius: 2rpx;
  background: linear-gradient(90deg, #C8963E, #A3271F);
  transform: translateX(-50%);
  transition: width 0.24s ease;
}

.sticks3d__theme.active .sticks3d__theme-bar {
  width: 40rpx;
}

.sticks3d__stage {
  position: relative;
  height: 660rpx;
  margin-top: 12rpx;
  border-radius: 20rpx;
  overflow: hidden;
  /* 拖动换视角时要吃掉浏览器默认手势；CSS 里写一份，JS 那边设不上也不影响 */
  touch-action: none;
  background:
    radial-gradient(62% 44% at 50% 26%, rgba(226, 178, 104, 0.2), rgba(226, 178, 104, 0) 70%),
    radial-gradient(120% 82% at 50% 118%, rgba(126, 52, 40, 0.44), rgba(126, 52, 40, 0) 62%),
    linear-gradient(180deg, #1f1714 0%, #191110 58%, #120c0a 100%);
  box-shadow:
    inset 0 0 0 1rpx rgba(216, 178, 116, 0.18),
    inset 0 24rpx 60rpx rgba(0, 0, 0, 0.5);
}

.sticks3d__stage.is-fullscreen {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9000;
  /*
   * 不要用 height: 100vh：iOS 的 100vh 是地址栏收起时的高度，
   * 工具栏展开时底部按钮会被推出可视区。100dvh 会跟着地址栏实时变；
   * 不支持的浏览器忽略这一行，退回 inset 撑开。
   */
  width: auto;
  height: 100dvh;
  margin: 0;
  border-radius: 0;
}

.sticks3d__canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
}

/* 舞台上方的暖光，避免大块深色背景发死 */
.sticks3d__glow {
  position: absolute;
  left: 50%;
  top: -10%;
  width: 78%;
  height: 48%;
  margin-left: -39%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(242, 202, 134, 0.22), rgba(242, 202, 134, 0));
  pointer-events: none;
}

/*
 * 唯一结果牌：竖版竹签，签题竖排。
 * 这是跨端兜底层，不依赖 Canvas 纹理文字，避免 Android/iOS WebView 里
 * 出现“签子飞出来了但字不见”。签文全文在下方 .sticks3d__lot 里展示。
 */
.sticks3d__reveal-card {
  position: absolute;
  left: 50%;
  top: 43%;
  z-index: 30;
  width: 184rpx;
  min-height: 386rpx;
  padding: 44rpx 14rpx 18rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  border-radius: 16rpx 16rpx 10rpx 10rpx;
  pointer-events: none;
  transform: translate(-50%, -50%);
  background:
    linear-gradient(90deg, rgba(126, 84, 38, 0.26), rgba(255, 255, 255, 0) 14%, rgba(255, 255, 255, 0) 86%, rgba(126, 84, 38, 0.26)),
    linear-gradient(180deg, #f7ecd0 0%, #eeddb4 48%, #e3cb96 100%);
  box-shadow:
    0 26rpx 54rpx rgba(0, 0, 0, 0.46),
    inset 0 0 0 2rpx rgba(178, 130, 62, 0.55),
    inset 0 0 34rpx rgba(150, 100, 42, 0.18);
  animation: sticks3d-reveal-in 420ms cubic-bezier(0.22, 0.9, 0.28, 1) both;
}

/* 签顶红绳 */
.sticks3d__reveal-string {
  position: absolute;
  left: 50%;
  top: -26rpx;
  width: 4rpx;
  height: 30rpx;
  margin-left: -2rpx;
  border-radius: 2rpx;
  background: linear-gradient(180deg, rgba(163, 39, 32, 0), #A3271F);
}

.sticks3d__reveal-hole {
  position: absolute;
  left: 50%;
  top: 16rpx;
  width: 20rpx;
  height: 20rpx;
  margin-left: -10rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(150, 106, 48, 0.9);
  background: rgba(58, 36, 24, 0.86);
  box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

/* 竖排文字：签题在右栏（大字），签级在左栏（朱砂小字） */
.sticks3d__reveal-body {
  flex: 1;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  overflow: hidden;
}

.sticks3d__reveal-title {
  writing-mode: vertical-rl;
  text-orientation: upright;
  color: #2b1a12;
  font-size: 38rpx;
  /* 竖排时 line-height 决定字列的宽度，给足宽度才不会削掉字的边缘 */
  line-height: 1.3;
  font-weight: 900;
  letter-spacing: 6rpx;
}

.sticks3d__reveal-level {
  writing-mode: vertical-rl;
  text-orientation: upright;
  color: #A3271F;
  font-size: 22rpx;
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.sticks3d__reveal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 14rpx;
}

.sticks3d__reveal-number {
  color: rgba(112, 70, 33, 0.78);
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.sticks3d__reveal-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38rpx;
  height: 38rpx;
  border-radius: 4rpx;
  background: #A3271F;
  color: #F6E6CE;
  font-size: 22rpx;
  font-weight: 900;
}

@keyframes sticks3d-reveal-in {
  from {
    opacity: 0;
    transform: translate(-50%, -36%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 常驻全屏浮标（页面里唯一的全屏入口） */
.sticks3d__fs-float {
  position: absolute;
  right: 20rpx;
  top: 18rpx;
  z-index: 22;
  min-height: 54rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(226, 196, 140, 0.42);
  background: rgba(24, 16, 14, 0.5);
  color: rgba(248, 235, 210, 0.9);
  font-size: 21rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.sticks3d__fs-float::after {
  border: none;
}

.sticks3d__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  text-align: center;
}

.sticks3d__loading-text {
  color: rgba(248, 235, 210, 0.88);
  font-size: 25rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
}

.sticks3d__loading-sub {
  color: rgba(248, 235, 210, 0.4);
  font-size: 19rpx;
  letter-spacing: 1rpx;
}

.sticks3d__loading-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 6rpx;
}

.sticks3d__chip {
  min-height: 62rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(226, 196, 140, 0.42);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(248, 235, 210, 0.88);
  font-size: 21rpx;
  font-weight: 700;
}

.sticks3d__chip::after {
  border: none;
}

.sticks3d__diag {
  color: rgba(248, 235, 210, 0.34);
  font-size: 18rpx;
}

/* 主操作：位置固定，文案随状态变化 */
.sticks3d__cta {
  position: absolute;
  left: 30rpx;
  right: 30rpx;
  bottom: calc(26rpx + env(safe-area-inset-bottom));
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.sticks3d__cta-title {
  color: rgba(246, 230, 206, 0.66);
  font-size: 21rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}

.sticks3d__cta-btn {
  width: 100%;
  min-height: 94rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(232, 196, 132, 0.5);
  background: linear-gradient(180deg, #A8322C 0%, #8B2622 100%);
  color: #F8EBD2;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 8rpx;
  box-shadow:
    0 16rpx 32rpx rgba(0, 0, 0, 0.42),
    inset 0 1rpx 0 rgba(255, 236, 206, 0.34);
}

.sticks3d__cta-btn::after {
  border: none;
}

.sticks3d__cta-btn[disabled] {
  opacity: 0.5;
}

.sticks3d__cta-progress {
  width: 58%;
  height: 6rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.sticks3d__cta-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #E0B26A, #C8963E);
  transition: width 0.1s linear;
}

.sticks3d__fs-bar {
  position: absolute;
  left: 30rpx;
  right: 30rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 14rpx;
  z-index: 20;
}

.sticks3d__fs-btn {
  flex: 1;
  min-height: 94rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(226, 196, 140, 0.36);
  background: rgba(28, 18, 16, 0.62);
  color: rgba(248, 235, 210, 0.9);
  font-size: 26rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.sticks3d__fs-btn::after {
  border: none;
}

.sticks3d__fs-btn--primary {
  flex: 1.4;
  border-color: rgba(232, 196, 132, 0.5);
  background: linear-gradient(180deg, #A8322C 0%, #8B2622 100%);
  color: #F8EBD2;
  letter-spacing: 6rpx;
}

.sticks3d__fs-btn--ghost {
  flex: 0 0 auto;
  min-width: 150rpx;
  background: rgba(28, 18, 16, 0.42);
  font-size: 22rpx;
}

.sticks3d__fs-btn[disabled] {
  opacity: 0.5;
}

.sticks3d__readout {
  margin-top: 16rpx;
}

.sticks3d__state {
  display: block;
  color: #2a1d16;
  font-size: 24rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.sticks3d__state.live {
  color: #A3271F;
}

.sticks3d__hint {
  display: block;
  margin-top: 5rpx;
  color: rgba(90, 70, 58, 0.64);
  font-size: 20rpx;
  line-height: 1.5;
}

/* 签文全文：签级 / 典故 / 四句签诗 / 白话签解 */
.sticks3d__lot {
  margin-top: 18rpx;
  padding: 22rpx 20rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.26);
  background:
    radial-gradient(120% 58% at 50% 0%, rgba(206, 158, 84, 0.1), rgba(206, 158, 84, 0) 62%),
    linear-gradient(180deg, #fffdf8 0%, #fbf4e8 100%);
  /* 结果牌先落，签文延后 90ms 跟上，两段动作连成一条 */
  animation: sticks3d-lot-in 460ms cubic-bezier(0.22, 0.9, 0.28, 1) 90ms both;
}

@keyframes sticks3d-lot-in {
  from {
    opacity: 0;
    transform: translateY(18rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sticks3d__lot-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sticks3d__lot-badge {
  flex: 0 0 auto;
  padding: 5rpx 16rpx;
  border: 1rpx solid transparent;
  border-radius: 6rpx;
  font-size: 21rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.sticks3d__lot-theme {
  color: rgba(90, 70, 58, 0.6);
  font-size: 20rpx;
}

.sticks3d__lot-number {
  margin-left: auto;
  color: rgba(90, 70, 58, 0.6);
  font-size: 20rpx;
}

.sticks3d__lot-title {
  display: block;
  margin-top: 16rpx;
  color: #2a1d16;
  font-size: 44rpx;
  font-weight: 900;
  letter-spacing: 6rpx;
}

.sticks3d__lot-tale {
  display: block;
  margin-top: 8rpx;
  color: rgba(150, 108, 48, 0.92);
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.sticks3d__lot-poem {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 10rpx;
  border-left: 5rpx solid rgba(163, 39, 32, 0.42);
  background: rgba(163, 39, 32, 0.05);
}

.sticks3d__lot-line {
  color: #43301f;
  font-size: 27rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  line-height: 1.5;
}

.sticks3d__lot-reading {
  margin-top: 18rpx;
}

.sticks3d__lot-reading-label {
  display: block;
  color: #A3271F;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.sticks3d__lot-reading-text {
  display: block;
  margin-top: 8rpx;
  color: #3d2c20;
  font-size: 25rpx;
  line-height: 1.7;
}

.sticks3d__editor {
  margin-top: 20rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.2);
  background: rgba(206, 158, 84, 0.07);
}

.sticks3d__editor-title {
  display: block;
  color: rgba(90, 70, 58, 0.66);
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.sticks3d__editor-row {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.sticks3d__editor-input {
  flex: 1;
  min-width: 0;
  height: 78rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.26);
  border-radius: 10rpx;
  background: #fffdf8;
  color: #2a1d16;
  font-size: 24rpx;
}

.sticks3d__editor-add {
  flex: 0 0 auto;
  min-width: 132rpx;
  min-height: 78rpx;
  border: 1rpx solid rgba(163, 39, 32, 0.28);
  border-radius: 10rpx;
  background: rgba(163, 39, 32, 0.08);
  color: #A3271F;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.sticks3d__editor-add::after,
.sticks3d__editor-remove::after {
  border: none;
}

.sticks3d__editor-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 12rpx;
}

.sticks3d__editor-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 10rpx;
  background: #fffdf8;
}

.sticks3d__editor-level {
  font-size: 19rpx;
  font-weight: 900;
}

.sticks3d__editor-label {
  min-width: 0;
  flex: 1;
  color: #2a1d16;
  font-size: 22rpx;
}

.sticks3d__editor-remove {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  background: rgba(163, 39, 32, 0.08);
  color: #A3271F;
  font-size: 26rpx;
}
</style>
