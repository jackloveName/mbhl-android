<template>
  <view
    class="user-avatar"
    :style="{ width: size, height: size }"
    :class="{ 'is-uploading': uploading }"
    @tap="pickImage"
    @longpress="emit('longpress')"
  >
    <!-- 只裁这一层：图片/首字被裁成圆，右下角的小铅笔在裁剪层外面，不会缺一半 -->
    <view class="user-avatar__circle">
      <image
        v-if="displaySrc"
        class="user-avatar__img"
        :src="displaySrc"
        mode="aspectFill"
      />
      <text v-else class="user-avatar__text">
        {{ initial }}
      </text>
    </view>

    <view v-if="editable" class="user-avatar__badge">
      <Pencil :size="12" />
    </view>

    <view v-if="uploading" class="user-avatar__mask">
      <text>上传中</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Pencil } from '@/components/icons'
import { chooseAndUploadImage, resolveOssUrl } from '@/utils/file-upload'
import { toast } from '@/utils/common'

const props = defineProps({
  /** 头像路径：支持后台返回的相对路径，也支持完整地址 */
  src: {
    type: String,
    default: ''
  },
  /** 没有头像时显示名字首字 */
  name: {
    type: String,
    default: '米贝'
  },
  /** 游客不能换头像 */
  editable: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: '126rpx'
  }
})

const emit = defineEmits(['change', 'error', 'longpress'])

const uploading = ref(false)

const displaySrc = computed(() => resolveOssUrl(props.src))
const initial = computed(() => String(props.name || '米贝').trim().slice(0, 1) || '米')

async function pickImage () {
  if (uploading.value) return
  if (!props.editable) {
    toast('登录后才能设置头像')
    return
  }

  uploading.value = true
  try {
    const files = await chooseAndUploadImage({ count: 1 })
    const file = files && files[0]
    if (file) emit('change', file)
  } catch (error) {
    const message = String(error?.message || '')
    if (message && message !== '已取消') toast(message)
    emit('error', error)
  } finally {
    uploading.value = false
  }
}

defineExpose({ pickImage })
</script>

<style lang="scss" scoped>
.user-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

/* 圆形头像本体：裁切只作用在这一层 */
.user-avatar__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 4rpx solid rgba(255, 111, 145, 0.22);
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8fae, #c8963e);
  box-shadow: 0 12rpx 28rpx rgba(190, 88, 116, 0.16);
}

.user-avatar__img {
  width: 100%;
  height: 100%;
}

.user-avatar__text {
  color: #fff;
  font-size: 46rpx;
  font-weight: 900;
}

/* 右下角的小铅笔：提示这里可以点 */
.user-avatar__badge {
  position: absolute;
  right: -2rpx;
  bottom: 2rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #fff;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4rpx 10rpx rgba(190, 88, 116, 0.28);
}

.user-avatar__mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(45, 22, 30, 0.52);
  color: #fff;
  font-size: 20rpx;
  font-weight: 800;
}
</style>
