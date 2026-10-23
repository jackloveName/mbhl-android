<template>
  <view class="login-page">
    <view class="login-shell">
      <view class="brand-card app-card">
        <view class="brand-top">
          <view class="brand-mark">
            <Sparkles :size="24" />
          </view>
          <view class="brand-copy">
            <text class="brand-kicker">
              米贝嗨乐
            </text>
            <text class="brand-name">
              登录后，米贝才跟着你走
            </text>
            <text class="brand-desc">
              登录送 100 米贝，用来兑换刮刮乐。游客可以先玩大转盘、摇签筒、摇骰子，刮刮乐免费一次，但没有米贝。
            </text>
          </view>
        </view>

        <view class="brand-badges">
          <view class="brand-badge">
            <ShieldCheck :size="14" />
            <text>账密登录</text>
          </view>
          <view class="brand-badge">
            <WalletCards :size="14" />
            <text>米贝同步</text>
          </view>
          <view class="brand-badge">
            <BellRing :size="14" />
            <text>记录留存</text>
          </view>
        </view>
      </view>

      <view class="login-card app-card">
        <view class="login-head">
          <view>
            <text class="login-title">
              登录 / 注册
            </text>
            <text class="login-subtitle">
              首次登录会按账号创建你的米贝空间。
            </text>
          </view>
        </view>

        <!-- 登录方式：验证码 / 密码 两种都支持 -->
        <view class="login-modes">
          <button
            class="login-mode"
            :class="{ 'login-mode--active': mode === 'code' }"
            hover-class="none"
            @tap="setMode('code')"
          >
            <Smartphone :size="16" />
            <text>验证码登录</text>
          </button>
          <button
            class="login-mode"
            :class="{ 'login-mode--active': mode === 'password' }"
            hover-class="none"
            @tap="setMode('password')"
          >
            <LockKeyhole :size="16" />
            <text>密码登录</text>
          </button>
        </view>

        <view class="field">
          <text class="field-label">
            {{ mode === 'code' ? '手机号' : '账号' }}
          </text>
          <view class="phone-row">
            <view v-if="mode === 'code'" class="phone-prefix">
              <text>+86</text>
            </view>
            <input
              v-model="form.account"
              class="field-input"
              :type="mode === 'code' ? 'number' : 'text'"
              :maxlength="mode === 'code' ? 11 : 32"
              :placeholder="mode === 'code' ? '请输入手机号' : '手机号 / 用户名 / 米贝号'"
              placeholder-class="field-placeholder"
              confirm-type="next"
              @input="handleAccountInput"
            >
          </view>
        </view>

        <!-- 验证码：60 秒倒计时 -->
        <view v-if="mode === 'code'" class="field">
          <text class="field-label">
            验证码
          </text>
          <view class="code-row">
            <input
              v-model="form.code"
              class="field-input field-input--code"
              type="number"
              maxlength="6"
              placeholder="6 位验证码"
              placeholder-class="field-placeholder"
              confirm-type="done"
              @input="handleCodeInput"
              @confirm="submitLogin"
            >
            <button
              class="code-button"
              :disabled="countdown > 0 || sendingCode"
              :loading="sendingCode"
              hover-class="none"
              @tap="sendCode"
            >
              {{ codeButtonText }}
            </button>
          </view>
        </view>

        <!-- 密码 -->
        <view v-else class="field">
          <text class="field-label">
            密码
          </text>
          <view class="password-row">
            <input
              v-model="form.password"
              class="field-input field-input--password"
              :type="showPassword ? 'text' : 'password'"
              maxlength="32"
              placeholder="请输入登录密码"
              placeholder-class="field-placeholder"
              confirm-type="done"
              @confirm="submitLogin"
            >
            <button
              class="eye-button"
              hover-class="none"
              @tap="showPassword = !showPassword"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="16" />
            </button>
          </view>
        </view>

        <button
          class="login-submit"
          :loading="submitting"
          :disabled="submitting"
          hover-class="none"
          @tap="submitLogin"
        >
          {{ mode === 'code' ? '验证并进入' : '登录并进入' }}
        </button>

        <button
          class="guest-button"
          hover-class="none"
          @tap="enterGuestMode"
        >
          先用游客模式看看
        </button>

        <view class="agreement-box">
          <checkbox-group @change="handleAgreementChange">
            <label class="agreement-line">
              <checkbox
                value="accepted"
                :checked="agreementAccepted"
                color="#ff6f91"
              />
              <text>我已阅读并同意</text>
              <text class="agreement-link" @tap.stop="openLegal('privacy')">《隐私协议》</text>
              <text>和</text>
              <text class="agreement-link" @tap.stop="openLegal('agreement')">《注册协议》</text>
            </label>
          </checkbox-group>
        </view>

        <view class="login-note">
          <LockKeyhole :size="16" />
          <text>登录后可攒米贝、兑换刮刮乐，之后新上的兑换物也能直接用米贝换。</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { BellRing, Eye, EyeOff, LockKeyhole, ShieldCheck, Smartphone, Sparkles, WalletCards } from '@/components/icons'
