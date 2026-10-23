<template>
  <view class="app-page mine-page">
    <view class="app-shell">
      <view class="topbar">
        <view>
          <text class="topbar-kicker">
            个人中心
          </text>
          <text class="topbar-title">
            账号与米贝
          </text>
          <text class="topbar-subtitle">
            米贝、记录和账号设置都在这里。
          </text>
        </view>
      </view>

      <view v-if="userStore.guest" class="guest-card app-card">
        <view class="guest-copy">
          <text class="guest-title">
            当前是游客身份
          </text>
          <text class="guest-desc">
            游客可以免费玩大转盘、摇签筒、摇骰子，刮刮乐免费 {{ freeScratchLeft }} 次，
            但不能自定义转盘，也没有米贝。登录后送 {{ signUpBonus }} 米贝，中奖也会入账。
          </text>
        </view>
        <button class="guest-button" hover-class="none" @tap="goLogin">
          去登录
        </button>
      </view>

      <view class="profile-card app-card">
        <view class="profile-main">
          <!-- 点头像换头像（游客点会提示先登录） -->
          <UserAvatar
            :src="avatarUrl"
            :name="userStore.displayName"
            :editable="!userStore.guest"
            @change="handleAvatarChange"
            @longpress="showAvatarDiagnostics"
          />
          <view class="profile-copy">
            <text class="profile-name">
              {{ userStore.displayName }}
            </text>
            <text class="profile-badge">
              {{ userStore.guest ? '游客模式 · 数据只在本机' : '已登录' }}
            </text>
          </view>
        </view>

        <view class="profile-stats">
          <view>
            <text>{{ wallet.balance }}</text>
            <text>我的米贝</text>
          </view>
          <view>
            <text>{{ playCount }}</text>
            <text>玩过几局</text>
          </view>
          <view>
            <text>{{ exchangeCount }}</text>
            <text>兑换次数</text>
          </view>
        </view>

        <button class="profile-action" hover-class="none" @tap="goExchange">
          去兑换中心
        </button>
      </view>

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
          <text>还没有米贝流水</text>
          <text>{{ userStore.guest ? '登录后玩一局就有了。' : '玩一局免费玩法，或者换一张刮刮乐。' }}</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">
            设置
          </text>
          <text class="section-subtitle">
            {{ userStore.guest ? '账号和本机数据' : '账号与云端数据' }}
          </text>
        </view>

        <view class="settings-card app-card">
          <button class="setting-row" hover-class="none" @tap="goLegal('privacy')">
            <view class="setting-copy">
              <text>隐私协议</text>
              <text>了解个人信息如何被收集、使用和保护</text>
            </view>
            <ChevronRight :size="16" />
          </button>
          <button class="setting-row" hover-class="none" @tap="goLegal('agreement')">
            <view class="setting-copy">
              <text>注册协议</text>
              <text>查看服务规则与账号条款</text>
            </view>
            <ChevronRight :size="16" />
          </button>
          <button class="setting-row" hover-class="none" @tap="goRules">
            <view class="setting-copy">
              <text>刮刮乐活动规则</text>
              <text>参与方式、中奖概率与奖励说明（含平台方声明）</text>
            </view>
            <ChevronRight :size="16" />
          </button>
          <!-- 登录后数据都存在账号下，本机这份只是缓存，没有「清理本机记录」这一说 -->
          <button v-if="userStore.guest" class="setting-row" hover-class="none" @tap="clearCache">
            <view class="setting-copy">
              <text>清理本机记录</text>
              <text>删除本机玩法记录和转盘预设</text>
            </view>
            <Trash2 :size="16" />
          </button>
          <view v-else class="setting-row setting-row--info">
            <view class="setting-copy">
              <text>数据已存到账号下</text>
              <text>米贝、玩法记录、自定义转盘都跟着账号走，换设备登录也在</text>
            </view>
            <CloudUpload :size="16" />
          </view>
          <button
            v-if="!userStore.guest"
            class="setting-row setting-row--danger"
            :disabled="accountActionPending"
            hover-class="none"
            @tap="destroyCurrentAccount"
          >
            <view class="setting-copy">
              <text>注销账号</text>
              <text>永久删除账号及线上数据</text>
            </view>
            <UserX :size="16" />
          </button>
        </view>
      </view>

      <!-- 退出登录：单独一个按钮，放在页面最下方 -->
      <button class="logout-action" hover-class="none" @tap="logout">
        <text>{{ userStore.guest ? '退出游客模式' : '退出登录' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores'
import { ChevronRight, CloudUpload, Trash2, UserX } from '@/components/icons'
import UserAvatar from '@/components/UserAvatar.vue'
import { clearPlayData, getPlayData, getPlayHistory } from '@/utils/play-data'
import { SIGN_UP_BONUS, clearWallet, getFreeScratchLeft, getWallet } from '@/utils/wallet'
import {
  pickAvatarPath,
  readLastAvatar,
  resolveOssUrl,
  writeLastAvatar
} from '@/utils/file-upload'
import { setUserInfo } from '@/api/account'
import { showConfirm, toast } from '@/utils/common'

const userStore = useUserStore()
const scope = ref('guest')
const wallet = ref(getWallet('guest'))
const playCount = ref(0)
const exchangeCount = ref(0)
const freeScratchLeft = ref(getFreeScratchLeft())
/** 注销/退出进行中，避免重复点 */
const accountActionPending = ref(false)
/** 流水默认只露几条，避免一屏全是账目 */
const LOG_PREVIEW = 3
const showAllLogs = ref(false)

const signUpBonus = SIGN_UP_BONUS
/**
 * 头像地址：**你上传哪张就显示哪张**。
 * 顺序：本次刚换上的（内存）→ 本机记下的最后一次（换页也在）→ 资料接口的字段。
 * 后台资料慢半拍、回的还是上一张时，不会把界面盖回去。
 */
const justUploadedAvatar = ref('')

const avatarPath = computed(() => {
  return justUploadedAvatar.value ||
    readLastAvatar(scope.value) ||
    pickAvatarPath(userStore.profile || {})
})

const avatarUrl = computed(() => resolveOssUrl(avatarPath.value))

/**
 * 换头像：先上传拿到 OSS 路径，再写回用户资料。
 * 后端是整体更新，昵称/性别/生日要原样带上，不然会被清空。
 */
async function handleAvatarChange (file) {
  if (!file?.filePath) return
  const profile = userStore.profile || {}
  try {
    await setUserInfo({
      pic: file.filePath,
      // 昵称只认 nickName 字段，没有就传空串，别拿别的字段顶
      nickName: String(profile.nickName || '').trim(),
      sex: profile.sex ?? '',
      birthDate: profile.birthDate || ''
    })
    const savedPic = file.filePath
    // 1. 本机记住这张，界面立刻切过去（不等后台）
    writeLastAvatar(scope.value, savedPic)
    justUploadedAvatar.value = savedPic
    userStore.patchProfile({ pic: savedPic })
    toast('头像已更新', 'success')
    // 2. 后台那份也同步一下，失败不影响已经显示出来的头像
    try {
      await userStore.fetchProfile({ fresh: true })
    } catch (error) {}
    // 拉回来的资料可能还是旧图，这里再兜一次，确保显示的是刚上传的那张
    if (String(userStore.profile?.pic || '') !== savedPic) {
      userStore.patchProfile({ pic: savedPic })
    }
  } catch (error) {
    toast(error?.message || '头像保存失败，请重试')
  }
}

/** 长按头像：把资料里跟头像有关的信息全摊开，排查「为什么显示不出来」 */
function showAvatarDiagnostics () {
  const profile = userStore.profile || {}
  const keys = Object.keys(profile)
  const related = keys.filter((key) => /pic|avatar|img|photo|portrait|head/i.test(key))
  const lines = [
    `资料字段：${keys.length ? keys.join('、') : '（空）'}`,
    `头像相关字段：${related.length ? related.map((key) => `${key}=${String(profile[key] || '')}`).join('；') : '没有'}`,
    `本机记下的最后一次：${readLastAvatar(scope.value) || '（空）'}`,
    `实际显示地址：${avatarUrl.value || '（空）'}`
  ]
  uni.showModal({
    title: '头像排查',
    content: lines.join('\n'),
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#ff5d8f'
  })
}

const visibleLogs = computed(() => (
  showAllLogs.value ? wallet.value.logs : wallet.value.logs.slice(0, LOG_PREVIEW)
))

async function resolveScope () {
  if (userStore.guest) return 'guest'
  try {
    await userStore.fetchProfile()
    return await userStore.getUserMobile()
  } catch (error) {
    return 'guest'
  }
}

async function hydrateMine () {
  scope.value = await resolveScope()
  wallet.value = getWallet(scope.value)
  freeScratchLeft.value = getFreeScratchLeft(scope.value)
  playCount.value = getPlayHistory(scope.value).length
  exchangeCount.value = wallet.value.logs.filter((log) => log.type === 'spend').length
}

function goLogin () {
  uni.navigateTo({ url: '/pages/login/index?from=mine' })
}

function goExchange () {
  uni.switchTab({ url: '/pages/data/index' })
}

function goLegal (type) {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` })
}

/** 刮刮乐活动规则：审核（5.3.2）要求随时可查，这里给第二个常驻入口 */
function goRules () {
  uni.navigateTo({ url: '/pages/rules/index' })
}
async function logout () {
  const isGuest = userStore.guest
  const result = await showConfirm(
    isGuest ? '退出后将回到登录页，本机玩法记录会保留。是否继续？' : '是否退出当前账号？',
    isGuest ? '退出游客模式' : '退出登录',
    { confirmText: '退出', confirmColor: '#ff5d8f' }
  )
  if (!result.confirm) return
  try {
    // 游客没有登录态，直接清掉本地游客身份即可
    if (isGuest) userStore.clearSession()
    else await userStore.logOut()
    uni.reLaunch({ url: '/pages/login/index' })
  } catch (error) {
    toast(error?.message || '退出失败')
  }
}

async function clearCache () {
  const result = await showConfirm('删除本机玩法记录和转盘预设？米贝和登录状态会保留。', '清理记录', {
    confirmText: '清理'
  })
  if (!result.confirm) return
  clearPlayData(scope.value)
  await hydrateMine()
  toast('本机记录已清理')
}

/**
 * 注销账号：先确认再确认一次，之后调用
 * GET /mall_user/user/destroy_user?forceDestroy=false。
 */
async function destroyCurrentAccount () {
  if (userStore.guest) {
    toast('游客身份不能注销账号')
    return
  }
  const firstConfirm = await showConfirm(
    '注销后账号和云端数据将无法恢复，是否继续？',
    '注销账号',
    { confirmText: '继续', confirmColor: '#a3271f' }
  )
  if (!firstConfirm.confirm) return

  const finalConfirm = await showConfirm(
    '请再次确认：永久注销当前账号并删除相关数据。',
    '再次确认',
    { confirmText: '确认注销', confirmColor: '#a3271f' }
  )
  if (!finalConfirm.confirm) return

  accountActionPending.value = true
  try {
    await userStore.destroyAccount()
    clearWallet(scope.value)
    clearPlayData(scope.value)
    uni.reLaunch({ url: '/pages/login/index' })
  } catch (error) {
    toast(error?.message || '注销失败')
  } finally {
    accountActionPending.value = false
  }
}

onShow(() => {
  // getPlayData 只是为了把数据初始化出来，读一次即可
  getPlayData(scope.value)
  hydrateMine().catch(() => {})
})
</script>

<style lang="scss" scoped>
.mine-page {
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 111, 145, 0.16), transparent 22%),
    linear-gradient(180deg, #fdf6f8 0%, #fbf5ec 100%);
}

.topbar-kicker {
  display: block;
  color: rgba(178, 130, 62, 0.95);
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
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

.guest-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 24rpx;
}

.guest-copy {
  min-width: 0;
  flex: 1;
}

.guest-title {
  display: block;
  color: #241a15;
  font-size: 26rpx;
  font-weight: 900;
}

.guest-desc {
  display: block;
  margin-top: 8rpx;
  color: rgba(88, 70, 58, 0.65);
  font-size: 20rpx;
  line-height: 1.55;
}

.guest-button {
  flex: 0 0 auto;
  min-height: 62rpx;
  padding: 0 24rpx;
  border: 0;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 22rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #e0577e, #c8963e);
}

.profile-card {
  margin-top: 22rpx;
  padding: 26rpx;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.profile-copy {
  min-width: 0;
  flex: 1;
}

.profile-name {
  display: block;
  color: #241a15;
  font-size: 32rpx;
  font-weight: 900;
}

.profile-badge {
  display: block;
  margin-top: 6rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 20rpx;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin-top: 22rpx;
}

.profile-stats view {
  text-align: center;
}

.profile-stats text:first-child {
  display: block;
  color: #a3271f;
  font-size: 34rpx;
  font-weight: 900;
}

.profile-stats text:last-child {
  display: block;
  margin-top: 4rpx;
  color: rgba(88, 70, 58, 0.55);
  font-size: 19rpx;
}

.profile-action {
  margin-top: 22rpx;
  min-height: 72rpx;
  border: 0;
  border-radius: 999rpx;
  color: #fff6ef;
  font-size: 24rpx;
  font-weight: 900;
  background: linear-gradient(180deg, #e0577e, #c8963e);
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

/* 设置 */
.settings-card {
  padding: 6rpx 22rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  width: 100%;
  padding: 22rpx 0;
  border: 0;
  border-bottom: 2rpx solid rgba(178, 130, 62, 0.12);
  background: transparent;
  text-align: left;
}

.setting-row:last-child {
  border-bottom: 0;
}

.setting-copy {
  min-width: 0;
  flex: 1;
}

.setting-copy text:first-child {
  display: block;
  color: #241a15;
  font-size: 25rpx;
  font-weight: 800;
  white-space: normal;
}

.setting-copy text:last-child {
  display: block;
  margin-top: 4rpx;
  color: rgba(88, 70, 58, 0.5);
  font-size: 19rpx;
  /* 设置项本身是 button，全局 nowrap 会让说明文字横向溢出 */
  white-space: normal;
}

.setting-row--danger .setting-copy text:first-child {
  color: #a3271f;
}

/* 登录账号：本机这份只是缓存，这里只说明数据存在账号下，不给清理入口 */
.setting-row--info {
  align-items: flex-start;
  color: var(--color-primary);
}

.setting-row--info .setting-copy text:first-child {
  color: var(--color-text);
}

.setting-row[disabled] {
  opacity: 0.6;
}

/* 退出登录：页面最下方单独一个按钮 */
.logout-action {
  width: 100%;
  min-height: 88rpx;
  margin-top: 30rpx;
  border: 2rpx solid rgba(163, 39, 32, 0.24);
  border-radius: 999rpx;
  background: rgba(163, 39, 32, 0.06);
  color: #a3271f;
  font-size: 27rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
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
