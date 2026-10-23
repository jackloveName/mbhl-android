/*
 * 记录同步队列。
 *
 * 钱包和玩法数据每次改动都会来这里登记一下，由云端模块注册的处理函数
 * 防抖推送上去。这样 wallet / play-data 不用反向 import 云端逻辑，
 * 避免两个模块互相 import 成环。
 */

let handler = null
let timer = null
let pendingScope = ''

/** 由 records-cloud 在加载时注册真正的推送函数 */
export function registerRecordsSyncHandler (fn) {
  handler = typeof fn === 'function' ? fn : null
}

function runPending () {
  const scope = pendingScope
  timer = null
  pendingScope = ''
  if (!handler || !scope) return Promise.resolve()
  return Promise.resolve(handler(scope)).catch(() => {})
}

/** 登记「这个账号的数据变了」，短时间内的多次改动合并成一次推送 */
export function scheduleRecordsSync (scope = '') {
  const normalized = String(scope || '').trim()
  if (!handler || !normalized || normalized === 'guest') return
  pendingScope = normalized
  if (timer) clearTimeout(timer)
  timer = setTimeout(runPending, 400)
}

/** 有攒着的改动就立刻推一次（退出登录、退出应用前用） */
export function flushRecordsSync () {
  if (timer) clearTimeout(timer)
  return runPending()
}

export function hasPendingRecordsSync () {
  return Boolean(timer)
}
