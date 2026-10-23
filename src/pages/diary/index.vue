<template>
  <view class="app-page play-page">
    <view class="app-shell">
      <view class="topbar">
        <view>
          <text class="topbar-kicker">
            单机娱乐 · 离线可玩
          </text>
          <text class="topbar-title">
            转盘 · 抽签 · 骰子
          </text>
          <text class="topbar-subtitle">
            全部结果都保存在本机，不需要登录。
          </text>
        </view>
        <button class="topbar-link" hover-class="none" @tap="goHome">
          <text>首页</text>
          <ChevronRight :size="14" />
        </button>
      </view>

      <!-- 玩法入口：一条分段控件，四个入口等高，切换时整块内容淡入上移 -->
      <view class="tool-strip">
        <button
          v-for="tool in tools"
          :key="tool.id"
          class="tool-tab"
          :class="{ active: activeTool === tool.id }"
          hover-class="none"
          @tap="activeTool = tool.id"
        >
          <view class="tool-glyph">
            <view v-if="tool.id === 'wheel'" class="glyph-wheel">
              <view class="glyph-wheel__hub" />
            </view>
            <view v-else-if="tool.id === 'lots'" class="glyph-lots">
              <view class="glyph-lots__sticks">
                <view />
                <view />
                <view />
              </view>
              <view class="glyph-lots__tube" />
            </view>
            <view v-else-if="tool.id === 'dice'" class="glyph-dice">
              <view class="glyph-dice__pip" />
              <view class="glyph-dice__pip is-center" />
              <view class="glyph-dice__pip" />
            </view>
            <component v-else :is="Sparkles" :size="18" />
          </view>
          <text class="tool-tab__label">{{ tool.title }}</text>
        </button>
      </view>
      <text class="tool-hint">{{ activeToolInfo.desc }}</text>

      <view class="section">
        <!-- key 跟着玩法走：切换时整块重建，配 CSS 动画做淡入上移 -->
        <view :key="activeTool" class="tool-stage">
          <LuckyWheel
            v-if="activeTool === 'wheel'"
            :scope="scope"
            :custom-enabled="!userStore.guest"
            kicker="LUCKY WHEEL"
            subtitle="按权重随机，指针停下的扇区就是答案。"
            @result="handleWheelResult"
          />

          <view v-if="activeTool === 'lots'" class="render-switch">
            <text>{{ useSimpleLots ? '当前：轻量签筒（更稳）' : '当前：3D 签筒' }}</text>
            <button class="render-switch__btn" hover-class="none" @tap="toggleLotsRender">
              {{ useSimpleLots ? '试着开 3D' : '切回轻量' }}
            </button>
          </view>
          <LuckySticks3D
            v-if="activeTool === 'lots' && !useSimpleLots"
            :key="`lots-${scope}-${lotThemeKey}`"
            :scope="scope"
            :active="pageVisible"
            kicker="LUCKY STICKS 3D"
            @result="handleLotsResult"
            @unavailable="handleLotsUnavailable"
          />
          <FortuneSticks
            v-if="activeTool === 'lots' && useSimpleLots"
            :scope="scope"
            :active="pageVisible"
            kicker="FORTUNE STICKS"
            @result="handleLotsResult"
          />

          <view v-if="activeTool === 'dice'" class="render-switch">
            <text>{{ useSimpleDice ? '当前：简易骰盅（更稳）' : '当前：3D 骰盅' }}</text>
            <button class="render-switch__btn" hover-class="none" @tap="toggleDiceRender">
              {{ useSimpleDice ? '试着开 3D' : '切回简易' }}
            </button>
          </view>
          <DiceCup3D
            v-if="activeTool === 'dice' && !useSimpleDice"
            :scope="scope"
            :active="pageVisible"
            kicker="DICE CUP 3D"
            subtitle="three.js 实时渲染，手机摇一摇，骰子在盅里真碰撞。"
            @result="handleDiceResult"
            @unavailable="applyDiceRender(true)"
          />
          <DiceCup
            v-if="activeTool === 'dice' && useSimpleDice"
            :scope="scope"
            :active="pageVisible"
            kicker="DICE CUP"
            subtitle="简易模式：拿起手机上下摇，摇完揭盅看点数。"
            @result="handleDiceResult"
          />

          <!-- 刮刮乐：登录后用米贝兑换；游客可以免费玩一次 -->
          <view v-if="activeTool === 'scratch'" class="scratch-gate">
            <ScratchCard
              v-if="activeScratch"
              :key="activeScratch.token"
              :scope="scope"
              :style-id="activeScratch.styleId"
              :ticket-data="activeScratch.ticket"
              :consumed="activeScratch.used"
              lock-style
              kicker="SCRATCH CARD"
              @result="handleScratchResult"
              @back-to-store="backToStore"
            />

            <view v-else class="store-card app-card">
              <view class="store-head">
                <text class="store-title">
                  选一张票
                </text>
                <text class="store-balance">
                  {{ userStore.guest ? `免费剩 ${freeScratchLeft} 次` : `我的米贝 ${walletBalance}` }}
                </text>
              </view>

              <view v-if="lastScratch" class="store-last">
                <text>上一张已刮完：{{ lastScratch.total ? `中 ${lastScratch.total} 米贝` : '未中奖' }}</text>
              </view>

              <view v-if="userStore.guest" class="store-free" :class="{ 'store-free--out': freeScratchLeft <= 0 }">
                <text v-if="freeScratchLeft > 0" class="store-free-text">
                  游客可以免费体验 {{ freeScratchLeft }} 次刮刮乐，选一张直接开刮。
                </text>
                <text v-else class="store-free-text">
                  游客免费次数已经用完了。登录后送 100 米贝，可以继续兑换。
                </text>
                <button v-if="freeScratchLeft <= 0" class="store-free-btn" hover-class="none" @tap="goLogin">
                  去登录
                </button>
              </view>

              <view
                v-for="item in scratchItems"
                :key="item.id"
                class="store-item"
                @tap="buyTicket(item)"
              >
                <view class="store-item__copy">
                  <text class="store-item__title">{{ item.title }}</text>
                  <text class="store-item__sub">
                    {{ item.subtitle }} · 最高 {{ item.topPrize }} 米贝 · 中奖率 {{ formatRate(item.winRate) }}
                  </text>
                </view>
                <text class="store-item__price">{{ userStore.guest ? '免费' : `${item.price} 米贝` }}</text>
              </view>
              <text class="store-tip">
                {{ userStore.guest
                  ? '登录后中奖金额才会进米贝账户。'
                  : `米贝不够就去玩转盘、签筒、骰子，一局攒 ${playReward} 米贝。` }}
              </text>

              <!-- 温馨提示：说明米贝只是站内虚拟积分 -->
              <view class="store-notice">
                <view class="store-notice__copy">
                  <view class="store-notice__head">
                    <ShieldCheck :size="16" />
                    <text>温馨提示</text>
                  </view>
                  <text class="store-notice__text">刮刮乐是站内娱乐玩法，米贝为 App 内虚拟积分，不能提现、不能兑换现金或实物。</text>
                  <text class="store-notice__apple">{{ marketNotice.short }}</text>
                  <button class="store-notice__link" hover-class="none" @tap="openRules">
                    查看完整活动规则 ›
                  </button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">
            最近结果
          </text>
          <button v-if="history.length" class="section-link" hover-class="none" @tap="clearHistory">
            <text>清空</text>
          </button>
        </view>

        <view v-if="history.length" class="history-list">
          <view
            v-for="(item, index) in history"
            :key="item.id"
            class="history-item"
            :style="{ animationDelay: `${Math.min(index, 8) * 45}ms` }"
          >
            <view class="history-icon" :class="`history-icon--${item.kind}`">
              <component :is="historyIcon(item.kind)" :size="16" />
            </view>
            <view class="history-copy">
              <text>{{ item.title }}</text>
              <text>{{ item.result }}</text>
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
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useAppStore, useUserStore } from '@/stores'
import { ChevronRight, Clock3, RefreshCw, ShieldCheck, Sparkles } from '@/components/icons'
import LuckyWheel from '@/components/play/LuckyWheel.vue'
import FortuneSticks from '@/components/play/FortuneSticks.vue'
import LuckySticks3D from '@/components/play/LuckySticks3D.vue'
import DiceCup from '@/components/play/DiceCup.vue'
import DiceCup3D from '@/components/play/DiceCup3D.vue'
import ScratchCard from '@/components/play/ScratchCard.vue'
import { clearPlayHistory, getPlayHistory } from '@/utils/play-data'
import { EXCHANGE_ITEMS } from '@/utils/exchange'
import { getMarketNotice } from '@/utils/market-notice'
import { buildTicket } from '@/utils/scratch-library'
import { PLAY_REWARD, earnMibe, getFreeScratchLeft, getWallet, spendMibe, useFreeScratch } from '@/utils/wallet'

