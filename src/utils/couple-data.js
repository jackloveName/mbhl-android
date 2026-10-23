import { readCloudConfig, writeCloudConfig } from '@/api/app-cloud-config'
import { formatDateTime, getTodayText } from '@/utils/toolbox-data'

const StoragePrefix = 'MiBeiHileCoupleV1'
const CloudKeySuffix = 'MiBeiHileCoupleV1'
const InboxKeySuffix = 'MiBeiHileCoupleInboxV1'
const RegistryKey = 'MiBeiHileCoupleRegistryV1'
const CloudRemark = '米贝嗨乐双人互动数据'

const cache = new Map()
const syncCache = new Map()
const registryCache = { value: null, ts: 0 }

const defaultWishShop = [
  { id: 'wish-massage', title: '按摩 20 分钟', cost: 100, note: '今天轮到对方放松一下。', source: 'partner' },
  { id: 'wish-ice', title: '请吃一份冰淇淋', cost: 68, note: '小小奖励，甜一下。', source: 'partner' },
  { id: 'wish-movie', title: '陪看一部电影', cost: 88, note: '把时间留给对方。', source: 'partner' },
  { id: 'wish-breakfast', title: '准备一顿早餐', cost: 120, note: '从早晨开始偏心一次。', source: 'partner' }
]

const defaultAnniversaries = [
  { id: 'anniv-001', title: '恋爱纪念日', date: '2026-09-01', note: '记得留一点仪式感。' },
  { id: 'anniv-002', title: '第一次约会', date: '2026-08-08', note: '很多故事都从这里开始。' }
]

const defaultLittleThings = [
  { id: 'little-001', title: '一起拍一张合照', bonus: 20 },
  { id: 'little-002', title: '给对方发一句夸夸', bonus: 10 },
  { id: 'little-003', title: '互相写一个小愿望', bonus: 20 },
  { id: 'little-004', title: '一起完成一次散步', bonus: 15 },
  { id: 'little-005', title: '分享今天最开心的事', bonus: 10 },
  { id: 'little-006', title: '给对方准备一杯饮品', bonus: 18 }
]

const defaultTruthLibrary = {
  sweet: [
    '最近一次心动是什么时候？',
    '如果今天只能说一句夸奖，会说什么？',
    '想给对方准备的惊喜是什么？'
  ],
  deep: [
    '你最希望我们一起改掉的一个小习惯是什么？',
    '最近一次真正被理解是什么场景？',
    '未来三个月最想一起完成的目标是什么？'
  ],
  funny: [
    '如果今天由对方做决定，你最怕哪件事？',
    '用三个词吐槽一下今天的状态。',
    '如果做一次角色互换，你会先学什么？'
  ]
}

const defaultWheelPresets = [
  {
    id: 'wheel-food',
    title: '今天吃什么',
    type: 'wheel',
    color: '#ff6f91',
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
    id: 'wheel-cook',
    title: '谁做饭',
    type: 'wheel',
    color: '#ff8a5b',
    options: [
      { id: 'c1', label: '我来做', weight: 1 },
      { id: 'c2', label: '对方来做', weight: 1 },
      { id: 'c3', label: '一起点外卖', weight: 2 },
      { id: 'c4', label: '猜拳决定', weight: 1 }
    ]
  },
  {
    id: 'wheel-date',
    title: '今晚安排',
    type: 'wheel',
    color: '#7b61ff',
    options: [
      { id: 'd1', label: '看电影', weight: 2 },
      { id: 'd2', label: '散步聊天', weight: 2 },
      { id: 'd3', label: '打游戏', weight: 1 },
      { id: 'd4', label: '早睡养精力', weight: 1 }
    ]
  }
]

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeString (value, fallback = '') {
  return String(value ?? fallback).trim()
}

