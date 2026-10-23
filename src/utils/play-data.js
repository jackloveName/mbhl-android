/**
 * 单机娱乐数据层：转盘 / 抽签 / 骰子。
 * 本地存储是主存储；登录账号的这份数据会额外同步到云端
 * （见 utils/records-cloud.js），换设备登录还能拿回来。
 * 游客只有本地这一份。
 */
import { updateCoupleData } from '@/utils/couple-data'
import { getLotLevel, getLotLibrary, getLotTheme } from '@/utils/lots-library'
import { scheduleRecordsSync } from '@/utils/records-sync-queue'

const StoragePrefix = 'MiBeiHilePlayV1'
const HistoryLimit = 60

const cache = new Map()

const defaultWheels = [
  {
    id: 'wheel-food',
    title: '今天吃什么',
    color: '#ff5d8f',
    options: [
      { id: 'f1', label: '火锅', weight: 2 },
      { id: 'f2', label: '烧烤', weight: 2 },
      { id: 'f3', label: '麻辣烫', weight: 1 },
      { id: 'f4', label: '轻食', weight: 1 },
      { id: 'f5', label: '面馆', weight: 1 },
      { id: 'f6', label: '日料', weight: 1 }
    ]
  },
  {
    id: 'wheel-chore',
    title: '今天谁洗碗',
    color: '#ff8a5b',
    options: [
      { id: 'c1', label: '我来洗', weight: 1 },
      { id: 'c2', label: '对方洗', weight: 1 },
      { id: 'c3', label: '一起洗', weight: 1 },
      { id: 'c4', label: '攒到明天', weight: 1 }
    ]
  },
  {
    id: 'wheel-weekend',
    title: '周末去哪玩',
    color: '#7b61ff',
    options: [
      { id: 'w1', label: '逛街', weight: 1 },
      { id: 'w2', label: '爬山', weight: 1 },
      { id: 'w3', label: '看电影', weight: 2 },
      { id: 'w4', label: '宅家躺平', weight: 2 },
      { id: 'w5', label: '短途旅行', weight: 1 }
    ]
  },
  {
    id: 'wheel-truth',
    title: '真心话还是大冒险',
    color: '#3bb7a3',
    options: [
      { id: 't1', label: '真心话', weight: 1 },
      { id: 't2', label: '大冒险', weight: 1 },
      { id: 't3', label: '免罚一次', weight: 1 }
    ]
  }
]

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText (value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function createId (prefix = 'play') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function getIdentity (scope = 'guest') {
  return normalizeText(scope, 'guest')
}

function getStorageKey (scope) {
  return `${getIdentity(scope)}:${StoragePrefix}`
}

function formatNow () {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeWheelOption (option = {}) {
  if (typeof option === 'string') {
    const label = normalizeText(option)
    return label ? { id: createId('wopt'), label, weight: 1 } : null
  }
  const label = normalizeText(option.label ?? option.name ?? option.text)
  if (!label) return null
  return {
    id: normalizeText(option.id) || createId('wopt'),
    label: label.slice(0, 12),
    weight: Math.min(Math.max(Number(option.weight || 1), 1), 99)
  }
}

function normalizeWheel (preset = {}) {
  const options = (Array.isArray(preset.options) ? preset.options : [])
    .map(normalizeWheelOption)
    .filter(Boolean)
  if (!options.length) return null
  return {
    id: normalizeText(preset.id) || createId('wheel'),
    title: normalizeText(preset.title, '未命名转盘').slice(0, 16),
    color: normalizeText(preset.color, '#ff5d8f'),
    custom: Boolean(preset.custom),
    options
  }
}

function normalizeCustomLot (lot = {}) {
  const label = normalizeText(lot.label ?? lot.text ?? lot.title)
  if (!label) return null
  return {
    id: normalizeText(lot.id) || createId('lot'),
    label: label.slice(0, 24),
    level: getLotLevel(lot.level || '中').id
  }
}

function makeDefaultData () {
  return {
    wheels: clone(defaultWheels).map((item) => ({ ...item, custom: false })),
    customLots: [],
    dice: { count: 2 },
    history: []
  }
}

const defaultWheelIds = new Set(defaultWheels.map((item) => item.id))

function normalizeData (raw) {
  const base = makeDefaultData()
  const source = raw && typeof raw === 'object' ? raw : {}

  // 内置转盘允许改内容（改完仍然是有改动的内置盘），但不能被删除；
  // 只有用户自己新建的转盘才标记为 custom。
  const storedWheels = (Array.isArray(source.wheels) ? source.wheels : [])
    .map(normalizeWheel)
    .filter(Boolean)
    .map((item) => ({ ...item, custom: !defaultWheelIds.has(item.id) }))

  const storedIds = new Set(storedWheels.map((item) => item.id))
  const wheels = [
    ...storedWheels,
    ...base.wheels.filter((item) => !storedIds.has(item.id))
  ]

  const count = Math.min(Math.max(Number(source.dice?.count || 2), 1), 6)

  return {
    wheels,
    customLots: (Array.isArray(source.customLots) ? source.customLots : [])
      .map(normalizeCustomLot)
      .filter(Boolean)
      .slice(0, 60),
    dice: { count },
    history: (Array.isArray(source.history) ? source.history : []).slice(0, HistoryLimit),
    // 版本号：每次本地改动都会更新，云端同步靠它判断谁更新
    updatedAt: Number(source.updatedAt) || 0
  }
}

export function getPlayData (scope = 'guest') {
  const key = getStorageKey(scope)
  if (cache.has(key)) return clone(cache.get(key))
  let stored = null
  try {
    stored = uni.getStorageSync(key)
  } catch (error) {
    stored = null
  }
  const normalized = normalizeData(stored)
  cache.set(key, normalized)
  return clone(normalized)
}

export function savePlayData (scope = 'guest', data = {}) {
  const key = getStorageKey(scope)
  const normalized = { ...normalizeData(data), updatedAt: Date.now() }
  cache.set(key, normalized)
  try {
    uni.setStorageSync(key, normalized)
  } catch (error) {
    // 本地存储写满时静默忽略，玩法本身不受影响
  }
  // 登录账号顺手把这份数据推到云端（游客会被队列忽略）
  scheduleRecordsSync(scope)
  return clone(normalized)
}

/** 云端同步用：把云端那份原样写回本地，不再触发回推 */
export function applyPlayDataFromCloud (scope = 'guest', data = {}) {
  const key = getStorageKey(scope)
  const normalized = normalizeData(data)
  cache.set(key, normalized)
  try {
    uni.setStorageSync(key, normalized)
  } catch (error) {
    // 同上，写不进去也不影响本次会话
  }
  return clone(normalized)
}

export function updatePlayData (scope = 'guest', updater = (data) => data) {
  const current = getPlayData(scope)
  const next = typeof updater === 'function' ? updater(clone(current)) : { ...current, ...updater }
  return savePlayData(scope, next)
}

export function clearPlayData (scope = 'guest') {
  const key = getStorageKey(scope)
  cache.delete(key)
  try {
    uni.removeStorageSync(key)
  } catch (error) {
    // ignore
  }
}

/**
 * 把结果同步一份到旧的决断历史里，首页的“最近结果”就能一并显示。
 */
function mirrorToDecisionHistory (scope, record) {
  try {
    updateCoupleData(scope, (data) => ({
      ...data,
      decisions: {
        ...data.decisions,
        history: [record, ...(data.decisions?.history || [])].slice(0, 60)
      }
    }))
  } catch (error) {
    // 单机玩法不依赖这一步，失败就跳过
  }
}

function pushHistory (scope, record) {
  const item = { id: createId('record'), createdAt: formatNow(), ...record }
  updatePlayData(scope, (data) => ({
    ...data,
    history: [item, ...data.history].slice(0, HistoryLimit)
  }))
  mirrorToDecisionHistory(scope, item)
  return item
}

export function getPlayHistory (scope = 'guest') {
  return getPlayData(scope).history
}

export function clearPlayHistory (scope = 'guest') {
  updatePlayData(scope, (data) => ({ ...data, history: [] }))
}

/* ------------------------------- 转盘 ------------------------------- */

export function getWheelPresets (scope = 'guest') {
  return getPlayData(scope).wheels
}

export function getWheelPresetById (scope = 'guest', presetId = '') {
  return getWheelPresets(scope).find((item) => item.id === presetId) || null
}

export function saveWheelPreset (scope = 'guest', preset = {}) {
  const normalized = normalizeWheel({ ...preset, custom: true })
  if (!normalized) throw new Error('转盘内容不完整')
  const next = { ...normalized, custom: true }
  updatePlayData(scope, (data) => {
    const rest = data.wheels.filter((item) => item.id !== next.id)
    return { ...data, wheels: [next, ...rest] }
  })
  return next
}

export function deleteWheelPreset (scope = 'guest', presetId = '') {
  updatePlayData(scope, (data) => ({
    ...data,
    wheels: data.wheels.filter((item) => item.id !== presetId || !item.custom)
  }))
}

export function pickWeightedIndex (options = []) {
  const list = Array.isArray(options) ? options : []
  const total = list.reduce((sum, item) => sum + Math.max(Number(item.weight || 1), 1), 0)
  if (!list.length || total <= 0) return -1
  let cursor = Math.random() * total
  for (let index = 0; index < list.length; index += 1) {
    cursor -= Math.max(Number(list[index].weight || 1), 1)
    if (cursor < 0) return index
  }
  return list.length - 1
}

export function spinWheel (scope = 'guest', presetId = '') {
  const preset = getWheelPresetById(scope, presetId)
  if (!preset) throw new Error('没有找到这个转盘')
  const index = pickWeightedIndex(preset.options)
  const option = preset.options[index] || preset.options[0]
  return {
    presetId: preset.id,
    presetTitle: preset.title,
    index,
    label: option?.label || '',
    optionCount: preset.options.length,
    record: pushHistory(scope, {
      kind: 'wheel',
      title: preset.title,
      result: option?.label || '未抽中',
      detail: `${preset.options.length} 个选项`
    })
  }
}

/* ------------------------------- 抽签 ------------------------------- */

export function getLotPool (scope = 'guest', themeId = 'yuelao') {
  if (themeId === 'custom') {
    return getPlayData(scope).customLots.map((item) => ({
      id: item.id,
      level: item.level,
      label: item.label,
      title: item.label,
      custom: true
    }))
  }
  return getLotLibrary()[themeId] || getLotLibrary().overall
}

export function addCustomLot (scope = 'guest', label = '', level = '中') {
  const normalized = normalizeCustomLot({ label, level })
  if (!normalized) throw new Error('请输入签词内容')
  updatePlayData(scope, (data) => ({
    ...data,
    customLots: [normalized, ...data.customLots].slice(0, 60)
  }))
  return normalized
}

export function removeCustomLot (scope = 'guest', lotId = '') {
  updatePlayData(scope, (data) => ({
    ...data,
    customLots: data.customLots.filter((item) => item.id !== lotId)
  }))
}

/* ------------------------------- 刮刮乐 ------------------------------- */

/** 刮开的那一刻记一条：中了多少米贝，回看记录才有意义。 */
export function recordScratchResult (scope = 'guest', payload = {}) {
  const amount = Math.max(0, Math.round(Number(payload.amount) || 0))
  const themeTitle = normalizeText(payload.themeTitle || '刮刮乐')
  const topPrize = Math.max(0, Math.round(Number(payload.topPrize) || 0))
  const record = pushHistory(scope, {
    kind: 'scratch',
    title: `刮刮乐 · ${themeTitle}`,
    result: amount ? `中 ${amount} 米贝` : '未中奖',
    detail: amount && topPrize && amount >= topPrize
      ? '最高奖'
      : (amount ? '已兑，记进米贝' : '谢谢参与')
  })
  return { record, amount }
}

function pickLotByLevel (pool = []) {
  const weightedLevels = ['上上', '上', '中', '下'].map((level) => ({
    level,
    weight: getLotLevel(level).weight
  }))
  const candidates = pool.filter((item) => item.level)
  if (!candidates.length) return null

  const available = weightedLevels.filter((entry) => candidates.some((item) => item.level === entry.level))
  const total = available.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = Math.random() * total
  let level = available[available.length - 1]?.level
  for (const entry of available) {
    cursor -= entry.weight
    if (cursor < 0) {
      level = entry.level
      break
    }
  }
  const group = candidates.filter((item) => item.level === level)
  return group[Math.floor(Math.random() * group.length)] || candidates[0]
}

export function drawLot (scope = 'guest', themeId = 'yuelao', preferredNumber = 0) {
  const pool = getLotPool(scope, themeId)
  if (!pool.length) throw new Error('这个签筒里还没有签')
  // 3D 签筒已经随机选中了某一支，这里按同一签号取签，
  // 保证「签面上写的第 N 签」和「解签面板的第 N 签」完全一致。
  const index = Number(preferredNumber) > 0
    ? (Math.floor(Number(preferredNumber)) - 1) % pool.length
    : -1
  const picked = index >= 0
    ? pool[index]
    : (pickLotByLevel(pool) || pool[Math.floor(Math.random() * pool.length)])
  const theme = getLotTheme(themeId)
  const level = getLotLevel(picked.level)

  const result = {
    themeId,
    themeTitle: theme.title,
    id: picked.id,
    number: picked.number || null,
    level: level.id,
    levelLabel: level.label,
    levelTone: level.tone,
    levelColor: level.color,
    title: picked.title,
    tale: picked.custom ? '' : (picked.tale || ''),
    poem: picked.custom ? [] : (picked.poem || []),
    reading: picked.custom
      ? '这是你自己写下的签，摇出来就是当下的答案。'
      : (picked.reading || ''),
    custom: Boolean(picked.custom)
  }

  result.record = pushHistory(scope, {
    kind: 'lots',
    title: `${theme.title}·${level.label}`,
    result: picked.custom ? picked.title : `${result.number}签 ${picked.title}`,
    detail: result.reading.slice(0, 24)
  })

  return result
}

/* ------------------------------- 骰子 ------------------------------- */

export function getDiceConfig (scope = 'guest') {
  return getPlayData(scope).dice
}

export function setDiceCount (scope = 'guest', count = 2) {
  const value = Math.min(Math.max(Number(count) || 1, 1), 6)
  updatePlayData(scope, (data) => ({ ...data, dice: { ...data.dice, count: value } }))
  return value
}

export function describeDice (values = []) {
  const counts = values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1
    return result
  }, {})
  const unique = Object.keys(counts).map(Number)

  if (values.length > 1 && unique.length === 1 && values.length >= 3) {
    return `${values.length} 个 ${values[0]} 点，豹子`
  }
  if (values.length > 1 && unique.length === 1) {
    return `对子 ${values[0]} 点`
  }
  if (values.length >= 3 && unique.length === values.length &&
    Math.max(...values) - Math.min(...values) === values.length - 1) {
    return '顺子，手气不错'
  }
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total >= values.length * 5) return '点数偏高，宜进攻'
  if (total <= values.length * 2) return '点数偏低，宜保守'
  return '点数平稳，正常发挥'
}

export function rollDice (scope = 'guest', count = 2) {
  const size = Math.min(Math.max(Number(count) || 1, 1), 6)
  const values = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 6))
  const total = values.reduce((sum, value) => sum + value, 0)
  const summary = describeDice(values)

  const result = {
    values,
    total,
    summary,
    record: pushHistory(scope, {
      kind: 'dice',
      title: `${size} 颗骰子`,
      result: `${values.join(' + ')} = ${total}`,
      detail: summary
    })
  }

  return result
}

/**
 * 3D 骰盅的点数来自真实物理模拟，这里只负责把结果写进本地历史。
 */
export function recordDiceResult (scope = 'guest', values = []) {
  const list = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => value >= 1 && value <= 6)
  if (!list.length) return null

  const total = list.reduce((sum, value) => sum + value, 0)
  const summary = describeDice(list)

  return {
    values: list,
    total,
    summary,
    record: pushHistory(scope, {
      kind: 'dice',
      title: `${list.length} 颗骰子`,
      result: `${list.join(' + ')} = ${total}`,
      detail: summary
    })
  }
}
