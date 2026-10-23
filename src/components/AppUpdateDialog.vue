<template>
  <view
    v-if="visible"
    class="ver-layer"
    @touchmove.stop.prevent
    @tap="handleOverlayTap"
  >
    <view
      class="ver-panel"
      role="dialog"
      aria-modal="true"
      aria-label="版本更新提示"
      @tap.stop
    >
      <view class="ver-hero">
        <button
          v-if="canCancel && !downloading"
          class="ver-close"
          hover-class="none"
          aria-label="稍后更新"
          @tap="cancelUpdate"
        >
          <X
            :size="19"
            :stroke-width="1.9"
          />
        </button>

        <image
          class="ver-app-icon"
          src="/static/images/app-icon.png"
          mode="aspectFit"
        />
        <view class="ver-flag">
          <Sparkles
            :size="13"
            :stroke-width="1.9"
          />
          <text>版本升级</text>
        </view>
        <text class="ver-title">
          米贝嗨乐有新版本啦
        </text>
        <text class="ver-subtitle">
          当前 {{ currentVersion }} · 最新 {{ targetVersion }}
        </text>
      </view>

      <view class="ver-body">
        <view class="ver-row">
          <view>
            <text>版本 {{ targetVersion }}</text>
            <text>{{ forceUpdate ? '更新后才能继续用' : '更新后体验更顺' }}</text>
          </view>
          <view
            class="ver-tag"
            :class="{ 'ver-tag--force': forceUpdate }"
          >
            {{ forceUpdate ? '必须更新' : '新版本' }}
          </view>
        </view>

        <view class="ver-notes">
          <view class="ver-notes-head">
            <FileText
              :size="17"
              :stroke-width="1.8"
            />
            <text>本次更新</text>
          </view>
          <scroll-view
            class="ver-notes-scroll"
            scroll-y
          >
            <text class="ver-notes-text">
              {{ updateDescription }}
            </text>
          </scroll-view>
        </view>

        <view
          v-if="downloading"
          class="ver-progress"
        >
          <view class="ver-progress-track">
            <view
              class="ver-progress-value"
              :style="{ width: `${progress}%` }"
            />
          </view>
          <view class="ver-progress-copy">
            <text>{{ statusMessage }}</text>
            <text>{{ progress }}%</text>
          </view>
        </view>

        <view
          v-else
          class="ver-actions"
        >
          <button
            v-if="canCancel"
            class="ver-btn ver-btn--sub"
            hover-class="none"
            @tap="cancelUpdate"
          >
            稍后更新
          </button>
          <button
            class="ver-btn ver-btn--main"
            hover-class="none"
            @tap="confirmUpdate"
          >
            <Download
              :size="18"
              :stroke-width="1.9"
            />
            <text>{{ platformName === 'ios' ? '前往 App Store' : '立即更新' }}</text>
          </button>
        </view>

        <view class="ver-note">
          <ShieldCheck
            :size="15"
            :stroke-width="1.8"
          />
          <text>更新包由官方版本配置提供，账号数据不受影响</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { Download, FileText, ShieldCheck, Sparkles, X } from '@/components/icons'
import { fetchAppReleaseConfig } from '@/api/app-release'
import manifest from '@/manifest.json'
import { getRuntimeAppName } from '@/utils/app-info'
import { toast } from '@/utils/common'

const emit = defineEmits(['dismiss'])
/** 「稍后更新」后的静默期：这段时间内不再打扰 */
const SkipDuration = 24 * 60 * 60 * 1000
const isDevRuntime = import.meta.env.DEV
/** pages.json 里 tabBar 的四个页面，只有这些页面需要临时藏一下底部栏 */
const TAB_ROUTES = ['/pages/home/index', '/pages/diary/index', '/pages/data/index', '/pages/mine/index']

const visible = ref(false)
const downloading = ref(false)
const progress = ref(0)
const statusMessage = ref('正在下载更新包')
const currentVersion = ref(manifest.versionName || '1.0.0')
const targetVersion = ref('')
const updateDescription = ref('优化使用体验并修复已知问题。')
const platformName = ref('ios')
const updateConfig = ref({
  downloadUrl: '',
  updateType: 0,
  updateWay: 1
})

let downloadTask = null
let skippedUpdate = null
/**
 * 最近一次检查的结果快照。
 * 手机上排查「为什么没弹更新框」用：长按首页的米贝卡片就能看到。
 */
let lastCheckResult = null

const forceUpdate = computed(() => updateConfig.value.updateType === 2)
const canCancel = computed(() => updateConfig.value.updateType === 1)

function parseConfig (payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  try {
    return JSON.parse(payload)
  } catch (error) {
    throw new Error('版本配置格式无效')
  }
}

