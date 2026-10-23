/**
 * 刮刮乐《喜乐满堂》票面数据。
 *
 * 票面结构：票头（喜乐满堂 + 灯笼 + 招财猫 + 徽标）
 * → 红色刮奖区（如意云纹包边，2×5 十枚铜钱当覆盖膜）
 * → 规则条 → 条码区。
 *
 * 每枚铜钱下面藏一个结果：中奖是「喜」+ 米贝金额，没中是「谢」。
 * 纯娱乐玩法，米贝是站内虚拟积分，不具备现实货币价值。
 */

/**
 * 票面主题系列：结构和玩法完全一样，只换配色、票名和吉祥物。
 * 一套主题一个配色一个吉祥物，凑成一个系列。
 */
export const FESTIVE_THEME = {
  id: 'xileman',
  layout: 'xileman',
  title: '喜乐满堂',
  subtitle: '新春喜庆',
  mascot: '财',
  price: 20,
  // 票面印的最高奖励必须在奖金表里，真的能刮出来
  topPrize: 100000,
  // 整票中奖率：面值最低，中奖率最高（25%）
  winRate: 0.25,
  bannerTop: '最高奖励 100000 米贝',
  bannerSub: '共 10 次中奖机会',
  // 中奖符号是福袋/奖励金额，「喜」只是票面主题字，别写成「刮出喜字就中」
  rules: '刮开覆盖膜，如果刮出任何奖励金额或福袋，即可获得该奖励；出现「谢」字则本枚未中奖。兼中兼得。',
  /*
   * 奖金表：每一行是「整票中这个金额的概率」。
   * 小奖占比最高（1 倍面值 18.75%），越往上越难，
   * 头奖 100000 米贝约两万张出一张 —— 印在票面上就一定刮得出来。
   */
  prizeTable: [
    { amount: 20, rate: 0.1875 },
    { amount: 40, rate: 0.045 },
    { amount: 100, rate: 0.0125 },
    { amount: 400, rate: 0.00375 },
    { amount: 2000, rate: 0.0011 },
    { amount: 100000, rate: 0.00005 }
  ],
  coinRings: ['#F6E3A8', '#E8C05A', '#2A3D8F', '#D8232A'],
  paint: {
    red: '#D8232A',
    redDeep: '#A81119',
    green: '#1FA24A',
    greenDeep: '#127A36',
    blue: '#1B2A6B',
    gold: '#E8C05A',
    goldDeep: '#B4862A',
    cream: '#FFF6E2'
  }
}

/** 2 行 × 5 列 = 10 次中奖机会 */
export const COIN_COLS = 5
export const COIN_ROWS = 2
export const COIN_COUNT = COIN_COLS * COIN_ROWS
export const GEM_CHANCES = 26

/**
 * 璀璨宝石的五个游戏区：
 * 第一局 10 格、第二局 1 格、第三局 1 格、第四局 4 格、第五局 10 格。
 * 前四局的规则是「刮出宝石图案即中该格奖金」，
 * 第五局是「号码对对碰」——只有号码和中奖号码相同才中，这个是重点。
 */
const GEM_ZONES = [
  { id: 1, cells: 10, chance: 0.3 },
  { id: 2, cells: 1, chance: 0.22 },
  { id: 3, cells: 1, chance: 0.22 },
  { id: 4, cells: 4, chance: 0.28 }
]
const LUCKY_NUMBER_COUNT = 2
const MY_NUMBER_COUNT = 10
/** 喜盈门 5×5 = 25 格 */
export const DOUBLEHAPPY_CELLS = 25

/**
 * 璀璨宝石：蓝色宝石票面，5 个游戏区共 26 次中奖机会，
 * 和喜乐满堂是完全不同的两套设计。
 */
