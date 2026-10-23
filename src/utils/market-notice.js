/*
 * 活动声明里的「平台方无关声明」。
 *
 * 审核（App Store 5.3.2）要求活动页必须写明平台方不是赞助方、未以任何方式参与，
 * 但这句话不能无脑发给所有端：
 * - iOS：按审核要求写 Apple；
 * - 安卓：写各安卓应用市场；
 * - H5（浏览器打开）：没有商店主体，用中性的「应用商店」说法。
 *
 * 文案分两档：short 给页面里的小字，long 给活动规则页那一整段。
 */

const NOTICE = {
  ios: {
    title: 'Apple 声明',
    short: '本活动与 Apple Inc. 无关，Apple 未以任何方式参与或赞助本活动。',
    long: 'Apple 声明：本活动与 Apple Inc. 无关，Apple 未以任何方式参与、赞助、管理或支持本活动，也不是本活动的赞助方。本活动仅在米贝嗨乐 App 内进行，与 App Store、Apple Pay 及任何 Apple 产品或服务均无关联。'
  },
  android: {
    title: '应用市场声明',
    short: '本活动与各安卓应用市场无关，相关应用市场未以任何方式参与或赞助本活动。',
    long: '应用市场声明：本活动与各安卓应用市场（包括各手机厂商的应用商店及第三方应用市场）无关，相关应用市场未以任何方式参与、赞助、管理或支持本活动，也不是本活动的赞助方。本活动仅在米贝嗨乐 App 内进行，与任何应用市场的账号、支付及服务均无关联。'
  },
  other: {
    title: '应用市场声明',
    short: '本活动与本应用所在的应用商店无关，相关平台未以任何方式参与或赞助本活动。',
    long: '应用市场声明：本活动与本应用所在的应用商店无关，相关平台未以任何方式参与、赞助、管理或支持本活动，也不是本活动的赞助方。本活动仅在米贝嗨乐 App 内进行，与任何应用商店的账号、支付及服务均无关联。'
  }
}

/** 当前端该用哪一档：ios / android / other */
function detectTarget () {
  try {
    const info = uni.getSystemInfoSync() || {}
    const os = String(info.osName || info.platform || '').toLowerCase()
    if (os.includes('ios')) return 'ios'
    if (os.includes('android')) return 'android'
  } catch (error) {}
  return 'other'
}

/** 取当前端的声明文案：{ title, short, long } */
export function getMarketNotice () {
  return NOTICE[detectTarget()]
}