function createId (prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function hashCode (text = '') {
  let hash = 0
  for (let index = 0; index < String(text).length; index += 1) {
    hash = ((hash << 5) - hash + String(text).charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function getIdentity (scope = 'guest') {
  const value = normalizeString(scope, 'guest')
  return value || 'guest'
}

function getCloudKey (scope = 'guest') {
  return `${getIdentity(scope)}${CloudKeySuffix}`
}

function getInboxKey (scope = 'guest') {
  return `${getIdentity(scope)}${InboxKeySuffix}`
}

function getRegistryStorageKey () {
  return RegistryKey
}

function normalizeWheelOption (option = {}) {
  if (typeof option === 'string') {
    return { id: createId('wheel-opt'), label: option, weight: 1 }
  }
  const label = normalizeString(option.label || option.name || option.text)
  if (!label) return null
  return {
    id: normalizeString(option.id) || createId('wheel-opt'),
    label,
    weight: Math.max(Number(option.weight || 1), 1)
  }
}

function normalizeWish (wish = {}) {
  const title = normalizeString(wish.title || wish.name)
  if (!title) return null
  return {
    id: normalizeString(wish.id) || createId('wish'),
    title,
    cost: Math.max(Number(wish.cost || 0), 0),
    note: normalizeString(wish.note),
    source: normalizeString(wish.source, 'custom'),
    createdAt: normalizeString(wish.createdAt) || formatDateTime(new Date())
  }
}

function normalizeTicket (ticket = {}) {
  const title = normalizeString(ticket.title)
  if (!title) return null
  return {
    id: normalizeString(ticket.id) || createId('ticket'),
    wishId: normalizeString(ticket.wishId),
    title,
    cost: Math.max(Number(ticket.cost || 0), 0),
    status: normalizeString(ticket.status, 'pending'),
    createdAt: normalizeString(ticket.createdAt) || formatDateTime(new Date()),
    usedAt: normalizeString(ticket.usedAt),
    source: normalizeString(ticket.source, 'partner'),
    note: normalizeString(ticket.note)
  }
}

function normalizeAnniversary (item = {}) {
  const title = normalizeString(item.title)
  if (!title) return null
  return {
    id: normalizeString(item.id) || createId('anniv'),
    title,
    date: normalizeString(item.date),
    note: normalizeString(item.note),
    checked: Boolean(item.checked),
    bonus: Math.max(Number(item.bonus || 0), 0)
  }
}

function normalizeTruth (item = {}) {
  const text = normalizeString(item.text || item.content || item.title)
  if (!text) return null
  return {
    id: normalizeString(item.id) || createId('truth'),
    text,
    category: normalizeString(item.category, 'custom'),
    createdAt: normalizeString(item.createdAt) || formatDateTime(new Date())
  }
}

function normalizePreset (preset = {}) {
  const title = normalizeString(preset.title || preset.name)
  const options = Array.isArray(preset.options)
    ? preset.options.map(normalizeWheelOption).filter(Boolean)
    : []
  if (!title || !options.length) return null
  return {
    id: normalizeString(preset.id) || createId('wheel'),
    title,
    type: normalizeString(preset.type, 'wheel'),
    color: normalizeString(preset.color, '#ff6f91'),
    options
  }
}

function normalizeProfile (profile = {}) {
  return {
    nickName: normalizeString(profile.nickName),
    avatarSeed: normalizeString(profile.avatarSeed, 'mi-bei-hai-le'),
    miBeiNo: normalizeString(profile.miBeiNo),
    bindingStatus: normalizeString(profile.bindingStatus, 'unbound'),
    partnerScope: normalizeString(profile.partnerScope),
    partnerMiBeiNo: normalizeString(profile.partnerMiBeiNo),
    partnerNickname: normalizeString(profile.partnerNickname),
    partnerAvatarSeed: normalizeString(profile.partnerAvatarSeed),
    inviteState: normalizeString(profile.inviteState, 'idle'),
    inviteId: normalizeString(profile.inviteId),
    inviteFromScope: normalizeString(profile.inviteFromScope),
    inviteFromMiBeiNo: normalizeString(profile.inviteFromMiBeiNo),
    inviteFromNickname: normalizeString(profile.inviteFromNickname),
    pendingInviteAt: normalizeString(profile.pendingInviteAt),
    boundAt: normalizeString(profile.boundAt),
    joinedAt: normalizeString(profile.joinedAt) || formatDateTime(new Date()),
    lastSeenAt: normalizeString(profile.lastSeenAt) || formatDateTime(new Date())
  }
}

function normalizeWallet (wallet = {}) {
  return {
    mine: Math.max(Number(wallet.mine ?? 520), 0),
    partner: Math.max(Number(wallet.partner ?? 520), 0),
    earned: Math.max(Number(wallet.earned ?? 0), 0),
    spent: Math.max(Number(wallet.spent ?? 0), 0),
    logs: Array.isArray(wallet.logs) ? wallet.logs.slice(0, 80) : []
  }
}

function normalizeEvents (events = {}) {
  return {
    anniversaries: Array.isArray(events.anniversaries)
      ? events.anniversaries.map(normalizeAnniversary).filter(Boolean)
      : clone(defaultAnniversaries),
    littleThings: Array.isArray(events.littleThings) && events.littleThings.length
      ? events.littleThings.map(normalizeAnniversary).filter(Boolean)
      : clone(defaultLittleThings).map(normalizeAnniversary).filter(Boolean),
    completedIds: Array.isArray(events.completedIds)
      ? events.completedIds.map((id) => normalizeString(id)).filter(Boolean).slice(0, 200)
      : [],
    streak: Math.max(Number(events.streak || 0), 0)
  }
}

function normalizeTruths (truths = {}) {
  return {
    sweet: Array.isArray(truths.sweet) && truths.sweet.length ? truths.sweet.map(normalizeString).filter(Boolean) : clone(defaultTruthLibrary.sweet),
    deep: Array.isArray(truths.deep) && truths.deep.length ? truths.deep.map(normalizeString).filter(Boolean) : clone(defaultTruthLibrary.deep),
    funny: Array.isArray(truths.funny) && truths.funny.length ? truths.funny.map(normalizeString).filter(Boolean) : clone(defaultTruthLibrary.funny),
    custom: Array.isArray(truths.custom) ? truths.custom.map(normalizeTruth).filter(Boolean).slice(0, 100) : []
  }
}

function normalizeWishes (wishes = {}) {
  return {
    shop: Array.isArray(wishes.shop) && wishes.shop.length ? wishes.shop.map(normalizeWish).filter(Boolean) : clone(defaultWishShop),
    customShop: Array.isArray(wishes.customShop) ? wishes.customShop.map(normalizeWish).filter(Boolean).slice(0, 50) : [],
    bag: Array.isArray(wishes.bag) ? wishes.bag.map(normalizeTicket).filter(Boolean).slice(0, 100) : [],
    used: Array.isArray(wishes.used) ? wishes.used.map(normalizeTicket).filter(Boolean).slice(0, 100) : [],
    history: Array.isArray(wishes.history) ? wishes.history.slice(0, 120) : []
  }
}

function normalizeDecision (decisions = {}) {
  return {
    wheelPresets: Array.isArray(decisions.wheelPresets) && decisions.wheelPresets.length
      ? decisions.wheelPresets.map(normalizePreset).filter(Boolean)
      : clone(defaultWheelPresets).map(normalizePreset).filter(Boolean),
    customPresets: Array.isArray(decisions.customPresets) ? decisions.customPresets.map(normalizePreset).filter(Boolean).slice(0, 30) : [],
    history: Array.isArray(decisions.history) ? decisions.history.slice(0, 60) : []
  }
}

function normalizeFortune (fortune = {}) {
  return {
    date: normalizeString(fortune.date),
    title: normalizeString(fortune.title),
    summary: normalizeString(fortune.summary),
    luckyColor: normalizeString(fortune.luckyColor, '#ff6f91'),
    luckyNumber: Math.max(Number(fortune.luckyNumber || 0), 0),
    luckyTime: normalizeString(fortune.luckyTime),
    vibe: normalizeString(fortune.vibe, '轻松')
  }
}

function normalizeInbox (inbox = {}) {
  return {
    items: Array.isArray(inbox.items) ? inbox.items.slice(0, 60) : [],
    updatedAt: normalizeString(inbox.updatedAt)
  }
}

function makeDefaultData () {
  return {
    version: 1,
    profile: normalizeProfile(),
    wallet: normalizeWallet(),
    wishes: normalizeWishes(),
    events: normalizeEvents(),
    truths: normalizeTruths(),
    decisions: normalizeDecision(),
    fortune: normalizeFortune(),
    inbox: normalizeInbox()
  }
}

function normalizeCloudData (data = {}) {
  const base = makeDefaultData()
  return {
    version: 1,
    profile: normalizeProfile(data.profile),
    wallet: normalizeWallet(data.wallet),
    wishes: normalizeWishes(data.wishes),
    events: normalizeEvents(data.events),
    truths: normalizeTruths(data.truths),
    decisions: normalizeDecision(data.decisions),
    fortune: normalizeFortune(data.fortune),
    inbox: normalizeInbox(data.inbox),
    templates: Array.isArray(data.templates) ? data.templates : [],
    customTemplates: Array.isArray(data.customTemplates) ? data.customTemplates : [],
    history: Array.isArray(data.history) ? data.history : [],
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    choiceHistory: Array.isArray(data.choiceHistory) ? data.choiceHistory : [],
    dailyStatus: Array.isArray(data.dailyStatus) ? data.dailyStatus : [],
    pinnedToolIds: Array.isArray(data.pinnedToolIds) ? data.pinnedToolIds : [],
    settings: data.settings || base.settings
  }
}

function cloneData (value) {
  return JSON.parse(JSON.stringify(value))
}

function mergeUniqueById (remote = [], local = []) {
  const map = new Map()
  ;[...remote, ...local].forEach((item) => {
    if (!item?.id) return
    map.set(item.id, item)
  })
  return Array.from(map.values())
}

function mergeTexts (remote = [], local = []) {
  return Array.from(new Set([...(remote || []), ...(local || [])]))
}

function mergeCoupleData (remote = makeDefaultData(), local = makeDefaultData()) {
  return normalizeCloudData({
    profile: {
      ...remote.profile,
      ...local.profile
    },
    wallet: {
      ...remote.wallet,
      ...local.wallet,
      logs: mergeUniqueById(remote.wallet.logs || [], local.wallet.logs || [])
    },
    wishes: {
      shop: mergeUniqueById(remote.wishes.shop || [], local.wishes.shop || []),
      customShop: mergeUniqueById(remote.wishes.customShop || [], local.wishes.customShop || []),
      bag: mergeUniqueById(remote.wishes.bag || [], local.wishes.bag || []),
      used: mergeUniqueById(remote.wishes.used || [], local.wishes.used || []),
      history: mergeTexts(remote.wishes.history || [], local.wishes.history || [])
    },
    events: {
      anniversaries: mergeUniqueById(remote.events.anniversaries || [], local.events.anniversaries || []),
      littleThings: mergeUniqueById(remote.events.littleThings || [], local.events.littleThings || []),
      completedIds: mergeTexts(remote.events.completedIds || [], local.events.completedIds || []),
      streak: Math.max(Number(remote.events.streak || 0), Number(local.events.streak || 0))
    },
    truths: {
      sweet: mergeTexts(remote.truths.sweet || [], local.truths.sweet || []),
      deep: mergeTexts(remote.truths.deep || [], local.truths.deep || []),
      funny: mergeTexts(remote.truths.funny || [], local.truths.funny || []),
      custom: mergeUniqueById(remote.truths.custom || [], local.truths.custom || [])
    },
    decisions: {
      wheelPresets: mergeUniqueById(remote.decisions.wheelPresets || [], local.decisions.wheelPresets || []),
      customPresets: mergeUniqueById(remote.decisions.customPresets || [], local.decisions.customPresets || []),
      history: mergeUniqueById(remote.decisions.history || [], local.decisions.history || [])
    },
    fortune: {
      ...remote.fortune,
      ...local.fortune
    },
    inbox: {
      items: mergeUniqueById(remote.inbox.items || [], local.inbox.items || []),
      updatedAt: local.inbox.updatedAt || remote.inbox.updatedAt
    }
  })
}

function normalizeRegistry (registry = {}) {
  return {
    version: 1,
    entries: registry && Array.isArray(registry.entries) ? registry.entries.slice(0, 500) : []
  }
}

function uniqueEntries (entries = []) {
  const map = new Map()
  entries.forEach((entry) => {
    if (!entry?.miBeiNo || !entry?.scope) return
    map.set(String(entry.miBeiNo), {
      miBeiNo: normalizeString(entry.miBeiNo),
      scope: normalizeString(entry.scope),
      nickName: normalizeString(entry.nickName),
      avatarSeed: normalizeString(entry.avatarSeed),
      updatedAt: normalizeString(entry.updatedAt) || formatDateTime(new Date())
    })
  })
  return Array.from(map.values())
}

async function readRegistry () {
  const now = Date.now()
  if (registryCache.value && now - registryCache.ts < 30000) {
    return registryCache.value
  }

  const raw = await readCloudConfig(getRegistryStorageKey())
  const registry = normalizeRegistry(raw && typeof raw === 'object' ? raw : { entries: [] })
  registry.entries = uniqueEntries(registry.entries)
  registryCache.value = registry
  registryCache.ts = now
  return registry
}

async function saveRegistry (registry) {
  const normalized = normalizeRegistry(registry)
  normalized.entries = uniqueEntries(normalized.entries)
  registryCache.value = normalized
  registryCache.ts = Date.now()
  await writeCloudConfig({
    paramKey: getRegistryStorageKey(),
    paramValue: JSON.stringify(normalized),
    remark: CloudRemark
  })
  return normalized
}

function pickColorFromSeed (seedText) {
  const colors = ['#ff6f91', '#ff8a5b', '#7b61ff', '#3bb7a3', '#f4b63a']
  return colors[hashCode(seedText) % colors.length]
}

function createMiBeiNo (scope) {
  return String(100000 + (hashCode(`${scope}|${Date.now()}`) % 900000))
}

function ensureProfileMiBeiNo (scope, profile) {
  const next = normalizeProfile(profile)
  if (!next.miBeiNo) {
    next.miBeiNo = createMiBeiNo(scope)
  }
  if (!next.nickName) {
    next.nickName = `米贝${next.miBeiNo.slice(-4)}`
  }
  if (!next.avatarSeed) {
    next.avatarSeed = `avatar-${next.miBeiNo}`
  }
  return next
}

async function registerIdentity (scope, profile) {
  const nextProfile = ensureProfileMiBeiNo(scope, profile)
  const registry = await readRegistry()
  const entries = registry.entries.filter((entry) => entry.scope !== scope && entry.miBeiNo !== nextProfile.miBeiNo)
  entries.unshift({
    scope,
    miBeiNo: nextProfile.miBeiNo,
    nickName: nextProfile.nickName,
    avatarSeed: nextProfile.avatarSeed,
    updatedAt: formatDateTime(new Date())
  })
  await saveRegistry({
    version: 1,
    entries
  })
  return nextProfile
}

async function resolveScopeByMiBeiNo (miBeiNo) {
  const registry = await readRegistry()
  const entry = registry.entries.find((item) => item.miBeiNo === String(miBeiNo || '').trim())
  return entry?.scope || ''
}

function getScopeKey (scope) {
  return getIdentity(scope)
}

export function getDefaultCoupleData () {
  return cloneData(makeDefaultData())
}

export function normalizeCoupleData (data = {}) {
  return mergeCoupleData(normalizeCloudData(data), makeDefaultData())
}

export function getCoupleStorageKey (scope = 'guest') {
  return `${getScopeKey(scope)}:${StoragePrefix}`
}

export function getCoupleData (scope = 'guest') {
  const key = getCoupleStorageKey(scope)
  if (cache.has(key)) return cloneData(cache.get(key))
  const raw = uni.getStorageSync(key)
  const normalized = normalizeCoupleData(raw && typeof raw === 'object' ? raw : getDefaultCoupleData())
  cache.set(key, normalized)
  return cloneData(normalized)
}

export function saveCoupleData (scope = 'guest', data = {}) {
  const key = getCoupleStorageKey(scope)
  const normalized = normalizeCoupleData(data)
  cache.set(key, normalized)
  uni.setStorageSync(key, normalized)
  return cloneData(normalized)
}

export function clearCoupleDataCache () {
  cache.clear()
  syncCache.clear()
}

export function clearCoupleData (scope = 'guest') {
  const key = getCoupleStorageKey(scope)
  cache.delete(key)
  uni.removeStorageSync(key)
}

export function updateCoupleData (scope = 'guest', updater = (data) => data) {
  const current = getCoupleData(scope)
  const next = typeof updater === 'function' ? updater(cloneData(current)) : { ...current, ...updater }
  return saveCoupleData(scope, next)
}

async function pushCoupleToCloud (scope, data) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') return data
  const prepared = normalizeCoupleData(data)
  await writeCloudConfig({
    paramKey: getCloudKey(normalizedScope),
    paramValue: JSON.stringify(prepared),
    remark: CloudRemark
  })
  syncCache.set(normalizedScope, Date.now())
  return prepared
}

async function pushInboxToCloud (scope, inbox) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') return inbox
  const prepared = normalizeInbox(inbox)
  await writeCloudConfig({
    paramKey: getInboxKey(normalizedScope),
    paramValue: JSON.stringify(prepared),
    remark: CloudRemark
  })
  return prepared
}

async function pullCoupleFromCloud (scope) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') {
    return { found: false, data: getDefaultCoupleData() }
  }

  const raw = await readCloudConfig(getCloudKey(normalizedScope))
  let value = raw
  if (value && typeof value === 'object') {
    value = value.paramValue ?? value.configValue ?? value.value ?? value
  }
  if (value === null || value === undefined || value === '') {
    return { found: false, data: getDefaultCoupleData() }
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return { found: false, data: getDefaultCoupleData() }
    }
  }
  if (value && typeof value === 'object') {
    return { found: true, data: normalizeCoupleData(value) }
  }
  return { found: false, data: getDefaultCoupleData() }
}