const userStore = useUserStore()
const appStore = useAppStore()

const tools = [
  { id: 'wheel', title: '大转盘', desc: '权重随机 · 吃什么都能定' },
  { id: 'lots', title: '摇签筒', desc: '摇手机求签 · 48 支签文' },
  { id: 'dice', title: '摇骰盅', desc: '摇手机 · 揭盅看点数' },
  { id: 'scratch', title: '刮刮乐', desc: '米贝兑换 · 每张票价不同' }
]

const scratchItems = EXCHANGE_ITEMS.filter((item) => item.kind === 'scratch')
const playReward = PLAY_REWARD

const activeTool = ref('wheel')
const pageVisible = ref(true)
const activeToolInfo = computed(() => tools.find((item) => item.id === activeTool.value) || tools[0])
const useSimpleDice = ref(readDiceRenderPref())
const DICE_RENDER_KEY = 'MiBeiHileDiceRenderV1'
function readDiceRenderPref () {
  try {
    return uni.getStorageSync(DICE_RENDER_KEY) === 'simple'
  } catch (error) {
    return false
  }
}
function applyDiceRender (simple) {
  useSimpleDice.value = simple
  try {
    uni.setStorageSync(DICE_RENDER_KEY, simple ? 'simple' : '3d')
  } catch (error) {
    // 存储失败不影响本次使用
  }
}
function toggleDiceRender () {
  applyDiceRender(!useSimpleDice.value)
}
// 签筒默认进 3D；用户手动切过（或者这台机器确实起不来 3D）就记住选择
const LOTS_RENDER_KEY = 'MiBeiHileLotsRenderV1'
function readLotsRenderPref () {
  try {
    return uni.getStorageSync(LOTS_RENDER_KEY) === 'simple'
  } catch (error) {
    return false
  }
}
const useSimpleLots = ref(readLotsRenderPref())
// 3D 签筒靠一次性 init 拿签题数据，所以切签种时用 key 重建一次，保证签面与结果对应
const lotThemeKey = ref(0)

