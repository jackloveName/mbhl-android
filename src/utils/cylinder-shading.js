/**
 * 圆柱体的逐片光照：把一圈木片按朝向算出明暗，
 * 中间迎面最亮、两侧收暗，这样平面片也能立起来。
 */

export function hslToRgb (hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360
  const s = Math.min(Math.max(saturation, 0), 1)
  const l = Math.min(Math.max(lightness, 0), 1)
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = chroma * (1 - Math.abs((hp % 2) - 1))
  let rgb = [chroma, 0, 0]
  if (hp < 1) rgb = [chroma, x, 0]
  else if (hp < 2) rgb = [x, chroma, 0]
  else if (hp < 3) rgb = [0, chroma, x]
  else if (hp < 4) rgb = [0, x, chroma]
  else if (hp < 5) rgb = [x, 0, chroma]
  else rgb = [chroma, 0, x]
  const m = l - chroma / 2
  return rgb.map((value) => Math.round((value + m) * 255))
}

export function cylinderSlatBackground (options = {}) {
  const {
    index = 0,
    total = 36,
    hue = 352,
    saturation = 56,
    lightness = 10,
    range = 24,
    specular = 14,
    grain = 0.12,
    vertical = true
  } = options

  const step = 360 / total
  const angle = index * step
  const facing = Math.max(0, Math.cos((angle * Math.PI) / 180))
  const level = (lightness + range * Math.pow(facing, 1.15) + specular * Math.pow(facing, 8)) / 100
  const [r, g, b] = hslToRgb(hue, saturation / 100, Math.min(level, 0.92))

  const layers = []
  if (grain) {
    layers.push(`repeating-linear-gradient(90deg, rgba(0,0,0,${grain}) 0 1rpx, rgba(255,255,255,0.05) 1rpx 3rpx)`)
  }
  if (vertical) {
    layers.push('linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.34) 100%)')
  }
  layers.push(`rgb(${r}, ${g}, ${b})`)

  return layers.join(', ')
}

/** 黄金/黄铜色环，用于签筒和骰盅的金属箍。 */
export function metalSlatBackground (options = {}) {
  return cylinderSlatBackground({
    hue: 42,
    saturation: 62,
    lightness: 26,
    range: 30,
    specular: 22,
    grain: 0.08,
    ...options
  })
}