import { sendLoginCode } from '@/api/account'
import { useUserStore } from '@/stores'
import { hasAppSession } from '@/utils/auth'
import { toast } from '@/utils/common'
import { isChinaMobile } from '@/utils/validate'

const HomePage = '/pages/home/index'
const TAB_PAGES = ['/pages/home/index', '/pages/diary/index', '/pages/data/index', '/pages/mine/index']
const userStore = useUserStore()
/** 从哪个页面被挡过来的，登录/游客进入后回到那里 */
const redirectUrl = ref('')
/** 用户自己点「去登录」进来的（游客升级 / 被玩法拦住），这种不自动跳走 */
const explicitEntry = ref(false)

/** 登录方式：默认验证码，也可以切到密码 */
const mode = ref('code')
const form = reactive({
  account: '',
  code: '',
  password: ''
})

const agreementAccepted = ref(false)
const submitting = ref(false)
const sendingCode = ref(false)
const showPassword = ref(false)
const countdown = ref(0)
let countdownTimer = null

const codeButtonText = computed(() => (
  countdown.value > 0 ? `${countdown.value}s 后重发` : '发送验证码'
))

function goHome () {
  const target = redirectUrl.value
  if (TAB_PAGES.includes(target)) {
    uni.switchTab({ url: target })
    return
  }
  uni.switchTab({ url: HomePage })
}

function handleAgreementChange (event) {
  agreementAccepted.value = Array.isArray(event.detail.value) && event.detail.value.includes('accepted')
}

