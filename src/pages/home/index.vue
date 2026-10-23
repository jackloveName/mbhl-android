<template>
  <view class="app-page home-page">
    <view class="app-shell">
      <view class="topbar">
        <view>
          <text class="topbar-kicker">
            米贝嗨乐
          </text>
          <text class="topbar-title">
            {{ greeting }}
          </text>
          <text class="topbar-subtitle">
            {{ sessionLabel }}
          </text>
        </view>
        <button class="topbar-link" hover-class="none" @tap="goMine">
          <text>我的</text>
          <ChevronRight :size="14" />
        </button>
      </view>

      <!-- 米贝：登录用户的余额，游客显示引导 -->
      <view class="wallet-card app-card">
        <view class="wallet-head">
          <!-- 长按这里看版本更新排查（手机上没控制台，这是最省事的入口） -->
          <view @longpress="showUpdateDiagnostics">
            <text class="wallet-label">
              我的米贝
            </text>
            <text class="wallet-value">
              {{ wallet.balance }}
            </text>
          </view>
          <button v-if="!isGuest" class="wallet-link" hover-class="none" @tap="goExchange">
            去兑换
          </button>
        </view>
        <text class="wallet-tip">
          {{ isGuest
            ? `游客可以免费玩大转盘、摇签筒、摇骰子，刮刮乐免费 ${freeScratchLeft} 次；登录送 100 米贝，中奖也能入账。`
            : '玩一局免费玩法攒 1 米贝，攒够了去兑换中心换刮刮乐。' }}
        </text>
        <button v-if="isGuest" class="wallet-btn" hover-class="none" @tap="goLogin">
          登录 / 注册
        </button>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">
            玩法
          </text>
          <text class="section-subtitle">
            免费三样 · 刮刮乐用米贝
          </text>
        </view>
        <view class="action-grid">
          <button
            v-for="item in quickActions"
            :key="item.id"
            class="action-card app-card"
            hover-class="none"
            @tap="handleAction(item.id)"
          >
            <view class="action-icon" :class="`action-icon--${item.tone}`">
              <component :is="iconMap[item.icon]" :size="18" />
            </view>
            <view class="action-copy">
              <text>{{ item.title }}</text>
              <text>{{ item.desc }}</text>
            </view>
            <ChevronRight :size="14" />
          </button>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">
            兑换中心
          </text>
          <text class="section-subtitle">
            {{ scratchCount }} 张刮刮乐
          </text>
        </view>
        <button class="exchange-card app-card" hover-class="none" @tap="goExchange">
          <view class="exchange-copy">
            <text class="exchange-title">
              用米贝换票，最高 {{ topPrize }} 米贝
            </text>
            <text class="exchange-desc">
              每张票价不同，以后还会上新的兑换物。
            </text>
          </view>
          <ChevronRight :size="14" />
        </button>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">
            最近记录
          </text>
          <text class="section-subtitle">
            {{ recentHistory.length }} 条
          </text>
        </view>
        <view v-if="recentHistory.length" class="history-list app-card">
          <view v-for="item in recentHistory" :key="item.id" class="history-item">
            <view class="history-copy">
              <text class="history-title">{{ item.title }}</text>
              <text class="history-result">{{ item.result }}</text>
            </view>
            <text class="history-time">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
        <view v-else class="empty-card app-card">
          <text>还没有记录</text>
          <text>转一次转盘、摇一支签，这里就会长出来。</text>
        </view>
      </view>
    </view>

    <!-- #ifdef APP-PLUS -->
    <!-- 版本更新弹窗：挂在首页，只有 borrowFlag === 1 的账号才会触发检查 -->
    <AppUpdateDialog ref="appUpdateRef" />
    <!-- #endif -->
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppUpdateDialog from '@/components/AppUpdateDialog.vue'
import { useAppStore, useUserStore } from '@/stores'
import { BadgePercent, ChevronRight, Clock3, RefreshCw, Sparkles } from '@/components/icons'
import { EXCHANGE_ITEMS } from '@/utils/exchange'
import { getPlayHistory } from '@/utils/play-data'
import { getFreeScratchLeft, getWallet, isGuestScope } from '@/utils/wallet'

const userStore = useUserStore()
const appStore = useAppStore()
const scope = ref('guest')
const wallet = ref(getWallet('guest'))
const appUpdateRef = ref(null)
const freeScratchLeft = ref(getFreeScratchLeft())
const recentHistory = ref([])

