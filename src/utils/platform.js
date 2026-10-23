/** 登录时上报的端类型，取值是后端约定好的，别改数字 */
const PLATFORM_CODE = {
  h5: 4,
  android: 5,
  ios: 6
}

export function getLoginPlatform () {
  // H5 是默认端，App 端再用系统信息覆盖
  let platform = 'h5'

  // #ifdef APP-PLUS
  const { platform: osName = '' } = uni.getSystemInfoSync() || {}
  platform = osName === 'android' ? 'android' : 'ios'
  // #endif

  return PLATFORM_CODE[platform]
}