async function pullInboxFromCloud (scope) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') {
    return { found: false, data: normalizeInbox() }
  }

  const raw = await readCloudConfig(getInboxKey(normalizedScope))
  let value = raw
  if (value && typeof value === 'object') {
    value = value.paramValue ?? value.configValue ?? value.value ?? value
  }
  if (value === null || value === undefined || value === '') {
    return { found: false, data: normalizeInbox() }
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return { found: false, data: normalizeInbox() }
    }
  }
  if (value && typeof value === 'object') {
    return { found: true, data: normalizeInbox(value) }
  }
  return { found: false, data: normalizeInbox() }
}

export async function syncCoupleWithCloud (scope, { force = false } = {}) {
  const normalizedScope = getScopeKey(scope)
  const local = getCoupleData(normalizedScope || 'guest')
  if (!normalizedScope || normalizedScope === 'guest') return local

  const cachedAt = syncCache.get(normalizedScope) || 0
  if (!force && cachedAt && Date.now() - cachedAt < 30000) {
    return local
  }

  const [remote, inbox] = await Promise.all([
    pullCoupleFromCloud(normalizedScope),
    pullInboxFromCloud(normalizedScope)
  ])

  let merged = local
  if (remote.found) {
    merged = mergeCoupleData(remote.data, merged)
  }
  if (inbox.found && Array.isArray(inbox.data.items) && inbox.data.items.length) {
    merged = updateCoupleData(normalizedScope, (data) => ({
      ...data,
      inbox: {
        items: mergeUniqueById(inbox.data.items, data.inbox.items || []),
        updatedAt: formatDateTime(new Date())
      },
      profile: {
        ...data.profile,
        inviteState: data.profile.inviteState === 'bound' ? 'bound' : 'pending'
      }
    }))
  }

  merged.profile = await registerIdentity(normalizedScope, merged.profile)
  merged.profile.lastSeenAt = formatDateTime(new Date())
  saveCoupleData(normalizedScope, merged)
  await pushCoupleToCloud(normalizedScope, merged)
  syncCache.set(normalizedScope, Date.now())

  return merged
}

