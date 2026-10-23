const StoragePrefix = 'MiBeiHileToolboxV1'

const defaultQuickTools = [
  {
    id: 'daily-status',
    icon: 'sparkles',
    label: '今日状态',
    description: '给今天一个轻松的开场',
    tone: 'coral'
  },
  {
    id: 'spin-wheel',
    icon: 'refresh',
    label: '大转盘',
    description: '自定义后直接开转',
    tone: 'teal'
  },
  {
    id: 'choice-picker',
    icon: 'badgePercent',
    label: '选择困难器',
    description: '快速二选一或多选一',
    tone: 'violet'
  },
  {
    id: 'luck-card',
    icon: 'calendarDays',
    label: '每日卡片',
    description: '保存今天的结果和灵感',
    tone: 'gold'
  },
  {
    id: 'collection',
    icon: 'archive',
    label: '收藏夹',
    description: '常用模板和好结果都在这',
    tone: 'mint'
  },
  {
    id: 'history',
    icon: 'clock3',
    label: '历史',
    description: '回看最近玩过什么',
    tone: 'ink'
  }
]

const defaultWheelTemplates = [
  {
    id: 'wheel-food',
    name: '今天吃什么',
    summary: '随机帮你决定吃饭选项。',
    accent: '#ff7a59',
    options: ['火锅', '烤肉', '麻辣烫', '轻食', '日料', '面']
  },
  {
    id: 'wheel-weekend',
    name: '周末去哪玩',
    summary: '适合周末和朋友一起转。',
    accent: '#1f6c67',
    options: ['公园散步', '咖啡店', '展览', '商场', '近郊', '宅家']
  },
  {
    id: 'wheel-evening',
    name: '今晚做什么',
    summary: '下班后的轻松选择器。',
    accent: '#7a67f7',
    options: ['看剧', '散步', '打游戏', '收纳', '听歌', '早睡']
  },
  {
    id: 'wheel-task',
    name: '今日小任务',
    summary: '把大目标拆成一小步。',
    accent: '#f1b14d',
    options: ['喝水', '拉伸', '清桌面', '发消息', '整理相册', '复盘一天']
  }
]

const dailyTitles = [
  '顺手的一天',
  '轻松模式开启',
  '今天很适合做决定',
  '把小事做完就会很顺',
  '状态不错，别浪费',
  '先玩一会儿再开始也行'
]

const dailySummaries = [
  '今天适合把纠结的事交给工具，把精力留给真正重要的部分。',
  '如果要做选择，先转一轮再定，效率会高很多。',
  '今天更适合处理轻量任务，别把开局搞得太重。',
  '把清单里最小的那件先完成，会获得一点明显的轻盈感。',
  '今天的关键不是拼劲头，而是把节奏稳定住。',
  '适合试新鲜、做记录、顺手整理一些零碎事。'
]

const dailyGoodFors = [
  '先做一个最简单的决定',
  '把待办缩成三项',
  '把收藏夹整理一次',
  '给朋友发一个小小的问候',
  '用转盘决定今晚安排',
  '把拖着的事切成更小块'
]

const dailyAvoids = [
  '别一口气塞太多计划',
  '别让犹豫拖慢开始',
  '别在细节上反复打转',
  '别一开始就追求完美',
  '别让选择题变成压力题',
  '别把今天的任务想得过重'
]

const luckyColors = [
  { name: '珊瑚橙', value: '#ff7a59' },
  { name: '海盐青', value: '#1f6c67' },
  { name: '浅葡萄', value: '#7a67f7' },
  { name: '奶油金', value: '#f1b14d' },
  { name: '雾粉', value: '#ef9fb5' },
  { name: '薄荷绿', value: '#69c49d' }
]

const chosenTimes = ['09:00', '10:30', '13:20', '15:40', '18:10', '21:00']

const moodTags = ['轻松', '果断', '顺路', '安稳', '有趣', '收尾']

const runtimeCache = new Map()

