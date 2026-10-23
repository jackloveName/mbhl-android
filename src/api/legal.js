import request from '@/utils/request'

/**
 * 协议文档不写死在页面里：按配置 key 从后端取，运营改文案不用发版。
 * MBHL_PRIVACY_PROTOC / MBHL_REGISTER_PROTOC 就是后台配置中心里的 key。
 */
export const LegalDocumentKeys = {
  privacy: 'MBHL_PRIVACY_PROTOC',
  agreement: 'MBHL_REGISTER_PROTOC'
}

export function getLegalDocument (key) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/value/config/${key}`,
    headers: { isToken: false },
    method: 'get'
  })
}