export function getCoupleProfile (scope = 'guest') {
  return getCoupleData(scope).profile
}

export function getCoupleSummary (scope = 'guest') {
  const data = getCoupleData(scope)
  const profile = data.profile || {}
  return {
    miBeiNo: profile.miBeiNo,
    nickName: profile.nickName || '米贝用户',
    avatarSeed: profile.avatarSeed,
    bindingStatus: profile.bindingStatus || 'unbound',
    partnerNickname: profile.partnerNickname || '',
    partnerMiBeiNo: profile.partnerMiBeiNo || '',
    partnerAvatarSeed: profile.partnerAvatarSeed || '',
    partnerScope: profile.partnerScope || '',
    walletMine: data.wallet.mine,
    walletPartner: data.wallet.partner,
    earned: data.wallet.earned,
    spent: data.wallet.spent,
    inviteState: profile.inviteState || 'idle',
    pendingInviteCount: data.inbox.items.length,
    completedCount: data.events.completedIds.length,
    streak: data.events.streak
  }
}

export function getFortune (scope = 'guest', dateText = getTodayText()) {
  const seed = hashCode(`${getScopeKey(scope)}|${dateText}`)
  // 恋爱运那一套已经下线，这里只留中立的状态文案（旧的调用点也都拆掉了）
  const titles = ['今天会很顺', '状态在线', '适合轻松一局', '先决定再行动', '来点轻松互动']
  const summaries = [
    '今天特别适合把纠结交给工具，留点耐心给对方。',
    '小决定交给转盘，大一点的决定交给默契。',
    '今天很适合发起一次互动，让气氛更轻一点。',
    '你的状态不错，安排一次双人小任务会很加分。',
    '今天适合先玩，再做事。'
  ]
  const luckyTimes = ['09:20', '11:11', '13:14', '18:08', '21:00']
  const colors = ['#ff6f91', '#ff8a5b', '#7b61ff', '#f2b844', '#3bb7a3']
  return {
    date: dateText,
    title: titles[seed % titles.length],
    summary: summaries[seed % summaries.length],
    luckyColor: colors[seed % colors.length],
    luckyNumber: 1 + (seed % 9),
    luckyTime: luckyTimes[(seed + 2) % luckyTimes.length],
    vibe: ['轻松', '甜一点', '偏暖', '要行动', '适合试试'][seed % 5]
  }
}