function createId (prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeString (value, fallback = '') {
  return String(value ?? fallback).trim()
}

function normalizeOption (option = {}) {
  if (typeof option === 'string') {
    return {
      id: createId('opt'),
      label: option,
      weight: 1
    }
  }

  const label = normalizeString(option.label || option.name || option.text)
  if (!label) return null

  return {
    id: normalizeString(option.id) || createId('opt'),
    label,
    weight: Math.max(Number(option.weight || 1), 1)
  }
}

function normalizeTemplate (template = {}) {
  const options = Array.isArray(template.options) ? template.options.map(normalizeOption).filter(Boolean) : []
  const name = normalizeString(template.name)
  if (!name || !options.length) return null

  return {
    id: normalizeString(template.id) || createId('wheel'),
    name,
    summary: normalizeString(template.summary, '适合快速做决定。'),
    accent: normalizeString(template.accent, '#1f6c67'),
    options
  }
}

function normalizeHistoryItem (item = {}) {
  const title = normalizeString(item.title)
  const result = normalizeString(item.result || item.choice || item.label)
  return {
    id: normalizeString(item.id) || createId('history'),
    kind: normalizeString(item.kind, 'wheel'),
    title: title || '一次记录',
    result: result || '已保存',
    detail: normalizeString(item.detail),
    templateId: normalizeString(item.templateId),
    createdAt: normalizeString(item.createdAt) || formatDateTime(new Date()),
    color: normalizeString(item.color, '#1f6c67')
  }
}

function normalizeProfile (profile = {}) {
  return {
    nickName: normalizeString(profile.nickName),
    theme: normalizeString(profile.theme, 'sunrise'),
    avatarSeed: normalizeString(profile.avatarSeed, 'mi-bei-hai-le'),
    lastMode: normalizeString(profile.lastMode, 'guest'),
    loginHintSeen: Boolean(profile.loginHintSeen)
  }
}

function normalizeSettings (settings = {}) {
  return {
    dailyCardPinned: settings.dailyCardPinned !== false,
    wheelSound: Boolean(settings.wheelSound),
    reducedMotion: Boolean(settings.reducedMotion),
    defaultTemplateId: normalizeString(settings.defaultTemplateId)
  }
}

export function getTodayText (date = new Date()) {
  const current = date instanceof Date ? date : new Date(date)
  return [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0')
  ].join('-')
}

export function formatDateTime (date = new Date()) {
  const current = date instanceof Date ? date : new Date(date)
  const dateText = getTodayText(current)
  const timeText = [
    String(current.getHours()).padStart(2, '0'),
    String(current.getMinutes()).padStart(2, '0')
  ].join(':')
  return `${dateText} ${timeText}`
}

function hashCode (text = '') {
  let hash = 0
  for (let i = 0; i < String(text).length; i += 1) {
    hash = ((hash << 5) - hash + String(text).charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function pickBySeed (list, seed, offset = 0) {
  const items = Array.isArray(list) ? list.filter(Boolean) : []
  if (!items.length) return ''
  return items[(seed + offset) % items.length]
}

function pickUnique (list, seed, count = 2) {
  const items = Array.isArray(list) ? list.filter(Boolean) : []
  const picked = []
  let cursor = seed
  while (picked.length < count && items.length) {
    const value = items[cursor % items.length]
    if (!picked.includes(value)) picked.push(value)
    cursor += 7
  }
  return picked
}

export function getDefaultToolboxData () {
  return {
    version: 1,
    profile: normalizeProfile(),
    templates: clone(defaultWheelTemplates),
    customTemplates: [],
    history: [],
    favorites: [],
    choiceHistory: [],
    dailyStatus: [],
    pinnedToolIds: ['daily-status', 'spin-wheel'],
    settings: normalizeSettings()
  }
}

export function normalizeToolboxData (data = {}) {
  const base = getDefaultToolboxData()
  return {
    version: 1,
    profile: normalizeProfile(data.profile),
    templates: base.templates,
    customTemplates: Array.isArray(data.customTemplates)
      ? data.customTemplates.map(normalizeTemplate).filter(Boolean)
      : [],
    history: Array.isArray(data.history)
      ? data.history.map(normalizeHistoryItem).filter(Boolean).slice(0, 60)
      : [],
    favorites: Array.isArray(data.favorites)
      ? data.favorites.map(normalizeHistoryItem).filter(Boolean).slice(0, 30)
      : [],
    choiceHistory: Array.isArray(data.choiceHistory)
      ? data.choiceHistory.map(normalizeHistoryItem).filter(Boolean).slice(0, 30)
      : [],
    dailyStatus: Array.isArray(data.dailyStatus)
      ? data.dailyStatus.filter(Boolean).slice(0, 30)
      : [],
    pinnedToolIds: Array.isArray(data.pinnedToolIds)
      ? data.pinnedToolIds.map((item) => normalizeString(item)).filter(Boolean).slice(0, 8)
      : base.pinnedToolIds,
    settings: normalizeSettings(data.settings)
  }
}

export function getStorageKey (scope = 'guest') {
  const normalized = normalizeString(scope, 'guest') || 'guest'
  return `${normalized}:${StoragePrefix}`
}

export function getToolboxData (scope = 'guest') {
  const key = getStorageKey(scope)
  if (runtimeCache.has(key)) return clone(runtimeCache.get(key))

  const raw = uni.getStorageSync(key)
  const normalized = normalizeToolboxData(raw && typeof raw === 'object' ? raw : getDefaultToolboxData())
  runtimeCache.set(key, normalized)
  return clone(normalized)
}

export function saveToolboxData (scope = 'guest', data = {}) {
  const key = getStorageKey(scope)
  const normalized = normalizeToolboxData(data)
  runtimeCache.set(key, normalized)
  uni.setStorageSync(key, normalized)
  return clone(normalized)
}

export function clearToolboxDataCache () {
  runtimeCache.clear()
}

export function clearToolboxData (scope = 'guest') {
  const key = getStorageKey(scope)
  runtimeCache.delete(key)
  uni.removeStorageSync(key)
}

export function updateToolboxData (scope = 'guest', updater = (data) => data) {
  const current = getToolboxData(scope)
  const next = typeof updater === 'function' ? updater(clone(current)) : { ...current, ...updater }
  return saveToolboxData(scope, next)
}

export function getQuickTools () {
  return clone(defaultQuickTools)
}

export function getWheelTemplates (scope = 'guest') {
  const data = getToolboxData(scope)
  return [...clone(data.templates), ...clone(data.customTemplates)]
}

export function getWheelTemplateById (scope, templateId) {
  return getWheelTemplates(scope).find((item) => item.id === templateId) || null
}

export function getDailyStatus (scope = 'guest', dateText = getTodayText()) {
  const seed = hashCode(`${normalizeString(scope, 'guest')}|${dateText}`)
  const score = 62 + (seed % 34)
  const luckyColor = pickBySeed(luckyColors, seed)
  const luckyNumber = 1 + (seed % 9)
  const luckyTime = pickBySeed(chosenTimes, seed, 2)
  const title = pickBySeed(dailyTitles, seed)
  const summary = pickBySeed(dailySummaries, seed, 1)
  const goodFor = pickUnique(dailyGoodFors, seed, 2)
  const avoid = pickBySeed(dailyAvoids, seed, 3)
  const mood = pickBySeed(moodTags, seed, 4)
  return {
    id: `${normalizeString(scope, 'guest')}-${dateText}`,
    date: dateText,
    score,
    title,
    summary,
    mood,
    luckyColor,
    luckyNumber,
    luckyTime,
    goodFor,
    avoid,
    badge: score >= 90 ? '超顺手' : score >= 82 ? '很顺' : score >= 72 ? '稳稳的' : '慢慢来'
  }
}

export function saveDailyStatus (scope = 'guest', status = getDailyStatus(scope)) {
  return updateToolboxData(scope, (data) => {
    const dailyStatus = [status, ...data.dailyStatus.filter((item) => item.id !== status.id)].slice(0, 30)
    return {
      ...data,
      dailyStatus,
      profile: {
        ...data.profile,
        lastMode: 'daily'
      }
    }
  })
}

export function getToolboxStats (scope = 'guest') {
  const data = getToolboxData(scope)
  return {
    templates: data.customTemplates.length,
    favorites: data.favorites.length,
    history: data.history.length,
    pinned: data.pinnedToolIds.length
  }
}

function appendHistory (scope, item) {
  return updateToolboxData(scope, (data) => ({
    ...data,
    history: [normalizeHistoryItem(item), ...data.history].slice(0, 60)
  }))
}

export function saveFavorite (scope = 'guest', item = {}) {
  return updateToolboxData(scope, (data) => {
    const favorite = normalizeHistoryItem({
      ...item,
      kind: 'favorite'
    })
    return {
      ...data,
      favorites: [favorite, ...data.favorites.filter((entry) => entry.id !== favorite.id)].slice(0, 30),
      history: [favorite, ...data.history].slice(0, 60)
    }
  })
}

export function togglePinnedTool (scope = 'guest', toolId) {
  return updateToolboxData(scope, (data) => {
    const next = new Set(data.pinnedToolIds)
    if (next.has(toolId)) next.delete(toolId)
    else next.add(toolId)
    return {
      ...data,
      pinnedToolIds: Array.from(next).slice(0, 8)
    }
  })
}

export function saveWheelTemplate (scope = 'guest', template = {}) {
  const normalized = normalizeTemplate(template)
  if (!normalized) throw new Error('转盘模板内容不完整')

  updateToolboxData(scope, (data) => {
    const customTemplates = [normalized, ...data.customTemplates.filter((item) => item.id !== normalized.id)].slice(0, 20)
    return {
      ...data,
      customTemplates,
      profile: {
        ...data.profile,
        lastMode: 'wheel'
      }
    }
  })

  appendHistory(scope, {
    kind: 'template',
    title: '保存了一个转盘模板',
    result: normalized.name,
    detail: `${normalized.options.length} 个选项`,
    templateId: normalized.id,
    color: normalized.accent
  })

  return normalized
}

export function deleteWheelTemplate (scope = 'guest', templateId) {
  return updateToolboxData(scope, (data) => ({
    ...data,
    customTemplates: data.customTemplates.filter((item) => item.id !== templateId)
  }))
}

export function chooseWheelOption (scope = 'guest', templateId) {
  const template = getWheelTemplateById(scope, templateId)
  if (!template) throw new Error('没有找到这个转盘模板')

  const totalWeight = template.options.reduce((sum, option) => sum + Number(option.weight || 1), 0)
  const seed = hashCode(`${normalizeString(scope, 'guest')}|${template.id}|${Date.now()}|${Math.random()}`)
  let cursor = seed % Math.max(totalWeight, 1)
  let picked = template.options[0]
  for (const option of template.options) {
    cursor -= Number(option.weight || 1)
    if (cursor < 0) {
      picked = option
      break
    }
  }

  const result = {
    id: createId('wheel'),
    kind: 'wheel',
    title: template.name,
    result: picked.label,
    detail: `${template.options.length} 个选项里转出`,
    templateId: template.id,
    color: template.accent,
    createdAt: formatDateTime(new Date())
  }

  appendHistory(scope, result)

  updateToolboxData(scope, (data) => ({
    ...data,
    profile: {
      ...data.profile,
      lastMode: 'wheel'
    }
  }))

  return result
}

export function chooseFromOptions (scope = 'guest', title, options = []) {
  const normalized = Array.isArray(options) ? options.map(normalizeOption).filter(Boolean) : []
  if (!normalized.length) throw new Error('请先填写选项')
  const seed = hashCode(`${normalizeString(scope, 'guest')}|${normalizeString(title)}|${Date.now()}`)
  const picked = normalized[seed % normalized.length]
  const result = {
    id: createId('choice'),
    kind: 'choice',
    title: normalizeString(title, '选择结果'),
    result: picked.label,
    detail: `${normalized.length} 选 1`,
    color: '#7a67f7',
    createdAt: formatDateTime(new Date())
  }
  updateToolboxData(scope, (data) => ({
    ...data,
    choiceHistory: [normalizeHistoryItem(result), ...data.choiceHistory].slice(0, 30),
    profile: {
      ...data.profile,
      lastMode: 'choice'
    }
  }))
  appendHistory(scope, result)
  return result
}

export function getRecentHistory (scope = 'guest', limit = 6) {
  const data = getToolboxData(scope)
  return data.history.slice(0, Math.max(Number(limit) || 6, 1))
}

export function getRecentFavorites (scope = 'guest', limit = 6) {
  const data = getToolboxData(scope)
  return data.favorites.slice(0, Math.max(Number(limit) || 6, 1))
}

export function getLastWheelResult (scope = 'guest') {
  const data = getToolboxData(scope)
  return data.history.find((item) => item.kind === 'wheel') || null
}

export function seedGuestProfile (scope = 'guest', nickName = '游客') {
  return updateToolboxData(scope, (data) => ({
    ...data,
    profile: {
      ...data.profile,
      nickName
    }
  }))
}
