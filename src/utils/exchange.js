import { SCRATCH_STYLES } from '@/utils/scratch-library'

/**
 * 米贝兑换中心。
 *
 * 现在能换的只有刮刮乐，每张票价不一样（喜乐满堂 / 喜盈门 / 璀璨宝石）。
 * 以后要加新东西（头像框、道具、其他小游戏次数……）就往这里加一条，
 * 兑换页、兑换记录、扣米贝都是通用逻辑，不用再动。
 */
export const EXCHANGE_ITEMS = SCRATCH_STYLES.map((style) => ({
  id: `scratch:${style.id}`,
  kind: 'scratch',
  styleId: style.id,
  title: style.title,
  subtitle: style.subtitle,
  price: style.price,
  topPrize: style.topPrize,
  winRate: typeof style.winRate === 'number'
    ? style.winRate
    : (style.prizeTable || []).reduce((sum, row) => sum + row.rate, 0),
  rules: style.rules,
  /** 兑换页的配色，跟着票面走 */
  tone: style.id === 'xileman' ? 'red' : style.id === 'gemstone' ? 'blue' : 'gold'
}))

/** 还没上线的兑换物，先占个位，让用户知道这里会长东西 */
export const COMING_ITEMS = [
  { id: 'coming-1', title: '更多玩法次数', desc: '敬请期待' },
  { id: 'coming-2', title: '米贝头像框', desc: '敬请期待' },
  { id: 'coming-3', title: '小道具', desc: '敬请期待' }
]

export function getExchangeItem (id = '') {
  return EXCHANGE_ITEMS.find((item) => item.id === id || item.styleId === id) || null
}

/**
 * 把一整段玩法规则拆成便于阅读的短句：
 * 按「；」「。」「\n」断句并保留标点，最多 5 行，太长的那句再按「，」兜一下。
 */
export function splitRules (text = '', limit = 5) {
  const lines = []
  String(text || '')
    .split(/(?<=[；。\n])/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((sentence) => {
      if (sentence.length <= 26 || lines.length >= limit - 1) {
        lines.push(sentence)
        return
      }
      // 太长的句子按逗号再断一刀
      const parts = sentence.split(/(?<=[，、])/)
      let buffer = ''
      parts.forEach((part) => {
        if ((buffer + part).length > 26 && buffer) {
          lines.push(buffer)
          buffer = part
          return
        }
        buffer += part
      })
      if (buffer) lines.push(buffer)
    })

  return lines.slice(0, limit)
}
