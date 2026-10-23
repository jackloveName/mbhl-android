import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SIZE = 48
const SCALE = 4
const HI = SIZE * SCALE
const OUT_DIR = path.resolve('src/static/tabbar')

const palette = {
  pink: '#ff5d8f',
  coral: '#ff8a5b',
  gold: '#f2b844',
  violet: '#7b61ff',
  mint: '#3bb7a3',
  softPink: '#ffe1eb',
  softWarm: '#fff0dd',
  muted: '#c79aaa',
  mutedSoft: '#f7dce5'
}

function hexToRgba (hex, alpha = 1) {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    Math.round(alpha * 255)
  ]
}

function createCanvas () {
  return new Uint8ClampedArray(HI * HI * 4)
}

function blend (canvas, x, y, rgba) {
  if (x < 0 || y < 0 || x >= HI || y >= HI) return
  const index = (Math.floor(y) * HI + Math.floor(x)) * 4
  const srcA = rgba[3] / 255
  const dstA = canvas[index + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA <= 0) return
  canvas[index] = Math.round((rgba[0] * srcA + canvas[index] * dstA * (1 - srcA)) / outA)
  canvas[index + 1] = Math.round((rgba[1] * srcA + canvas[index + 1] * dstA * (1 - srcA)) / outA)
  canvas[index + 2] = Math.round((rgba[2] * srcA + canvas[index + 2] * dstA * (1 - srcA)) / outA)
  canvas[index + 3] = Math.round(outA * 255)
}

function fillCircle (canvas, cx, cy, radius, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  const x1 = Math.floor((cx - radius) * SCALE)
  const x2 = Math.ceil((cx + radius) * SCALE)
  const y1 = Math.floor((cy - radius) * SCALE)
  const y2 = Math.ceil((cy + radius) * SCALE)
  const hc = [cx * SCALE, cy * SCALE]
  const hr = radius * SCALE
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const dx = x + 0.5 - hc[0]
      const dy = y + 0.5 - hc[1]
      if (dx * dx + dy * dy <= hr * hr) blend(canvas, x, y, rgba)
    }
  }
}

function fillRoundedRect (canvas, x, y, w, h, r, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  const sx = Math.floor(x * SCALE)
  const sy = Math.floor(y * SCALE)
  const ex = Math.ceil((x + w) * SCALE)
  const ey = Math.ceil((y + h) * SCALE)
  const sr = r * SCALE
  for (let py = sy; py <= ey; py++) {
    for (let px = sx; px <= ex; px++) {
      const lx = px + 0.5 - sx
      const ly = py + 0.5 - sy
      const rx = w * SCALE
      const ry = h * SCALE
      const qx = Math.max(sr - lx, 0, lx - (rx - sr))
      const qy = Math.max(sr - ly, 0, ly - (ry - sr))
      if (qx * qx + qy * qy <= sr * sr) blend(canvas, px, py, rgba)
    }
  }
}

function line (canvas, x1, y1, x2, y2, width, color, alpha = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * SCALE * 1.8
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    fillCircle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color, alpha)
  }
}

function strokeCircle (canvas, cx, cy, radius, width, color, alpha = 1) {
  const steps = Math.ceil(radius * 2 * Math.PI * SCALE)
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI * 2 * i) / steps
    fillCircle(canvas, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, width / 2, color, alpha)
  }
}

function fillPolygon (canvas, points, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  const scaled = points.map(([x, y]) => [x * SCALE, y * SCALE])
  const minX = Math.floor(Math.min(...scaled.map((p) => p[0])))
  const maxX = Math.ceil(Math.max(...scaled.map((p) => p[0])))
  const minY = Math.floor(Math.min(...scaled.map((p) => p[1])))
  const maxY = Math.ceil(Math.max(...scaled.map((p) => p[1])))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = false
      for (let i = 0, j = scaled.length - 1; i < scaled.length; j = i++) {
        const xi = scaled[i][0]
        const yi = scaled[i][1]
        const xj = scaled[j][0]
        const yj = scaled[j][1]
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
        if (intersect) inside = !inside
      }
      if (inside) blend(canvas, x, y, rgba)
    }
  }
}

function heart (canvas, cx, cy, size, color, alpha = 1) {
  fillCircle(canvas, cx - size * 0.22, cy - size * 0.12, size * 0.24, color, alpha)
  fillCircle(canvas, cx + size * 0.22, cy - size * 0.12, size * 0.24, color, alpha)
  fillPolygon(canvas, [
    [cx - size * 0.46, cy - size * 0.03],
    [cx + size * 0.46, cy - size * 0.03],
    [cx, cy + size * 0.48]
  ], color, alpha)
}

function star (canvas, cx, cy, r1, r2, color, alpha = 1) {
  const points = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }
  fillPolygon(canvas, points, color, alpha)
}

