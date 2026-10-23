import { defineComponent, h } from 'vue'
import IconGlyph from '@/components/IconGlyph.vue'

/** 所有图标组件共用的 props，页面里直接 `<Plus :size="18" />` 就行 */
const glyphProps = {
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: ''
  },
  strokeWidth: {
    type: [Number, String],
    default: 2
  }
}

/** 米贝嗨乐用到的图标：导出名 → 字形名（字形名对应字体里的码位） */
const GLYPH_LIST = [
  ['ArrowLeft', 'arrowLeft'],
  ['BadgePercent', 'badgePercent'],
  ['BellRing', 'bellRing'],
  ['ChevronRight', 'chevronRight'],
  ['Clock3', 'clock'],
  ['CloudUpload', 'cloudUpload'],
  ['Download', 'download'],
  ['Eye', 'eye'],
  ['EyeOff', 'eyeOff'],
  ['FileText', 'fileText'],
  ['LockKeyhole', 'lock'],
  ['Pencil', 'pencil'],
  ['Plus', 'plus'],
  ['RefreshCw', 'refresh'],
  ['ShieldCheck', 'shieldCheck'],
  ['Smartphone', 'smartphone'],
  ['Sparkles', 'sparkles'],
  ['Trash2', 'trash'],
  ['UserX', 'userRemove'],
  ['WalletCards', 'wallet'],
  ['X', 'x']
]

function createGlyph (exportName, glyphName) {
  return defineComponent({
    name: `MbhlIcon${exportName}`,
    inheritAttrs: false,
    props: glyphProps,
    setup (props, { attrs }) {
      return () => h(IconGlyph, {
        ...attrs,
        name: glyphName,
        size: props.size,
        color: props.color
      })
    }
  })
}

const glyphComponents = GLYPH_LIST.reduce((map, [exportName, glyphName]) => {
  map[exportName] = createGlyph(exportName, glyphName)
  return map
}, {})

export const {
  ArrowLeft,
  BadgePercent,
  BellRing,
  ChevronRight,
  Clock3,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserX,
  WalletCards,
  X
} = glyphComponents