function readRuntimeInfo () {
  const systemInfo = uni.getSystemInfoSync() || {}
  let version = systemInfo.appVersion || manifest.versionName || '1.0.0'
  let platform = String(systemInfo.osName || systemInfo.platform || 'ios').toLowerCase()
  let runtimeVersion = ''

  // #ifdef APP-PLUS
  runtimeVersion = plus.runtime.version || ''
  version = isDevRuntime
    ? manifest.versionName || version
    : runtimeVersion || version
  platform = String(plus.os.name || platform).toLowerCase()
  // #endif

  return {
    appName: getRuntimeAppName(),
    platform: platform.includes('ios') ? 'ios' : 'android',
    version,
    runtimeVersion,
    manifestVersion: manifest.versionName || ''
  }
}

function shouldSkipUpdate (version) {
  return skippedUpdate?.version === version && Number(skippedUpdate.until || 0) > Date.now()
}

/** 按端取对应的版本配置：iOS 一套、安卓一套，都兼容 h5DownloadUrl */
function applyPlatformConfig (payload, platform) {
  /*
   * 下载地址的字段名后台可能叫得不一样，这里按常见叫法依次认，
   * 免得配置里填了地址、前端却读不到（表现为「有新版本但不弹窗」）。
   */
  const pickUrl = (keys) => {
    for (let i = 0; i < keys.length; i += 1) {
      const value = String(payload[keys[i]] || '').trim()
      if (value) return value
    }
    return ''
  }

  if (platform === 'ios') {
    return {
      updateType: Number(payload.iosUpdateType || 0),
      updateWay: Number(payload.iosUpdateWay ?? 1),
      targetVersion: String(payload.iosAppVersion || ''),
      downloadUrl: pickUrl(['iosAppDownloadUrl', 'iosDownloadUrl', 'iosUpdateUrl', 'iosUrl', 'h5DownloadUrl']),
      description: payload.iosVersionDesc || payload.versionDesc
    }
  }

  return {
    updateType: Number(payload.androidUpdateType || 0),
    updateWay: Number(payload.androidUpdateWay || 0),
    targetVersion: String(payload.androidVersion || ''),
    downloadUrl: pickUrl(['androidAppDownloadUrl', 'androidDownloadUrl', 'androidUpdateUrl', 'androidUrl', 'h5DownloadUrl']),
    description: payload.androidVersionDesc || payload.versionDesc
  }
}

function isDifferentVersion (current, target) {
  return String(current || '').trim() !== String(target || '').trim()
}

/**
 * 弹窗盖全屏时把底部 tabBar 藏起来，关掉再放出来。
 * 非 tabBar 页面（登录页这类）直接跳过，否则 uni 会抛一个没人接的 promise。
 */
function toggleTabBar (nextVisible) {
  let route = ''
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages && pages.length ? pages[pages.length - 1] : null
    route = `/${String(current?.route || '').replace(/^\//, '')}`
  } catch (error) {
    return
  }

  if (!TAB_ROUTES.includes(route)) return

  try {
    const task = nextVisible ? uni.showTabBar({ fail: () => {} }) : uni.hideTabBar({ fail: () => {} })
    if (task && typeof task.catch === 'function') task.catch(() => {})
  } catch (error) {}
}

/**
 * 检查更新：返回 true 表示弹窗已经出来了。
 * 判定口径：updateType > 0（1 = 可稍后更新 / 2 = 强制更新）
 * 且目标版本和当前版本不同，就算有新版本；updateType = 0 就是不提示。
 * 下载地址配没配都不影响弹不弹框——地址只影响点了「立即更新」之后那一步。
 */
