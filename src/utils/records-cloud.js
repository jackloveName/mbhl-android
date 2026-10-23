/*
 * 米贝与玩法记录的云端存储。
 *
 * 登录账号的账本（米贝余额 + 流水）和玩法数据（自定义转盘、自定义签、
 * 骰子数量、玩过的记录）都存在账号名下，换设备登录照样在。
 * 游客只有本地这一份，不会碰云端。
 *
 * 冲突处理：两边都有数据时看 updatedAt，谁新用谁；
 * 本地没改过（新设备、见面礼还没动过）就一律以云端为准。
 */
import { readCloudConfig, writeCloudConfig } from '@/api/app-cloud-config'
import { applyPlayDataFromCloud, getPlayData } from '@/utils/play-data'
import { applyWalletSnapshot, getWalletSnapshot } from '@/utils/wallet'
import { registerRecordsSyncHandler } from '@/utils/records-sync-queue'

const CloudKeySuffix = 'MiBeiHileRecordsV1'
const CloudRemark = '米贝嗨乐米贝与玩法记录'
/** 同一账号多久之内不重复拉取云端 */
const SyncInterval = 30000

const syncCache = new Map()

function normalizeScope (scope) {
  const value = String(scope || '').trim()
  return value && value !== 'guest' ? value : ''
}

function cloudKey (scope) {
  return `${scope}${CloudKeySuffix}`
}

/** 后端可能给对象、也可能给 JSON 字符串，统一解析成记录对象 */
function parseCloudValue (payload) {
  let value = payload
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    value = value.paramValue ?? value.configValue ?? value.value ?? value
  }
  if (value === null || value === undefined || value === '') {
    return { found: false, records: null }
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return { found: false, records: null }
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { found: true, records: value }
  }
  return { found: false, records: null }
}

/** 本地这份记录最后一次改动的时间 */
function readLocalUpdatedAt (scope) {
  const wallet = getWalletSnapshot(scope)
  const play = getPlayData(scope)
  return Math.max(Number(wallet?.updatedAt) || 0, Number(play?.updatedAt) || 0)
}

function buildRecords (scope) {
  const wallet = getWalletSnapshot(scope)
  const play = getPlayData(scope)
  return {
    wallet,
    play,
    updatedAt: Math.max(Number(wallet?.updatedAt) || 0, Number(play?.updatedAt) || 0)
  }
}

/** 把本地这份推到云端 */
export async function pushRecordsToCloud (scope) {
  const target = normalizeScope(scope)
  if (!target) return null

  const records = buildRecords(target)
  await writeCloudConfig({
    paramKey: cloudKey(target),
    paramValue: JSON.stringify(records),
    remark: CloudRemark
  })
  syncCache.set(target, Date.now())
  return records
}

/**
 * 开始同步：云端更新就用云端，否则把本地推上去。
 * 返回 true 表示这次采用了云端数据（调用方可以据此刷新界面）。
 */
export async function syncRecordsWithCloud (scope, { force = false } = {}) {
  const target = normalizeScope(scope)
  if (!target) return false

  if (!force && syncCache.has(target) && Date.now() - syncCache.get(target) < SyncInterval) {
    return false
  }

  let remote = { found: false, records: null }
  try {
    remote = parseCloudValue(await readCloudConfig(cloudKey(target)))
  } catch (error) {
    // 云端读不到就先按本地用，等下次有网再同步
    return false
  }

  const remoteStamp = Number(remote.records?.updatedAt) || 0
  const localStamp = readLocalUpdatedAt(target)

  if (remote.found && remoteStamp >= localStamp) {
    if (remote.records.wallet) applyWalletSnapshot(target, remote.records.wallet)
    if (remote.records.play) applyPlayDataFromCloud(target, remote.records.play)
    syncCache.set(target, Date.now())
    return true
  }

  await pushRecordsToCloud(target)
  return false
}

export function clearRecordsSyncCache () {
  syncCache.clear()
}

// 钱包 / 玩法数据一改就自动往云端推
registerRecordsSyncHandler(pushRecordsToCloud)