function setLotsRender (simple) {
  useSimpleLots.value = simple
  lotThemeKey.value += 1
  try {
    uni.setStorageSync(LOTS_RENDER_KEY, simple ? 'simple' : '3d')
  } catch (error) {
    // 存储失败不影响本次使用
  }
}

function toggleLotsRender () {
  setLotsRender(!useSimpleLots.value)
}

// 3D 真的起不来（老机型 WebGL 不可用）就自动落到轻量签筒，并告诉用户一声
function handleLotsUnavailable () {
  if (useSimpleLots.value) return
  setLotsRender(true)
  uni.showToast({ title: '这台机器 3D 起不来，已切到简易签筒', icon: 'none', duration: 2400 })
}
const scope = ref('guest')
/** 平台方无关声明：iOS 写 Apple，安卓写应用市场（审核 5.3.2 要求必须展示） */
const marketNotice = getMarketNotice()
const history = ref([])
const walletBalance = ref(0)
/** 游客剩余免费刮券次数 */
const freeScratchLeft = ref(getFreeScratchLeft())
/** 已经兑换好的票：{ styleId, token }，兑换一张就换一次 token（组件重建 = 新票） */
const activeScratch = ref(null)
/** 上一张票的结算结果，回选票页时给个交代 */
const lastScratch = ref(null)

function historyIcon (kind) {
  return {
    wheel: RefreshCw,
    lots: Sparkles,
    scratch: Sparkles,
    dice: Clock3
  }[kind] || Clock3
}

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

function loadHistory () {
  const merged = [...getPlayHistory(scope.value)]
  merged.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
  history.value = merged.slice(0, 12)
}

function refreshWallet () {
  walletBalance.value = getWallet(scope.value).balance
  freeScratchLeft.value = getFreeScratchLeft(scope.value)
}