async function checkAppUpdate ({ manual = false } = {}) {
  let updateVisible = false

  // #ifdef APP-PLUS
  try {
    const runtime = readRuntimeInfo()
    const payload = parseConfig(await fetchAppReleaseConfig(runtime.appName))
    const next = applyPlatformConfig(payload, runtime.platform)
    const hasNewVersion = next.updateType > 0 &&
      next.targetVersion &&
      isDifferentVersion(runtime.version, next.targetVersion)

    lastCheckResult = {
      at: new Date().toLocaleString('zh-CN'),
      appName: runtime.appName,
      platform: runtime.platform,
      currentVersion: runtime.version,
      targetVersion: next.targetVersion,
      updateType: next.updateType,
      updateWay: next.updateWay,
      hasDownloadUrl: Boolean(next.downloadUrl),
      hasNewVersion,
      reason: hasNewVersion
        ? '有新版本'
        : (next.updateType <= 0
            ? '后台把更新关掉了（updateType = 0）'
            : (!next.targetVersion
                ? '后台没填目标版本号'
                : `版本号和当前一致（${runtime.version}）`))
    }

    logUpdateDebug(runtime, next, hasNewVersion)

    if (!hasNewVersion) {
      visible.value = false
      if (manual) toast('当前已是最新版本', 'success')
    } else if (!manual && next.updateType === 1 && shouldSkipUpdate(next.targetVersion)) {
      visible.value = false
    } else {
      currentVersion.value = runtime.version
      targetVersion.value = next.targetVersion
      platformName.value = runtime.platform
      updateDescription.value = String(next.description || '优化使用体验并修复已知问题。').trim()
      updateConfig.value = {
        downloadUrl: next.downloadUrl,
        updateType: next.updateType,
        updateWay: next.updateWay
      }
      visible.value = true
      updateVisible = true
      toggleTabBar(false)
    }
  } catch (error) {
    lastCheckResult = {
      at: new Date().toLocaleString('zh-CN'),
      failed: true,
      reason: String(error?.message || error || '检查失败')
    }
    if (manual) toast(error?.message || '暂时查不到版本信息')
  }
  // #endif

  // #ifndef APP-PLUS
  lastCheckResult = {
    at: new Date().toLocaleString('zh-CN'),
    reason: '当前不是 App 环境（H5 里不做版本检查）'
  }
  // #endif

  // #ifndef APP-PLUS
  if (manual) toast('请在应用内检查更新')
  // #endif

  return updateVisible
}

function logUpdateDebug (runtime, next, hasNewVersion) {
  if (!isDevRuntime) return

  console.info('[AppUpdate]', {
    appName: runtime.appName,
    platform: runtime.platform,
    checkVersion: runtime.version,
    runtimeVersion: runtime.runtimeVersion,
    manifestVersion: runtime.manifestVersion,
    targetVersion: next.targetVersion,
    updateType: next.updateType,
    updateWay: next.updateWay,
    hasDownloadUrl: Boolean(next.downloadUrl),
    hasNewVersion: Boolean(hasNewVersion)
  })
}

function handleOverlayTap () {
  if (forceUpdate.value || downloading.value) toast('请先完成版本更新')
}

function cancelUpdate () {
  if (!canCancel.value || downloading.value) return
  skippedUpdate = {
    version: targetVersion.value,
    until: Date.now() + SkipDuration
  }
  visible.value = false
  toggleTabBar(true)
  emit('dismiss')
}

function openDownloadUrl () {
  if (!updateConfig.value.downloadUrl) {
    toast('更新地址暂未配置')
    return
  }

  // #ifdef APP-PLUS
  plus.runtime.openURL(updateConfig.value.downloadUrl, () => {
    toast('打开更新地址失败')
  })
  // #endif
}

function confirmUpdate () {
  // #ifdef APP-PLUS
  /*
   * iOS 和 updateWay === 1 都走外链（iOS 必须是 App Store 链接）；
   * 其余情况才是应用内下载安装包，仅安卓有意义。
   */
  if (platformName.value === 'ios' || updateConfig.value.updateWay === 1) {
    openDownloadUrl()
    return
  }

  if (!updateConfig.value.downloadUrl) {
    toast('更新地址暂未配置')
    return
  }

  downloading.value = true
  progress.value = 0
  statusMessage.value = '正在下载更新包'
  downloadTask = uni.downloadFile({
    url: updateConfig.value.downloadUrl,
    success: installDownloadedPackage,
    fail: () => resetDownload('更新包下载失败')
  })
  downloadTask.onProgressUpdate((result) => {
    progress.value = Math.min(100, Math.max(0, Math.floor(result.progress || 0)))
    if (progress.value >= 100) statusMessage.value = '下载完成，正在准备安装'
  })
  // #endif
}

function installDownloadedPackage (result) {
  // #ifdef APP-PLUS
  if (result.statusCode !== 200) {
    resetDownload('更新包下载失败')
    return
  }

  progress.value = 100
  statusMessage.value = '正在安装新版本'
  plus.runtime.install(result.tempFilePath, { force: false }, () => {
    downloading.value = false
    uni.showModal({
      title: '更新已安装',
      content: '重启应用即可使用新版本。',
      showCancel: false,
      confirmText: '立即重启',
      confirmColor: '#ff5d8f',
      success: () => plus.runtime.restart()
    })
  }, () => resetDownload('新版本安装失败'))
  // #endif
}

function resetDownload (message) {
  downloading.value = false
  progress.value = 0
  statusMessage.value = '正在下载更新包'
  toast(message)
}

onUnmounted(() => {
  downloadTask?.abort?.()
  if (visible.value) toggleTabBar(true)
})

defineExpose({
  checkAppUpdate,
  getLastCheckResult: () => lastCheckResult
})
</script>

