<template>
  <view class="rules-page">
    <view class="app-shell">
      <view class="app-topbar rules-topbar">
        <button
          class="rules-back"
          hover-class="none"
          aria-label="返回"
          @tap="goBack"
        >
          <ArrowLeft :size="19" />
        </button>
        <view class="rules-heading">
          <text class="app-title">
            刮刮乐活动规则
          </text>
          <text class="app-subtitle">
            参与即视为已阅读并同意以下全部条款
          </text>
        </view>
      </view>

      <view class="rules-card app-card">
        <view v-for="section in sections" :key="section.title" class="rules-section">
          <text class="rules-title">{{ section.title }}</text>
          <text v-for="(line, index) in section.lines" :key="`${section.title}-${index}`" class="rules-line">
            {{ line }}
          </text>
        </view>

        <view class="rules-apple">
          <text class="rules-apple-text">
            {{ marketNotice.long }}
          </text>
        </view>

        <text class="rules-updated">
          规则更新时间：{{ updatedAt }} · 主办方保留在法律允许范围内解释与调整本规则的权利，调整后会在此页更新。
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ArrowLeft } from '@/components/icons'
import { hasAppSession } from '@/utils/auth'
import { getLegalOperator } from '@/utils/legal-operator'
import { getMarketNotice } from '@/utils/market-notice'

/*
 * 主办方和联系方式跟隐私协议 / 注册协议走同一份配置：
 * iOS 是一个主体，安卓和 H5 是另一个主体，换主体只改 utils/legal-operator.js。
 */
const { name: operator, email: contact } = getLegalOperator()
/** 平台方无关声明：iOS 写 Apple，安卓写应用市场，H5 用中性说法 */
const marketNotice = getMarketNotice()
const updatedAt = '2026-09-21'

/*
 * 活动规则写死在页面里（不走后端），保证任何网络情况下用户都能随时看到。
 * 这是 App Store 审核（5.3.2）明确要求的两点：
 * 1. 官方规则常驻可查；
 * 2. 明确写明 Apple 不是赞助方、未以任何方式参与。
 */
const sections = [
  {
    title: '一、活动主办方',
    lines: [
      `主办方：${operator}（以下简称「主办方」）`,
      `联系方式：${contact}`
    ]
  },
  {
    title: '二、活动性质',
    lines: [
      '本活动是米贝嗨乐 App 内的娱乐玩法，全程免费参与。',
      '本活动不涉及任何真实货币交易：参与无需付费、无需购买任何商品或服务，App 内也没有任何付费购买入口。'
    ]
  },
  {
    title: '三、参与资格',
    lines: [
      '面向所有米贝嗨乐用户开放，无地域限制。',
      '注册用户可直接参与；未注册的游客可以免费体验 1 次刮刮乐（游客中奖金额需登录后入账）。'
    ]
  },
  {
    title: '四、参与方式',
    lines: [
      '1. 免费获得米贝：新注册用户赠送 100 米贝；每完成一局免费玩法（大转盘 / 摇签筒 / 摇骰子）获得 1 米贝。',
      '2. 兑换票面：在「兑换」页用米贝兑换刮刮乐票面，三张票面面值分别为 20 / 30 / 50 米贝。',
      '3. 刮开结果：在「决断」页刮开覆盖膜，刮开面积达到票面约定比例后自动揭晓该格结果。',
      '米贝只能通过使用 App 获得，不能购买、不能充值。'
    ]
  },
  {
    title: '五、奖励与中奖概率',
    lines: [
      '奖励形式：米贝（App 内虚拟积分），不是现金、不是实物。',
      '中奖率与最高奖励在各票面兑换页与票面上公示：喜乐满堂（20 米贝，中奖率 25%）、喜盈门（30 米贝，中奖率 22%）、璀璨宝石（50 米贝，中奖率 18%）。',
      '三张票面的最高奖励均为 100000 米贝，该奖励真实存在于对应票面的奖励表中，存在被抽中的可能。',
      '中奖结果在兑换出票时确定，刮开即生效；每张票面奖金表固定，概率不随参与次数变化。'
    ]
  },
  {
    title: '六、关于米贝的重要说明',
    lines: [
      '米贝是米贝嗨乐 App 内的虚拟积分，不具备任何现实货币价值。',
      '米贝不可提现、不可兑换现金、不可兑换实物或任何有价物品，仅可用于 App 内的娱乐玩法。',
      '米贝不能通过任何方式购买或用真实货币换取。'
    ]
  },
  {
    title: '七、奖励发放与查询',
    lines: [
      '中奖米贝即时发放至当前账号，可在「我的」页的米贝流水中查询明细。',
      '游客身份下的中奖金额不计入账户，登录后产生的记录才会入账。'
    ]
  },
  {
    title: '八、其他条款',
    lines: [
      '如发现使用外挂、脚本、多账号刷取等作弊行为，主办方有权取消相关账号的参与资格与所得米贝。',
      '因不可抗力或系统故障导致活动无法正常进行的，主办方有权暂停或终止本活动。',
      '主办方保留在法律允许范围内解释与调整本规则的权利，调整后会更新本页面。'
    ]
  }
]

/**
 * 返回：正常从兑换页/玩法页进来时退栈；
 * 如果是冷启动直接落在本页（外链、浏览器刷新）没有上一页，就按登录态回首页或登录页。
 */
function goBack () {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: hasAppSession() ? '/pages/home/index' : '/pages/login/index' })
}
</script>

<style lang="scss" scoped>
.rules-page {
  min-height: 100vh;
  max-width: 100%;
  overflow-x: clip;
  padding: calc(var(--status-bar-height) + 24rpx) 30rpx 48rpx;
  background:
    linear-gradient(180deg, rgba(214, 168, 96, 0.1) 0%, rgba(253, 249, 243, 0) 360rpx),
    var(--color-bg);
}

.rules-topbar {
  position: sticky;
  z-index: 6;
  top: var(--status-bar-height);
  justify-content: flex-start;
  gap: 18rpx;
  padding: 10rpx 0 14rpx;
  background: linear-gradient(180deg, rgba(253, 249, 243, 0.96) 62%, rgba(253, 249, 243, 0) 100%);
}

.rules-back {
  flex: 0 0 auto;
  width: 68rpx;
  height: 68rpx;
  border: 1rpx solid var(--color-border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-primary);
  box-shadow: 0 10rpx 26rpx rgba(190, 88, 116, 0.14);
}

.rules-heading {
  flex: 1;
  min-width: 0;
}

.rules-card {
  margin-top: 24rpx;
  padding: 28rpx 26rpx 30rpx;
}

.rules-section {
  margin-bottom: 26rpx;
}

.rules-title {
  display: block;
  margin-bottom: 10rpx;
  color: #a3271f;
  font-size: 27rpx;
  font-weight: 850;
}

.rules-line {
  display: block;
  margin-top: 6rpx;
  color: #53615b;
  font-size: 24rpx;
  line-height: 1.72;
  white-space: normal;
}

/* 平台方无关声明单独框出来，一眼能看到（iOS 显示 Apple，安卓显示应用市场） */
.rules-apple {
  margin-top: 8rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid rgba(200, 16, 46, 0.24);
  border-radius: 18rpx;
  background: rgba(255, 245, 246, 0.92);
}

.rules-apple-text {
  display: block;
  color: #8c1f28;
  font-size: 23rpx;
  font-weight: 700;
  line-height: 1.7;
  white-space: normal;
}

.rules-updated {
  display: block;
  margin-top: 22rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 21rpx;
  line-height: 1.6;
}
</style>
