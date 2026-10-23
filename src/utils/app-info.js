/** 拿不到运行环境信息时的兜底应用名 */
const FALLBACK_APP_NAME = '米贝嗨乐'

/** 按可靠性依次尝试：App 基础信息 → 系统信息 */
const APP_NAME_READERS = [
  () => uni.getAppBaseInfo?.()?.appName,
  () => uni.getSystemInfoSync?.()?.appName
]

export function getRuntimeAppName () {
  for (let i = 0; i < APP_NAME_READERS.length; i += 1) {
    try {
      const name = APP_NAME_READERS[i]()
      if (name) return name
    } catch (error) {}
  }

  return FALLBACK_APP_NAME
}