function savePng (name, canvas) {
  const low = Buffer.alloc(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const acc = [0, 0, 0, 0]
      for (let yy = 0; yy < SCALE; yy++) {
        for (let xx = 0; xx < SCALE; xx++) {
          const src = ((y * SCALE + yy) * HI + (x * SCALE + xx)) * 4
          acc[0] += canvas[src]
          acc[1] += canvas[src + 1]
          acc[2] += canvas[src + 2]
          acc[3] += canvas[src + 3]
        }
      }
      const dst = (y * SIZE + x) * 4
      low[dst] = Math.round(acc[0] / (SCALE * SCALE))
      low[dst + 1] = Math.round(acc[1] / (SCALE * SCALE))
      low[dst + 2] = Math.round(acc[2] / (SCALE * SCALE))
      low[dst + 3] = Math.round(acc[3] / (SCALE * SCALE))
    }
  }

  const scanlines = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  for (let y = 0; y < SIZE; y++) {
    scanlines[y * (SIZE * 4 + 1)] = 0
    low.copy(scanlines, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
  }

  const chunks = [
    chunk('IHDR', Buffer.concat([
      u32(SIZE),
      u32(SIZE),
      Buffer.from([8, 6, 0, 0, 0])
    ])),
    chunk('IDAT', zlib.deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0))
  ]

  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunks
  ]))
}

function u32 (value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value)
  return buffer
}

function chunk (type, data) {
  const typeBuffer = Buffer.from(type)
  const crc = crc32(Buffer.concat([typeBuffer, data]))
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc)])
}

function crc32 (buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
  }
  return ~crc >>> 0
}

function home (active) {
  const c = createCanvas()
  const main = active ? palette.pink : palette.muted
  if (active) {
    fillCircle(c, 24, 24, 19, palette.softPink, 1)
    fillCircle(c, 35, 14, 4, palette.gold, 0.9)
  }
  line(c, 12, 23, 24, 12, 30, active ? palette.softWarm : palette.mutedSoft, active ? 0.9 : 0.18)
  line(c, 24, 12, 36, 23, 30, active ? palette.softWarm : palette.mutedSoft, active ? 0.9 : 0.18)
  line(c, 13, 23, 24, 13, 4.2, main)
  line(c, 24, 13, 35, 23, 4.2, main)
  line(c, 17, 23, 17, 34, 4.2, main)
  line(c, 31, 23, 31, 34, 4.2, main)
  line(c, 17, 34, 31, 34, 4.2, main)
  heart(c, 24, 27, 9, active ? palette.coral : palette.muted, active ? 1 : 0.72)
  return c
}

function wheel (active) {
  const c = createCanvas()
  const main = active ? palette.pink : palette.muted
  if (active) fillCircle(c, 24, 25, 18, palette.softPink)
  strokeCircle(c, 24, 25, 13, 4, main)
  line(c, 24, 12, 24, 38, 2.6, active ? palette.coral : palette.muted, active ? 0.95 : 0.75)
  line(c, 11, 25, 37, 25, 2.6, active ? palette.violet : palette.muted, active ? 0.95 : 0.75)
  line(c, 15, 16, 33, 34, 2.4, active ? palette.gold : palette.muted, active ? 0.95 : 0.65)
  line(c, 33, 16, 15, 34, 2.4, active ? palette.mint : palette.muted, active ? 0.95 : 0.65)
  fillCircle(c, 24, 25, 5, active ? '#ffffff' : '#ffffff')
  fillCircle(c, 24, 25, 2.9, main)
  fillPolygon(c, [[24, 4], [29, 12], [19, 12]], active ? palette.coral : palette.muted, active ? 1 : 0.84)
  return c
}

function ticket (active) {
  const c = createCanvas()
  const main = active ? palette.pink : palette.muted
  if (active) {
    fillRoundedRect(c, 9, 13, 30, 23, 7, palette.softPink)
    fillCircle(c, 38, 20, 4, palette.softWarm)
  }
  fillRoundedRect(c, 10, 14, 28, 21, 6, active ? '#ffffff' : '#fff7fa')
  fillCircle(c, 10, 24.5, 3.7, '#000000', 0)
  fillCircle(c, 38, 24.5, 3.7, '#000000', 0)
  line(c, 14, 15, 34, 15, 3.2, main)
  line(c, 14, 34, 34, 34, 3.2, main)
  line(c, 11, 18, 11, 31, 3.2, main)
  line(c, 37, 18, 37, 31, 3.2, main)
  line(c, 26, 18.5, 26, 31, 1.8, active ? palette.coral : palette.muted, active ? 0.72 : 0.48)
  star(c, 19, 24.5, 5.8, 2.7, active ? palette.gold : palette.muted, active ? 1 : 0.72)
  heart(c, 31, 24.5, 7, active ? palette.coral : palette.muted, active ? 0.94 : 0.62)
  return c
}

function mine (active) {
  const c = createCanvas()
  const main = active ? palette.pink : palette.muted
  if (active) fillCircle(c, 23.5, 24, 18.5, palette.softPink)
  fillCircle(c, 23.5, 18.5, 6.6, active ? '#ffffff' : '#fff7fa')
  strokeCircle(c, 23.5, 18.5, 6.6, 3.2, main)
  line(c, 13, 35, 15.5, 31, 4, main)
  line(c, 15.5, 31, 22, 29, 4, main)
  line(c, 22, 29, 31.5, 31, 4, main)
  line(c, 31.5, 31, 35, 35, 4, main)
  line(c, 13, 35, 35, 35, 4, main)
  heart(c, 34.5, 17, 7.8, active ? palette.coral : palette.muted, active ? 1 : 0.72)
  return c
}

fs.mkdirSync(OUT_DIR, { recursive: true })
savePng('today.png', home(false))
savePng('today-active.png', home(true))
savePng('diary.png', wheel(false))
savePng('diary-active.png', wheel(true))
savePng('data.png', ticket(false))
savePng('data-active.png', ticket(true))
savePng('mine.png', mine(false))
savePng('mine-active.png', mine(true))
