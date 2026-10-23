import request from '@/utils/request'

/** 登录、注册这类接口不需要带 token */
function anonymousHeaders () {
  return { isToken: false }
}

/** 发登录验证码 */
export function sendLoginCode (data) {
  return request({
    url: '/mall_biz/ua/sms/verification_code/login_wtocode',
    headers: anonymousHeaders(),
    method: 'put',
    timeout: 20000,
    data
  })
}

/** 验证码登录 */
export function loginByCode (data) {
  return request({
    url: '/mall_auth/ua/login_with_code',
    headers: anonymousHeaders(),
    method: 'post',
    data
  })
}

/** 账号密码登录 */
export function loginByPassword (data) {
  return request({
    url: '/mall_auth/ua/login',
    headers: anonymousHeaders(),
    method: 'post',
    data
  })
}

/**
 * 当前账号资料。
 * 资料接口是 GET，刚写完资料（比如换头像）马上再来取容易被缓存住，
 * 这种场景传 fresh = true 加个时间戳绕开缓存。
 */
export function fetchUserProfile ({ fresh = false } = {}) {
  return request({
    url: '/mall_user/user/ma/user_detail_info',
    method: 'get',
    params: fresh ? { t: Date.now() } : undefined
  })
}

/** 退出登录 */
export function signOut () {
  return request({
    url: '/mall_auth/ma/login_out',
    method: 'post'
  })
}

/** 注销账号 */
export function deleteAccount (forceDestroy = false) {
  return request({
    url: '/mall_user/user/destroy_user',
    method: 'get',
    params: { forceDestroy }
  })
}

/**
 * 修改用户资料（头像 pic、昵称 nickName、性别 sex、生日 birthDate）。
 * 后端按整体更新，调用时把没改的字段原样带上，避免被清空。
 */
export function setUserInfo (data) {
  return request({
    url: '/mall_user/user/set_user_info',
    method: 'put',
    data
  })
}
