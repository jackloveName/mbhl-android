/*
 * 图片上传（现在用在换头像）。
 *
 * 流程和后台约定好的三步：
 * 1. 选图 → 拿本地临时路径；
 * 2. 用文件名换 OSS 预签名地址（get_batch_pre_sign_url），把文件 PUT 上去；
 * 3. 登记到平台资源库（save_to_platform），拿到最终路径 /mall/日期/xxx.jpg。
 *
 * App 端读文件走 plus.io，H5 走 uni.request(arraybuffer)，
 * 两条路都在这里收口，页面只管拿上传结果。
 */
import config from '@/config'
import { getBatchPreSignUrl, saveAttachFileToPlatform } from '@/api/upload'

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
/** 图片类附件在平台里的 type 值 */
const ATTACH_TYPE_IMAGE = 1

/** OSS 相对路径 → 可直接显示的完整地址 */
export function resolveOssUrl (path = '') {
  const value = String(path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const base = String(config.ossUrl || '').replace(/\/$/, '')
  return `${base}/${value.replace(/^\//, '')}`
}

/** 头像字段后台可能叫得不一样，按常见叫法依次认 */
const AVATAR_KEYS = ['pic', 'avatar', 'avatarUrl', 'headImg', 'headPic', 'headUrl', 'userPic', 'photo', 'portrait', 'img']

/** 从用户资料里取头像路径（取不到返回空字符串） */
export function pickAvatarPath (profile = {}) {
  for (let i = 0; i < AVATAR_KEYS.length; i += 1) {
    const value = String(profile?.[AVATAR_KEYS[i]] || '').trim()
    if (value) return value
  }
  return ''
}

/*
 * 「用户最后一次换上的头像」本机记一份。
 *
 * 规则很简单：**你上传哪张就显示哪张**。
 * 上传成功后立刻把路径记下来，界面直接用这份，不等后台回包；
 * 后台资料接口慢半拍、回的还是上一张时，也不会把界面盖回去。
 */
const AVATAR_CACHE_PREFIX = 'MiBeiHileAvatarV1:'

/** 读「最后一次换上的头像」（按账号分开存） */
export function readLastAvatar (scope = '') {
  try {
    const raw = uni.getStorageSync(`${AVATAR_CACHE_PREFIX}${scope || 'guest'}`)
    if (!raw) return ''
    // 兼容早期版本存过的 { path, at } 结构
    if (typeof raw === 'string' && raw.charAt(0) === '{') {
      const parsed = JSON.parse(raw)
      return String(parsed?.path || '')
    }
    return String(raw)
  } catch (error) {
    return ''
  }
}

/** 记下「刚换上的这张」，界面之后就以它为准 */
export function writeLastAvatar (scope = '', path = '') {
  try {
    uni.setStorageSync(`${AVATAR_CACHE_PREFIX}${scope || 'guest'}`, String(path || ''))
  } catch (error) {
    // 存不下只影响下次显示，本次照常
  }
}

function pickPath (file = {}) {
  return String(file.path || file.tempFilePath || file.filePath || '')
}

function pickName (file = {}) {
  const explicit = String(file.name || '').trim()
  if (explicit) return explicit
  const path = pickPath(file)
  return path.split('/').pop() || ''
}

function pickExtension (file = {}) {
  const name = pickName(file)
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return ext
}

function pickSize (file = {}) {
  return Number(file.size || file.fileSize || 0)
}

function contentTypeOf (extension) {
  return extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
}

/** 选图；返回 uni.chooseImage 的结果 */
function chooseImage ({ count = 1, sourceType = ['album', 'camera'] } = {}) {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType,
      success: resolve,
      fail: (error) => {
        const message = String(error?.errMsg || '')
        // 用户主动取消不算错误
        reject(new Error(/cancel/i.test(message) ? '已取消' : '选图片失败'))
      }
    })
  })
}

/** 读文件成 arrayBuffer：App 用 plus.io，H5 用 uni.request */
function readFileBuffer (filePath) {
  let loader = () => Promise.reject(new Error('当前环境不支持读取图片'))

  // #ifdef APP-PLUS
  loader = () => new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
      entry.file((file) => {
        const reader = new plus.io.FileReader()
        reader.onload = () => {
          const base64 = String(reader.result || '').split(',')[1] || ''
          resolve(uni.base64ToArrayBuffer(base64))
        }
        reader.onerror = () => reject(new Error('读取图片失败'))
        reader.readAsDataURL(file)
      }, () => reject(new Error('读取图片失败')))
    }, () => reject(new Error('读取图片失败')))
  })
  // #endif

  // #ifndef APP-PLUS
  loader = () => new Promise((resolve, reject) => {
    uni.request({
      url: filePath,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => resolve(res.data),
      fail: () => reject(new Error('读取图片失败'))
    })
  })
  // #endif

  return loader()
}

/** PUT 到预签名地址；这里不能用项目的 request 包装（那是打自己后端的） */
function putToOss (url, data, contentType) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'PUT',
      data,
      header: { 'Content-Type': contentType },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
          return
        }
        reject(new Error(`上传失败（${res.statusCode}）`))
      },
      fail: () => reject(new Error('网络异常，图片没传上去'))
    })
  })
}

/**
 * 选图并上传，返回 [{ filePath, url, fileType, fileName, fileSize }]
 * filePath 是存到用户资料里的相对路径（/mall/2026/09/24/xxx.jpg）。
 */
export async function chooseAndUploadImage (options = {}) {
  const result = await chooseImage(options)
  const tempFiles = (result?.tempFiles || []).filter(Boolean)
  if (!tempFiles.length) return []

  const prepared = tempFiles.map((file) => {
    const extension = pickExtension(file)
    const size = pickSize(file)
    if (!IMAGE_TYPES.includes(extension)) throw new Error('只能上传 jpg / png 图片')
    if (size && size > MAX_IMAGE_SIZE) throw new Error('图片太大了，换一张小一点的')
    return {
      path: pickPath(file),
      name: pickName(file),
      extension,
      size
    }
  })

  const signList = await getBatchPreSignUrl(prepared.map((item) => item.name).join(','))
  const list = Array.isArray(signList) ? signList : (Array.isArray(signList?.list) ? signList.list : [])
  if (list.length < prepared.length) throw new Error('上传地址获取失败，请重试')

  const uploaded = []
  for (let i = 0; i < prepared.length; i += 1) {
    const target = list[i] || {}
    const buffer = await readFileBuffer(prepared[i].path)
    await putToOss(target.preSignUrl, buffer, contentTypeOf(prepared[i].extension))
    uploaded.push({
      type: ATTACH_TYPE_IMAGE,
      fileType: prepared[i].extension,
      fileName: prepared[i].name,
      filePath: `/${String(target.dir || '').replace(/^\//, '')}${target.fileName}`,
      fileSize: prepared[i].size
    })
  }

  // 登记到平台资源库；失败不阻断（文件已经在 OSS 上了）
  try {
    await saveAttachFileToPlatform(uploaded)
  } catch (error) {}

  return uploaded.map((item) => ({ ...item, url: resolveOssUrl(item.filePath) }))
}