function openLegal (type) {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` })
}

function setMode (value) {
  mode.value = value
}

/** 验证码模式下只允许数字，密码模式下保留原文 */
function handleAccountInput (event) {
  const value = String(event.detail.value || '')
  form.account = mode.value === 'code' ? value.replace(/\D/g, '').slice(0, 11) : value.slice(0, 32)
}

function handleCodeInput (event) {
  form.code = String(event.detail.value || '').replace(/\D/g, '').slice(0, 6)
}

function startCountdown () {
  clearCountdown()
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearCountdown()
  }, 1000)
}

function clearCountdown () {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = null
  if (countdown.value < 0) countdown.value = 0
}

/**
 * 发送登录验证码：PUT /mall_biz/ua/sms/verification_code/login_wtocode，
 * 只传 mobile，不需要带 token。
 */
async function sendCode () {
  if (sendingCode.value || countdown.value > 0) return
  if (!isChinaMobile(form.account)) {
    toast('请输入正确的手机号')
    return
  }
  sendingCode.value = true
  try {
    await sendLoginCode({ mobile: form.account })
    toast('验证码已发送', 'success')
    startCountdown()
  } catch (error) {
    toast(error?.message || '验证码发送失败，请稍后重试')
  } finally {
    sendingCode.value = false
  }
}

async function submitLogin () {
  if (!agreementAccepted.value) {
    toast('请先阅读并同意隐私协议和注册协议')
    return
  }
  const account = String(form.account || '').trim()
  if (!account) {
    toast(mode.value === 'code' ? '请输入手机号' : '请输入账号')
    return
  }
  if (mode.value === 'code') {
    if (!isChinaMobile(account)) {
      toast('请输入正确的手机号')
      return
    }
    if (String(form.code || '').length !== 6) {
      toast('请输入 6 位验证码')
      return
    }
  } else if (!String(form.password || '').length) {
    toast('请输入登录密码')
    return
  }
  if (submitting.value) return

  submitting.value = true
  try {
    await userStore.login(
      mode.value === 'code'
        ? { mode: 'code', mobile: account, code: form.code }
        : { mode: 'password', userName: account, password: form.password }
    )
    clearCountdown()
    goHome()
  } catch (error) {
    toast(error?.message || '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function enterGuestMode () {
  if (!agreementAccepted.value) {
    toast('请先阅读并同意隐私协议和注册协议')
    return
  }
  userStore.enterGuestMode()
  goHome()
}

onShow(() => {
  /*
   * 登录页同时是启动页：已经有身份（登录或游客）就放行。
   * 但用户主动点「去登录」进来的要能看到表单，
   * 否则刚点进去就被弹回首页。
   */
  if (explicitEntry.value) return
  if (hasAppSession()) {
    goHome()
  }
})

onUnload(clearCountdown)

onLoad((query = {}) => {
  agreementAccepted.value = false
  // 被拦下来的页面：登录或选游客之后回到那里
  const raw = query.redirect ? decodeURIComponent(String(query.redirect)) : ''
  redirectUrl.value = raw && raw.startsWith('/pages/') ? raw : ''
  explicitEntry.value = Boolean(query.from || query.upgrade)
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  /* 同 .app-page：页面根只裁横轴，真机上元素超宽也不会让整页被左右拖 */
  max-width: 100%;
  overflow-x: clip;
  padding: calc(var(--status-bar-height) + 24rpx) 30rpx 48rpx;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 111, 145, 0.16), transparent 20%),
    radial-gradient(circle at 90% 4%, rgba(123, 97, 255, 0.12), transparent 18%),
    linear-gradient(180deg, #fff4f7 0%, #fff9f1 100%);
}

.login-shell {
  max-width: 900rpx;
  margin: 0 auto;
}

.brand-card,
.login-card {
  padding: 24rpx;
}

.brand-top {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74rpx;
  height: 74rpx;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 111, 145, 0.18), rgba(255, 138, 91, 0.18));
  color: #ff5d8f;
  box-shadow: 0 12rpx 24rpx rgba(255, 111, 145, 0.16);
}

.brand-copy {
  min-width: 0;
  flex: 1;
}

.brand-kicker {
  display: block;
  color: #ff5d8f;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.brand-name {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1.12;
}

.brand-desc {
  display: block;
  margin-top: 10rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.55;
}

.brand-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  min-height: 42rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 111, 145, 0.1);
  color: #d05273;
  font-size: 20rpx;
  font-weight: 700;
}

.fortune-card {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 111, 145, 0.12), rgba(255, 138, 91, 0.1));
}

.fortune-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.fortune-kicker {
  display: block;
  color: var(--color-muted);
  font-size: 18rpx;
  font-weight: 700;
}

.fortune-title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.fortune-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 96rpx;
  padding: 10rpx 12rpx;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.fortune-score text:first-child {
  color: #ff5d8f;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1;
}

.fortune-score text:last-child {
  margin-top: 2rpx;
  color: var(--color-muted);
  font-size: 18rpx;
}

.fortune-desc {
  display: block;
  margin-top: 10rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.55;
}

.fortune-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.fortune-tags text {
  min-height: 36rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-text);
  font-size: 18rpx;
  line-height: 36rpx;
}

.login-card {
  margin-top: 18rpx;
}

.login-title {
  display: block;
  color: var(--color-text);
  font-size: 34rpx;
  font-weight: 900;
}

.login-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
}

.field {
  margin-top: 18rpx;
}

/* 登录方式切换：验证码 / 密码 */
.login-modes {
  display: flex;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 6rpx;
  border-radius: 999rpx;
  background: rgba(255, 111, 145, 0.08);
}

.login-mode {
  flex: 1;
  min-width: 0;
  gap: 6rpx;
  min-height: 66rpx;
  border-radius: 999rpx;
  color: rgba(160, 74, 100, 0.85);
  font-size: 24rpx;
  font-weight: 800;
}

.login-mode--active {
  color: #fff;
  background: linear-gradient(135deg, #ff6f91, #ff8a5b);
  box-shadow: 0 10rpx 20rpx rgba(255, 111, 145, 0.22);
}

.phone-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.phone-prefix {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 20rpx;
  border: 1rpx solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  font-size: 26rpx;
  font-weight: 800;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.field-input--code {
  flex: 1;
  min-width: 0;
}

.code-button {
  flex: 0 0 auto;
  min-width: 210rpx;
  height: 88rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 111, 145, 0.4);
  border-radius: 8px;
  background: rgba(255, 111, 145, 0.1);
  color: #c94f72;
  font-size: 23rpx;
  font-weight: 800;
}

.code-button[disabled] {
  opacity: 0.6;
}

.field-label {
  display: block;
  margin-bottom: 8rpx;
  color: var(--color-muted);
  font-size: 20rpx;
  font-weight: 700;
}

.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 18rpx;
  border: 1rpx solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  font-size: 28rpx;
}

.password-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.field-input--password {
  flex: 1;
  min-width: 0;
}

.eye-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  /* 320px 窄屏下 88rpx 会被图标字撑出 3px，加到 96rpx 才干净 */
  width: 96rpx;
  height: 96rpx;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 111, 145, 0.1);
  color: #d05273;
}

.field-placeholder {
  color: #a3a6a1;
}

.login-submit {
  width: 100%;
  min-height: 84rpx;
  margin-top: 22rpx;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6f91, #ff8a5b);
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  box-shadow: 0 18rpx 32rpx rgba(255, 111, 145, 0.18);
}

.guest-button {
  width: 100%;
  min-height: 80rpx;
  margin-top: 12rpx;
  border-radius: 8px;
  background: rgba(255, 111, 145, 0.08);
  color: #c94f72;
  font-size: 26rpx;
  font-weight: 800;
}

.agreement-box {
  margin-top: 18rpx;
}

.agreement-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6rpx;
  color: var(--color-muted);
  font-size: 20rpx;
  line-height: 1.5;
}

.agreement-link {
  color: #ff5d8f;
  font-weight: 700;
}

.login-note {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  color: var(--color-muted);
  font-size: 20rpx;
  line-height: 1.45;
}
</style>
