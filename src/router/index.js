import uniCrazyRouter, { beforeEach, onError } from 'uni-crazy-router'
import { hasAppSession } from '@/utils/auth'

/**
 * 登录门槛。
 *
 * 启动后必须先选身份：登录，或者点「游客模式」进入。
 * 没选之前只放行登录页和协议页，其它页面一律先跳到登录页，
 * 并把原页面带在 redirect 上，选完身份直接回去。
 *
 * 注意：游客态是用户主动选的（点过「游客模式」才会写入），
 * 不再像以前那样启动时自动写入，否则登录页永远不会出现。
 */
const PUBLIC_ROUTES = ['pages/login/index', 'pages/legal/index']

function currentRoute () {
  try {
    const pages = getCurrentPages()
    const page = pages && pages.length ? pages[pages.length - 1] : null
    return (page && (page.route || (page.$page && page.$page.fullPath))) || ''
  } catch (error) {
    return ''
  }
}

export function enforcePageAccess () {
  const route = currentRoute()
  if (!route) return true
  if (PUBLIC_ROUTES.some((path) => route.indexOf(path) >= 0)) return true
  if (hasAppSession()) return true
  uni.reLaunch({ url: `/pages/login/index?redirect=${encodeURIComponent(`/${route}`)}` })
  return false
}

export function setupRouter (app) {
  app.use(uniCrazyRouter)

  // uni-crazy-router only intercepts navigation API calls. A page lifecycle
  // check also protects cold starts and direct H5 hash navigation.
  app.mixin({
    onLoad () {
      enforcePageAccess()
    }
  })

  beforeEach((to, from, next) => {
    next()
  })

  onError((to) => {
    uni.showToast({
      title: `${to.url} 不存在`,
      icon: 'none'
    })
  })
}