/** 中奖率文案：25% / 22% / 18%（和票面配置同一个来源） */
function formatRate (rate) {
  const value = Number(rate) || 0
  return `${String(Math.round(value * 1000) / 10).replace(/\.?0+$/, '')}%`
}

/**
 * 免费玩法：每局给一点米贝（游客没有米贝，earnMibe 里会忽略）。
 * 注意必须写成真正的方法，不能写成 `@result="handlePlayResult('大转盘')"`
 * —— 那种写法只是「求值出一个函数」，事件回调并不会被执行，米贝根本不会加。
 */
function rewardFreePlay (label) {
  earnMibe(scope.value, PLAY_REWARD, `${label} · 玩了一局`)
  refreshWallet()
  loadHistory()
}

function handleWheelResult () {
  rewardFreePlay('大转盘')
}

function handleLotsResult () {
  rewardFreePlay('摇签筒')
}

function handleDiceResult () {
  rewardFreePlay('摇骰盅')
}

/** 刮刮乐结算：中奖金额直接进米贝 */
function handleScratchResult (payload = {}) {
  const amount = Math.max(0, Math.round(Number(payload.amount) || 0))
  // 这张票用掉了：票面数据和「已刮完」状态都留在页面上，
  // 重新挂载时只会显示结算结果，不会变回一张可刮的新票
  if (activeScratch.value) {
    activeScratch.value = { ...activeScratch.value, used: true }
  }
  lastScratch.value = { total: amount }
  if (amount > 0 && userStore.guest) {
    uni.showToast({ title: `中 ${amount} 米贝！登录后才入账`, icon: 'none', duration: 2600 })
  } else if (amount > 0) {
    earnMibe(scope.value, amount, `刮刮乐中奖 +${amount}`)
    uni.showToast({ title: `中 ${amount} 米贝，已到账`, icon: 'none', duration: 2200 })
  }
  refreshWallet()
  loadHistory()
}

function goLogin () {
  uni.navigateTo({ url: '/pages/login/index?from=scratch' })
}

/** 活动规则常驻入口：审核（5.3.2）要求规则随时可查 */
function openRules () {
  uni.navigateTo({ url: '/pages/rules/index' })
}

function payForTicket (item) {
  try {
    spendMibe(scope.value, item.price, `兑换《${item.title}》`)
  } catch (error) {
    uni.showToast({ title: error.message || '兑换失败', icon: 'none' })
    return false
  }
  refreshWallet()
  /*
   * 票面数据在付款这一刻就定下来，跟着 token 一起存。
   * 组件重新挂载时用同一份数据重建，不会变出一张新的免费票。
   */
  activeScratch.value = {
    styleId: item.styleId,
    token: `${item.styleId}-${Date.now()}`,
    ticket: buildTicket(item.styleId),
    used: false
  }
  uni.showToast({ title: `已兑 ${item.title}`, icon: 'none' })
  return true
}

function buyTicket (item) {
  // 游客：先看还有没有免费次数，用完就引导登录
  if (userStore.guest) {
    if (freeScratchLeft.value <= 0) {
      uni.showModal({
        title: '免费次数用完了',
        content: '游客只能免费玩一次刮刮乐。登录后送 100 米贝，可以继续兑换。',
        confirmText: '去登录',
        confirmColor: '#ff5d8f',
        success: (res) => {
          if (res.confirm) goLogin()
        }
      })
      return
    }
    /*
     * 免费次数也要先确认再开票。
     * 之前是点了就直接出票，看起来像「没兑换也能刮」，
     * 而且游客中奖金额不进账户，容易误解成白刮。
     */
    uni.showModal({
      title: `免费体验《${item.title}》`,
      content: '游客只能免费玩一次刮刮乐，中奖金额需要登录后才会入账。',
      confirmText: '开始刮',
      cancelText: '取消',
      confirmColor: '#ff5d8f',
      success: (res) => {
        if (!res.confirm) return
        if (useFreeScratch(scope.value)) {
          refreshWallet()
          activeScratch.value = {
            styleId: item.styleId,
            token: `${item.styleId}-${Date.now()}`,
            ticket: buildTicket(item.styleId),
            used: false
          }
          uni.showToast({ title: `免费体验《${item.title}》`, icon: 'none' })
        }
      }
    })
    return
  }
  if (walletBalance.value < item.price) {
    uni.showToast({ title: `米贝不够，还差 ${item.price - walletBalance.value}`, icon: 'none' })
    return
  }
  uni.showModal({
    title: `兑换《${item.title}》`,
    content: `花 ${item.price} 米贝刮一张，最高奖励 ${item.topPrize} 米贝。`,
    confirmText: '兑换',
    confirmColor: '#ff5d8f',
    success: (res) => {
      if (res.confirm) payForTicket(item)
    }
  })
}

