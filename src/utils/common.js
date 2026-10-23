import { getRuntimeAppName } from '@/utils/app-info'

/** 米贝嗨乐的对话框主色，跟主题的胭脂粉一致 */
const CONFIRM_COLOR = '#ff6f91'

/** 轻提示，默认不报错图标 */
export function toast (title, icon = 'none') {
  uni.showToast({
    title,
    icon,
    duration: 1800
  })
}

/** 二次确认，返回 { confirm, cancel }，失败也按“取消”处理，避免调用方悬挂 */
export function showConfirm (content, title = getRuntimeAppName(), options = {}) {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      confirmColor: options.confirmColor || CONFIRM_COLOR,
      success: resolve,
      fail: () => resolve({ confirm: false, cancel: true })
    })
  })
}

function encodePair (key, value) {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
}

/** 空值（undefined / null / ''）不上参数，对象按 key[child] 展开一层 */
function collectPairs (params = {}) {
  const pairs = []

  Object.keys(params).forEach((propName) => {
    const value = params[propName]
    if (value === undefined || value === null || value === '') return

    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(value).forEach((key) => {
        const nested = value[key]
        if (nested === undefined || nested === null || nested === '') return
        pairs.push(encodePair(`${propName}[${key}]`, nested))
      })
      return
    }

    pairs.push(encodePair(propName, value))
  })

  return pairs
}

/** 拼 query string，末尾保留一个 & 交给调用方裁掉 */
export function tansParams (params = {}) {
  const pairs = collectPairs(params)
  return pairs.length ? `${pairs.join('&')}&` : ''
}