export const GEMSTONE_THEME = {
  id: 'gemstone',
  layout: 'gemstone',
  title: '璀璨宝石',
  subtitle: '蓝钻主题 · 26 次机会',
  mascot: '宝',
  price: 50,
  topPrize: 100000,
  // 面值最高、机会最多，中奖率压到 18%
  winRate: 0.18,
  // 全部口径换成 App 内的「米贝」，不再出现「元」
  bannerTop: '最高奖励 100000 米贝',
  bannerSub: '共有26次中奖机会',
  rules: '第一~第四局：刮出宝石图案即中该格米贝；' +
    '第五局：你的号码与中奖号码相同，即中该号码下方的米贝。兼中兼得。',
  prizeTable: [
    { amount: 50, rate: 0.135 },
    { amount: 100, rate: 0.0324 },
    { amount: 250, rate: 0.009 },
    { amount: 1000, rate: 0.0027 },
    { amount: 5000, rate: 0.00079 },
    { amount: 100000, rate: 0.00005 }
  ],
  coinRings: ['#FFF3CF', '#F5C542', '#2E6BFF', '#E23A45'],
  paint: {
    bg: '#0E4BC9',
    bgDeep: '#072E86',
    red: '#E01B24',
    redDeep: '#A80F1A',
    gold: '#F5C542',
    goldDeep: '#A87A12',
    orange: '#F08A1D',
    orangeDeep: '#C4650A',
    green: '#2FBF6A',
    greenDeep: '#0E7A3C',
    blue: '#2E6BFF',
    blueDeep: '#123FA8',
    purple: '#7B4BD8',
    ruby: '#E23A45',
    rubyDeep: '#96101C',
    ink: '#0A1030',
    cream: '#FFF7E0'
  }
}

/**
 * 喜盈门：国风 5×5 共 25 格。
 *
 * 规则：刮出「喜」图符 = 得该格米贝；刮出「囍」图符 = 得该格米贝的两倍。
 * 其余图案（祥云、礼盒、风铃…）只是陪衬，不中奖。兼中兼得。
 */
export const DOUBLEHAPPY_THEME = {
  id: 'xiyingmen',
  layout: 'xiyingmen',
  title: '喜盈门',
  subtitle: '国风双喜 · 25 次机会',
  mascot: '喜',
  price: 30,
  topPrize: 100000,
  // 25 格、有「囍」双倍，中奖率 22%
  winRate: 0.22,
  bannerTop: '最高奖励 100000 米贝',
  bannerSub: '共 25 次中奖机会',
  coinRings: ['#FFF3CE', '#E8C05A', '#D32F2F', '#1565C0'],
  paint: {
    red: '#D32F2F',
    redDeep: '#9E1B1B',
    redLight: '#F2604F',
    blue: '#1565C0',
    blueDeep: '#0D3C7A',
    gold: '#E8C05A',
    goldDeep: '#A8791C',
    goldLight: '#FFF3CE',
    cream: '#FFF7E6',
    paper: '#F3F1EA',
    paperLine: '#C9CBC6',
    ink: '#1B1B1B',
    seal: '#B3261E'
  },
  couplets: ['鹏程万里', '鸿运千秋'],
  footerBox: '金玉满堂',
  rules: '刮开覆盖膜，如果刮出「喜」图符，即可获得该图符下方所对应的米贝；' +
    '如果刮出「囍」图符，即可获得该图符下方所对应米贝的两倍。中奖米贝兼中兼得。',
  // 「囍」翻倍后也不会超过票面最高奖励
  prizeTable: [
    { amount: 30, rate: 0.165 },
    { amount: 60, rate: 0.0396 },
    { amount: 150, rate: 0.011 },
    { amount: 600, rate: 0.0033 },
    { amount: 3000, rate: 0.00099 },
    { amount: 100000, rate: 0.00005 }
  ]
}

export const SCRATCH_STYLES = [FESTIVE_THEME, GEMSTONE_THEME, DOUBLEHAPPY_THEME]

/** 格子里的陪衬图案：祥云、礼盒、风铃这类喜庆小图 */
export const DECOR_ICONS = ['祥云', '礼盒', '风铃', '灯笼', '笑脸', '金币', '笛子']

/** 金额对应的拼音，印在格子底部 */
const DECOR_PINYIN = {
  10: 'SHI',
  20: 'ERSHI',
  40: 'SISHI',
  50: 'WUSHI',
  100: 'YIBAI',
  200: 'ERBAI',
  500: 'WUBAI',
  1000: 'YIQIAN',
  2000: 'ERQIAN',
  5000: 'WUQIAN',
  10000: 'YIWAN',
  50000: 'WUWAN',
  100000: 'SHIWAN',
  200000: 'ERSHIWAN',
  800000: 'BASHIWAN'
}

