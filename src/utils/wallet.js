/**
 * 米贝钱包。
 *
 * 规则：
 * - 游客没有米贝：余额恒为 0，收入和支出都会被拒绝（用来把「登录」变成有实际好处的事）。
 * - 登录用户开局送一笔见面礼，之后靠玩大转盘 / 摇签筒 / 掷骰子一点点攒，
 *   再用米贝兑换刮刮乐这类玩法。
 * - 以后新增的米贝兑换物（皮肤、道具……）都走 spendMibe，
 *   不用再各自写一套余额逻辑。
 * - 登录账号的账本会同步到云端（见 utils/records-cloud.js），
 *   本地这份只是缓存，换设备登录也拿得回来。
 */

import { scheduleRecordsSync } from '@/utils/records-sync-queue'

const WALLET_KEY = 'MiBeiHileWalletV1'
const GUEST_FREE_KEY = 'MiBeiHileGuestScratchV1'
export const GUEST_SCOPE = 'guest'
/** 新账号见面礼 */
export const SIGN_UP_BONUS = 100
/** 玩一次免费玩法（转盘 / 签筒 / 骰子）给的米贝 */
export const PLAY_REWARD = 1
/** 游客可以免费刮的次数（刮完想继续就得登录） */
export const GUEST_FREE_SCRATCH = 1

function formatNow () {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function createId (prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function readAll () {
  try {
    return uni.getStorageSync(WALLET_KEY) || {}
  } catch (error) {
    return {}
  }
}

function writeAll (map) {
  try {
    uni.setStorageSync(WALLET_KEY, map)
  } catch (error) {
    // 存储失败不影响本次会话
  }
}

/** 账本改动后登记一次云端同步（游客会被队列直接忽略） */
function markChanged (scope) {
  scheduleRecordsSync(scope)
}

export function isGuestScope (scope = GUEST_SCOPE) {
  return !scope || String(scope) === GUEST_SCOPE
}

function readGuestUsed () {
  try {
    return Math.max(0, Number(uni.getStorageSync(GUEST_FREE_KEY)) || 0)
  } catch (error) {
    return 0
  }
}

/** 游客还剩几次免费刮（只对游客有意义，登录用户返回 0） */
export function getFreeScratchLeft (scope = GUEST_SCOPE) {
  if (!isGuestScope(scope)) return 0
  return Math.max(0, GUEST_FREE_SCRATCH - readGuestUsed())
}

/** 用掉一次游客免费刮；没有次数了返回 false */
export function useFreeScratch (scope = GUEST_SCOPE) {
  if (!isGuestScope(scope)) return false
  if (getFreeScratchLeft(scope) <= 0) return false
  try {
    uni.setStorageSync(GUEST_FREE_KEY, readGuestUsed() + 1)
  } catch (error) {
    // 存不下也不拦着玩，本次照常
  }
  return true
}

/** 读余额：游客永远 0，登录用户第一次读会拿到见面礼 */
export function getWallet (scope = GUEST_SCOPE) {
  if (isGuestScope(scope)) {
    return { scope: GUEST_SCOPE, guest: true, balance: 0, logs: [] }
  }
  const map = readAll()
  let entry = map[scope]
  if (!entry) {
    /*
     * 新账号的见面礼先只落在本地，updatedAt 保持 0：
     * 这样换设备登录时，云端那份更新过的账本会盖过这份初始账本，
     * 不会出现「新设备又发一次见面礼」。
     */
    entry = {
      balance: SIGN_UP_BONUS,
      updatedAt: 0,
      logs: [{
        id: createId('log'),
        type: 'earn',
        title: '注册见面礼',
        value: SIGN_UP_BONUS,
        createdAt: formatNow()
      }]
    }
    map[scope] = entry
    writeAll(map)
  }
  return {
    scope,
    guest: false,
    balance: Math.max(0, Number(entry.balance) || 0),
    logs: Array.isArray(entry.logs) ? entry.logs : [],
    updatedAt: Number(entry.updatedAt) || 0
  }
}

export function canAfford (scope, amount) {
  if (isGuestScope(scope)) return false
  return getWallet(scope).balance >= Math.max(0, Math.round(Number(amount) || 0))
}

function pushLog (entry, type, title, value) {
  return {
    ...entry,
    // 记账时间就是这份账本的版本号，云端同步靠它判断谁更新
    updatedAt: Date.now(),
    logs: [
      { id: createId('log'), type, title, value, createdAt: formatNow() },
      ...(entry.logs || [])
    ].slice(0, 100)
  }
}

/** 花米贝。余额不足或游客身份会抛错，调用方拿去弹提示。 */
export function spendMibe (scope, amount, title = '兑换') {
  const value = Math.max(0, Math.round(Number(amount) || 0))
  if (isGuestScope(scope)) throw new Error('游客模式没有米贝，登录后才能兑换')
  if (!value) return getWallet(scope)
  const map = readAll()
  const entry = map[scope] || { balance: SIGN_UP_BONUS, logs: [] }
  if ((Number(entry.balance) || 0) < value) {
    throw new Error(`米贝不够，还差 ${value - (Number(entry.balance) || 0)} 米贝`)
  }
  const next = pushLog({ ...entry, balance: (Number(entry.balance) || 0) - value }, 'spend', title, -value)
  map[scope] = next
  writeAll(map)
  markChanged(scope)
  return getWallet(scope)
}

/** 赚米贝。游客直接忽略（不写账，也不报错）。 */
export function earnMibe (scope, amount, title = '获得米贝') {
  const value = Math.max(0, Math.round(Number(amount) || 0))
  if (isGuestScope(scope) || !value) return getWallet(scope)
  const map = readAll()
  const entry = map[scope] || { balance: SIGN_UP_BONUS, logs: [] }
  const next = pushLog({ ...entry, balance: (Number(entry.balance) || 0) + value }, 'earn', title, value)
  map[scope] = next
  writeAll(map)
  markChanged(scope)
  return getWallet(scope)
}

/** 玩免费玩法的一次小奖励，顺手记一笔 */
export function rewardPlay (scope, title = '玩了一局') {
  return earnMibe(scope, PLAY_REWARD, title)
}

export function clearWallet (scope = GUEST_SCOPE) {
  if (isGuestScope(scope)) return
  const map = readAll()
  delete map[scope]
  writeAll(map)
  markChanged(scope)
}

/** 云端同步用：账本快照（游客没有账本，返回 null） */
export function getWalletSnapshot (scope = GUEST_SCOPE) {
  if (isGuestScope(scope)) return null
  const map = readAll()
  const entry = map[scope]
  if (!entry) return null
  return {
    balance: Math.max(0, Number(entry.balance) || 0),
    logs: Array.isArray(entry.logs) ? entry.logs.slice(0, 100) : [],
    updatedAt: Number(entry.updatedAt) || 0
  }
}

/**
 * 用云端账本覆盖本地这一份（不会触发回推，避免来回打架）。
 * 本地没有账本时也要写：这样换设备登录能看到云端的余额和流水。
 */
export function applyWalletSnapshot (scope = GUEST_SCOPE, snapshot = null) {
  if (isGuestScope(scope) || !snapshot) return
  const map = readAll()
  map[scope] = {
    balance: Math.max(0, Number(snapshot.balance) || 0),
    logs: Array.isArray(snapshot.logs) ? snapshot.logs.slice(0, 100) : [],
    updatedAt: Number(snapshot.updatedAt) || Date.now()
  }
  writeAll(map)
}
