/*
 * 协议与活动规则里的「开发者 / 主办方」主体。
 *
 * iOS 和其它端不是同一个主体（App Store 的开发者账号主体不同），
 * 所以按端区分。隐私协议、注册协议、活动规则都引用这一份，
 * 以后换主体只改这里，三个页面同时生效。
 */

export const LEGAL_OPERATOR = {
  ios: {
    name: 'Froza Korthals',
    email: 'frozakorthals@icloud.com'
  },
  other: {
    name: '湖北黩歆科技有限公司',
    email: 'developking6@outlook.com'
  }
}

/** 当前端对应的主体：iOS 走 ios，其余（安卓 / H5）走 other */
export function getLegalOperator () {
  let isIos = false
  try {
    const systemInfo = uni.getSystemInfoSync() || {}
    isIos = systemInfo.osName === 'ios' || systemInfo.platform === 'ios'
  } catch (error) {
    isIos = false
  }
  return isIos ? LEGAL_OPERATOR.ios : LEGAL_OPERATOR.other
}
