import request from '@/utils/request'

/** 取 OSS 预签名上传地址；fileNames 用逗号拼接 */
export function getBatchPreSignUrl (fileNames) {
  return request({
    url: '/mall_biz/ua/oss/get_batch_pre_sign_url',
    method: 'get',
    params: { fileNames },
    timeout: 20000
  })
}

/** 上传完成后把附件登记到平台资源库 */
export function saveAttachFileToPlatform (data) {
  return request({
    url: '/mall_biz/attach_file/save_to_platform',
    method: 'post',
    data,
    timeout: 20000
  })
}
