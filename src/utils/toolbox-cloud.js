import { readCloudConfig, writeCloudConfig } from '@/api/app-cloud-config'
import {
  clearToolboxDataCache,
  getDefaultToolboxData,
  getToolboxData,
  normalizeToolboxData,
  saveToolboxData
} from '@/utils/toolbox-data'

const CloudKeySuffix = 'MiBeiHileToolboxV1'
const CloudRemark = '米贝嗨乐个人工具箱数据'

const syncCache = new Map()

function cloudKey (scope) {
  return `${String(scope || '').trim()}${CloudKeySuffix}`
}

function parseCloudValue (payload) {
  let value = payload
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    value = value.paramValue ?? value.configValue ?? value.value ?? value
  }
  if (value === null || value === undefined || value === '') {
    return { found: false, data: getDefaultToolboxData() }
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (error) {
      return { found: false, data: getDefaultToolboxData() }
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { found: true, data: normalizeToolboxData(value) }
  }
  return { found: false, data: getDefaultToolboxData() }
}

function mergeUniqueById (remote = [], local = []) {
  const map = new Map()
  ;[...remote, ...local].forEach((item) => {
    if (!item?.id) return
    map.set(item.id, item)
  })
  return Array.from(map.values())
}

function hasMeaningfulData (data = {}) {
  return Boolean(
    (Array.isArray(data.customTemplates) && data.customTemplates.length) ||
    (Array.isArray(data.history) && data.history.length) ||
    (Array.isArray(data.favorites) && data.favorites.length) ||
    (Array.isArray(data.choiceHistory) && data.choiceHistory.length)
  )
}

function mergeToolboxData (remote = getDefaultToolboxData(), local = getDefaultToolboxData()) {
  return normalizeToolboxData({
    profile: {
      ...remote.profile,
      ...local.profile
    },
    customTemplates: mergeUniqueById(remote.customTemplates, local.customTemplates),
    history: mergeUniqueById(remote.history, local.history),
    favorites: mergeUniqueById(remote.favorites, local.favorites),
    choiceHistory: mergeUniqueById(remote.choiceHistory, local.choiceHistory),
    dailyStatus: mergeUniqueById(remote.dailyStatus, local.dailyStatus),
    pinnedToolIds: Array.from(new Set([...(remote.pinnedToolIds || []), ...(local.pinnedToolIds || [])])),
    settings: {
      ...remote.settings,
      ...local.settings
    }
  })
}

export async function pushToolboxToCloud (scope, data = getToolboxData(scope)) {
  const normalizedScope = String(scope || '').trim()
  if (!normalizedScope || normalizedScope === 'guest') return data

  const prepared = normalizeToolboxData(data)
  await writeCloudConfig({
    paramKey: cloudKey(normalizedScope),
    paramValue: JSON.stringify(prepared),
    remark: CloudRemark
  })
  syncCache.set(normalizedScope, Date.now())
  return prepared
}

export async function pullToolboxFromCloud (scope) {
  const normalizedScope = String(scope || '').trim()
  if (!normalizedScope || normalizedScope === 'guest') {
    return { found: false, data: getDefaultToolboxData() }
  }
  return parseCloudValue(await readCloudConfig(cloudKey(normalizedScope)))
}

export async function syncToolboxWithCloud (scope, { force = false } = {}) {
  const normalizedScope = String(scope || '').trim()
  const local = getToolboxData(normalizedScope || 'guest')
  if (!normalizedScope || normalizedScope === 'guest') return local

  if (!force && syncCache.has(normalizedScope) && Date.now() - syncCache.get(normalizedScope) < 30000) {
    return local
  }

  const remote = await pullToolboxFromCloud(normalizedScope)
  if (remote.found) {
    const merged = mergeToolboxData(remote.data, local)
    saveToolboxData(normalizedScope, merged)
    syncCache.set(normalizedScope, Date.now())
    return merged
  }

  if (hasMeaningfulData(local)) {
    await pushToolboxToCloud(normalizedScope, local)
  }
  syncCache.set(normalizedScope, Date.now())
  return local
}

export function clearToolboxSyncCache () {
  syncCache.clear()
  clearToolboxDataCache()
}
