/** 大陆手机号：1 开头、共 11 位 */
const CHINA_MOBILE = /^1\d{10}$/

export function isChinaMobile (value) {
  return CHINA_MOBILE.test(String(value ?? '').trim())
}
