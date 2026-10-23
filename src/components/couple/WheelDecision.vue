<template>
  <view class="wheel-tool app-card">
    <view class="wheel-head">
      <view class="wheel-copy">
        <text class="wheel-kicker">
          {{ kicker }}
        </text>
        <text class="wheel-title">
          {{ activePreset.title }}
        </text>
        <text class="wheel-subtitle">
          {{ subtitle || '可编辑权重，转完自动保存到本地和云端。' }}
        </text>
      </view>
      <view class="wheel-actions">
        <button
          class="wheel-chip"
          hover-class="none"
          @tap="openEditor"
        >
          <Pencil :size="14" />
          <text>编辑</text>
        </button>
        <button
          class="wheel-chip"
          hover-class="none"
          @tap="refreshPresets"
        >
          <RefreshCw :size="14" />
          <text>刷新</text>
        </button>
      </view>
    </view>

    <view class="wheel-stage">
      <view class="wheel-pointer" />
      <view
        class="wheel-disc"
        :style="wheelDiscStyle"
      >
        <view class="wheel-core">
          <text class="wheel-core__title">
            {{ resultCard.result || activePreset.title }}
          </text>
          <text class="wheel-core__hint">
            {{ spinning ? '转动中...' : '点一下开始' }}
          </text>
          <button
            class="wheel-spin"
            hover-class="none"
            :disabled="spinning || !activePreset.options.length"
            @tap="spinWheel"
          >
            <RefreshCw :size="18" />
            <text>{{ spinning ? '转动中' : '开始转' }}</text>
          </button>
        </view>
      </view>
    </view>

    <view class="wheel-meta">
      <view class="wheel-meta__item">
        <text>{{ activePreset.options.length }}</text>
        <text>个选项</text>
      </view>
      <view class="wheel-meta__item">
        <text>{{ activePreset.options.reduce((sum, item) => sum + Number(item.weight || 1), 0) }}</text>
        <text>总权重</text>
      </view>
      <view class="wheel-meta__item">
        <text>{{ wheelList.length }}</text>
        <text>可用模板</text>
      </view>
    </view>

    <view class="wheel-result" :class="{ visible: !!resultCard.result }">
      <text class="wheel-result__label">
        结果卡片
      </text>
      <text class="wheel-result__value">
        {{ resultCard.result || '还没有结果' }}
      </text>
      <text class="wheel-result__detail">
        {{ resultCard.detail || '结果会显示在这里。' }}
      </text>
    </view>

    <view class="wheel-presets">
      <button
        v-for="preset in wheelList"
        :key="preset.id"
        class="preset-pill"
        :class="{ active: preset.id === activePresetId }"
        hover-class="none"
        @tap="selectPreset(preset.id)"
      >
        {{ preset.title }}
      </button>
    </view>

    <view
      v-if="showEditor"
      class="editor-mask"
      @tap="closeEditor"
    >
      <view
        class="editor-sheet app-card"
        @tap.stop
      >
        <view class="editor-head">
          <view>
            <text class="editor-title">
              自定义选项
            </text>
            <text class="editor-subtitle">
              增删改权重后直接保存。
            </text>
          </view>
          <button
            class="editor-close"
            hover-class="none"
            @tap="closeEditor"
          >
            <X :size="16" />
          </button>
        </view>

        <view class="editor-field">
          <text>标题</text>
          <input
            v-model="draft.title"
            type="text"
            placeholder="例如：今天吃什么"
            placeholder-class="field-placeholder"
          >
        </view>

        <view class="editor-field">
          <text>主色</text>
          <input
            v-model="draft.color"
            type="text"
            maxlength="7"
            placeholder="#ff6f91"
            placeholder-class="field-placeholder"
          >
        </view>

        <view class="editor-list">
          <view
            v-for="(option, index) in draft.options"
            :key="option.id"
            class="editor-row"
          >
            <input
              v-model="option.label"
              class="editor-input"
              type="text"
              placeholder="选项名称"
              placeholder-class="field-placeholder"
            >
            <input
              v-model="option.weight"
              class="editor-weight"
              type="number"
              min="1"
              placeholder="1"
              placeholder-class="field-placeholder"
            >
            <button
              class="editor-remove"
              hover-class="none"
              @tap="removeDraftOption(index)"
            >
              <Trash2 :size="14" />
            </button>
          </view>
        </view>

        <view class="editor-actions">
          <button
            class="editor-add"
            hover-class="none"
            @tap="addDraftOption"
          >
            <Plus :size="14" />
            <text>增加选项</text>
          </button>
          <button
            class="editor-save"
            hover-class="none"
            @tap="saveDraft"
          >
            保存
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Pencil, RefreshCw, Trash2, X } from '@/components/icons'
import { getWheelPresets, saveWheelPreset, spinDecisionWheel } from '@/utils/couple-data'

