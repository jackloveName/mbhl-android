<template>
  <text
    class="mbhl-glyph"
    :style="glyphStyle"
    aria-hidden="true"
  >{{ glyph }}</text>
</template>

<script setup>
import { computed } from 'vue'

/** 字形码位，和 mbhl-icons.ttf 一一对应 */
const GLYPHS = {
  arrowLeft: '\ue6bc',
  badgePercent: '\ue6a8',
  bellRing: '\ue6a6',
  chevronRight: '\ue6b5',
  clock: '\ue6a0',
  cloudUpload: '\ue645',
  download: '\ue68d',
  eye: '\ue651',
  eyeOff: '\ue6b3',
  fileText: '\ue644',
  lock: '\ue66b',
  pencil: '\ue67f',
  plus: '\ue676',
  refresh: '\ue657',
  shieldCheck: '\ue6ab',
  smartphone: '\ue69c',
  sparkles: '\ue68f',
  trash: '\ue687',
  userRemove: '\ue693',
  wallet: '\ue6b1',
  x: '\ue66c'
}

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: ''
  }
})

/** 带单位的写法原样透传，纯数字补 px */
function toLength (value) {
  const text = String(value)
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text}px` : text
}

const glyph = computed(() => GLYPHS[props.name] || GLYPHS.sparkles)

const glyphStyle = computed(() => {
  const length = toLength(props.size)

  return {
    color: props.color || 'inherit',
    fontSize: length,
    height: length,
    lineHeight: length,
    width: length
  }
})
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'MbhlIcons';
  src: url('./mbhl-icons.ttf') format('truetype');
}

.mbhl-glyph {
  display: inline-block;
  overflow: hidden;
  flex: 0 0 auto;
  font-family: 'MbhlIcons';
  font-style: normal;
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
</style>
