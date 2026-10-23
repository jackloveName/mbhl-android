/*
 * 游戏音效。
 *
 * 现在用在转盘上：指针每扫过一颗钉子响一声「咔哒」。
 * 转速越快声音越密越实，停下前自然变轻。
 *
 * 为什么不用 uni.createInnerAudioContext：
 * - App 端它是原生播放器，转盘最快一秒要响二十多下，同一个实例连播会丢音；
 * - 停一次再播（stop + play）在原生播放器上经常直接哑掉，表现就是「整个没声音」。
 * 所以这里统一走 webview 里的音频元素（H5 和 App 的 vue 页面都有），
 * 重播用 currentTime = 0 + play()，不 stop；真的取不到 Audio 时才退回 InnerAudioContext。
 *
 * 播放权限（iOS 的自动播放策略）按「单个元素」放行，
 * 所以整池元素必须在用户点按的同一次调用里各播一遍解锁，否则一声都不会响。
 */

const SOUND_ON_KEY = 'MiBeiHileSoundOnV1'
const POOL_SIZE = 6
const TICK_FILES = [
  '/static/audio/wheel-tick-a.wav',
  '/static/audio/wheel-tick-b.wav'
]
/*
 * 两次响声的最小间隔。
 * 26ms 时峰值能到每秒三十多声，每一响都是一次「归零 currentTime + play()」的
 * 媒体操作，全在渲染线程上排队——弱机上这些排队会直接变成一顿一顿的卡顿。
 * 放宽到 60ms 后峰值降到每秒十几声，听起来仍然像转盘在扫钉子。
 */
const MIN_TICK_GAP = 60
/** 解锁播放权限时用的音量：必须大于 0，否则某些内核不认这次"有效播放" */
const PRIME_VOLUME = 0.02

let soundOn = null
let engine = null
let pool = []
let poolIndex = 0
let unlocked = false
let lastTickAt = 0

/** 诊断信息：真机上点开转盘的音效按钮长按就能看到，方便判断是哪一步没成 */
const diagnostics = {
  engine: '未创建',
  platform: '',
  poolSize: 0,
  unlocked: false,
  plays: 0,
  confirmed: 0,
  failures: 0,
  suppressed: false,
  lastError: ''
}

/** 连错这么多次、且一次都没确认起播，就认定这台设备放不出声，不再逐声重试 */
const FAILURE_LIMIT = 6
let suppressed = false

function recordError (error) {
  diagnostics.failures += 1
  diagnostics.lastError = String((error && (error.message || error.errMsg)) || error || '未知错误').slice(0, 120)
}

/**
 * 音频彻底起不来时（一次都没确认起播、却已经错了好几回），停止继续尝试播放。
 * 失败的媒体加载/播放同样排在渲染线程上：转盘一秒要响十几声，
 * 每一响都触发一次失败的重试，表现就是「一卡一卡」。
 * 离开页面会重置，下次进来还会再试一遍。
 */
function shouldGiveUp () {
  if (!suppressed && diagnostics.failures >= FAILURE_LIMIT && diagnostics.confirmed === 0) {
    suppressed = true
    diagnostics.suppressed = true
  }
  return suppressed
}

function readPlatform () {
  try {
    const info = uni.getSystemInfoSync() || {}
    return [info.osName || info.platform || '', info.appVersion ? `v${info.appVersion}` : ''].filter(Boolean).join(' ')
  } catch (error) {
    return ''
  }
}

/**
 * 音频会话：App 端默认跟随系统静音键，iPhone 拨到静音就整段没声。
 * 这里设成不跟随，想安静的人用页面上的音效开关关。
 */
function applyAudioOptions () {
  try {
    uni.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: true,
      success: () => {},
      fail: () => {}
    })
  } catch (error) {}
}

function getAudioElement () {
  if (typeof Audio === 'function') return Audio
  if (typeof window !== 'undefined' && typeof window.Audio === 'function') return window.Audio
  return null
}

