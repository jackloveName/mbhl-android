import * as THREE from 'three'

// 签筒：细高、直筒、开口朝上（不能收肩，收了就变骰盅）
// 按规格：竹筒高 4.5、半径 1.5、壁厚 0.15；竹签 3.8 × 0.2 × 0.04
// 矮宽型木筒：高视角能直接看进筒底
const TUBE_RADIUS = 2.0
const TUBE_HEIGHT = 3.0
const TUBE_WALL = 0.15
const STICK_COUNT = 18
// 长木质令牌：修长厚重，顶部云头
const STICK_LENGTH = 5.0
const STICK_WIDTH = 0.3
const STICK_THICKNESS = 0.08
const STICK_BEVEL = 0.03
// 飞出的展示牌：宽扁竹牌（比筒内签大一圈），带穿孔与绳结
// eslint-disable-next-line no-unused-vars
const REVEAL_LENGTH = 5.5
// eslint-disable-next-line no-unused-vars
const REVEAL_WIDTH = 1.2
// eslint-disable-next-line no-unused-vars
const REVEAL_THICKNESS = 0.06
const CAMERA_FOV = 32

/**
 * 古风云头签的二维轮廓。
 * 直接用轮廓挤出，避免把签子做成一根没有识别度的矩形木条。
 */
function createTokenShape (width, length) {
  const shape = new THREE.Shape()
  const half = width / 2
  const bottom = -length / 2
  const shoulder = length / 2 - Math.max(width * 0.72, 0.12)
  const crown = length / 2 + Math.max(width * 0.2, 0.035)
  const corner = Math.min(width * 0.22, 0.08)

  shape.moveTo(-half + corner, bottom)
  shape.lineTo(half - corner, bottom)
  shape.quadraticCurveTo(half, bottom, half, bottom + corner)
  shape.lineTo(half, shoulder)
  shape.quadraticCurveTo(half, crown - width * 0.08, half * 0.5, crown)
  shape.quadraticCurveTo(0, crown + width * 0.3, -half * 0.5, crown)
  shape.quadraticCurveTo(-half, crown - width * 0.08, -half, shoulder)
  shape.lineTo(-half, bottom + corner)
  shape.quadraticCurveTo(-half, bottom, -half + corner, bottom)
  shape.closePath()
  return shape
}

/**
 * 签身、正面、背面分层构建：
 * - ExtrudeGeometry 只负责真实厚度和倒角侧面；
 * - 两张 ShapeGeometry 负责清晰承载签文，避免挤出几何体的材质组在 App WebView 中错位。
 */
function createTokenGroup ({ width, length, thickness, bevel, faceMat, sideMat }) {
  const group = new THREE.Group()
  const shape = createTokenShape(width, length)
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelThickness: Math.min(bevel * 0.55, thickness * 0.28),
    bevelSize: bevel,
    curveSegments: 8,
    steps: 1
  })
  bodyGeo.translate(0, 0, -thickness / 2)
  const body = new THREE.Mesh(bodyGeo, sideMat)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const front = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), faceMat)
  front.position.z = thickness / 2 + 0.004
  front.castShadow = true
  front.receiveShadow = true
  group.add(front)

  const back = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), faceMat)
  back.position.z = -thickness / 2 - 0.004
  back.rotation.y = Math.PI
  back.castShadow = true
  back.receiveShadow = true
  group.add(back)
  return group
}

/** 影棚环境（和骰子同一套思路：顶部柔光箱 + 冷暖侧光）。 */
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
  const softbox = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), panel(0xfff2e2, 2.4))
  softbox.position.set(0, 4.6, 0)
  softbox.rotation.x = Math.PI / 2
  envScene.add(softbox)
  const coolSide = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5), panel(0xcfe0ff, 0.95))
  coolSide.position.set(-5.4, 1.6, 0.4)
  coolSide.rotation.y = Math.PI / 2
  envScene.add(coolSide)
  const warmSide = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5), panel(0xffdcc4, 1.15))
  warmSide.position.set(5.4, 1.8, -0.4)
  warmSide.rotation.y = -Math.PI / 2
  envScene.add(warmSide)
  const texture = pmrem.fromScene(envScene, 0.02).texture
  pmrem.dispose()
  return texture
}