export function saveFortune (scope = 'guest', fortune = getFortune(scope)) {
  return updateCoupleData(scope, (data) => ({
    ...data,
    fortune
  }))
}

export function getWheelPresets (scope = 'guest') {
  const data = getCoupleData(scope)
  return [...clone(data.decisions.wheelPresets), ...clone(data.decisions.customPresets)]
}

export function getWheelPresetById (scope = 'guest', presetId) {
  return getWheelPresets(scope).find((item) => item.id === presetId) || null
}

function pickWeightedOption (options = [], seedText = '') {
  const list = Array.isArray(options) ? options.filter(Boolean) : []
  const totalWeight = list.reduce((sum, option) => sum + Math.max(Number(option.weight || 1), 1), 0)
  if (!list.length || totalWeight <= 0) return null
  let cursor = hashCode(seedText) % totalWeight
  for (const option of list) {
    cursor -= Math.max(Number(option.weight || 1), 1)
    if (cursor < 0) return option
  }
  return list[0]
}

export function spinDecisionWheel (scope = 'guest', presetId) {
  const preset = getWheelPresetById(scope, presetId)
  if (!preset) throw new Error('没有找到这个转盘')
  const picked = pickWeightedOption(preset.options, `${getScopeKey(scope)}|${presetId}|${Date.now()}|${Math.random()}`)
  const result = {
    id: createId('wheel-spin'),
    kind: 'wheel',
    title: preset.title,
    result: picked?.label || '未抽中',
    detail: `${preset.options.length} 个选项`,
    color: preset.color || '#ff6f91',
    createdAt: formatDateTime(new Date()),
    presetId: preset.id
  }

  updateCoupleData(scope, (data) => ({
    ...data,
    decisions: {
      ...data.decisions,
      history: [result, ...data.decisions.history].slice(0, 60)
    }
  }))

  return result
}