/**
 * 音频地址的候选列表，按顺序逐个试：
 * 1) 相对路径——H5 部署在子路径（/mbhl/…）下能跟着走，App 的 webview 落在 www/static 下；
 * 2) 从根开始的写法；
 * 3) App 专属兜底：把 _www 换成真实的 file:// 绝对路径。
 * 之前只试了前两种，真机上一次都取不到就彻底没声音了。
 */
function buildSrcCandidates (file) {
  const clean = String(file || '').replace(/^\//, '')
  const list = [clean, `/${clean}`]
  // #ifdef APP-PLUS
  try {
    if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
      const path = plus.io.convertLocalFileSystemURL(`_www/${clean}`)
      if (path) list.push(path.indexOf('file://') === 0 ? path : `file://${path}`)
    }
  } catch (error) {
    // 取不到就算了，前两个候选通常够用
  }
  // #endif
  return list
}

/** webview 引擎：直接用音频元素，重播是 currentTime = 0（不 stop，避免原生播放器被停死） */
function createElementEngine () {
  const AudioCtor = getAudioElement()
  if (!AudioCtor) return null

  return {
    name: 'webview-audio',
    create (src) {
      const el = new AudioCtor()
      const candidates = buildSrcCandidates(src)
      el.preload = 'auto'
      // iOS 要显式声明行内播放，不然会尝试全屏播放器
      try {
        el.setAttribute('playsinline', 'true')
        el.setAttribute('webkit-playsinline', 'true')
      } catch (error) {}
      // 一个地址取不到就换下一个候选，全试完才算失败
      let cursor = 0
      el.onerror = () => {
        cursor += 1
        if (cursor >= candidates.length) {
          recordError(new Error(`音频加载失败：${src}`))
          return
        }
        try {
          el.src = candidates[cursor]
          el.load()
        } catch (error) {
          recordError(error)
        }
      }
      el.src = candidates[0]
      /*
       * 把元素挂进文档。部分内核既不加载也不播放"游离"的媒体元素，
       * 挂上去最稳；display:none 不占布局。
       */
      try {
        if (typeof document !== 'undefined' && document.body) {
          el.style.display = 'none'
          document.body.appendChild(el)
        }
      } catch (error) {}
      return el
    },
    play (player, volume) {
      player.volume = volume
      try {
        player.currentTime = 0
      } catch (error) {}
      const result = player.play()
      if (result && typeof result.then === 'function') {
        // play() 的 promise 兑现 = 真的起播了，这是"有没有声音"唯一能确认的信号
        result.then(() => {
          diagnostics.confirmed += 1
        }).catch(recordError)
      }
    },
    prime (player) {
      /*
       * 解锁用「真的播一下」，不是设成 0 音量再播。
       * 有的内核只把"有声播放"算作一次有效播放，静音播放解锁不了，
       * 结果是之后所有 play() 都被拦掉——表现就是完全没有声音。
       * 0.02 的音量听不出来，但足够算数。
       */
      try {
        player.volume = PRIME_VOLUME
        const result = player.play()
        if (result && typeof result.catch === 'function') result.catch(recordError)
      } catch (error) {
        recordError(error)
      }
    },
    destroy (player) {
      try {
        player.pause()
        player.src = ''
      } catch (error) {}
      try {
        if (player.parentNode) player.parentNode.removeChild(player)
      } catch (error) {}
    }
  }
}

/** 兜底引擎：没有 Audio 时（小程序等）用 uni 的原生播放器 */
function createInnerAudioEngine () {
  if (typeof uni.createInnerAudioContext !== 'function') return null
  return {
    name: 'inner-audio',
    create (src) {
      const player = uni.createInnerAudioContext()
      player.src = src
      player.obeyMuteSwitch = false
      if (typeof player.onError === 'function') player.onError(recordError)
      return player
    },
    play (player, volume) {
      try {
        player.volume = volume
        player.seek(0)
        player.play()
      } catch (error) {
        recordError(error)
      }
    },
    prime (player) {
      try {
        player.volume = PRIME_VOLUME
        player.play()
      } catch (error) {
        recordError(error)
      }
    },
    destroy (player) {
      try {
        player.destroy()
      } catch (error) {}
    }
  }
}

