/*
 * 把转盘盘面画成一张 SVG（扇形 + 文字 + 钉子 + 反光 + 描边），
 * 交给页面当背景图用。
 *
 * 为什么不继续用 DOM 拼：部分安卓内核在旋转一块合成层时，每帧都会把层里的
 * 内容重新栅格化一遍。盘面里最贵的就是 conic 渐变和文字渲染，逐帧重画直接
 * 把帧率拖到十几帧。换成一张位图之后，每帧只剩「贴图 + 变换矩阵」，
 * 这是所有渲染器都快的路径。
 *
 * 坐标系：viewBox 用 0 0 560 560，1 单位 = 1rpx，尺寸和配色跟原来 DOM 版一一对应。
 */

const SIZE = 560
const CENTER = SIZE / 2
const RADIUS = CENTER
/** 文字中心离圆心的距离，占半径的比例（原 DOM 版是 .wheel-sector__rail 的 63%） */
const LABEL_RATIO = 0.63
/** 钉子离圆心的距离（原 DOM 版是 translateY(-248rpx)） */
const PEG_DISTANCE = 248
const PEG_SIZE = 9
const FONT_STACK = 'PingFang SC, Helvetica Neue, Arial, sans-serif'

const round = (value) => Math.round(value * 100) / 100

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/** 字号跟标签长度走，和原来 CSS 里的 is-len-1..4 一一对应 */
function labelSize (length) {
  if (length <= 1) return 34
  if (length === 2) return 30
  if (length === 3) return 26
  return 22
}

/**
 * @param {Array} sectors 见组件里的 sectors 计算属性：{ start, angle, center, text, flip }
 * @param {Array<string>} palette 扇区配色，按索引循环取
 * @returns {string} 完整 SVG 源码
 */
export function buildWheelFace (sectors = [], palette = []) {
  const colors = palette.length ? palette : ['#E9547A']
  const parts = []

  sectors.forEach((sector, index) => {
    const color = colors[index % colors.length]
    // 只有一个扇区时是整圆，用 path 画会退化，直接画圆
    if (sector.angle >= 359.99) {
      parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="${color}"/>`)
      return
    }
    /*
     * conic-gradient 的 0° 在正上方、顺时针增大；SVG 的 0° 在三点钟方向、
     * 在 y 向下的坐标系里同样是顺时针。所以扇形角统一减 90。
     */
    const from = ((sector.start - 90) * Math.PI) / 180
    const to = ((sector.start + sector.angle - 90) * Math.PI) / 180
    const x0 = round(CENTER + RADIUS * Math.cos(from))
    const y0 = round(CENTER + RADIUS * Math.sin(from))
    const x1 = round(CENTER + RADIUS * Math.cos(to))
    const y1 = round(CENTER + RADIUS * Math.sin(to))
    const largeArc = sector.angle > 180 ? 1 : 0
    parts.push(`<path d="M${CENTER} ${CENTER}L${x0} ${y0}A${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x1} ${y1}Z" fill="${color}"/>`)
  })

  // 外圈细白线（原 .wheel-face 的 inset box-shadow）
  parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS - 2}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="4"/>`)

  // 左上高光 + 右下暗角，裁进圆里，这样容器不用再靠 overflow 裁
  parts.push('<g clip-path="url(#face)">')
  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="url(#glossHigh)"/>`)
  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="url(#glossLow)"/>`)
  parts.push('</g>')

  // 内圈细线
  parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS - 22}" fill="none" stroke="#ffffff" stroke-opacity="0.32" stroke-width="2"/>`)

  sectors.forEach((sector) => {
    const anchorY = round(CENTER - CENTER * LABEL_RATIO)
    const rotate = sector.flip ? 90 : -90
    const fontSize = labelSize(sector.text.length)
    const text = escapeXml(sector.text)
    const attrs = `text-anchor="middle" dy="0.32em" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="900"`
    // SVG 里没有 rgba()，阴影用「先画一层深色、稍微下移」来模拟
    parts.push(
      `<g transform="rotate(${round(sector.center)} ${CENTER} ${CENTER})">` +
        `<text x="${CENTER}" y="${anchorY + 2}" transform="rotate(${rotate} ${CENTER} ${anchorY})" ${attrs} fill="#3c0c20" fill-opacity="0.34">${text}</text>` +
        `<text x="${CENTER}" y="${anchorY}" transform="rotate(${rotate} ${CENTER} ${anchorY})" ${attrs} fill="#ffffff">${text}</text>` +
      '</g>'
    )
  })

  sectors.forEach((sector) => {
    const angle = ((sector.start - 90) * Math.PI) / 180
    const x = round(CENTER + PEG_DISTANCE * Math.cos(angle))
    const y = round(CENTER + PEG_DISTANCE * Math.sin(angle))
    parts.push(`<circle cx="${x}" cy="${y}" r="${PEG_SIZE}" fill="url(#peg)"/>`)
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    '<defs>' +
      `<clipPath id="face"><circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}"/></clipPath>` +
      '<radialGradient id="glossHigh" cx="0.26" cy="0.12" r="0.66">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.62"/>' +
        '<stop offset="0.46" stop-color="#ffffff" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="glossLow" cx="0.7" cy="0.96" r="0.6">' +
        '<stop offset="0" stop-color="#26101e" stop-opacity="0.22"/>' +
        '<stop offset="0.58" stop-color="#26101e" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="peg" cx="0.34" cy="0.3" r="0.7">' +
        '<stop offset="0" stop-color="#fffdf6"/>' +
        '<stop offset="0.62" stop-color="#d8c08a"/>' +
        '<stop offset="1" stop-color="#8d7132"/>' +
      '</radialGradient>' +
    '</defs>' +
    parts.join('') +
    '</svg>'
}

/** 包成可以直接塞进 style 的 data URI */
export function buildWheelFaceUrl (sectors, palette) {
  if (!sectors.length) return ''
  return `data:image/svg+xml,${encodeURIComponent(buildWheelFace(sectors, palette))}`
}
