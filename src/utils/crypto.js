import CryptoJS from 'crypto-js'

/**
 * 登录密码的加密方式由后端约定：AES-ECB + PKCS7，
 * 明文是「当前时间戳 + 原密码」，密钥固定。
 */
const AES_SECRET = '-mall--password-'

export function encryptPassword (password) {
  const plain = CryptoJS.enc.Utf8.parse(`${Date.now()}${password}`)

  return CryptoJS.AES.encrypt(plain, CryptoJS.enc.Utf8.parse(AES_SECRET), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
}