const iconMap = {
  sparkles: Sparkles,
  refresh: RefreshCw,
  badgePercent: BadgePercent,
  clock3: Clock3
}

const quickActions = [
  { id: 'wheel', icon: 'refresh', title: '大转盘', desc: '按权重随机，今天吃什么', tone: 'coral' },
  { id: 'lots', icon: 'sparkles', title: '摇签筒', desc: '摇手机求签，48 支签文', tone: 'warm' },
  { id: 'dice', icon: 'badgePercent', title: '摇骰子', desc: '拿起手机上下摇，揭盅看点', tone: 'violet' },
  { id: 'scratch', icon: 'clock3', title: '刮刮乐', desc: '米贝兑换，每张票价不同', tone: 'mint' }
]

const scratchItems = EXCHANGE_ITEMS.filter((item) => item.kind === 'scratch')
const scratchCount = computed(() => scratchItems.length)
const topPrize = computed(() => scratchItems.reduce((max, item) => Math.max(max, item.topPrize || 0), 0))
const isGuest = computed(() => isGuestScope(scope.value))

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，来玩一把'
  if (hour < 12) return '早上好，今天交给米贝'
  if (hour < 18) return '下午好，来一发决定'
  return '晚上好，转盘还是签筒？'
})

const sessionLabel = computed(() => (
  userStore.guest ? '游客模式 · 只保存在本机' : `已登录 · ${userStore.displayName}`
))