/** 刮完之后回到选票列表，用户可以自己挑另一张票（不用重复买同一种） */
function backToStore () {
  activeScratch.value = null
}

function goHome () {
  uni.switchTab({ url: '/pages/home/index' })
}

function clearHistory () {
  uni.showModal({
    title: '清空记录',
    content: '会清掉本机保存的所有玩法记录，确定吗？',
    confirmColor: '#ff5d8f',
    success: (res) => {
      if (!res.confirm) return
      clearPlayHistory(scope.value)
      loadHistory()
      uni.showToast({ title: '已清空', icon: 'none' })
    }
  })
}

onShow(async () => {
  pageVisible.value = true
  // 玩法列表会变（真心话已换成情侣任务），本地存着旧 id 时要兜回第一个，
  // 否则进来会是一片空白
  const stored = appStore.activePlayTool
  activeTool.value = tools.some((item) => item.id === stored) ? stored : 'wheel'
  scope.value = await resolveScope()
  refreshWallet()
  // 兑换中心刚买的票：切过来直接开刮
  const pending = appStore.consumePendingScratch()
  if (pending) {
    activeTool.value = 'scratch'
    activeScratch.value = { styleId: pending.styleId, token: pending.token }
  }
  loadHistory()
  /*
   * 登录用户在后台对一次云端（30 秒内只拉一次，成本很低）：
   * 别的设备上花的米贝、改过的转盘，切过来就能看到。
   */
  userStore.syncCloudData().then((adopted) => {
    if (adopted) {
      refreshWallet()
      loadHistory()
    }
  })
})

onHide(() => {
  pageVisible.value = false
  /*
   * 离开页面时，只把「已经刮完」的票收起来：
   * 下次进来看到的是选票页（带上一张的结果），不会出现「没兑换又冒出一张可刮的票」。
   * 还没刮的票要留着 —— 那是花米贝买的，切后台回来不能把票弄丢。
   */
  if (activeScratch.value && activeScratch.value.used) activeScratch.value = null
})

watch(activeTool, (toolId) => {
  appStore.setActivePlayTool(toolId)
})
</script>

<style lang="scss" scoped>
.play-page {
  /* 全站偏粉，这一页收成「暖纸 + 单一胭脂色」：四张卡各一个颜色是最像半成品的地方 */
  background:
    radial-gradient(120% 42% at 50% 0%, rgba(214, 168, 96, 0.16), rgba(214, 168, 96, 0) 60%),
    linear-gradient(180deg, #fdf9f3 0%, #fbf5ec 100%);
}

/* 卡片圆角统一放大一档，8px 太方，是「旧」的主要来源 */
.play-page :deep(.app-card) {
  border-radius: 24rpx;
  border-color: rgba(178, 130, 62, 0.16);
  box-shadow: 0 14rpx 34rpx rgba(88, 52, 40, 0.06);
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
  margin-top: 10rpx;
  color: #241a15;
  font-size: 44rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
  line-height: 1.1;
}

.topbar-subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(88, 70, 58, 0.6);
  font-size: 21rpx;
  line-height: 1.5;
}

.topbar-link,
.section-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  min-height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.topbar-link {
  border: 1rpx solid rgba(178, 130, 62, 0.24);
  background: rgba(255, 255, 255, 0.7);
  color: rgba(120, 88, 52, 0.9);
  font-weight: 800;
}

/* ---------- 玩法入口 ---------- */

/* 四个入口共用一条分段控件：牌子矮了，游戏就往上走，不用先滚屏才能玩 */
.tool-strip {
  display: flex;
  gap: 6rpx;
  margin-top: 24rpx;
  padding: 8rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.16);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 10rpx 26rpx rgba(88, 52, 40, 0.05);
}

