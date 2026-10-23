import config from '@/config'
import { getToken, removeToken } from '@/utils/auth'
import { showConfirm, tansParams, toast } from '@/utils/common'
import errorCode from '@/utils/error-code'

/** 默认超时（毫秒），个别接口可以用 options.timeout 单独放宽 */
const DEFAULT_TIMEOUT = 10000
/** 会话失效后统一回到登录页 */
const LOGIN_PAGE = '/pages/login/index'
const ABSOLUTE_URL = /^https?:\/\//i
const NETWORK_ERROR_CODE = 'NETWORK_ERROR'

let sessionPromptVisible = false

function joinUrl (url = '', requestBaseUrl = '') {
  if (ABSOLUTE_URL.test(url)) return url
  const base = String(requestBaseUrl || config.baseUrl || '').replace(/\/+$/, '')
  const path = String(url).replace(/^\/+/, '')
  return `${base}/${path}`
}

function withQuery (url = '', params) {
  if (!params) return url
  const query = tansParams(params)
  if (!query) return url
  return `${url}${String(url).includes('?') ? '&' : '?'}${query.slice(0, -1)}`
}

function buildHeader (options = {}) {
  const { isToken, ...custom } = options.headers || {}
  const header = { ...(options.header || {}), ...custom }

  if (isToken !== false) {
    const token = getToken()
    if (token) header.Authorization = token
  }

  return header
}

function createRequestError (code, message, cause) {
  const error = new Error(message)
  error.code = code
  error.handled = true
  if (cause) error.cause = cause
  return error
}

/** 回登录页之前先把本地登录态清掉 */
function dropSession () {
  removeToken()
}

/** 会话过期提示只弹一次，避免并发请求叠出一堆弹窗 */
function promptSessionExpired () {
  if (sessionPromptVisible) return
  sessionPromptVisible = true

  showConfirm('登录状态已过期，是否重新登录？')
    .then((result) => {
      if (!result.confirm) return
      dropSession()
      uni.reLaunch({ url: LOGIN_PAGE })
    })
    .finally(() => {
      sessionPromptVisible = false
    })
}

function describeNetworkError (error = {}) {
  const raw = error.errMsg || error.message || ''

  if (/timeout/i.test(raw)) return '请求超时了，稍后重试'
  if (/network|fail/i.test(raw)) return '网络连不上，检查一下网络再试'
  if (/status code/i.test(raw)) return `服务响应异常（${raw.slice(-3)}）`

  return raw || '网络开小差了，请稍后重试'
}

/**
 * 后端定义的特殊 code 各自处理：
 * 401 / A00001 走会话失效，A00005 / A00006 是限流类的业务提示。
 */
function handleSpecialCode (code, body, { showError }) {
  switch (String(code)) {
    case '401':
      promptSessionExpired()
      return { reject: ['401', '无效的会话，或者会话已过期，请重新登录。'] }

    case 'A00001': {
      const message = body.msg || '登录状态已失效'
      toast(message)
      dropSession()
      uni.reLaunch({ url: LOGIN_PAGE })
      return { reject: [code, message] }
    }

    case 'A00005': {
      const message = body.msg || '当前请求暂时无法处理'
      if (showError) toast(message)
      return { reject: ['500', message] }
    }

    case 'A00006': {
      const message = body.msg || '请求过于频繁，请稍后重试'
      if (showError) toast(message)
      return { reject: ['600', message] }
    }

    default:
      return null
  }
}

/** 统一收口响应：成功 resolve 数据，失败 reject 带业务码的错误 */
function settleResponse (response, { showError, resolve, reject }) {
  const body = response.data || {}
  const code = body.code ?? response.statusCode ?? 200

  const special = handleSpecialCode(code, body, { showError })
  if (special) {
    reject(createRequestError(...special.reject))
    return
  }

  if (String(code) === '00000') {
    resolve(body.data)
    return
  }

  if (String(code) !== '200') {
    const message = body.msg || errorCode[String(code)] || errorCode.default
    if (showError) toast(message)
    reject(createRequestError(code, message))
    return
  }

  resolve(body.data ?? body)
}

const request = (options = {}) => {
  const showError = options.showError !== false
  const url = withQuery(options.url, options.params)

  return new Promise((resolve, reject) => {
    uni.request({
      method: options.method || 'get',
      timeout: options.timeout || DEFAULT_TIMEOUT,
      url: joinUrl(url, options.baseUrl),
      data: options.data,
      header: buildHeader(options),
      dataType: 'json',
      success: (response) => settleResponse(response, { showError, resolve, reject }),
      fail: (error) => {
        const message = describeNetworkError(error)
        if (showError) toast(message)
        reject(createRequestError(NETWORK_ERROR_CODE, message, error))
      }
    })
  })
}

export default request
