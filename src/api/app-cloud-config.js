import request from '@/utils/request'

/*
 * 云端的通用配置读写：米贝、百件小事这类数据都以「一个 key 一段 JSON」
 * 的形式存在配置中心，读回来自己解析。
 */

/** 读配置 */
export function readCloudConfig (key) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/other/value/config/${encodeURIComponent(key)}`,
    method: 'get',
    timeout: 20000
  })
}

/** 写配置 */
export function writeCloudConfig (data) {
  return request({
    url: '/mall_admin/p/sys_config/ua/other/save',
    method: 'post',
    data,
    timeout: 20000
  })
}
