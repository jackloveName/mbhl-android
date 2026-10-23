/**
 * 摇一摇检测（H5 / App 通用）
 *
 * - H5：uni.startAccelerometer 内部监听 devicemotion，iOS 的
 *   DeviceMotionEvent.requestPermission 也由 uni 自己发起，所以必须在用户
 *   手势里调用 start()。
 * - App：走 plus.accelerometer，固定 200ms 回调一次，轴向是 xAxis/yAxis/zAxis。
 *
 * 两种来源的采样率差很多（60Hz vs 5Hz），所以这里用「急动度积分」来算力度，
 * 保证同一个动作在两端的手感接近。加速度计不能用时 supported 会是 false，
 * 界面需要回退到手动按钮。
 */
import { onBeforeUnmount, ref } from 'vue'

const DEFAULTS = {
  // 急动度低于这个值不算摇动（走路、掏手机的日常动作大概在 25 以下）
  jerkFloor: 38,
  // 累计力度到达该值判定为一次摇动
  threshold: 100,
  // 另外一条更稳的判定：短时间内的方向反转次数
  reversals: 3,
  // 单次采样变化超过这个值才参与方向反转统计
  reversalFloor: 2.4,
  // 力度衰减时间常数（秒）
  decay: 0.5,
  // 两次触发之间的最短间隔（毫秒）
  cooldown: 900,
  // 倾斜映射的最大幅度（g）
  swayMax: 0.36
}

function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function useDeviceShake (options = {}) {
  const config = { ...DEFAULTS, ...options }

  const running = ref(false)
  const supported = ref(false)
  const energy = ref(0)
  const sway = ref({ x: 0, y: 0 })
  // 原始重力方向（单位 g），3D 场景直接拿它当世界重力用
  const gravity = ref({ x: 0, y: 0, z: 0 })

  let previous = null
  let lastAt = 0
  let firstAt = 0
  let baseline = null
  let accumulated = 0
  let lastTriggerAt = 0
  let smoothX = 0
  let smoothY = 0
  let smoothZ = 0
  let peak = 0
  let lastAxis = ''
  let lastSign = 0
  let lastFlipAt = 0
  let reversalCount = 0
  let watchdog = null
  let handler = null
  let onShake = config.onShake || null

  function reset () {
    previous = null
    lastAt = 0
    baseline = null
    accumulated = 0
    smoothX = 0
    smoothY = 0
    smoothZ = 0
    peak = 0
    lastAxis = ''
    lastSign = 0
    reversalCount = 0
    energy.value = 0
    sway.value = { x: 0, y: 0 }
    gravity.value = { x: 0, y: 0, z: 0 }
  }

  function handleSample (sample = {}) {
    const now = Date.now()
    const x = Number(sample.x) || 0
    const y = Number(sample.y) || 0
    const z = Number(sample.z) || 0

    if (!firstAt) {
      firstAt = now
      supported.value = true
      baseline = { x, y }
    }

    // 采样间隔：App 端固定 200ms，H5 大约 16ms
    const dt = clamp((now - (lastAt || now - 16)) / 1000, 0.012, 0.4)
    lastAt = now

    if (!previous) previous = { x, y, z }
    const delta = Math.sqrt(
      (x - previous.x) ** 2 + (y - previous.y) ** 2 + (z - previous.z) ** 2
    )
    const rawDelta = {
      x: x - previous.x,
      y: y - previous.y,
      z: z - previous.z
    }
    previous = { x, y, z }

    const jerk = delta / dt
    accumulated *= Math.exp(-dt / config.decay)
    if (jerk > config.jerkFloor) {
      accumulated += (jerk - config.jerkFloor) * dt
    }
    energy.value = clamp(accumulated / config.threshold, 0, 1)

    // 倾斜：低通滤波后与校准基线比较，再用观测到的动态范围归一化，
    // 这样「带重力的数据」和「去掉重力的数据」都能给出合理的摆动。
    const smoothFactor = clamp(dt * 5, 0.06, 0.9)
    smoothX += (x - smoothX) * smoothFactor
    smoothY += (y - smoothY) * smoothFactor
    smoothZ += (z - smoothZ) * smoothFactor
    const offsetX = smoothX - baseline.x
    const offsetY = smoothY - baseline.y
    gravity.value = {
      x: clamp(smoothX / 9.81, -2, 2),
      y: clamp(smoothY / 9.81, -2, 2),
      z: clamp(smoothZ / 9.81, -2, 2)
    }
    peak = Math.max(peak * 0.998, Math.abs(offsetX), Math.abs(offsetY))
    const scale = clamp(peak, 3, 12)
    sway.value = {
      x: clamp(offsetX / scale, -1, 1) * config.swayMax,
      y: clamp(offsetY / scale, -1, 1) * config.swayMax
    }

    // 方向反转计数：App 端只有 5Hz，光靠力度积分偶尔会偏钝，
    // 「来回甩」这个特征在两种采样率下都稳。
    const ax = Math.abs(rawDelta.x)
    const ay = Math.abs(rawDelta.y)
    const az = Math.abs(rawDelta.z)
    const axis = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z'
    const sign = Math.sign(rawDelta[axis])
    let flipped = false
    if (delta > config.reversalFloor && sign !== 0) {
      if (axis === lastAxis && sign !== lastSign) {
        reversalCount = now - lastFlipAt < 420 ? reversalCount + 1 : 1
        lastFlipAt = now
        flipped = true
      } else if (axis !== lastAxis) {
        reversalCount = Math.max(0, reversalCount - 1)
      }
      lastAxis = axis
      lastSign = sign
    }

    const reachedThreshold = accumulated >= config.threshold
    const reachedReversals = reversalCount >= config.reversals
    if ((reachedThreshold || reachedReversals) && now - lastTriggerAt > config.cooldown) {
      lastTriggerAt = now
      accumulated = 0
      reversalCount = 0
      energy.value = 0
      if (onShake) onShake()
      return
    }
    if (flipped) {
      // 反转时给一点力度脉冲，界面上能立刻看到反馈
      energy.value = Math.min(1, energy.value + 0.18)
    }
  }

  function start () {
    if (running.value) return
    reset()
    firstAt = 0
    supported.value = false
    running.value = true

    handler = (sample) => handleSample(sample)

    try {
      uni.onAccelerometerChange(handler)
      uni.startAccelerometer({
        interval: 'game',
        fail: () => {
          supported.value = false
          running.value = false
        }
      })
    } catch (error) {
      supported.value = false
      running.value = false
      return
    }

    // 有些环境（桌面浏览器）API 存在但永远收不到数据，2.6 秒后判定不可用
    if (watchdog) clearTimeout(watchdog)
    watchdog = setTimeout(() => {
      if (!supported.value) {
        energy.value = 0
        sway.value = { x: 0, y: 0 }
      }
      watchdog = null
    }, 2600)
  }

  function stop () {
    if (watchdog) {
      clearTimeout(watchdog)
      watchdog = null
    }
    if (!running.value) return
    running.value = false
    try {
      if (handler) uni.offAccelerometerChange(handler)
      uni.stopAccelerometer({ fail: () => {} })
    } catch (error) {
      // 忽略停止失败
    }
    handler = null
    reset()
  }

  function setShakeHandler (fn) {
    onShake = fn
  }

  /** 在用户手势里重试一次：iOS Safari 要求授权必须发生在点击回调里。 */
  function retry () {
    stop()
    start()
  }

  onBeforeUnmount(stop)

  return { running, supported, energy, sway, gravity, start, stop, retry, setShakeHandler }
}