/** 竹纹贴图：竖向纤维 + 竹节暗环。 */
function createBambooTexture (baseColor) {
  const w = 256
  const hgt = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = hgt
  const ctx = canvas.getContext('2d')
  const base = new THREE.Color(baseColor)
  ctx.fillStyle = `#${base.getHexString()}`
  ctx.fillRect(0, 0, w, hgt)
  // 竖向纤维
  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * w
    const alpha = 0.03 + Math.random() * 0.07
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,255,255,${alpha})`
      : `rgba(0,0,0,${alpha})`
    ctx.fillRect(x, 0, 1 + Math.random() * 1.6, hgt)
  }
  // 竹节
  [0.34, 0.68].forEach((ratio) => {
    const y = ratio * hgt
    const gradient = ctx.createLinearGradient(0, y - 10, 0, y + 10)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.35)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, y - 10, w, 20)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * 签面贴图：温润竹色底（#F4E4BC）+ 四面古铜云纹边框
 * + 中央竖排烫金/朱红签文 + 顶部朱红点缀 + 底部签号。
 *
 * 画布比例必须和签面（宽 0.3 × 长 5.0 ≈ 1:16.7）一致，
 * 否则贴上去的字会被横向压扁；字号也要按字数自动缩，
 * 不然字数一多就会顶出画布被裁掉。
 */
function createStickTexture (label, number, title, isLucky) {
  // 签身很窄，使用高分辨率长画布，避免 WebView 缩放后字形发糊或被裁切。
  const w = 128
  const hgt = 2048
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = hgt
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.fillStyle = '#d8bd86'
  ctx.fillRect(0, 0, w, hgt)

  // 细密竖向竹纤维与轻微色差，让筒内签统一但不塑料。
  for (let i = 0; i < 760; i += 1) {
    const x = Math.random() * w
    const alpha = 0.025 + Math.random() * 0.065
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(255,248,220,${alpha})`
      : `rgba(85,50,22,${alpha * 0.75})`
    ctx.fillRect(x, 0, 0.6 + Math.random() * 1.25, hgt)
  }
  for (let i = 0; i < 12; i += 1) {
    const y = 120 + i * 168 + Math.random() * 30
    const line = ctx.createLinearGradient(0, y, w, y)
    line.addColorStop(0, 'rgba(84,51,24,0)')
    line.addColorStop(0.5, 'rgba(84,51,24,0.13)')
    line.addColorStop(1, 'rgba(84,51,24,0)')
    ctx.fillStyle = line
    ctx.fillRect(0, y, w, 4)
  }

  // 内外双线边框，顶部留出云头和穿孔的呼吸空间。
  ctx.strokeStyle = 'rgba(76,43,22,0.72)'
  ctx.lineWidth = 5
  ctx.strokeRect(8, 8, w - 16, hgt - 16)
  ctx.strokeStyle = isLucky ? 'rgba(143,23,43,0.88)' : 'rgba(156,112,48,0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(15, 15, w - 30, hgt - 30)

  // 顶部朱砂圆印，和云头轮廓形成统一识别点。
  ctx.fillStyle = 'rgba(143,23,43,0.92)'
  ctx.beginPath()
  ctx.arc(w / 2, 78, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(235,199,115,0.95)'
  ctx.beginPath()
  ctx.arc(w / 2, 78, 6, 0, Math.PI * 2)
  ctx.fill()

  const levelText = String(label || '吉').replace(/签$/, '')
  const titleText = String(title || '').replace(/[\n\r]/g, '')
  const numberText = String(number || '')
  const chars = [
    ...levelText.split('').map((char) => ({ char, tone: 'level' })),
    ...titleText.split('').map((char) => ({ char, tone: 'title' })),
    ...numberText.split('').map((char) => ({ char, tone: 'number' }))
  ]
  const usableTop = 170
  const usableBottom = hgt - 170
  const step = Math.min(156, (usableBottom - usableTop) / Math.max(chars.length, 1))
  const fontSize = Math.max(24, Math.min(112, Math.floor(step * 0.72)))
  ctx.font = `bold ${fontSize}px "Kaiti SC", "STKaiti", "PingFang SC", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const colors = {
    level: isLucky ? '#8f172b' : '#382519',
    title: '#2c2018',
    number: '#7b4c25'
  }
  const firstY = usableTop + step * 0.5
  chars.forEach((item, index) => {
    const y = firstY + index * step
    ctx.lineWidth = Math.max(3, fontSize * 0.12)
    ctx.strokeStyle = 'rgba(255,243,211,0.72)'
    ctx.strokeText(item.char, w / 2, y)
    ctx.fillStyle = colors[item.tone]
    ctx.fillText(item.char, w / 2, y)
  })

  // 底部小编号线，增强成品签的装饰完成度。
  ctx.strokeStyle = 'rgba(92,55,27,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(28, hgt - 88)
  ctx.lineTo(w - 28, hgt - 88)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/**
 * 展示牌的正面贴图：
 * 象牙淡黄竹色底 + 竖向竹纤维 + 四周熏黑做旧渐变
 * + 顶部毛笔大字（签级，如「上上」）+ 中间竖排签题（如「花开并蒂」）
 * + 底部签号与朱红方印「吉」+ 顶部穿孔。
 *
 * 画布比例对齐竹牌正面（宽 1.2 × 长 5.5 ≈ 1:4.58），
 * 并用「按字数算字号」的方式排版，几个字都不会跑到画布外被裁掉。
 */
// eslint-disable-next-line no-unused-vars
function createRevealTexture (level = '上上', title = '', number = 1) {
  // 展示签只会生成一张，但它会被相机推到近景；提高长边分辨率，
  // 让手机端放大时笔画仍然完整、边缘仍然细腻。
  const w = 512
  const hgt = 2048
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = hgt
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // 暖象牙竹色底：避免纯黄色塑料感。
  ctx.fillStyle = '#e6c894'
  ctx.fillRect(0, 0, w, hgt)

  // 细密竖向竹纤维 + 极轻横向竹节，保证近景有材质，但不会抢签文。
  for (let i = 0; i < 2100; i += 1) {
    const x = Math.random() * w
    const alpha = 0.035 + Math.random() * 0.085
    ctx.fillStyle = Math.random() > 0.52
      ? `rgba(255,250,226,${alpha})`
      : `rgba(112,74,34,${alpha * 0.62})`
    ctx.fillRect(x, 0, 0.55 + Math.random() * 1.6, hgt)
  }
  ;[0.23, 0.48, 0.73].forEach((ratio) => {
    const y = Math.round(hgt * ratio)
    const band = ctx.createLinearGradient(0, y - 18, 0, y + 18)
    band.addColorStop(0, 'rgba(97,59,24,0)')
    band.addColorStop(0.5, 'rgba(97,59,24,0.11)')
    band.addColorStop(1, 'rgba(97,59,24,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, y - 18, w, 36)
  })

  // 四周轻微熏黑做旧，用渐变而不是厚重实色，保留高级留白。
  const edgeTop = ctx.createLinearGradient(0, 0, 0, 190)
  edgeTop.addColorStop(0, 'rgba(67,40,20,0.54)')
  edgeTop.addColorStop(1, 'rgba(67,40,20,0)')
  ctx.fillStyle = edgeTop
  ctx.fillRect(0, 0, w, 190)
  const edgeBottom = ctx.createLinearGradient(0, hgt - 220, 0, hgt)
  edgeBottom.addColorStop(0, 'rgba(67,40,20,0)')
  edgeBottom.addColorStop(1, 'rgba(67,40,20,0.58)')
  ctx.fillStyle = edgeBottom
  ctx.fillRect(0, hgt - 220, w, 220)
  const edgeLeft = ctx.createLinearGradient(0, 0, 130, 0)
  edgeLeft.addColorStop(0, 'rgba(67,40,20,0.34)')
  edgeLeft.addColorStop(1, 'rgba(67,40,20,0)')
  ctx.fillStyle = edgeLeft
  ctx.fillRect(0, 0, 130, hgt)
  const edgeRight = ctx.createLinearGradient(w - 130, 0, w, 0)
  edgeRight.addColorStop(0, 'rgba(67,40,20,0)')
  edgeRight.addColorStop(1, 'rgba(67,40,20,0.34)')
  ctx.fillStyle = edgeRight
  ctx.fillRect(w - 130, 0, 130, hgt)

  const frame = 28
  const inner = 45
  // 双线边框：古铜主线 + 很细的朱砂内线，不做廉价的大金框。
  ctx.strokeStyle = 'rgba(73,43,23,0.78)'
  ctx.lineWidth = 9
  ctx.strokeRect(frame, frame, w - frame * 2, hgt - frame * 2)
  ctx.strokeStyle = 'rgba(155,103,47,0.82)'
  ctx.lineWidth = 3
  ctx.strokeRect(inner, inner, w - inner * 2, hgt - inner * 2)
  ctx.strokeStyle = 'rgba(143,23,43,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(inner + 13, inner + 13, w - (inner + 13) * 2, hgt - (inner + 13) * 2)

  const contentW = w * 0.68
  const centerX = w / 2
  const fontFamily = '"STKaiti", "Kaiti SC", "PingFang SC", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 顶部穿孔区：留出足够空白，和 3D Torus 绳环叠合时不会压住签级。
  ctx.beginPath()
  ctx.arc(centerX, 116, 28, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(55,31,16,0.86)'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(169,123,60,0.9)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(centerX, 116, 13, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(230,200,148,0.85)'
  ctx.fill()

  // 顶部签级：字数越多字号越小，始终落在安全区内。
  const levelText = String(level || '吉').replace(/签$/, '')
  const levelChars = levelText.split('')
  const levelFont = Math.max(58, Math.min(178, Math.floor((contentW / Math.max(levelChars.length, 1)) * 0.88)))
  ctx.font = `bold ${levelFont}px ${fontFamily}`
  ctx.fillStyle = 'rgba(42,26,18,0.96)'
  ctx.fillText(levelChars.join(''), centerX, 350)
  ctx.strokeStyle = 'rgba(255,238,192,0.52)'
  ctx.lineWidth = Math.max(2, Math.round(levelFont * 0.035))
  ctx.strokeText(levelChars.join(''), centerX, 350)

  // 中间竖排签题：限制在固定安全带内，长签文也不会从上下边缘跑出去。
  const titleChars = String(title || '').replace(/[\n\r]/g, '').split('').filter(Boolean)
  if (titleChars.length) {
    const bandTop = 520
    const bandBottom = 1435
    const band = bandBottom - bandTop
    const step = Math.min(184, band / titleChars.length)
    const titleFont = Math.max(34, Math.min(122, Math.floor(step * 0.74)))
    ctx.font = `bold ${Math.min(titleFont, Math.floor(contentW * 0.72))}px ${fontFamily}`
    ctx.fillStyle = 'rgba(47,31,21,0.95)'
    const total = step * titleChars.length
    const blockTop = bandTop + (band - total) / 2
    titleChars.forEach((char, index) => {
      const y = blockTop + step * (index + 0.5)
      ctx.strokeStyle = 'rgba(255,237,194,0.46)'
      ctx.lineWidth = Math.max(2, Math.round(titleFont * 0.03))
      ctx.strokeText(char, centerX, y)
      ctx.fillText(char, centerX, y)
    })
  }

  // 签号（与解签面板保持一致），放在签文和印章之间。
  const numberText = `第 ${number} 签`
  const numberFont = Math.max(30, Math.min(58, Math.floor((contentW / numberText.length) * 0.9)))
  ctx.font = `bold ${numberFont}px ${fontFamily}`
  ctx.fillStyle = 'rgba(122,74,32,0.95)'
  ctx.fillText(numberText, centerX, 1515)
  ctx.strokeStyle = 'rgba(255,236,192,0.45)'
  ctx.lineWidth = 2
  ctx.strokeText(numberText, centerX, 1515)

  // 底部朱红方印「吉」：比例收敛一些，把视觉重心留给签文。
  const sealSize = Math.floor(w * 0.27)
  const sealX = centerX - sealSize / 2
  const sealY = 1628
  ctx.fillStyle = 'rgba(157,24,31,0.93)'
  ctx.fillRect(sealX, sealY, sealSize, sealSize)
  ctx.strokeStyle = 'rgba(255,240,230,0.85)'
  ctx.lineWidth = 5
  ctx.strokeRect(sealX + 10, sealY + 10, sealSize - 20, sealSize - 20)
  ctx.fillStyle = 'rgba(255,248,242,0.96)'
  ctx.font = `bold ${Math.floor(sealSize * 0.62)}px ${fontFamily}`
  ctx.fillText('吉', centerX, sealY + sealSize / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/** 桌面绒布。 */
function createTableTexture () {
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
  for (let i = 0; i < 22000; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default {
  data () {
    return {
      ready: false,
      disposed: false,
      fps: 0,
      buildRetry: 0,
      /*
       * 摇签时间轴的状态必须声明在 data 里。
       * 只写 this.xxx = ... 的话赋值不会真正落到实例上，
       * 结果就是 finishAt 永远是 undefined，摇完那一下的
       * “出签”回调再也发不出来，界面只能靠兜底计时器出结果，
       * 3D 动画看起来自然就是不连贯的。
       */
      state: 'idle',
      shaking: false,
      shakePower: 0,
      shakeUntil: 0,
      drawAt: 0,
      riseAt: 0,
      ejectAt: 0,
      revealAt: 0,
      finishAt: 0,
      drawnIndex: -1,
      drawnProgress: 0,
      luckyRise: 0,
      lastSeq: 0,
      lastShakeToken: 0,
      lastShakeStart: 0
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
    notify (payload) {
      try {
        if (this.$ownerInstance && this.$ownerInstance.callMethod) {
          this.$ownerInstance.callMethod('onSceneEvent', payload)
        }
      } catch (error) {
        // 逻辑层销毁后忽略
      }
    },

    onCommand (newValue) {
      this.runCommand(newValue || {})
    },

    runCommand (cmd) {
      this.lastCmd = `${cmd.type}#${cmd.id}`
      if (cmd.type === 'init') {
        // 界面把当前签种的签级/签题带过来，签面就照它写，保证与抽签结果一一对应
        const payload = cmd.payload || {}
        if (Array.isArray(payload.signs) && payload.signs.length) {
          this.signs = payload.signs
          // 场景可能先于这条指令建好（renderjs 的 mounted 会自己起场景），
          // 那就把签面上的字重画一遍，别让筒里的签留着默认字。
          this.refreshStickFaces()
        }
        if (!this.scene) this.startScene()
        return
      }
      if (!this.scene) return
      const payload = cmd.payload || {}
      if (cmd.type === 'clear-reveal') this.resetRevealVisuals()
      else if (cmd.type === 'shake') this.shake(payload.duration || 1500)
      else if (cmd.type === 'reset') this.resetSticks()
      else if (cmd.type === 'reset-view') this.resetView()
      else if (cmd.type === 'resize') this.handleResize()
      else if (cmd.type === 'rebuild') this.rebuildScene()
      else if (cmd.type === 'dispose') this.disposeScene()
    },

    onGravity (newValue) {
      const g = newValue || {}
      this.deviceGravity = { x: Number(g.x) || 0, y: Number(g.y) || 0, z: Number(g.z) || 0 }
      this.gravityAt = Date.now()
      // 指令随重力通道下发（:change 在 App 里只生效一次）
      if (g.seq && g.seq !== this.lastSeq) {
        this.lastSeq = g.seq
        this.runCommand({ type: g.cmd, id: g.seq, payload: g.payload || {} })
      }
    },

    /** 摇签触发（用原始值传递，规避 App 端对象 :change 不可靠的问题）。 */
    onShakeToken (value) {
      const token = Number(value) || 0
      if (!token || token === this.lastShakeToken) return
      this.lastShakeToken = token
      if (this.scene) this.shake(1500)
    },

    /* ------------------------- 初始化 ------------------------- */

    startScene () {
      if (this.scene || this.disposed) return
      this.retryCount = 0
      this.pullSignsFromDom()
      this.tryBuild()
    },

    /**
     * 从舞台元素的 data-signs 属性里兜底读取签文。
     * 界面正常会用 init 指令送过来；万一那条通道在 App 上没到，
     * 这里还能保证签面上写的是真签文，而不是默认的「吉」。
     */
    pullSignsFromDom () {
      try {
        // renderjs 的 $el 在 H5/部分 App WebView 中可能是组件根卡片，
        // 签文实际挂在内部舞台上；优先查找舞台，避免初始化早于 init 指令时
        // 只能拿到默认的「吉」而没有真实签名。
        const el = (this.$el && this.$el.querySelector && this.$el.querySelector('.sticks3d__stage')) ||
          (typeof document !== 'undefined' && document.querySelector ? document.querySelector('.sticks3d__stage') : null) ||
          ((this.$el && this.$el.getAttribute) ? this.$el : null)
        if (!el || !el.getAttribute) return
        const raw = el.getAttribute('data-signs')
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length) this.signs = parsed
      } catch (error) {
        // 属性读不到就继续用指令通道的数据
      }
    },

    resolveHost () {
      const root = this.$el
      if (root && root.querySelector) {
        const found = root.querySelector('.sticks3d__canvas')
        if (found) return found
        if (root.appendChild) return root
      }
      if (typeof document !== 'undefined' && document.querySelector) {
        return document.querySelector('.sticks3d__canvas')
      }
      return null
    },

    /**
     * 找 3D 舞台元素（拖动换视角、轻点摇签都绑在它身上）。
     * 只认 .sticks3d__stage，找不到才退回到 canvas 本身。
     */
    resolveStageEl (renderer) {
      const pick = (node) => (node && node.addEventListener ? node : null)
      try {
        if (this.$el && this.$el.querySelector) {
          const inner = pick(this.$el.querySelector('.sticks3d__stage'))
          if (inner) return inner
        }
      } catch (error) {
        // 忽略：继续往 document 上找
      }
      try {
        if (typeof document !== 'undefined' && document.querySelector) {
          const stage = pick(document.querySelector('.sticks3d__stage'))
          if (stage) return stage
        }
      } catch (error) {
        // 忽略：退回到 canvas
      }
      return renderer.domElement
    },

    tryBuild () {
      const host = this.host || this.resolveHost()
      if (!host) {
        if (this.retryCount < 40) {
          this.retryCount += 1
          setTimeout(() => this.tryBuild(), 100)
          return
        }
        this.notify({ type: 'error', message: '找不到 3D 容器' })
        return
      }
      this.host = host
      const width = host.clientWidth || 0
      const height = host.clientHeight || 0
      if ((width < 40 || height < 40) && this.retryCount < 40) {
        this.retryCount += 1
        setTimeout(() => this.tryBuild(), 100)
        return
      }
      try {
        this.build(width || 320, height || 320)
        this.notify({ type: 'ready', info: this.glInfo })
      } catch (error) {
        const message = String(error && error.message ? error.message : error)
        // 先收回半成品，免得残留一个坏掉的场景
        try {
          this.disposeScene()
        } catch (cleanupError) {
          // 清理失败也不影响后续重试
        }
        this.notify({ type: 'error', message })
        // App 端的跨层指令通道不稳，所以「重试」不能只靠界面点按钮：
        // 这里在 3D 层自己重试几次，很多机型第二次就能起来。
        if (this.buildRetry < 4) {
          this.buildRetry += 1
          this.disposed = false
          setTimeout(() => {
            if (!this.scene) this.tryBuild()
          }, 900 * this.buildRetry)
        }
      }
    },

    rebuildScene () {
      const host = this.host
      if (!host) return
      this.disposeScene()
      this.disposed = false
      this.host = host
      this.pullSignsFromDom()
      this.startScene()
    },

    build (width, height) {
      const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua) || width < 430 || height < 430
      this.quality = isMobile ? { pixelRatio: 1.6, shadowSize: 768 } : { pixelRatio: 2, shadowSize: 1024 }

      const scene = new THREE.Scene()
      this.scene = scene

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio))
      renderer.setSize(width, height, false)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.95
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      this.renderer = renderer
      this.host.appendChild(renderer.domElement)

      renderer.domElement.addEventListener('webglcontextlost', (event) => {
        if (event.cancelable) event.preventDefault()
        this.notify({ type: 'context-lost' })
      }, false)
      renderer.domElement.addEventListener('webglcontextrestored', () => {
        this.notify({ type: 'rebuild' })
      }, false)

      let rendererName = 'unknown'
      try {
        const gl = renderer.getContext()
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        rendererName = String((debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || 'unknown')
      } catch (error) {
        rendererName = 'unknown'
      }

      // 长焦 32°：高角度也不会有夸张透视畸变
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.05, 80)
      this.camera = camera
      // 取景高度：对准筒身中上部（签簇探出的位置）
      // 高视角俯瞰：相机约在 [0, 8, 11] 的位置，盯住签筒中下部
      // 高空俯视：约等于 position [0, 14, 6] 看向筒底
      this.cameraTarget = new THREE.Vector3(0, 0.6, 0)
      this.baseDistance = this.fitDistance(width / height)
      this.orbit = {
        azimuth: 0,
        elevation: 1.107,
        distance: this.baseDistance,
        targetAzimuth: 0,
        targetElevation: 1.107,
        targetDistance: this.baseDistance,
        velocityAzimuth: 0,
        velocityElevation: 0,
        dragging: false,
        lastX: 0,
        lastY: 0,
        lastAt: 0,
        pinchStart: 0,
        pinchDistance: 0
      }
      this.updateCamera(1)

      try {
        scene.environment = createStudioEnvironment(renderer)
      } catch (error) {
        // 环境贴图失败也能继续：只靠灯光，画面稍暗但场景能开
      }
      // 暖色古典氛围：环境 0.4 + 金色主光 0.8 + 侧向补光
      scene.add(new THREE.AmbientLight(0xffe9d2, 0.4))

      const key = new THREE.DirectionalLight(0xffd9a0, 0.8)
      key.position.set(5, 9, 6)
      key.castShadow = true
      key.shadow.mapSize.set(this.quality.shadowSize, this.quality.shadowSize)
      key.shadow.camera.left = -9
      key.shadow.camera.right = 9
      key.shadow.camera.top = 9
      key.shadow.camera.bottom = -9
      key.shadow.camera.near = 0.5
      key.shadow.camera.far = 32
      key.shadow.bias = -0.0008
      scene.add(key)

      const fill = new THREE.DirectionalLight(0xcfe0ff, 0.35)
      fill.position.set(-6, 4, -4)
      scene.add(fill)

      const rimLight = new THREE.PointLight(0xffc6d6, 3.2, 16, 2)
      rimLight.position.set(-2.6, 4.4, -5)
      scene.add(rimLight)

      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 0.3, 64),
        new THREE.MeshPhysicalMaterial({ map: createTableTexture(), roughness: 0.92, metalness: 0, clearcoat: 0.06 })
      )
      table.position.y = -0.15
      table.receiveShadow = true
      scene.add(table)

      this.buildTube()
      this.buildSticks()
      // 结果展示统一交给 Vue 的 .sticks3d__reveal-card。
      // 这里绝不创建 3D 展示牌，避免和 HTML 结果牌叠成两张。
      this.revealSlip = null
      this.revealMats = null
      this.revealFaceMat = null
      this.glowParticles = null
      // 待机：签筒正立在桌面上，镜头 45° 俯瞰
      if (this.tube) {
        this.tube.position.set(0, 0, 0)
        this.tube.rotation.set(0, 0, 0)
        this.tubeBaseY = 0
        this.tubeBaseTilt = { x: 0, z: 0 }
      }
      if (this.stickGroup && this.tube) this.tube.add(this.stickGroup)

      this.glInfo = {
        version: renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
        renderer: rendererName.slice(0, 48),
        size: `${width}x${height}`,
        mobile: isMobile
      }

      // 事件只绑在 3D 舞台上。
      // 注意：renderjs 的 $el 在 H5 里是整个组件根节点（卡片），绑它会导致
      // 点「签种」「标题」也触发摇签，所以这里必须显式找 .sticks3d__stage。
      const stageEl = this.resolveStageEl(renderer)
      // bindOrbitControl 里会碰元素的 style，App 端某些 WebView 的样式对象很挑
      // （乱设属性会直接抛异常）。这里兜住，绝不让它拖垮整个 3D 场景。
      try {
        this.bindOrbitControl(stageEl)
      } catch (error) {
        try {
          this.bindOrbitControl(renderer.domElement)
        } catch (fallbackError) {
          // 连视角手势都绑不上时也要把画面跑起来，用户还能看签筒
        }
      }
      if (typeof window !== 'undefined') {
        this.resizeHandler = () => this.handleResize()
        window.addEventListener('resize', this.resizeHandler, { passive: true })
        window.addEventListener('orientationchange', this.resizeHandler, { passive: true })
      }

      this.clock = new THREE.Clock()
      this.shakePower = 0
      this.shaking = false
      this.drawnIndex = -1
      this.drawnProgress = 0
      const animate = () => {
        if (this.disposed) return
        this.frame = requestAnimationFrame(animate)
        this.tick()
      }
      animate()
    },

    /* ------------------------- 签筒 ------------------------- */

    buildTube () {
      const tube = new THREE.Group()
      const h = TUBE_HEIGHT
      const wall = TUBE_WALL
      // 顶部开口、底部封闭、有壁厚的竹筒：
      // 外壁上去 → 越过口沿 → 内壁下来 → 封底
      const outerUp = [
        [TUBE_RADIUS * 0.94, 0.02 * h],
        [TUBE_RADIUS, 0.1 * h],
        [TUBE_RADIUS * 0.99, 0.5 * h],
        [TUBE_RADIUS, 0.88 * h],
        [TUBE_RADIUS * 1.02, 0.965 * h],
        [TUBE_RADIUS * 1.03, 1.0 * h]
      ]
      const innerDown = [
        [TUBE_RADIUS * 1.03 - wall, 1.0 * h],
        [TUBE_RADIUS * 1.02 - wall, 0.965 * h],
        [TUBE_RADIUS - wall, 0.88 * h],
        [TUBE_RADIUS * 0.99 - wall, 0.5 * h],
        [TUBE_RADIUS - wall, 0.1 * h],
        [TUBE_RADIUS * 0.96 - wall, 0.06 * h],
        [0.001, 0.06 * h]
      ]
      const profile = [...outerUp, ...innerDown].map(([radius, y]) => new THREE.Vector2(radius, y))

      // 深棕古璞竹纹：粗糙度 0.4、金属度 0.1
      const lacquer = new THREE.MeshPhysicalMaterial({
        color: 0x4a2c17,
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.7,
        map: createBambooTexture(0x4a2c17),
        side: THREE.DoubleSide
      })
      const gold = new THREE.MeshPhysicalMaterial({
        color: 0xc9982f,
        roughness: 0.28,
        metalness: 1,
        clearcoat: 0.5,
        envMapIntensity: 1.25
      })

      const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), lacquer)
      body.castShadow = true
      body.receiveShadow = true
      tube.add(body)

      // 两道包铁／金箍
      const bandTop = new THREE.Mesh(new THREE.TorusGeometry(TUBE_RADIUS * 1.0, 0.07, 18, 80), gold)
      bandTop.rotation.x = Math.PI / 2
      bandTop.position.y = 0.72 * h
      bandTop.castShadow = true
      tube.add(bandTop)

      const bandBottom = new THREE.Mesh(new THREE.TorusGeometry(TUBE_RADIUS * 1.0, 0.07, 18, 80), gold)
      bandBottom.rotation.x = Math.PI / 2
      bandBottom.position.y = 0.24 * h
      bandBottom.castShadow = true
      tube.add(bandBottom)

      // 口沿薄金边，让开口更清楚
      const mouthRim = new THREE.Mesh(new THREE.TorusGeometry(TUBE_RADIUS * 1.025, 0.035, 14, 80), gold)
      mouthRim.rotation.x = Math.PI / 2
      mouthRim.position.y = h
      mouthRim.castShadow = true
      tube.add(mouthRim)

      this.scene.add(tube)
      this.tube = tube
    },

    /**
     * 一只手握着筒身下段：手掌在后、四指在前勾住、拇指压在前侧。
     * 用胶囊体拼，形准、面数低，手机上也不掉帧。
     */
    buildHand (tube) {
      const skin = new THREE.MeshPhysicalMaterial({
        color: 0xd99d78,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.14,
        clearcoatRoughness: 0.6,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xffb79c),
        envMapIntensity: 0.55
      })
      const skinDark = skin.clone()
      skinDark.color = new THREE.Color(0xcf8f6c)

      const hand = new THREE.Group()
      const r = TUBE_RADIUS

      // 手掌：贴在筒后侧（扁一些，像掌部而不是香肠）
      const palm = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.46, r * 0.86, 8, 20), skinDark)
      palm.position.set(0, TUBE_HEIGHT * 0.23, -r * 0.98)
      palm.rotation.z = Math.PI / 2
      palm.scale.set(1, 1, 0.52)
      palm.castShadow = true
      hand.add(palm)

      // 手指：每根分三段，沿筒壁弧线一段段绕过来，所以是"勾住"而不是一根直棍
      const segGeo = new THREE.CapsuleGeometry(r * 0.115, r * 0.28, 6, 14)
      const fingerCenters = [-0.78, -0.26, 0.26, 0.78]
      fingerCenters.forEach((center, index) => {
        const y = TUBE_HEIGHT * (0.14 + index * 0.058)
        for (let seg = 0; seg < 3; seg += 1) {
          const angle = center + (seg - 1) * 0.24
          const bone = new THREE.Mesh(segGeo, seg === 2 ? skin : skinDark)
          bone.position.set(
            Math.sin(angle) * r * 1.02,
            y - seg * 0.016,
            Math.cos(angle) * r * 1.02
          )
          bone.rotation.set(0, angle, Math.PI / 2 - seg * 0.1)
          bone.scale.set(1, 1 - seg * 0.1, 1)
          bone.castShadow = true
          hand.add(bone)
        }
      })

      // 拇指：两段，斜着压在前侧
      const thumbSeg = new THREE.CapsuleGeometry(r * 0.14, r * 0.34, 6, 14)
      for (let seg = 0; seg < 2; seg += 1) {
        const angle = 1.02 + seg * 0.3
        const bone = new THREE.Mesh(thumbSeg, skin)
        bone.position.set(
          Math.sin(angle) * r * 1.03,
          TUBE_HEIGHT * (0.34 - seg * 0.05),
          Math.cos(angle) * r * 1.03
        )
        bone.rotation.set(0, angle, Math.PI / 2 - 0.42 - seg * 0.16)
        bone.castShadow = true
        hand.add(bone)
      }

      tube.add(hand)
      this.hand = hand
    },

    buildSticks () {
      const group = new THREE.Group()

      this.sticks = []
      for (let i = 0; i < STICK_COUNT; i += 1) {
        const stick = new THREE.Group()
        const number = i + 1
        // 签面内容取自当前签种的真实签文（和下方解签面板同一份数据）
        const sign = (this.signs && this.signs[i]) || null
        const label = sign ? `${sign.level}签` : '吉'
        const title = sign ? sign.title : ''
        // 不能在整组签之间复用可透明材质：飞出一支签时只应淡出这一支。
        const sideMat = new THREE.MeshPhysicalMaterial({
          color: 0xc7a66a,
          roughness: 0.32,
          metalness: 0.04,
          clearcoat: 0.45,
          clearcoatRoughness: 0.25,
          envMapIntensity: 0.75,
          transparent: true,
          opacity: 1
        })
        // 与展示竹牌同一套暖竹质感（颜色交给贴图，基础色设为白以免压暗）
        const faceMat = new THREE.MeshPhysicalMaterial({
          map: createStickTexture(label, number, title, label.indexOf('上上') === 0),
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.04,
          clearcoat: 0.5,
          clearcoatRoughness: 0.25,
          envMapIntensity: 0.8,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide
        })
        // 云头轮廓 + 真实厚度 + 倒角；正反面单独承载签文，避免 WebView 材质组错位。
        const slip = createTokenGroup({
          width: STICK_WIDTH,
          length: STICK_LENGTH,
          thickness: STICK_THICKNESS,
          bevel: STICK_BEVEL,
          faceMat,
          sideMat
        })
        stick.add(slip)

        // 伞状散开：绕筒心排一圈，各自向外微倾
        const angle = (i / STICK_COUNT) * Math.PI * 2
        // 环状靠壁站立、底部交错：高视角看下去层次很满
        const radius = TUBE_RADIUS * (0.52 + (i % 3) * 0.12)
        const lean = 0.08 + (i % 4) * 0.024
        stick.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        stick.rotation.z = -Math.cos(angle) * lean
        stick.rotation.x = Math.sin(angle) * lean
        stick.rotation.y = angle * 0.6
        group.add(stick)

        this.sticks.push({
          mesh: stick,
          faceMat,
          // 底部坐在筒底、顶部自然高出筒口
          baseY: 0.3 + STICK_LENGTH * 0.5 + (i % 4) * 0.14,
          baseX: stick.position.x,
          baseZ: stick.position.z,
          baseTilt: { x: stick.rotation.x, z: stick.rotation.z },
          baseRotY: stick.rotation.y,
          label,
          title,
          number,
          phase: Math.random() * Math.PI * 2
        })
      }
      this.scene.add(group)
      this.stickGroup = group
    },

    /* ------------------------- 交互 ------------------------- */

    shake (duration) {
      const startedAt = Date.now()
      // 同一次点击会从 cmd / 重力通道 / shakeToken 三条通道各送一遍。
      // 这里用启动时间去重，而不是依赖 this.shaking —— 那个标志一旦被
      // 上一轮异常中断留在 true，整个 3D 时间轴就再也起不来了。
      if (this.lastShakeStart && startedAt - this.lastShakeStart < 900) return
      this.lastShakeStart = startedAt
      this.shaking = false
      // 新一轮开始：立刻收掉上一轮飞出的展示牌（不能还挂在屏幕中间）
      this.resetRevealVisuals()
      // 上一轮解签时镜头是推近的，重新摇签先把视角拉回全景，
      // 否则签筒是特写，摇动幅度会有一半晃出画外。
      if (this.orbit) {
        this.orbit.targetAzimuth = 0
        this.orbit.targetElevation = 1.107
        this.orbit.targetDistance = this.baseDistance
      }
      if (this.cameraTarget) this.cameraTarget.set(0, 0.6, 0)
      this.shaking = true
      this.state = 'shake'
      this.shakePower = 1
      const now = startedAt
      this.stateAt = now
      // 时间轴：摇动 → 定签 → 窜出筒口 → 离筒瞬间交给结果牌。
      // 关键是不留空档：原来摇动 1.5 秒就停、结果牌 3.3 秒才出，
      // 中间 1.8 秒画面完全静止，还会看到筒里少了一支签。
      this.shakeUntil = now + 1150
      this.drawAt = now + 470
      this.riseAt = now + 880
      this.ejectAt = now + 1420
      this.revealAt = now + 1420
      this.finishAt = now + 1580
      this.luckyRise = 0
      this.drawnIndex = -1
      this.drawnProgress = 0
      this.applySticks()
    },

    resetSticks () {
      this.shaking = false
      this.state = 'idle'
      this.shakePower = 0
      this.drawnIndex = -1
      this.drawnProgress = 0
      this.drawAt = 0
      this.finishAt = 0
      this.riseAt = 0
      this.ejectAt = 0
      this.revealAt = 0
      this.luckyRise = 0
      this.resetRevealVisuals()
      this.applySticks()
      if (this.orbit) {
        this.orbit.targetAzimuth = 0
        this.orbit.targetElevation = 0.78
        this.orbit.targetDistance = this.baseDistance
      }
    },

    /* ------------------------- 每帧 ------------------------- */

    tick () {
      const dt = Math.min(this.clock.getDelta(), 0.05)
      const now = Date.now()
      const live = this.shaking && now < this.shakeUntil ? 1 : 0
      if (this.shaking && this.drawnIndex < 0 && this.drawAt && now >= this.drawAt) {
        this.drawnIndex = Math.floor(Math.random() * this.sticks.length)
        this.drawnProgress = 0
      }
      if (this.shaking && this.finishAt && now >= this.finishAt) {
        this.shaking = false
        // 把抽中的签号报给界面，保证签面与解签面板的签号对得上
        this.notify({ type: 'drawn', stickNumber: this.drawnIndex >= 0 ? this.drawnIndex + 1 : 0 })
      }
      const gravity = this.deviceGravity || { x: 0, y: 0 }
      this.shakePower = (this.shakePower || 0) * Math.exp(-dt / (live ? 0.28 : 0.5))
      if (live) this.shakePower = Math.min(1.2, this.shakePower + dt * 4)

      const t = now / 1000
      const sway = Math.min(1, Math.abs(gravity.x || 0) * 1.2)

      // 阶段推进：shake（摇）→ eject（掉签）→ reveal（推近解签）
      if (this.shaking && this.state === 'shake' && this.ejectAt && now >= this.ejectAt) {
        this.state = 'eject'
      }
      if (this.shaking && this.state === 'eject' && this.revealAt && now >= this.revealAt) {
        this.state = 'reveal'
        this.applyRevealCamera()
      }

      this.sticks.forEach((stick, index) => {
        const mesh = stick.mesh
        const lucky = index === this.drawnIndex
        if (lucky && (this.state === 'eject' || this.state === 'reveal')) {
          this.applyFlyPose(stick)
          return
        }
        const idle = this.state === 'idle' ? 1 : 0
        const jitter = this.shakePower * 0.5
        const wobble = Math.sin(t * 21 + stick.phase) * jitter * 0.05
        const wobble2 = Math.cos(t * 17 + stick.phase) * jitter * 0.045
        mesh.rotation.z = (stick.baseTilt.z || 0) + wobble + Math.sin(t * 0.9 + stick.phase) * 0.008 * idle
        mesh.rotation.x = (stick.baseTilt.x || 0) + wobble2 + (gravity.y || 0) * 0.04 * sway
        mesh.rotation.y = stick.baseRotY || 0
        mesh.position.x = stick.baseX + wobble * 0.4
        mesh.position.z = stick.baseZ + wobble2 * 0.4
        let lift = Math.abs(wobble) * 0.8
        if (lucky && this.riseAt && now >= this.riseAt) {
          // 摇动后半段窜出筒口，0.48 秒到位，正好接上离筒隐藏的那一帧
          this.luckyRise = Math.min(1, (now - this.riseAt) / 480)
          const eased = this.luckyRise * this.luckyRise * (3 - 2 * this.luckyRise)
          lift += eased * 2.5
          // 窜出时带一点外倾，比直上直下自然
          mesh.rotation.z += eased * 0.1
          mesh.rotation.x += eased * 0.05
        }
        mesh.position.y = stick.baseY + lift
      })

      // 签筒：待机轻微呼吸，摇签高频左右倾斜 + 上下拉起
      if (this.tube) {
        const base = this.tubeBaseTilt || { x: 0, z: 0 }
        const baseY = this.tubeBaseY || 0
        if (this.state === 'idle') {
          this.tube.rotation.z = base.z + Math.sin(t * 0.9) * 0.008
          this.tube.rotation.x = base.x + Math.cos(t * 0.7) * 0.006
          this.tube.position.x = 0
          this.tube.position.y = baseY
        } else {
          const amp = this.shakePower * 0.12
          this.tube.rotation.z = base.z + Math.sin(t * 19) * amp
          this.tube.rotation.x = base.x + Math.cos(t * 15) * amp * 0.8
          this.tube.position.x = Math.sin(t * 19) * amp * 0.6
          this.tube.position.y = baseY + Math.abs(Math.sin(t * 17)) * amp * 1.6
        }
      }

      this.updateCamera(dt)
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera)
      this.trackFps()
    },

    /**
     * 抽中签的处理：结果牌由 Vue 唯一渲染。
     * 3D 签本体在离开筒口的第一帧就隐藏，避免“先出一支、再叠一张牌”。
     */
    applyFlyPose (stick) {
      if (!stick || !stick.mesh) return
      stick.mesh.visible = false
      stick.flyDetached = false
      stick.flyStart = null
    },

    /** 签子周围的柔和金色粒子（展示时淡入）。 */
    /**
     * 飞出展示的高精复古竹牌：宽扁竹片 + 顶部穿孔 + 棕色绳结。
     * 平时隐藏，飞升途中与筒内普通签交叉淡入淡出。
     */
    /**
     * 立刻收掉展示牌、粒子，并把上一轮被淡出的那支签恢复显示。
     * 每次开始摇签都会先调用，保证屏上不会有上一轮的残留。
     */
    removeLegacyRevealSlip () {
      const removeNode = (legacy) => {
        if (!legacy) return
        if (legacy.parent) legacy.parent.remove(legacy)
        legacy.traverse((node) => {
          if (node.geometry && node.geometry.dispose) node.geometry.dispose()
          if (!node.material) return
          const materials = Array.isArray(node.material) ? node.material : [node.material]
          materials.forEach((mat) => {
            if (mat.map && mat.map.dispose) {
              mat.map.dispose()
              mat.map = null
            }
            if (mat.dispose) mat.dispose()
          })
        })
      }

      removeNode(this.revealSlip)

      // HMR/热更新可能留下一个旧实例的引用；给旧展示牌打过标记时一并清掉。
      if (this.scene) {
        const stale = []
        this.scene.traverse((node) => {
          if (node.userData && node.userData.legacyRevealSlip) stale.push(node)
        })
        stale.forEach(removeNode)
      }

      this.revealSlip = null
      this.revealMats = null
      this.revealFaceMat = null
    },

    resetRevealVisuals () {
      // 当前产品只保留 Vue 的 .sticks3d__reveal-card，3D 层不再创建结果牌。
      this.removeLegacyRevealSlip()
      this.notify({ type: 'reveal', visible: false })

      if (this.sticks) {
        this.sticks.forEach((stick) => {
          // 下一轮摇签前把上一轮被隐藏的幸运签放回签簇。
          if (stick.flyDetached && this.stickGroup) {
            this.stickGroup.attach(stick.mesh)
          }
          stick.flyDetached = false
          stick.flyStart = null
          stick.revealRemoved = false
          stick.mesh.visible = true
          stick.mesh.position.set(stick.baseX, stick.baseY, stick.baseZ)
          stick.mesh.rotation.set(stick.baseTilt.x, 0, stick.baseTilt.z)
          stick.mesh.traverse((node) => {
            if (!node.isMesh || !node.material) return
            const materials = Array.isArray(node.material) ? node.material : [node.material]
            materials.forEach((mat) => {
              mat.opacity = 1
              mat.transparent = false
              mat.needsUpdate = true
            })
          })
        })
      }
    },

    /**
     * 签种切换、或者首个 init 指令晚到时，把筒内每支签的面重画成当前签文，
     * 保证筒里的签、飞出来的展示牌、下方解签面板三处签号签文完全一致。
     */
    refreshStickFaces () {
      if (!this.sticks || !this.sticks.length) return
      this.sticks.forEach((stick, i) => {
        const sign = (this.signs && this.signs[i]) || null
        const label = sign ? `${sign.level}签` : (stick.label || '吉')
        const title = sign ? sign.title : (stick.title || '')
        if (stick.label === label && stick.title === title) return
        const previous = stick.faceMat && stick.faceMat.map
        const next = createStickTexture(label, stick.number || i + 1, title, label.indexOf('上上') === 0)
        if (stick.faceMat) {
          stick.faceMat.map = next
          stick.faceMat.needsUpdate = true
        }
        if (previous && previous.dispose) previous.dispose()
        stick.label = label
        stick.title = title
      })
    },

    /** 展示：镜头平滑推近到落签处（阻尼收敛即 tween）。 */
    applyRevealCamera () {
      if (!this.orbit) return
      this.orbit.targetAzimuth = 0
      // 视高放低，正对签面，才看得清上面的字
      this.orbit.targetElevation = 0.32
      this.orbit.targetDistance = Math.max(6.2, (this.baseDistance || 10.5) * 0.6)
      if (this.cameraTarget) this.cameraTarget.set(0.45, STICK_LENGTH * 0.52, TUBE_RADIUS + 1.75)
    },

    applySticks () {
      if (!this.sticks) return
      this.sticks.forEach((stick, index) => {
        const mesh = stick.mesh
        mesh.position.set(stick.baseX, stick.baseY, stick.baseZ)
        mesh.rotation.set(stick.baseTilt.x, 0, stick.baseTilt.z)
      })
    },

    trackFps () {
      const now = Date.now()
      this.frames = (this.frames || 0) + 1
      if (!this.fpsSince) this.fpsSince = now
      if (now - this.fpsSince < 1000) return
      const fps = Math.round((this.frames * 1000) / (now - this.fpsSince))
      this.fpsSince = now
      this.frames = 0
      // 每秒都上报（不能只在帧率变化时上报，否则界面上的状态会停在旧值）
      this.lastFps = fps
      this.notify({
        type: 'fps',
        fps,
        // 结果牌由 Vue 唯一渲染，3D 层不再上报展示牌透明度。
        slip: -2,
        grabbing: this.shaking ? 1 : 0
      })
    },

    /* ------------------------- 视角 ------------------------- */

    fitDistance (aspect) {
      const vFov = (36 * Math.PI) / 180
      const base = 22.4
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 0.35))
      return Math.max(base, 3.6 / Math.tan(hFov / 2))
    },

    handleResize () {
      if (!this.renderer || !this.camera || !this.host) return
      const width = this.host.clientWidth || 0
      const height = this.host.clientHeight || 0
      if (width < 40 || height < 40) return
      this.renderer.setSize(width, height, false)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      const previousBase = this.baseDistance || 3.5
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
      // 轻点（不是拖动）= 摇签。这个监听在 3D 层自己身上，不依赖跨层指令通道
      const tap = { x: 0, y: 0, at: 0, moved: false }
      // 手势监听挂在舞台上，事件冒泡上来时 target 可能是 canvas，
      // 也可能是盖在上面的按钮（全屏 / 再摇一支 / 摇签）。
      // 只认真正的 3D 画面，否则点一次按钮会顺带摇一次签。
      const surfaceEl = (this.renderer && this.renderer.domElement) || null
      const isStageSurface = (target) => {
        if (!target) return false
        if (surfaceEl && target === surfaceEl) return true
        const tag = target.tagName ? String(target.tagName).toUpperCase() : ''
        return tag === 'CANVAS'
      }
      const clampElevation = (value) => Math.min(1.28, Math.max(0.12, value))
      const onDragStart = (x, y) => {
        tap.x = x
        tap.y = y
        tap.at = Date.now()
        tap.moved = false
        orbit.dragging = true
        orbit.lastX = x
        orbit.lastY = y
        orbit.lastAt = Date.now()
        orbit.velocityAzimuth = 0
        orbit.velocityElevation = 0
      }
      const onDragMove = (x, y) => {
        if (!orbit.dragging) return
        if (Math.hypot(x - tap.x, y - tap.y) > 8) tap.moved = true
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
        const wasTap = orbit.dragging && !tap.moved && Date.now() - tap.at < 420
        orbit.dragging = false
        if (wasTap) this.onStageTap()
      }
      const handleTouchStart = (event) => {
        if (!isStageSurface(event.target)) return
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
        // 手势必须从画面上开始，否则不要拦浏览器的滚动
        if (!orbit.dragging && !orbit.pinchStart) return
        if (event.cancelable) event.preventDefault()
        if (event.touches.length >= 2) {
          const [a, b] = event.touches
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
          if (orbit.pinchStart > 0) {
            orbit.targetDistance = this.clampZoom(orbit.pinchDistance * (orbit.pinchStart / Math.max(1, distance)))
          }
          return
        }
        if (!orbit.dragging) return
        onDragMove(event.touches[0].clientX, event.touches[0].clientY)
      }
      const handleTouchEnd = () => { orbit.pinchStart = 0; onDragEnd() }
      const handleMouseDown = (event) => {
        if (!isStageSurface(event.target)) return
        onDragStart(event.clientX, event.clientY)
      }
      const handleMouseMove = (event) => onDragMove(event.clientX, event.clientY)
      const handleWheel = (event) => {
        if (!isStageSurface(event.target)) return
        if (event.cancelable) event.preventDefault()
        orbit.targetDistance = this.clampZoom(orbit.targetDistance + event.deltaY * 0.003)
      }
      // 注意：App 端部分 WebView 的 style 对象很挑，给自定义元素（uni-view）
      // 设 touch-action 会直接抛异常（报错信息里就是 touchAction），
      // 一旦抛出就会让整个 3D 建不起来。所以这里统一走容错封装。
      this.applyTouchActionNone(this.host)
      this.applyTouchActionNone(canvas)
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

    clampZoom (value) {
      const base = this.baseDistance || 3.5
      return Math.min(base * 1.8, Math.max(base * 0.6, value))
    },

    /**
     * 关闭元素上的默认手势（touch-action: none）。
     * App 端不同 WebView 的 style 实现差别很大，有的直接赋值就抛异常，
     * 所以这里试三种写法并且全部吞掉异常——失败也只是拖动手感差一点，
     * 绝不能让 3D 场景建不起来。
     */
    applyTouchActionNone (el) {
      if (!el || !el.style) return
      try {
        el.style.touchAction = 'none'
        return
      } catch (error) {
        // 落到 setProperty 再试一次
      }
      try {
        el.style.setProperty('touch-action', 'none')
        return
      } catch (error) {
        // 真的设不了就靠 preventDefault 兜底
      }
      try {
        el.setAttribute('style', `${el.getAttribute('style') || ''};touch-action:none`)
      } catch (error) {
        // 忽略：CSS 里已经写了一份 touch-action: none
      }
    },

    /** 点一下签筒就摇（3D 层自治，不依赖逻辑层下发指令）。 */
    onStageTap () {
      if (!this.scene || this.shaking) return
      // 交给 Vue 逻辑层统一开始一轮抽签。直接在 renderjs 里摇会绕过
      // result=null 和轮次去重，旧结果牌就可能和新牌短暂叠在一起。
      this.notify({ type: 'shake-request' })
    },

    updateCamera (dt) {
      const orbit = this.orbit
      if (!orbit || !this.camera) return
      const step = Math.max(dt, 0.008)
      if (!orbit.dragging) {
        orbit.targetAzimuth += orbit.velocityAzimuth * step * 0.18
        orbit.targetElevation = Math.min(1.28, Math.max(0.12, orbit.targetElevation + orbit.velocityElevation * step * 0.18))
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

    resetView () {
      const orbit = this.orbit
      if (!orbit) return
      orbit.targetAzimuth = 0
      orbit.targetElevation = 1.166
      orbit.targetDistance = this.baseDistance || 15.2
      if (this.cameraTarget) this.cameraTarget.set(0, 1.0, 0)
      orbit.velocityAzimuth = 0
      orbit.velocityElevation = 0
    },

    disposeScene () {
      if (this.disposed) return
      this.disposed = true
      if (this.frame) cancelAnimationFrame(this.frame)
      this.frame = null
      if (this.resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeHandler)
        window.removeEventListener('orientationchange', this.resizeHandler)
        this.resizeHandler = null
      }
      if (this.orbitListeners) {
        this.orbitListeners.forEach(([target, name, handler]) => target.removeEventListener(name, handler))
        this.orbitListeners = null
      }
      if (this.orbitWindowListeners && typeof window !== 'undefined') {
        this.orbitWindowListeners.forEach(([target, name, handler]) => target.removeEventListener(name, handler))
        this.orbitWindowListeners = null
      }
      if (this.renderer) {
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
      }
      this.scene = null
      this.renderer = null
      this.sticks = null
    }
  }
}