const props = defineProps({
  scope: {
    type: String,
    default: 'guest'
  },
  presetId: {
    type: String,
    default: ''
  },
  kicker: {
    type: String,
    default: 'COUPLE DECIDER'
  },
  subtitle: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['result', 'audio'])

const rotation = ref(0)
const spinning = ref(false)
const activePresetId = ref(props.presetId)
const wheelList = ref([])
const resultCard = ref({})
const showEditor = ref(false)
const draft = reactive({
  id: '',
  title: '',
  color: '#ff6f91',
  options: []
})

const accentPalette = ['#ff6f91', '#ff8a5b', '#7b61ff', '#3bb7a3', '#f2b844', '#f46fb4']

const activePreset = computed(() => {
  return wheelList.value.find((item) => item.id === activePresetId.value) || wheelList.value[0] || {
    id: '',
    title: '还没有转盘',
    color: '#ff6f91',
    options: []
  }
})

const wheelDiscStyle = computed(() => {
  const options = activePreset.value.options || []
  if (!options.length) {
    return {
      transform: `rotate(${rotation.value}deg)`,
      background: 'radial-gradient(circle at 50% 40%, #fff 0 28%, rgba(255,111,145,0.2) 29% 48%, rgba(255,255,255,0.92) 49% 100%)'
    }
  }
  const segment = 360 / options.length
  const stops = options.map((option, index) => {
    const start = index * segment
    const end = (index + 1) * segment
    const color = accentPalette[index % accentPalette.length]
    return `${color} ${start}deg ${end}deg`
  }).join(', ')
  return {
    transform: `rotate(${rotation.value}deg)`,
    background: `conic-gradient(from -90deg, ${stops})`
  }
})

function refreshPresets () {
  wheelList.value = getWheelPresets(props.scope)
  if (!activePresetId.value || !wheelList.value.find((item) => item.id === activePresetId.value)) {
    activePresetId.value = wheelList.value[0]?.id || ''
  }
}

function selectPreset (id) {
  activePresetId.value = id
}

function copyPresetToDraft (preset) {
  draft.id = preset.id || ''
  draft.title = preset.title || ''
  draft.color = preset.color || '#ff6f91'
  draft.options = (preset.options || []).map((item) => ({
    id: item.id || `opt-${Date.now()}`,
    label: item.label || '',
    weight: String(Math.max(Number(item.weight || 1), 1))
  }))
}

function openEditor () {
  copyPresetToDraft(activePreset.value)
  showEditor.value = true
}

function closeEditor () {
  showEditor.value = false
}

function addDraftOption () {
  draft.options.push({
    id: `opt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    label: '',
    weight: '1'
  })
}

function removeDraftOption (index) {
  draft.options.splice(index, 1)
}

function saveDraft () {
  const options = draft.options
    .map((item) => ({
      id: item.id || `opt-${Date.now()}`,
      label: String(item.label || '').trim(),
      weight: Math.max(Number(item.weight || 1), 1)
    }))
    .filter((item) => item.label)

  if (!draft.title.trim()) {
    uni.showToast({ title: '请先填写标题', icon: 'none' })
    return
  }
  if (options.length < 2) {
    uni.showToast({ title: '至少保留 2 个选项', icon: 'none' })
    return
  }

  saveWheelPreset(props.scope, {
    id: draft.id || `wheel-${Date.now()}`,
    title: draft.title.trim(),
    type: 'wheel',
    color: draft.color.trim() || '#ff6f91',
    options
  })
  refreshPresets()
  showEditor.value = false
  uni.showToast({ title: '已保存转盘', icon: 'none' })
}

function spinWheel () {
  if (spinning.value) return
  if (!activePreset.value.options.length) {
    uni.showToast({ title: '请先添加选项', icon: 'none' })
    return
  }

  emit('audio')
  spinning.value = true
  const result = spinDecisionWheel(props.scope, activePreset.value.id)
  const activeOption = activePreset.value.options.find((item) => item.label === result.result) || activePreset.value.options[0]
  const segment = 360 / activePreset.value.options.length
  const index = Math.max(activePreset.value.options.findIndex((item) => item.id === activeOption.id), 0)
  const center = index * segment + segment / 2
  const target = rotation.value + 1440 + (360 - center)
  rotation.value = target

  setTimeout(() => {
    spinning.value = false
    resultCard.value = result
    emit('result', result)
    uni.showToast({ title: `转出 ${result.result}`, icon: 'none' })
  }, 1200)
}

watch(() => props.scope, () => {
  refreshPresets()
}, { immediate: true })

watch(() => props.presetId, (value) => {
  if (value) activePresetId.value = value
})

onMounted(refreshPresets)

onBeforeUnmount(() => {
  spinning.value = false
})

defineExpose({
  spinWheel,
  refreshPresets
})
</script>

<style lang="scss" scoped>
.wheel-tool {
  padding: 22rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 243, 247, 0.98));
}

.wheel-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.wheel-copy {
  min-width: 0;
  flex: 1;
}

.wheel-kicker {
  display: block;
  color: #ea6f8d;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.wheel-title {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.08;
}

.wheel-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.45;
}

.wheel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: flex-start;
}

.wheel-chip,
.preset-pill,
.editor-add {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 111, 145, 0.12);
  color: #c64569;
  font-size: 20rpx;
  font-weight: 700;
}

.wheel-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 22rpx;
}

.wheel-pointer {
  position: absolute;
  top: -4rpx;
  z-index: 3;
  width: 0;
  height: 0;
  border-left: 18rpx solid transparent;
  border-right: 18rpx solid transparent;
  border-top: 28rpx solid #ff6f91;
  filter: drop-shadow(0 8rpx 12rpx rgba(245, 79, 123, 0.18));
}

.wheel-disc {
  position: relative;
  width: 432rpx;
  height: 432rpx;
  border-radius: 50%;
  border: 10rpx solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 24rpx 48rpx rgba(235, 91, 127, 0.16);
  transition: transform 1.2s cubic-bezier(0.16, 0.84, 0.18, 1);
  overflow: hidden;
}

.wheel-disc::before {
  content: '';
  position: absolute;
  inset: 16rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.wheel-core {
  position: absolute;
  inset: 108rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 0 0 12rpx rgba(255, 111, 145, 0.08);
  text-align: center;
}

.wheel-core__title {
  display: block;
  max-width: 180rpx;
  color: var(--color-text);
  font-size: 28rpx;
  font-weight: 900;
  line-height: 1.2;
}

.wheel-core__hint {
  display: block;
  margin-top: 6rpx;
  color: var(--color-muted);
  font-size: 18rpx;
}

.wheel-spin {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  min-height: 60rpx;
  margin-top: 14rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff6f91, #ff8a5b);
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
  box-shadow: 0 16rpx 28rpx rgba(255, 111, 145, 0.24);
}

.wheel-spin[disabled] {
  opacity: 0.55;
}

.wheel-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
  margin-top: 18rpx;
}

.wheel-meta__item {
  padding: 14rpx 10rpx;
  border-radius: 8px;
  background: rgba(255, 111, 145, 0.08);
  text-align: center;
}

.wheel-meta__item text {
  display: block;
}

.wheel-meta__item text:first-child {
  color: var(--color-text);
  font-size: 28rpx;
  font-weight: 900;
}

.wheel-meta__item text:last-child {
  margin-top: 3rpx;
  color: var(--color-muted);
  font-size: 18rpx;
}

.wheel-result {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 111, 145, 0.12), rgba(255, 138, 91, 0.1));
}

.wheel-result__label {
  display: block;
  color: var(--color-muted);
  font-size: 18rpx;
}

.wheel-result__value {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.wheel-result__detail {
  display: block;
  margin-top: 4rpx;
  color: var(--color-muted);
  font-size: 20rpx;
}

.wheel-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.preset-pill {
  background: #fff;
  border: 1rpx solid rgba(255, 111, 145, 0.18);
}

.preset-pill.active {
  background: #ff6f91;
  border-color: #ff6f91;
  color: #fff;
}

.editor-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(24, 18, 22, 0.4);
}

.editor-sheet {
  width: 100%;
  max-width: 900rpx;
  max-height: 82vh;
  padding: 20rpx;
  border-radius: 20rpx 20rpx 0 0;
  overflow: auto;
}

.editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.editor-title {
  display: block;
  color: var(--color-text);
  font-size: 30rpx;
  font-weight: 900;
}

.editor-subtitle {
  display: block;
  margin-top: 6rpx;
  color: var(--color-muted);
  font-size: 20rpx;
}

.editor-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 111, 145, 0.12);
  color: #cf5879;
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 16rpx;
}

.editor-field text {
  color: var(--color-muted);
  font-size: 20rpx;
  font-weight: 700;
}

.editor-field input,
.editor-input,
.editor-weight {
  width: 100%;
  height: 74rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 111, 145, 0.2);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  font-size: 24rpx;
}

.editor-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 16rpx;
}

.editor-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120rpx 64rpx;
  gap: 10rpx;
  align-items: center;
}

.editor-remove {
  width: 64rpx;
  height: 64rpx;
  border-radius: 8px;
  background: rgba(255, 111, 145, 0.1);
  color: #d35d7b;
}

.editor-actions {
  display: flex;
  gap: 10rpx;
  margin-top: 18rpx;
}

.editor-add {
  flex: 1;
  justify-content: center;
  background: rgba(255, 111, 145, 0.12);
}

.editor-save {
  flex: 0 0 auto;
  min-width: 180rpx;
  min-height: 44rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff6f91, #ff8a5b);
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
}

</style>