.tool-tab {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 4rpx 14rpx;
  border-radius: 20rpx;
  transition: background 0.24s ease;
}

.tool-tab.active {
  background: linear-gradient(180deg, rgba(224, 87, 126, 0.14), rgba(224, 87, 126, 0.05));
}

.tool-tab__label {
  color: rgba(88, 70, 58, 0.6);
  font-size: 21rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  transition: color 0.24s ease;
}

.tool-tab.active .tool-tab__label {
  color: #b23a5c;
  font-weight: 900;
}

/* 图标统一单色，靠形状区分功能，不再一个功能一个色 */
.tool-glyph {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  color: rgba(88, 70, 58, 0.46);
  transition: color 0.24s ease, transform 0.3s cubic-bezier(0.22, 0.9, 0.28, 1);
}

.tool-tab.active .tool-glyph {
  color: #e0577e;
  transform: translateY(-2rpx) scale(1.08);
}

.tool-hint {
  display: block;
  margin-top: 14rpx;
  padding: 0 8rpx;
  color: rgba(88, 70, 58, 0.56);
  font-size: 21rpx;
  letter-spacing: 1rpx;
}

/* 玩法内容整体入场：切玩法时淡入上移，替换掉原来的硬切 */
.tool-stage {
  /*
   * 注意：这里不能用 animation-fill-mode: both / forwards。
   * 动画结束后会保留 transform: translateY(0)，而祖先元素只要带 transform，
   * 里面的 position: fixed（骰盅/签筒的全屏舞台）就会相对这个祖先定位，
   * 全屏会整体偏移、跑出屏幕。动画播完必须回到没有 transform 的状态。
   */
  animation: play-rise 340ms cubic-bezier(0.22, 0.9, 0.28, 1);
}

@keyframes play-rise {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.glyph-wheel {
  position: relative;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 3rpx solid currentColor;
  background:
    linear-gradient(currentColor, currentColor) 50% 0 / 3rpx 100% no-repeat,
    linear-gradient(currentColor, currentColor) 0 50% / 100% 3rpx no-repeat;
}

.glyph-wheel__hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12rpx;
  height: 12rpx;
  margin: -6rpx 0 0 -6rpx;
  border-radius: 50%;
  background: currentColor;
}

.glyph-lots {
  position: relative;
  width: 42rpx;
  height: 42rpx;
}

.glyph-lots__sticks {
  position: absolute;
  left: 50%;
  top: 0;
  width: 22rpx;
  margin-left: -11rpx;
  display: flex;
  justify-content: space-between;
}

.glyph-lots__sticks view {
  width: 4rpx;
  height: 24rpx;
  border-radius: 2rpx;
  background: currentColor;
}

.glyph-lots__sticks view:nth-child(2) {
  height: 30rpx;
}

.glyph-lots__tube {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 38rpx;
  height: 24rpx;
  margin-left: -19rpx;
  border-radius: 6rpx 6rpx 8rpx 8rpx;
  background: currentColor;
}

.glyph-dice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  border: 3rpx solid currentColor;
}

.glyph-dice__pip {
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: currentColor;
}

.glyph-dice__pip.is-center {
  width: 8rpx;
  height: 8rpx;
}

/* ---------- 通用区块 ---------- */

.section {
  margin-top: 26rpx;
}

/* 3D / 轻量切换是给我们自己看的兜底开关，收成一行小声提示，别抢主按钮 */
.render-switch {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  /* 文案 + 按钮在窄屏放不下时要能换行，否则会把整行撑宽 */
  flex-wrap: wrap;
  gap: 14rpx;
  margin-bottom: 14rpx;
  padding: 0 8rpx;
  color: rgba(88, 70, 58, 0.5);
  font-size: 19rpx;
}

.render-switch__btn {
  flex: 0 0 auto;
  min-height: 46rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.24);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  color: rgba(120, 88, 52, 0.86);
  font-size: 19rpx;
  font-weight: 800;
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

.section-link {
  border: 1rpx solid rgba(178, 130, 62, 0.2);
  background: rgba(255, 255, 255, 0.7);
  color: rgba(120, 88, 52, 0.82);
  font-weight: 700;
}

