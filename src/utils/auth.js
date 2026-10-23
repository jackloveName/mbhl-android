/*
 * 本地登录态：token + 游客标记。
 * 存储 key 沿用老版本，改了会让已装机的用户被登出一次。
 */
const TokenKey = 'App-Token'
const GuestKey = 'App-Guest-Mode'

function readStorage (key) {
  try {
    return uni.getStorageSync(key)
  } catch (error) {
    return ''
  }
}

function writeStorage (key, value) {
  try {
    return uni.setStorageSync(key, value)
  } catch (error) {}
}

function dropStorage (key) {
  try {
    return uni.removeStorageSync(key)
  } catch (error) {}
}

export function getToken () {
  return readStorage(TokenKey) || ''
}

export function setToken (token) {
  return writeStorage(TokenKey, token)
}

export function removeToken () {
  return dropStorage(TokenKey)
}

export function isGuestSession () {
  return Boolean(readStorage(GuestKey))
}

export function setGuestSession (value = true) {
  return value ? writeStorage(GuestKey, '1') : dropStorage(GuestKey)
}

export function removeGuestSession () {
  return dropStorage(GuestKey)
}

export function hasAppSession () {
  return Boolean(getToken() || isGuestSession())
}

/*
 * 这里原来有个 ensureLocalSession()：没登录态就自动写游客态。
 * 现在登录页是唯一入口（见 router/index.js 的登录门槛），自动写游客态会绕过登录页：
 * 页面 onShow 先写、门槛再跳登录、登录页又被弹回首页。
 * 所以游客态只能由用户在登录页主动选择。
 */