function ensureEngine () {
  if (engine) return engine
  engine = createElementEngine() || createInnerAudioEngine()
  diagnostics.engine = engine ? engine.name : '不可用'
  diagnostics.platform = readPlatform()
  return engine
}

/**
 * 提前把音频池建好、文件开始预加载（不影响播放权限）。
 * 进玩法页就可以调，省得第一声要等文件。
 */
export function prepareGameSound () {
  if (pool.length) return
  const target = ensureEngine()
  if (!target) return
  applyAudioOptions()

  const list = []
  for (let i = 0; i < POOL_SIZE; i += 1) {
    try {
      list.push(target.create(TICK_FILES[i % TICK_FILES.length]))
    } catch (error) {
      recordError(error)
    }
  }
  pool = list
  diagnostics.poolSize = list.length
}

export function isSoundOn () {
  if (soundOn === null) {
    try {
      const stored = uni.getStorageSync(SOUND_ON_KEY)
      // 没存过就默认开着
      soundOn = stored === '' || stored === undefined || stored === null ? true : Boolean(stored)
    } catch (error) {
      soundOn = true
    }
  }
  return soundOn
}

export function setSoundOn (value) {
  soundOn = Boolean(value)
  try {
    uni.setStorageSync(SOUND_ON_KEY, soundOn ? '1' : '')
  } catch (error) {
    // 存不下只影响下次启动的默认值，本次照常
  }
  return soundOn
}

export function toggleSoundOn () {
  return setSoundOn(!isSoundOn())
}

/**
 * 解锁播放权限：必须在用户点按的同一次调用里同步执行，
 * 而且整池元素都要各播一遍（iOS 是按元素放行的）。
 * 这里用极低的音量真播一下（不是静音），不 stop：文件 50ms 播完自己就结束了。
 */
export function unlockGameSound () {
  const target = ensureEngine()
  if (!target) return
  prepareGameSound()
  applyAudioOptions()

  if (unlocked) return
  unlocked = true
  diagnostics.unlocked = true
  pool.forEach((player) => target.prime(player))
}

/**
 * 响一声「咔哒」。
 * intensity 0~1：转速越接近 1，声音越大越实；快停下时会自然变轻。
 */
export function playWheelTick (intensity = 1) {
  if (!isSoundOn()) return

  const now = Date.now()
  if (now - lastTickAt < MIN_TICK_GAP) return
  if (shouldGiveUp()) return
  lastTickAt = now

  const target = ensureEngine()
  if (!target) return
  prepareGameSound()
  if (!pool.length) return

  const player = pool[poolIndex % pool.length]
  poolIndex += 1

  const speed = Math.max(0, Math.min(1, Number(intensity) || 0))
  target.play(player, Math.min(1, 0.34 + speed * 0.66))
  diagnostics.plays += 1
}

/** 手机上排查用：长按音效按钮会把这段文字弹出来 */
export function getSoundDiagnostics () {
  const info = diagnostics
  return [
    `引擎：${info.engine}`,
    `平台：${info.platform || '未知'}`,
    `音频池：${info.poolSize} 个`,
    `已解锁：${info.unlocked ? '是' : '否'}`,
    `已播放：${info.plays} 次（起播确认 ${info.confirmed} 次）`,
    `失败：${info.failures} 次`,
    `已停用播放：${info.suppressed ? '是（错误太多，不再逐声重试）' : '否'}`,
    info.lastError ? `最近错误：${info.lastError}` : '最近错误：无',
    '起播确认大于 0 说明音频真的响了，那时听不到就是设备或系统没放出来。'
  ].join('\n')
}

export function releaseGameSound () {
  const target = engine
  pool.forEach((player) => {
    if (target) target.destroy(player)
  })
  pool = []
  poolIndex = 0
  unlocked = false
  suppressed = false
  diagnostics.unlocked = false
  diagnostics.suppressed = false
  lastTickAt = 0
}