/* ---------- 历史 ---------- */

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.12);
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.66);
  /* 逐条错开入场，长列表不再是一次性糊上来 */
  animation: play-rise 380ms cubic-bezier(0.22, 0.9, 0.28, 1) both;
}

.history-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 16rpx;
  background: rgba(224, 87, 126, 0.1);
  color: #b23a5c;
  flex: 0 0 auto;
}

.history-copy {
  min-width: 0;
  flex: 1;
}

.history-copy text {
  display: block;
}

.history-copy text:first-child {
  color: #241a15;
  font-size: 23rpx;
  font-weight: 900;
}

.history-copy text:last-child {
  margin-top: 4rpx;
  color: rgba(88, 70, 58, 0.56);
  font-size: 19rpx;
}

.history-time {
  color: rgba(88, 70, 58, 0.44);
  font-size: 19rpx;
}

.empty-card {
  padding: 26rpx 22rpx;
  border-radius: 24rpx;
  color: rgba(88, 70, 58, 0.58);
  font-size: 21rpx;
}

.empty-card text {
  display: block;
}

.empty-card text:last-child {
  margin-top: 4rpx;
}

/* ------------------------- 刮刮乐兑换区 ------------------------- */

.scratch-gate {
  margin-top: 8rpx;
}

.gate-card {
  padding: 34rpx 26rpx;
  text-align: center;
}

.gate-title {
  display: block;
  color: #241a15;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.gate-desc {
  display: block;
  margin-top: 14rpx;
  color: rgba(88, 70, 58, 0.7);
  font-size: 21rpx;
  line-height: 1.6;
  text-align: left;
}

.gate-btn {
  margin-top: 22rpx;
  min-height: 76rpx;
  border: 0;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 26rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

.store-card {
  padding: 24rpx;
}

.store-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.store-title {
  color: #241a15;
  font-size: 28rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.store-balance {
  color: #a3271f;
  font-size: 21rpx;
  font-weight: 800;
}

/* 游客免费次数提示条 */
.store-free {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
  padding: 16rpx 18rpx;
  border-radius: 12rpx;
  background: rgba(75, 191, 154, 0.14);
}

.store-free--out {
  background: rgba(224, 87, 126, 0.12);
}

/* 上一张票的结果，回到选票页时给个交代 */
.store-last {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 12rpx;
  background: rgba(178, 130, 62, 0.12);
  color: rgba(120, 88, 52, 0.95);
  font-size: 20rpx;
  line-height: 1.5;
}

.store-free-text {
  flex: 1;
  min-width: 0;
  color: rgba(58, 76, 68, 0.9);
  font-size: 20rpx;
  line-height: 1.5;
  white-space: normal;
}

.store-free-btn {
  flex: 0 0 auto;
  min-height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 21rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

.store-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid rgba(178, 130, 62, 0.14);
}

.store-item:last-of-type {
  border-bottom: 0;
}

.store-item__copy {
  min-width: 0;
  flex: 1;
}

.store-item__title {
  display: block;
  color: #241a15;
  font-size: 26rpx;
  font-weight: 800;
}

.store-item__sub {
  display: block;
  margin-top: 6rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 22rpx;
}

.store-item__price {
  flex: 0 0 auto;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 22rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #d8232a, #9e1b1b);
}

.store-tip {
  display: block;
  margin-top: 18rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 19rpx;
  line-height: 1.5;
}

/* 温馨提示：米贝只是站内虚拟积分 */
.store-notice {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 18rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.22);
  border-radius: 18rpx;
  background: rgba(255, 249, 235, 0.92);
}

.store-notice__copy {
  flex: 1;
  min-width: 0;
}

.store-notice__head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
  color: #8a6a3c;
}

.store-notice__head text {
  color: #8a6a3c;
  font-size: 23rpx;
  font-weight: 850;
}

.store-notice__text {
  display: block;
  color: rgba(88, 70, 58, 0.8);
  font-size: 22rpx;
  line-height: 1.62;
}

/* 平台方无关声明：审核要求必须能一眼看到（iOS 显示 Apple，安卓显示应用市场） */
.store-notice__apple {
  display: block;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed rgba(200, 16, 46, 0.22);
  color: #8c1f28;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.6;
}

.store-notice__link {
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
</style>
