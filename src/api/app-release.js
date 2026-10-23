import request from '@/utils/request'

/** 取应用版本配置（按应用名取，不带 token、不弹错误提示） */
export function fetchAppReleaseConfig (appName) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/value/config/${encodeURIComponent(appName)}`,
    headers: { isToken: false },
    method: 'get',
    showError: false,
    timeout: 20000
  })
}