export function saveWheelPreset (scope = 'guest', preset = {}) {
  const normalized = normalizePreset(preset)
  if (!normalized) throw new Error('转盘内容不完整')
  updateCoupleData(scope, (data) => ({
    ...data,
    decisions: {
      ...data.decisions,
      customPresets: [normalized, ...data.decisions.customPresets.filter((item) => item.id !== normalized.id)].slice(0, 30)
    }
  }))
  return normalized
}

export function deleteWheelPreset (scope = 'guest', presetId) {
  updateCoupleData(scope, (data) => ({
    ...data,
    decisions: {
      ...data.decisions,
      customPresets: data.decisions.customPresets.filter((item) => item.id !== presetId)
    }
  }))
}

export function getTruthCategories () {
  return [
    { id: 'sweet', title: '甜蜜' },
    { id: 'deep', title: '深度沟通' },
    { id: 'funny', title: '趣味恶搞' },
    { id: 'custom', title: '私密词条' }
  ]
}

export function getTruthPool (scope = 'guest') {
  const data = getCoupleData(scope)
  return {
    sweet: clone(data.truths.sweet),
    deep: clone(data.truths.deep),
    funny: clone(data.truths.funny),
    custom: clone(data.truths.custom)
  }
}

export function drawTruth (scope = 'guest', category = 'sweet') {
  const pool = getTruthPool(scope)[category] || getTruthPool(scope).sweet
  if (!pool.length) throw new Error('词库还没有内容')
  const index = hashCode(`${getScopeKey(scope)}|${category}|${Date.now()}|${Math.random()}`) % pool.length
  const text = typeof pool[index] === 'string' ? pool[index] : pool[index]?.text
  const result = {
    id: createId('truth-pick'),
    kind: 'truth',
    title: getTruthCategories().find((item) => item.id === category)?.title || '真心话',
    result: normalizeString(text),
    detail: category,
    createdAt: formatDateTime(new Date())
  }

  updateCoupleData(scope, (data) => ({
    ...data,
    decisions: {
      ...data.decisions,
      history: [result, ...data.decisions.history].slice(0, 60)
    }
  }))

  return result
}

export function saveCustomTruth (scope = 'guest', category, text) {
  const item = normalizeTruth({ text, category })
  if (!item) throw new Error('请输入真心话内容')
  updateCoupleData(scope, (data) => ({
    ...data,
    truths: {
      ...data.truths,
      custom: [item, ...data.truths.custom].slice(0, 100)
    }
  }))
  return item
}

export function getWishStore (scope = 'guest') {
  const data = getCoupleData(scope)
  const partnerScope = data.profile.partnerScope
  const partnerData = partnerScope ? getCoupleData(partnerScope) : null
  const shop = partnerData?.wishes.customShop?.length
    ? partnerData.wishes.customShop
    : data.wishes.shop
  return clone(shop)
}

export function getWishBag (scope = 'guest') {
  return clone(getCoupleData(scope).wishes.bag)
}

export function getWishUsed (scope = 'guest') {
  return clone(getCoupleData(scope).wishes.used)
}

export function createWish (scope = 'guest', wish = {}) {
  const normalized = normalizeWish(wish)
  if (!normalized) throw new Error('愿望内容不能为空')
  normalized.source = 'me'
  updateCoupleData(scope, (data) => ({
    ...data,
    wishes: {
      ...data.wishes,
      customShop: [normalized, ...data.wishes.customShop.filter((item) => item.id !== normalized.id)].slice(0, 50)
    }
  }))
  return normalized
}

export function exchangeWish (scope = 'guest', wishId) {
  const data = getCoupleData(scope)
  const shop = getWishStore(scope)
  const wish = shop.find((item) => item.id === wishId)
  if (!wish) throw new Error('没有找到这个愿望')
  if (data.wallet.mine < Number(wish.cost || 0)) throw new Error('米贝余额不足')

  const ticket = {
    id: createId('ticket'),
    wishId: wish.id,
    title: wish.title,
    cost: Number(wish.cost || 0),
    status: 'pending',
    createdAt: formatDateTime(new Date()),
    source: 'partner',
    note: wish.note || '',
    ownerScope: getScopeKey(scope),
    partnerScope: data.profile.partnerScope || ''
  }

  updateCoupleData(scope, (current) => ({
    ...current,
    wallet: {
      ...current.wallet,
      mine: Math.max(current.wallet.mine - ticket.cost, 0),
      spent: current.wallet.spent + ticket.cost,
      logs: [
        { id: createId('log'), type: 'spend', title: `兑换 ${wish.title}`, cost: ticket.cost, createdAt: formatDateTime(new Date()) },
        ...current.wallet.logs
      ].slice(0, 80)
    },
    wishes: {
      ...current.wishes,
      bag: [ticket, ...current.wishes.bag].slice(0, 100)
    }
  }))

  if (data.profile.partnerScope) {
    updateInbox(data.profile.partnerScope, (box) => ({
      ...box,
      items: [
        {
          id: createId('inbox'),
          type: 'wish-exchange',
          title: '有一张愿望券被兑换了',
          result: wish.title,
          detail: `消耗 ${ticket.cost} 米贝`,
          createdAt: formatDateTime(new Date()),
          ticketId: ticket.id,
          fromScope: getScopeKey(scope)
        },
        ...box.items
      ].slice(0, 60),
      updatedAt: formatDateTime(new Date())
    }))
  }

  return ticket
}