function formatTime (value) {
  return String(value || '').slice(5, 16).replace('-', '/')
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

/** 先把本地这份画出来，别让页面等云端 */
function refreshLocal () {
  wallet.value = getWallet(scope.value)
  freeScratchLeft.value = getFreeScratchLeft(scope.value)
  recentHistory.value = getPlayHistory(scope.value).slice(0, 6)
}

/** 登录用户在后台对一次云端，拿到新数据再刷新一遍 */
async function pullCloudData () {
  const adopted = await userStore.syncCloudData()
  if (adopted) refreshLocal()
}

async function hydrate () {
  scope.value = await resolveScope()
  refreshLocal()
  pullCloudData()
}

/**
 * 版本更新的触发条件（照 jianzhirj 首页那套）：
 * 取用户信息里的 borrowFlag，只有 === 1 才去判断要不要弹更新框；
 * 不等于 1（或取不到）就完全不查、不弹。
 */
async function shouldCheckAppUpdate () {
  try {
    // 上面 hydrate 已经把用户信息拉回来了，这里优先用缓存，避免多打一次接口
    const cached = userStore.profile || {}
    const profile = Object.keys(cached).length ? cached : await userStore.getInfo()
    return Number(profile?.borrowFlag) === 1
  } catch (error) {
    return false
  }
}

async function runAppUpdateCheck () {
  if (!(await shouldCheckAppUpdate())) return false
  return Boolean(await appUpdateRef.value?.checkAppUpdate?.())
}

/**
 * 长按米贝卡片：把「为什么没弹更新框」的原因直接显示出来。
 * 手机上没有控制台，这是最省事的排查入口。
 */
async function showUpdateDiagnostics () {
  let borrowFlag = '未知'
  try {
    const profile = await userStore.getInfo()
    borrowFlag = (profile?.borrowFlag === undefined || profile?.borrowFlag === null)
      ? '后台没返回这个字段'
      : String(profile.borrowFlag)
  } catch (error) {
    borrowFlag = `读取失败：${error?.message || error}`
  }

  const result = appUpdateRef.value?.getLastCheckResult?.()
  const lines = [
    `borrowFlag：${borrowFlag}`,
    borrowFlag === '1' ? '（等于 1，会去查版本）' : '（不等于 1，不查版本、不弹框）'
  ]

  if (!result) {
    lines.push('本轮还没有检查过版本')
  } else if (result.failed) {
    lines.push(`检查失败：${result.reason}`)
  } else {
    lines.push(`平台：${result.platform} · 当前版本 ${result.currentVersion}`)
    lines.push(`后台目标版本：${result.targetVersion || '未填'}`)
    lines.push(`updateType ${result.updateType} · updateWay ${result.updateWay}`)
    lines.push(`下载地址：${result.hasDownloadUrl ? '已配置' : '未配置'}`)
    lines.push(`结论：${result.reason}`)
  }

  uni.showModal({
    title: '版本更新排查',
    content: lines.join('\n'),
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#ff5d8f'
  })
}

function goMine () {
  uni.switchTab({ url: '/pages/mine/index' })
}

function goExchange () {
  uni.switchTab({ url: '/pages/data/index' })
}

function goLogin () {
  uni.navigateTo({ url: '/pages/login/index?from=home' })
}

function handleAction (id) {
  appStore.setActivePlayTool(id)
  uni.switchTab({ url: '/pages/diary/index' })
}

onShow(async () => {
  // 先等用户信息落地，borrowFlag 才读得到（顺带避免重复请求用户信息）
  await hydrate()
  // 和 jianzhirj 一样：进首页时按 borrowFlag 判断要不要查版本更新
  runAppUpdateCheck()
})
</script>

<style lang="scss" scoped>
.home-page {
  background:
    radial-gradient(120% 44% at 50% 0%, rgba(214, 168, 96, 0.16), rgba(214, 168, 96, 0) 62%),
    linear-gradient(180deg, #fdf9f3 0%, #fbf5ec 100%);
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

/* 昵称可能很长：让左边这块能收缩，右边的「我的」永远不被打出去 */
.topbar > view:first-child {
  flex: 1;
  min-width: 0;
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
  overflow: hidden;
  color: rgba(88, 70, 58, 0.6);
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 米贝卡 */
.wallet-card {
  margin-top: 24rpx;
  padding: 26rpx;
  background: linear-gradient(140deg, #2b1420 0%, #4a2333 100%);
  border-color: rgba(255, 214, 150, 0.28);
}

.wallet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.wallet-head > view:first-child {
  min-width: 0;
}

.wallet-label {
  display: block;
  color: rgba(255, 236, 214, 0.72);
  font-size: 22rpx;
  font-weight: 700;
}

.wallet-value {
  display: block;
  margin-top: 4rpx;
  color: #ffd98a;
  font-size: 64rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.wallet-link {
  flex: 0 0 auto;
  min-height: 56rpx;
  padding: 0 22rpx;
  border: 0;
  border-radius: 999rpx;
  color: #3b1220;
  font-size: 22rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #ffe6a8, #f2c162);
}

.wallet-tip {
  display: block;
  margin-top: 14rpx;
  color: rgba(255, 236, 214, 0.68);
  font-size: 20rpx;
  line-height: 1.55;
}

.wallet-btn {
  margin-top: 20rpx;
  min-height: 74rpx;
  border: 0;
  border-radius: 999rpx;
  color: #3b1220;
  font-size: 26rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #ffe6a8, #f2c162);
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
  flex: 0 1 auto;
  overflow: hidden;
  color: rgba(88, 70, 58, 0.55);
  font-size: 20rpx;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 玩法入口 */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 22rpx 18rpx;
  text-align: left;
}

.action-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62rpx;
  height: 62rpx;
  border-radius: 18rpx;
  color: #fff6ef;
}

.action-icon--coral {
  background: linear-gradient(180deg, #ef6f8f, #cf4f6f);
}

.action-icon--warm {
  background: linear-gradient(180deg, #e8a44a, #c9822c);
}

.action-icon--violet {
  background: linear-gradient(180deg, #8f7be0, #6a55be);
}

.action-icon--mint {
  background: linear-gradient(180deg, #4bbf9a, #2c9174);
}

.action-copy {
  min-width: 0;
  flex: 1;
}

.action-copy text:first-child {
  display: block;
  color: #241a15;
  font-size: 26rpx;
  font-weight: 800;
  white-space: normal;
}

.action-copy text:last-child {
  display: block;
  margin-top: 4rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 18rpx;
  /* 按钮全局是 nowrap，卡片里的说明必须显式允许换行，不然会横向溢出 */
  white-space: normal;
}

/* 兑换入口 */
.exchange-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 26rpx;
  text-align: left;
}

.exchange-title {
  display: block;
  color: #241a15;
  font-size: 28rpx;
  font-weight: 900;
  white-space: normal;
}

.exchange-desc {
  display: block;
  margin-top: 6rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 20rpx;
  white-space: normal;
}

/* 历史 */
.history-list {
  padding: 8rpx 22rpx;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 2rpx solid rgba(178, 130, 62, 0.12);
}

.history-item:last-child {
  border-bottom: 0;
}

.history-copy {
  min-width: 0;
  flex: 1;
}

.history-title {
  display: block;
  overflow: hidden;
  color: #241a15;
  font-size: 23rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-result {
  display: block;
  margin-top: 4rpx;
  overflow: hidden;
  color: rgba(88, 70, 58, 0.6);
  font-size: 19rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  flex: 0 0 auto;
  color: rgba(88, 70, 58, 0.45);
  font-size: 18rpx;
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
