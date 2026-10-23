/** 后端返回的通用错误码文案，没登记的走 default */
const CODE_MESSAGES = [
  [401, '认证失败，无法访问系统资源'],
  [403, '当前操作没有权限'],
  [404, '访问资源不存在']
]

const errorCode = CODE_MESSAGES.reduce((table, [code, message]) => {
  table[code] = message
  return table
}, {
  default: '服务开了个小差，稍后再试'
})

export default errorCode