export function useWishTicket (scope = 'guest', ticketId) {
  const current = getCoupleData(scope)
  const ticket = current.wishes.bag.find((item) => item.id === ticketId)
  const next = updateCoupleData(scope, (data) => {
    const bag = data.wishes.bag.map((item) => {
      if (item.id !== ticketId) return item
      return {
        ...item,
        status: 'used',
        usedAt: formatDateTime(new Date())
      }
    })
    const usedItem = bag.find((item) => item.id === ticketId)
    const used = usedItem ? [usedItem, ...data.wishes.used.filter((item) => item.id !== usedItem.id)].slice(0, 100) : data.wishes.used
    return {
      ...data,
      wishes: {
        ...data.wishes,
        bag,
        used
      }
    }
  })

  if (ticket?.partnerScope) {
    updateInbox(ticket.partnerScope, (box) => ({
      ...box,
      items: [
        {
          id: createId('reminder'),
          type: 'wish-used',
          title: '愿望券已履约',
          result: ticket.title,
          detail: '对方已确认使用，米贝券生效。',
          createdAt: formatDateTime(new Date()),
          ticketId: ticket.id,
          fromScope: getScopeKey(scope)
        },
        ...box.items
      ].slice(0, 60),
      updatedAt: formatDateTime(new Date())
    }))
  }

  return next
}

export function earnMibe (scope = 'guest', amount = 0, reason = '') {
  const value = Math.max(Number(amount || 0), 0)
  if (!value) return
  updateCoupleData(scope, (current) => ({
    ...current,
    wallet: {
      ...current.wallet,
      mine: current.wallet.mine + value,
      earned: current.wallet.earned + value,
      logs: [
        { id: createId('log'), type: 'earn', title: reason || '获得米贝', cost: value, createdAt: formatDateTime(new Date()) },
        ...current.wallet.logs
      ].slice(0, 80)
    }
  }))
}

export function toggleLittleThing (scope = 'guest', eventId) {
  return updateCoupleData(scope, (current) => {
    const done = new Set(current.events.completedIds)
    const existed = done.has(eventId)
    if (existed) {
      done.delete(eventId)
    } else {
      done.add(eventId)
    }
    const bonus = current.events.littleThings.find((item) => item.id === eventId)?.bonus || 0
    const nextWallet = existed
      ? current.wallet
      : {
          ...current.wallet,
          mine: current.wallet.mine + bonus,
          earned: current.wallet.earned + bonus,
          logs: [
            { id: createId('log'), type: 'earn', title: '完成百件小事', cost: bonus, createdAt: formatDateTime(new Date()) },
            ...current.wallet.logs
          ].slice(0, 80)
        }
    return {
      ...current,
      wallet: nextWallet,
      events: {
        ...current.events,
        completedIds: Array.from(done),
        streak: existed ? Math.max(current.events.streak - 1, 0) : current.events.streak + 1
      }
    }
  })
}

export function getEventOverview (scope = 'guest') {
  const data = getCoupleData(scope)
  return {
    anniversaries: clone(data.events.anniversaries),
    littleThings: clone(data.events.littleThings),
    completedIds: clone(data.events.completedIds),
    streak: data.events.streak
  }
}

export function getNextAnniversary (scope = 'guest') {
  const anniversaries = getEventOverview(scope).anniversaries
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const list = anniversaries
    .map((item) => {
      const target = new Date(`${item.date}T00:00:00`)
      if (Number.isNaN(target.getTime())) return null
      const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
      return { ...item, diff }
    })
    .filter(Boolean)
    .sort((a, b) => a.diff - b.diff)
  return list[0] || null
}

export function setBindingInvite (scope = 'guest', partnerMiBeiNo = '', note = '') {
  return updateCoupleData(scope, (current) => ({
    ...current,
    profile: {
      ...current.profile,
      partnerMiBeiNo: normalizeString(partnerMiBeiNo),
      inviteState: 'pending',
      inviteId: createId('invite'),
      inviteFromScope: getScopeKey(scope),
      inviteFromMiBeiNo: current.profile.miBeiNo,
      inviteFromNickname: current.profile.nickName,
      pendingInviteAt: formatDateTime(new Date())
    }
  }))
}

async function updateInbox (scope, updater) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') return normalizeInbox()
  const current = normalizeInbox((await pullInboxFromCloud(normalizedScope)).data)
  const next = typeof updater === 'function' ? updater(cloneData(current)) : { ...current, ...updater }
  await pushInboxToCloud(normalizedScope, next)
  return next
}