function pinyinOf (amount) {
  return DECOR_PINYIN[amount] || String(amount)
}

/**
 * 开一张《喜盈门》。
 *
 * 25 格默认全是陪衬图案（祥云、礼盒…），每格下面印一个陪衬金额和拼音 ——
 * 没中奖的格子也印着数字，只是图案不是「喜 / 囍」。
 * 中奖票里随机一格变成「喜」，或者「囍」（结算翻倍）。
 */
function buildDoubleHappyTicket () {
  const cells = []
  for (let i = 0; i < DOUBLEHAPPY_CELLS; i += 1) {
    const amount = pickDecorAmount('xiyingmen')
    cells.push({
      symbolType: 'normal',
      icon: pick(DECOR_ICONS),
      amount,
      pinyin: pinyinOf(amount),
      multiple: 1,
      hit: false
    })
  }

  // 这张票中奖格上印的基础金额（0 = 空票）；「囍」结算时翻倍
  const basePrize = rollPrize('xiyingmen')
  if (basePrize > 0) {
    const [index] = pickIndexes(DOUBLEHAPPY_CELLS, 1)
    // 「囍」要翻倍，所以只有翻倍后不超过票面最高奖励时才给「囍」
    const double = Math.random() < 0.3 && basePrize * 2 <= DOUBLEHAPPY_THEME.topPrize
    cells[index] = {
      ...cells[index],
      symbolType: double ? '囍' : '喜',
      hit: true,
      multiple: double ? 2 : 1,
      amount: basePrize,
      pinyin: pinyinOf(basePrize)
    }
  }

  const total = cells.reduce((sum, cell) => sum + (cell.hit ? cell.amount * cell.multiple : 0), 0)

  return {
    layout: 'xiyingmen',
    cells,
    total,
    serial: `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
    security: `XX${randomInt(100000, 999999)}${randomInt(1000, 9999)}`
  }
}

export function getScratchStyle (styleId = 'xileman') {
  return SCRATCH_STYLES.find((item) => item.id === styleId) || SCRATCH_STYLES[0]
}

/** 没中奖的格子上印的陪衬金额 */
const DECOR_POOLS = {
  gemstone: [30, 50, 50, 100, 100, 200, 500],
  xiyingmen: [20, 40, 40, 100, 200]
}

function randomInt (min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick (list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function formatAmount (value) {
  const number = Math.max(0, Math.round(Number(value) || 0))
  return String(number)
}

function pad2 (value) {
  return String(value).padStart(2, '0')
}

/**
 * 抽这一张票的奖金。
 *
 * 每个票面自己的奖金表（theme.prizeTable）里写的是「整票中到这个金额的概率」，
 * 所以：
 * - 中奖率 = 表里所有概率之和（喜乐满堂 25%、喜盈门 22%、璀璨宝石 18%）；
 * - 小奖排在前面、概率最高，越往上越难；
 * - 票面印的「最高奖励」就是表里那一行，真的能刮出来。
 * 返回 0 表示这张是空票。
 */
function rollPrize (themeId) {
  const theme = getScratchStyle(themeId)
  const table = theme.prizeTable || []
  let roll = Math.random()
  for (let i = 0; i < table.length; i += 1) {
    roll -= table[i].rate
    if (roll <= 0) return table[i].amount
  }
  return 0
}

/** 票面标称的中奖率（就是奖金表里概率之和） */
export function getWinRate (styleId = 'xileman') {
  const theme = getScratchStyle(styleId)
  if (typeof theme.winRate === 'number') return theme.winRate
  return (theme.prizeTable || []).reduce((sum, row) => sum + row.rate, 0)
}

/** 挑 n 个互不重复的下标 */
function pickIndexes (count, n) {
  const list = []
  while (list.length < n && list.length < count) {
    const index = randomInt(0, count - 1)
    if (list.indexOf(index) < 0) list.push(index)
  }
  return list
}

/** 没中奖的格子上印的陪衬金额 */
function pickDecorAmount (themeId) {
  const pool = DECOR_POOLS[themeId] || DECOR_POOLS.xiyingmen
  return pick(pool)
}

/**
 * 开一张《璀璨宝石》。
 *
 * 1. 先生成 2 个【中奖号码】（01~39，互不重复），直接印在票面上给你对照。
 * 2. 第五局 10 个【你的号码】，每一格都是「号码 + 米贝」，
 *    号码和中奖号码对上了才算中，金额才作数；对不上就是没中，
 *    但格子里照样印着那个号码和它对应的金额。
 * 3. 前四局刮出宝石图案即中该格米贝。
 *
 * 中奖票要么在前四局刮出一颗宝石，要么第五局号码对上；
 * 没中的票，10 个号码保证和中奖号码一个都对不上。
 */
function buildGemstoneTicket () {
  const winningNumbers = []
  while (winningNumbers.length < LUCKY_NUMBER_COUNT) {
    const next = pad2(randomInt(1, 39))
    if (winningNumbers.indexOf(next) < 0) winningNumbers.push(next)
  }

  const cells = []
  GEM_ZONES.forEach((zone) => {
    for (let i = 0; i < zone.cells; i += 1) {
      cells.push({ zone: zone.id, hit: false, amount: 0 })
    }
  })

  // 这张票的奖金（0 = 空票）。一张票只开一格，奖金表里的金额就是这张票的实付。
  const prize = rollPrize('gemstone')
  const mode = !prize ? 'none' : (Math.random() < 0.55 ? 'gem' : 'number')

  // 第五局：中奖票才有号码对得上，没中的票一个都对不上
  const matched = []
  if (mode === 'number') {
    pickIndexes(MY_NUMBER_COUNT, 1).forEach((index) => matched.push(index))
  }

  const used = {}
  winningNumbers.forEach((number) => { used[number] = true })
  let matchOrder = 0
  for (let i = 0; i < MY_NUMBER_COUNT; i += 1) {
    const hit = matched.indexOf(i) >= 0
    let number = ''
    if (hit) {
      number = winningNumbers[matchOrder % winningNumbers.length]
      matchOrder += 1
    } else {
      // 没对上的号码也要是独立的号码，不能和中奖号码或别的格子撞号
      let guard = 0
      do {
        number = pad2(randomInt(1, 39))
        guard += 1
      } while (used[number] && guard < 400)
    }
    used[number] = true
    cells.push({
      zone: 5,
      hit,
      number,
      amount: hit ? prize : pickDecorAmount('gemstone')
    })
  }

  // 中奖票的另一种中法：前四局刮出一颗宝石（16 格里的随机一颗）
  if (mode === 'gem') {
    const index = randomInt(0, 15)
    cells[index] = { ...cells[index], hit: true, amount: prize }
  }

  const total = cells.reduce((sum, cell) => sum + (cell.hit ? cell.amount : 0), 0)

  return {
    layout: 'gemstone',
    winningNumbers,
    cells,
    total,
    serial: `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
    security: `BS${randomInt(100000, 999999)}${randomInt(1000, 9999)}`
  }
}

/**
 * 开一张《喜乐满堂》。10 枚铜钱，刮中哪一枚就中哪一枚的米贝。
 */
function buildFestiveTicket () {
  const cells = []
  for (let i = 0; i < COIN_COUNT; i += 1) {
    cells.push({ hit: false, amount: 0 })
  }
  const prize = rollPrize('xileman')
  if (prize > 0) {
    const [index] = pickIndexes(COIN_COUNT, 1)
    cells[index] = { hit: true, amount: prize }
  }
  const total = cells.reduce((sum, cell) => sum + (cell.hit ? cell.amount : 0), 0)

  return {
    cells,
    total,
    serial: `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
    security: `DX${randomInt(100000, 999999)}${randomInt(1000, 9999)}`
  }
}

/** 开一张票：三个票面各自一套玩法与中奖率（喜乐满堂 25%、喜盈门 22%、璀璨宝石 18%） */
export function buildTicket (styleId = 'xileman') {
  const style = getScratchStyle(styleId)
  if (style.layout === 'gemstone') return buildGemstoneTicket()
  if (style.layout === 'xiyingmen') return buildDoubleHappyTicket()
  const ticket = buildFestiveTicket()
  return { layout: 'xileman', ...ticket }
}