<style lang="scss" scoped>
.ver-layer {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  background: rgba(45, 22, 30, 0.5);
  backdrop-filter: blur(14px);
}

.ver-panel {
  width: 100%;
  max-width: 650rpx;
  overflow: hidden;
  border: 1rpx solid var(--color-border);
  border-radius: 24rpx;
  background: var(--color-surface);
  box-shadow: 0 38rpx 110rpx rgba(88, 36, 48, 0.28);
}

.ver-hero {
  position: relative;
  padding: 46rpx 42rpx 36rpx;
  background:
    radial-gradient(circle at 84% 16%, rgba(255, 111, 145, 0.18), transparent 24%),
    radial-gradient(circle at 12% 88%, rgba(200, 150, 62, 0.18), transparent 26%),
    linear-gradient(135deg, #FFFDFA 0%, #FFF4F7 58%, #FFE6EF 100%);
  color: var(--color-text);
}

.ver-close {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border: 1rpx solid var(--color-border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-primary);
  box-shadow: 0 14rpx 32rpx rgba(120, 60, 44, 0.1);
}

.ver-app-icon {
  display: block;
  width: 126rpx;
  height: 126rpx;
  border-radius: 28rpx;
  box-shadow: 0 20rpx 46rpx rgba(190, 88, 116, 0.24);
}

.ver-flag,
.ver-notes-head,
.ver-progress-copy,
.ver-note,
.ver-btn {
  display: flex;
  align-items: center;
}

.ver-flag {
  align-self: flex-start;
  gap: 9rpx;
  margin-top: 28rpx;
  padding: 9rpx 15rpx;
  border: 1rpx solid rgba(255, 111, 145, 0.24);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-primary);
  font-size: 20rpx;
  font-weight: 850;
}

.ver-title,
.ver-subtitle,
.ver-row text,
.ver-notes-text {
  display: block;
}

.ver-title {
  margin-top: 18rpx;
  color: var(--color-text);
  font-size: 42rpx;
  font-weight: 900;
  line-height: 1.18;
}

.ver-subtitle {
  margin-top: 12rpx;
  color: var(--color-muted);
  font-size: 23rpx;
  line-height: 1.35;
}

.ver-body {
  padding: 30rpx 34rpx 30rpx;
}

.ver-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.16);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.74);
}

.ver-row > view:first-child {
  flex: 1;
  min-width: 0;
}

.ver-row text:first-child {
  color: var(--color-text);
  font-size: 28rpx;
  font-weight: 850;
}

.ver-row text:last-child {
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 21rpx;
  line-height: 1.35;
  white-space: normal;
}

.ver-tag {
  flex: 0 0 auto;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(255, 111, 145, 0.28);
  border-radius: 999rpx;
  background: rgba(255, 111, 145, 0.12);
  color: var(--color-primary);
  font-size: 20rpx;
  font-weight: 850;
}

.ver-tag--force {
  border-color: rgba(200, 16, 46, 0.26);
  background: rgba(200, 16, 46, 0.12);
  color: #c8102e;
}

.ver-notes {
  margin-top: 28rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.16);
  border-radius: 24rpx;
  background:
    radial-gradient(circle at 100% 0%, rgba(232, 192, 90, 0.16), transparent 28%),
    rgba(253, 249, 243, 0.94);
}

.ver-notes-head {
  gap: 10rpx;
  color: var(--color-primary);
  font-size: 23rpx;
  font-weight: 850;
}

.ver-notes-scroll {
  max-height: 220rpx;
  margin-top: 15rpx;
}

.ver-notes-text {
  color: var(--color-muted);
  font-size: 23rpx;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.ver-progress {
  margin-top: 30rpx;
}

.ver-progress-track {
  width: 100%;
  height: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: var(--color-primary-soft);
}

.ver-progress-value {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.25s ease;
}

.ver-progress-copy {
  justify-content: space-between;
  margin-top: 13rpx;
  color: var(--color-muted);
  font-size: 21rpx;
}

.ver-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 30rpx;
}

.ver-actions > .ver-btn:only-child {
  grid-column: 1 / -1;
}

.ver-btn {
  justify-content: center;
  gap: 10rpx;
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.25;
}

.ver-btn--sub {
  border: 1rpx solid var(--color-border);
  background: rgba(255, 255, 255, 0.74);
  color: var(--color-muted);
}

.ver-btn--main {
  background: linear-gradient(135deg, #ff6f91, #c8963e);
  color: #fff;
  box-shadow: 0 18rpx 36rpx rgba(224, 87, 126, 0.26);
}

.ver-note {
  justify-content: center;
  gap: 8rpx;
  margin-top: 22rpx;
  color: var(--color-muted);
  font-size: 19rpx;
  line-height: 1.4;
  text-align: center;
  white-space: normal;
}
</style>