export async function sendBindingInvite (scope = 'guest', partnerMiBeiNo = '', message = '') {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') throw new Error('游客模式不能绑定账号')

  const partnerScope = await resolveScopeByMiBeiNo(partnerMiBeiNo)
  if (!partnerScope) throw new Error('没有找到这个米贝号')
  if (partnerScope === normalizedScope) throw new Error('不能绑定自己')

  const local = updateCoupleData(normalizedScope, (current) => ({
    ...current,
    profile: {
      ...current.profile,
      partnerScope,
      partnerMiBeiNo: normalizeString(partnerMiBeiNo),
      inviteState: 'pending',
      inviteId: createId('invite'),
      inviteFromScope: normalizedScope,
      inviteFromMiBeiNo: current.profile.miBeiNo,
      inviteFromNickname: current.profile.nickName,
      pendingInviteAt: formatDateTime(new Date())
    }
  }))

  await updateInbox(partnerScope, (box) => ({
    ...box,
    items: [
      {
        id: createId('invite'),
        type: 'binding-invite',
        title: '有一个 CP 邀请',
        result: local.profile.nickName || '米贝用户',
        detail: message || `对方米贝号：${local.profile.miBeiNo}`,
        createdAt: formatDateTime(new Date()),
        fromScope: normalizedScope,
        fromMiBeiNo: local.profile.miBeiNo,
        fromNickname: local.profile.nickName,
        note: message || ''
      },
      ...box.items
    ].slice(0, 60),
    updatedAt: formatDateTime(new Date())
  }))

  await pushCoupleToCloud(normalizedScope, local)
  return local
}

export async function acceptBindingInvite (scope = 'guest', invite = {}) {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') throw new Error('游客模式不能绑定账号')

  const partnerScope = normalizeString(invite.fromScope)
  if (!partnerScope) throw new Error('邀请信息缺失')

  const current = updateCoupleData(normalizedScope, (data) => ({
    ...data,
    profile: {
      ...data.profile,
      bindingStatus: 'bound',
      partnerScope,
      partnerMiBeiNo: normalizeString(invite.fromMiBeiNo),
      partnerNickname: normalizeString(invite.fromNickname),
      partnerAvatarSeed: pickColorFromSeed(invite.fromMiBeiNo || partnerScope),
      inviteState: 'bound',
      inviteId: normalizeString(invite.id),
      inviteFromScope: partnerScope,
      inviteFromMiBeiNo: normalizeString(invite.fromMiBeiNo),
      inviteFromNickname: normalizeString(invite.fromNickname),
      pendingInviteAt: '',
      boundAt: formatDateTime(new Date())
    },
    wallet: {
      ...data.wallet,
      partner: data.wallet.partner
    }
  }))

  const partnerData = updateCoupleData(partnerScope, (data) => ({
    ...data,
    profile: {
      ...data.profile,
      bindingStatus: 'bound',
      partnerScope: normalizedScope,
      partnerMiBeiNo: current.profile.miBeiNo,
      partnerNickname: current.profile.nickName,
      partnerAvatarSeed: current.profile.avatarSeed,
      inviteState: 'bound',
      inviteId: normalizeString(invite.id),
      inviteFromScope: normalizedScope,
      inviteFromMiBeiNo: current.profile.miBeiNo,
      inviteFromNickname: current.profile.nickName,
      pendingInviteAt: '',
      boundAt: formatDateTime(new Date())
    }
  }))

  await pushCoupleToCloud(normalizedScope, current)
  await pushCoupleToCloud(partnerScope, partnerData)
  await updateInbox(normalizedScope, (box) => ({
    ...box,
    items: box.items.filter((item) => item.id !== invite.id),
    updatedAt: formatDateTime(new Date())
  }))

  return current
}

export async function unbindPartner (scope = 'guest') {
  const normalizedScope = getScopeKey(scope)
  if (!normalizedScope || normalizedScope === 'guest') return getCoupleData(normalizedScope)
  const current = getCoupleData(normalizedScope)
  const partnerScope = current.profile.partnerScope
  const next = updateCoupleData(normalizedScope, (data) => ({
    ...data,
    profile: {
      ...data.profile,
      bindingStatus: 'unbound',
      partnerScope: '',
      partnerMiBeiNo: '',
      partnerNickname: '',
      partnerAvatarSeed: '',
      inviteState: 'idle',
      inviteId: '',
      inviteFromScope: '',
      inviteFromMiBeiNo: '',
      inviteFromNickname: '',
      pendingInviteAt: '',
      boundAt: '',
      updatedAt: formatDateTime(new Date())
    }
  }))

  if (partnerScope) {
    const partnerData = updateCoupleData(partnerScope, (data) => ({
      ...data,
      profile: {
        ...data.profile,
        bindingStatus: 'unbound',
        partnerScope: '',
        partnerMiBeiNo: '',
        partnerNickname: '',
        partnerAvatarSeed: '',
        inviteState: 'idle',
        inviteId: '',
        inviteFromScope: '',
        inviteFromMiBeiNo: '',
        inviteFromNickname: '',
        pendingInviteAt: '',
        boundAt: '',
        updatedAt: formatDateTime(new Date())
      }
    }))
    await pushCoupleToCloud(partnerScope, partnerData)
  }

  await pushCoupleToCloud(normalizedScope, next)
  return next
}

export function getIncomingInvites (scope = 'guest') {
  return clone(getCoupleData(scope).inbox.items)
}

export function setPartnerWallet (scope = 'guest', value = 0) {
  updateCoupleData(scope, (data) => ({
    ...data,
    wallet: {
      ...data.wallet,
      partner: Math.max(Number(value || 0), 0)
    }
  }))
}
