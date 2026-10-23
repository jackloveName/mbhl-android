<template>
  <view class="legal-page">
    <view class="app-shell">
      <view class="app-topbar legal-topbar">
        <button
          class="legal-back"
          hover-class="none"
          aria-label="返回"
          @tap="goBack"
        >
          <ArrowLeft :size="19" />
        </button>
        <view class="legal-heading">
          <text class="app-title">
            {{ pageTitle }}
          </text>
          <text class="app-subtitle">
            {{ pageSubtitle }}
          </text>
        </view>
      </view>

      <view class="legal-card app-card">
        <view v-if="loading" class="legal-state">
          <view class="loading-ring" />
          <text>正在加载协议内容</text>
        </view>

        <button
          v-else-if="loadFailed"
          class="legal-state legal-retry"
          hover-class="none"
          @tap="loadDocument"
        >
          <RefreshCw :size="24" />
          <text>加载失败，点击重试</text>
        </button>

        <rich-text
          v-else
          class="legal-content"
          :nodes="content"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ArrowLeft, RefreshCw } from '@/components/icons'
import { getLegalDocument, LegalDocumentKeys } from '@/api/legal'
import { hasAppSession } from '@/utils/auth'
import { getLegalOperator } from '@/utils/legal-operator'

const type = ref('privacy')
const content = ref('')
const loading = ref(true)
const loadFailed = ref(false)

const DocumentMeta = {
  privacy: {
    title: '隐私协议',
    subtitle: '了解个人信息如何被收集、使用和保护'
  },
  agreement: {
    title: '注册协议',
    subtitle: '请仔细阅读服务规则与账号条款'
  }
}

const pageMeta = computed(() => DocumentMeta[type.value] || DocumentMeta.privacy)
const pageTitle = computed(() => pageMeta.value.title)
const pageSubtitle = computed(() => pageMeta.value.subtitle)

/**
 * 返回：正常从登录页/我的页跳进来时，直接退栈；
 * 如果是冷启动直接落在协议页（外链、H5 刷新）没有上一页，就按登录态回到首页或登录页。
 */
function goBack () {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({ url: hasAppSession() ? '/pages/home/index' : '/pages/login/index' })
}

function replaceDocumentVariables (value) {
  // 主体按端取（iOS 与其它端不同），和活动规则页共用同一份配置
  const operator = getLegalOperator()
  return String(value || '')
    .replace(/\$\{name\}/g, operator.name)
    .replace(/\$\{email\}/g, operator.email)
    // 后端文档自带大标题，页头已经有一份了，这里去掉避免重复
    .replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/i, '')
}

async function loadDocument () {
  loading.value = true
  loadFailed.value = false
  try {
    const result = await getLegalDocument(LegalDocumentKeys[type.value])
    const html = typeof result === 'string'
      ? result
      : (result?.value || result?.content || '')
    content.value = replaceDocumentVariables(html)
    loadFailed.value = !content.value.trim()
  } catch (error) {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onLoad((query = {}) => {
  type.value = Object.prototype.hasOwnProperty.call(DocumentMeta, query.type) ? query.type : 'privacy'
  loadDocument()
})
</script>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  /* 同 .app-page：横向只裁不滚，吸顶头部仍然相对页面生效 */
  max-width: 100%;
  overflow-x: clip;
  padding: calc(var(--status-bar-height) + 24rpx) 30rpx 48rpx;
  background:
    linear-gradient(180deg, rgba(214, 168, 96, 0.1) 0%, rgba(253, 249, 243, 0) 360rpx),
    var(--color-bg);
}

.legal-card {
  margin-top: 24rpx;
  overflow: hidden;
}

/* 长协议往下滚时，返回按钮跟着吸顶，随时能退出去 */
.legal-topbar {
  position: sticky;
  z-index: 6;
  top: var(--status-bar-height);
  justify-content: flex-start;
  gap: 18rpx;
  padding: 10rpx 0 14rpx;
  background: linear-gradient(180deg, rgba(253, 249, 243, 0.96) 62%, rgba(253, 249, 243, 0) 100%);
}

.legal-back {
  flex: 0 0 auto;
  width: 68rpx;
  height: 68rpx;
  border: 1rpx solid var(--color-border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-primary);
  box-shadow: 0 10rpx 26rpx rgba(190, 88, 116, 0.14);
}

.legal-heading {
  flex: 1;
  min-width: 0;
}

.legal-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  width: 100%;
  min-height: 420rpx;
  margin: 0;
  padding: 32rpx;
  color: rgba(88, 70, 58, 0.72);
  font-size: 23rpx;
}

.legal-retry {
  color: #c8963e;
}

.loading-ring {
  width: 42rpx;
  height: 42rpx;
  border: 4rpx solid rgba(178, 130, 62, 0.22);
  border-top-color: #c8963e;
  border-radius: 50%;
  animation: legal-loading 800ms linear infinite;
}

.legal-content {
  display: block;
  padding: 28rpx 28rpx 36rpx;
  color: #53615b;
  font-size: 26rpx;
  line-height: 1.82;
  word-break: break-word;
}

.legal-content :deep(h1) {
  margin: 6rpx 0 22rpx;
  color: #241a15;
  font-size: 34rpx;
  line-height: 1.35;
}

.legal-content :deep(h2) {
  margin: 36rpx 0 14rpx;
  color: #a3271f;
  font-size: 29rpx;
  font-weight: 850;
  line-height: 1.45;
}

.legal-content :deep(p) {
  margin: 14rpx 0;
}

.legal-content :deep(ol),
.legal-content :deep(ul) {
  margin: 14rpx 0;
  padding-left: 36rpx;
}

.legal-content :deep(li) {
  margin: 8rpx 0;
}

.legal-content :deep(a) {
  color: #c8963e;
}

@keyframes legal-loading {
  to { transform: rotate(360deg); }
}
</style>
