<template>
  <view class="app-page exchange-page">
    <view class="app-shell">
      <view class="topbar">
        <view>
          <text class="topbar-kicker">
            兑换中心
          </text>
          <text class="topbar-title">
            用米贝换玩法
          </text>
          <text class="topbar-subtitle">
            米贝不用花钱买，玩转盘、签筒、骰子就能攒。
          </text>
        </view>
        <button class="topbar-link" hover-class="none" @tap="goMine">
          <text>我的</text>
          <ChevronRight :size="14" />
        </button>
      </view>

      <!-- 余额 -->
      <view class="wallet-card app-card">
        <view class="wallet-main">
          <text class="wallet-label">
            我的米贝
          </text>
          <text class="wallet-value">
            {{ wallet.balance }}
          </text>
        </view>
        <view v-if="isGuest" class="wallet-guest">
          <text class="wallet-guest-text">
            游客可以免费玩一次刮刮乐（剩 {{ freeScratchLeft }} 次）。
            登录后立刻拿 {{ signUpBonus }} 米贝见面礼，中奖金额也会入账。
          </text>
          <button class="wallet-guest-btn" hover-class="none" @tap="goLogin">
            去登录
          </button>
        </view>
        <view v-else class="wallet-tip">
          <text>玩一次转盘 / 签筒 / 骰子 +{{ playReward }} 米贝，攒够了就来这里换。</text>
        </view>
      </view>

      <!-- 兑换玩法 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">
            刮刮乐
          </text>
          <text class="section-subtitle">
            {{ scratchItems.length }} 张票 · 价格各不同
          </text>
        </view>
        <view class="shop-list">
          <view v-for="item in scratchItems" :key="item.id" class="shop-card app-card">
            <view class="shop-head">
              <view class="shop-title-wrap">
                <text class="shop-title">{{ item.title }}</text>
                <text class="shop-sub">{{ item.subtitle }}</text>
              </view>
              <view class="shop-price" :class="`shop-price--${item.tone}`">
                <text>{{ item.price }}</text>
                <text>米贝</text>
              </view>
            </view>
            <view class="shop-rules">
              <text class="shop-rules__label">
                玩法规则
              </text>
              <text v-for="(line, index) in rulesLines(item)" :key="`${item.id}-rule-${index}`" class="shop-rules__line">
                {{ line }}
              </text>
            </view>
            <view class="shop-foot">
              <text class="shop-top">
                最高奖励 {{ item.topPrize }} 米贝 · 中奖率 {{ formatRate(item.winRate) }}
              </text>
              <button
                class="shop-btn"
                :class="{ 'shop-btn--disabled': !canBuy(item) }"
                hover-class="none"
                @tap="redeem(item)"
              >
                {{ redeemLabel(item) }}
              </button>
            </view>
          </view>
        </view>

        <!-- 温馨提示：说清楚米贝是虚拟积分，不涉及真实货币 -->
        <view class="shop-notice app-card">
          <view class="shop-notice__copy">
            <view class="shop-notice__head">
              <ShieldCheck :size="16" />
              <text>温馨提示</text>
            </view>
            <text class="shop-notice__text">刮刮乐是站内娱乐玩法，刮到的米贝是 App 内虚拟积分，不能提现、不能兑换现金或实物，也不涉及任何真实货币；未成年请在监护人陪同下使用。</text>
            <text class="shop-notice__apple">{{ marketNotice.short }}</text>
            <button class="shop-notice__link" hover-class="none" @tap="goRules">
              查看完整活动规则 ›
            </button>
          </view>
        </view>
      </view>

      <!-- 以后的兑换物：还没真做出来，先隐藏，等上线再打开 showComingItems -->
      <view v-if="showComingItems" class="section">
        <view class="section-head">
          <text class="section-title">
            更多兑换
          </text>
          <text class="section-subtitle">
            陆续上线
          </text>
        </view>
        <view class="coming-grid">
          <view v-for="item in comingItems" :key="item.id" class="coming-card app-card">
            <text class="coming-title">{{ item.title }}</text>
            <text class="coming-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 兑换记录 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">
            米贝流水
          </text>
          <text class="section-subtitle">
            {{ wallet.logs.length ? `最近 ${visibleLogs.length} / 共 ${wallet.logs.length} 条` : '暂无' }}
          </text>
        </view>
        <view v-if="wallet.logs.length" class="log-list app-card">
          <view v-for="log in visibleLogs" :key="log.id" class="log-item">
            <view class="log-copy">
              <text class="log-title">{{ log.title }}</text>
              <text class="log-time">{{ log.createdAt }}</text>
            </view>
            <text class="log-value" :class="{ 'log-value--earn': log.value > 0 }">
              {{ log.value > 0 ? `+${log.value}` : log.value }}
            </text>
          </view>
          <button
            v-if="wallet.logs.length > LOG_PREVIEW"
            class="log-toggle"
            hover-class="none"
            @tap="showAllLogs = !showAllLogs"
          >
            {{ showAllLogs ? '收起' : `展开全部 ${wallet.logs.length} 条` }}
          </button>
        </view>
        <view v-else class="empty-card app-card">
          <text>还没有流水</text>
          <text>{{ isGuest ? '登录后玩一局就会有一条。' : '玩一局免费玩法，或者换一张刮刮乐。' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore, useUserStore } from '@/stores'
import { ChevronRight, ShieldCheck } from '@/components/icons'
import { COMING_ITEMS, EXCHANGE_ITEMS, splitRules } from '@/utils/exchange'
import { getMarketNotice } from '@/utils/market-notice'
import {
  PLAY_REWARD,
  SIGN_UP_BONUS,
  getFreeScratchLeft,
  getWallet,
  isGuestScope,
  spendMibe,
  useFreeScratch
} from '@/utils/wallet'

const userStore = useUserStore()
const appStore = useAppStore()
const scope = ref('guest')
const wallet = ref(getWallet('guest'))
/** 游客还剩几次免费刮 */
const freeScratchLeft = ref(getFreeScratchLeft())
/** 流水默认只露几条，避免一屏全是账目 */
const LOG_PREVIEW = 3
const showAllLogs = ref(false)

const scratchItems = computed(() => EXCHANGE_ITEMS.filter((item) => item.kind === 'scratch'))
const comingItems = computed(() => COMING_ITEMS)
/** 更多兑换（头像框、小道具…）还没上线，先隐藏；真做出来把这里改成 true 即可 */
const showComingItems = false
/** 平台方无关声明：iOS 写 Apple，安卓写应用市场（审核 5.3.2 要求必须展示） */
const marketNotice = getMarketNotice()
const isGuest = computed(() => isGuestScope(scope.value))
const visibleLogs = computed(() => (
  showAllLogs.value ? wallet.value.logs : wallet.value.logs.slice(0, LOG_PREVIEW)
))
const playReward = PLAY_REWARD
const signUpBonus = SIGN_UP_BONUS

function canBuy (item) {
  if (isGuest.value) return freeScratchLeft.value > 0
  return wallet.value.balance >= item.price
}

/** 中奖率文案：25% / 22% / 18% */
/** 票面规则拆成短句，读起来不像一坨 */
function rulesLines (item) {
  return splitRules(item && item.rules)
}

function formatRate (rate) {
  const value = Number(rate) || 0
  return `${String(Math.round(value * 1000) / 10).replace(/\.?0+$/, '')}%`
}

function redeemLabel (item) {
  if (isGuest.value) return freeScratchLeft.value > 0 ? '免费玩一次' : '登录后兑换'
  return wallet.value.balance >= item.price ? `兑换 ${item.price} 米贝` : '米贝不够'
}

async function resolveScope () {
  if (userStore.guest) return 'guest'
  try {
    await userStore.fetchProfile()
    return await userStore.getUserMobile()
  } catch (error) {
    return 'guest'
  }
}

function refresh () {
  wallet.value = getWallet(scope.value)
  freeScratchLeft.value = getFreeScratchLeft(scope.value)
}

function goLogin () {
  uni.navigateTo({ url: '/pages/login/index?from=exchange' })
}

function goMine () {
  uni.switchTab({ url: '/pages/mine/index' })
}

/** 活动规则常驻入口：审核（5.3.2）要求规则随时可查 */
function goRules () {
  uni.navigateTo({ url: '/pages/rules/index' })
}

function goPlay (item) {
  // 把刚兑换的票面交给决断页，切过去直接开刮
  appStore.setActivePlayTool('scratch')
  appStore.setPendingScratch(item.styleId)
  uni.switchTab({ url: '/pages/diary/index' })
}

function redeem (item) {
  if (isGuest.value) {
    if (freeScratchLeft.value > 0) {
      uni.showModal({
        title: `免费体验《${item.title}》`,
        content: '游客可以免费玩一次刮刮乐（中奖金额要登录后才入账）。',
        confirmText: '开刮',
        confirmColor: '#ff5d8f',
        success: (res) => {
          if (!res.confirm) return
          if (useFreeScratch(scope.value)) {
            refresh()
            goPlay(item)
          }
        }
      })
      return
    }
    uni.showModal({
      title: '免费次数用完了',
      content: '游客只能免费玩一次刮刮乐。登录后送 100 米贝，就能继续兑换了。',
      confirmText: '去登录',
      confirmColor: '#ff5d8f',
      success: (res) => {
        if (res.confirm) goLogin()
      }
    })
    return
  }
  if (wallet.value.balance < item.price) {
    uni.showToast({ title: `米贝不够，还差 ${item.price - wallet.value.balance}`, icon: 'none' })
    return
  }
  uni.showModal({
    title: `兑换《${item.title}》`,
    content: `花 ${item.price} 米贝换一张，最高奖励 ${item.topPrize} 米贝。`,
    confirmText: '兑换',
    confirmColor: '#ff5d8f',
    success: (res) => {
      if (!res.confirm) return
      try {
        spendMibe(scope.value, item.price, `兑换《${item.title}》`)
        refresh()
        uni.showToast({ title: '兑换成功', icon: 'none' })
        goPlay(item)
      } catch (error) {
        uni.showToast({ title: error.message || '兑换失败', icon: 'none' })
      }
    }
  })
}

onShow(async () => {
  scope.value = await resolveScope()
  refresh()
})
</script>

<style lang="scss" scoped>
.exchange-page {
  background:
    radial-gradient(120% 46% at 50% 0%, rgba(214, 168, 96, 0.14), rgba(214, 168, 96, 0) 62%),
    linear-gradient(180deg, #fdf9f3 0%, #fbf5ec 100%);
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.topbar-kicker {
  display: block;
  color: rgba(178, 130, 62, 0.95);
  font-size: 17rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.topbar-title {
  display: block;
  margin-top: 8rpx;
  color: #241a15;
  font-size: 40rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.topbar-subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(88, 70, 58, 0.6);
  font-size: 21rpx;
}

.topbar-link {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-height: 56rpx;
  padding: 0 20rpx;
  border: 0;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 22rpx;
  font-weight: 800;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

/* 余额 */
.wallet-card {
  margin-top: 24rpx;
  padding: 26rpx;
  background: linear-gradient(140deg, #2b1420 0%, #4a2333 100%);
  border-color: rgba(255, 214, 150, 0.28);
}

.wallet-main {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.wallet-label {
  color: rgba(255, 236, 214, 0.72);
  font-size: 22rpx;
  font-weight: 700;
}

.wallet-value {
  color: #ffd98a;
  font-size: 62rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.wallet-guest {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 18rpx;
}

.wallet-guest-text {
  flex: 1;
  color: rgba(255, 236, 214, 0.75);
  font-size: 20rpx;
  line-height: 1.5;
}

.wallet-guest-btn {
  flex: 0 0 auto;
  padding: 0 24rpx;
  min-height: 56rpx;
  border: 0;
  border-radius: 999rpx;
  color: #3b1220;
  font-size: 22rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #ffe6a8, #f2c162);
}

.wallet-tip {
  margin-top: 14rpx;
  color: rgba(255, 236, 214, 0.62);
  font-size: 20rpx;
  line-height: 1.5;
}

/* 分区 */
.section {
  margin-top: 30rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
}

.section-title {
  position: relative;
  padding-left: 18rpx;
  color: #241a15;
  font-size: 27rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 6rpx;
  height: 24rpx;
  margin-top: -12rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

.section-subtitle {
  color: rgba(88, 70, 58, 0.55);
  font-size: 20rpx;
}

/* 商品 */
.shop-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 温馨提示：米贝是站内虚拟积分，不涉及真实货币 */
.shop-notice {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 16rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.22);
  background: rgba(255, 249, 235, 0.92);
}

.shop-notice__copy {
  flex: 1;
  min-width: 0;
}

.shop-notice__head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
  color: #8a6a3c;
}

.shop-notice__head text {
  color: #8a6a3c;
  font-size: 23rpx;
  font-weight: 850;
}

.shop-notice__text {
  display: block;
  color: rgba(88, 70, 58, 0.8);
  font-size: 22rpx;
  line-height: 1.62;
}

/* 平台方无关声明：审核要求必须能一眼看到（iOS 显示 Apple，安卓显示应用市场） */
.shop-notice__apple {
  display: block;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed rgba(200, 16, 46, 0.22);
  color: #8c1f28;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.6;
}

.shop-notice__link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 62rpx;
  margin-top: 14rpx;
  border: 1rpx solid rgba(255, 93, 143, 0.32);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-primary);
  font-size: 22rpx;
  font-weight: 800;
}

.shop-card {
  padding: 22rpx;
}

.shop-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.shop-title-wrap {
  min-width: 0;
  flex: 1;
}

.shop-title {
  display: block;
  color: #241a15;
  font-size: 32rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.shop-sub {
  display: block;
  margin-top: 6rpx;
  color: rgba(88, 70, 58, 0.58);
  font-size: 22rpx;
}

.shop-price {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  color: #fff6ef;
}

.shop-price text:first-child {
  font-size: 34rpx;
  font-weight: 900;
}

.shop-price text:last-child {
  font-size: 18rpx;
  font-weight: 800;
  opacity: 0.86;
}

.shop-price--red {
  background: linear-gradient(180deg, #d8232a, #9e1b1b);
}

.shop-price--blue {
  background: linear-gradient(180deg, #1565c0, #0d3c7a);
}

.shop-price--gold {
  background: linear-gradient(180deg, #d8a13a, #9a6c0c);
}

.shop-rules {
  /* 规则单独做一块：浅底 + 小标题 + 分行短句，不再是一坨小字 */
  margin-top: 16rpx;
  padding: 18rpx 20rpx 16rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.16);
  border-radius: 18rpx;
  background: rgba(178, 130, 62, 0.06);
}

.shop-rules__label {
  display: block;
  margin-bottom: 8rpx;
  color: rgba(163, 39, 31, 0.92);
  font-size: 22rpx;
  font-weight: 850;
  letter-spacing: 1rpx;
}

.shop-rules__line {
  display: block;
  color: rgba(88, 70, 58, 0.8);
  font-size: 24rpx;
  line-height: 1.62;
}

.shop-rules__line + .shop-rules__line {
  margin-top: 4rpx;
}

.shop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 「最高奖励 xxx」+ 兑换按钮，窄屏放不下时换行，别把卡片撑破 */
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 18rpx;
}

.shop-top {
  color: rgba(160, 62, 48, 0.9);
  font-size: 20rpx;
  font-weight: 800;
}

.shop-btn {
  flex: 0 0 auto;
  min-height: 62rpx;
  padding: 0 28rpx;
  border: 0;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 23rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

.shop-btn--disabled {
  opacity: 0.55;
}

/* 敬请期待 */
.coming-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.coming-card {
  padding: 20rpx 14rpx;
  text-align: center;
  opacity: 0.72;
}

.coming-title {
  display: block;
  color: #241a15;
  font-size: 22rpx;
  font-weight: 800;
}

.coming-desc {
  display: block;
  margin-top: 6rpx;
  color: rgba(88, 70, 58, 0.5);
  font-size: 18rpx;
}

/* 流水 */
.log-list {
  padding: 8rpx 22rpx;
}

.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 2rpx solid rgba(178, 130, 62, 0.12);
}

.log-item:last-child {
  border-bottom: 0;
}

.log-copy {
  min-width: 0;
  flex: 1;
}

.log-title {
  display: block;
  color: #241a15;
  font-size: 23rpx;
  font-weight: 700;
}

.log-time {
  display: block;
  margin-top: 4rpx;
  color: rgba(88, 70, 58, 0.5);
  font-size: 18rpx;
}

.log-value {
  flex: 0 0 auto;
  color: #a3271f;
  font-size: 26rpx;
  font-weight: 900;
}

.log-value--earn {
  color: #1f8a4c;
}

/* 展开/收起流水 */
.log-toggle {
  width: 100%;
  min-height: 64rpx;
  margin: 6rpx 0 10rpx;
  border-top: 2rpx solid rgba(178, 130, 62, 0.12);
  border-radius: 0;
  color: rgba(120, 88, 52, 0.9);
  font-size: 21rpx;
  font-weight: 800;
}

.empty-card {
  padding: 34rpx 24rpx;
  text-align: center;
}

.empty-card text {
  display: block;
  color: rgba(88, 70, 58, 0.55);
  font-size: 21rpx;
}

.empty-card text:first-child {
  color: #241a15;
  font-size: 25rpx;
  font-weight: 800;
}
</style>
