<template>
  <view class="scratch-tool app-card">
    <view class="scratch-tool__head">
      <view class="scratch-tool__copy">
        <text class="scratch-tool__kicker">
          {{ kicker }}
        </text>
        <text class="scratch-tool__title">
          娱乐刮刮乐
        </text>
        <text class="scratch-tool__subtitle">
          {{ subtitle || '刮开覆盖膜 · 10 次中奖机会' }}
        </text>
      </view>
      <view class="scratch-tool__seal">
        <text class="scratch-tool__seal-num">{{ totalWon }}</text>
        <text class="scratch-tool__seal-unit">米贝</text>
      </view>
    </view>

    <view v-if="!lockStyle" class="scratch-tool__themes">
      <button
        v-for="item in styles"
        :key="item.id"
        class="scratch-tool__theme"
        :class="{ active: item.id === activeStyleId }"
        hover-class="none"
        @tap="selectStyle(item.id)"
      >
        <text class="scratch-tool__theme-text">{{ item.title }}</text>
        <view class="scratch-tool__theme-bar" />
      </button>
    </view>

    <!-- 当前票面的价格与玩法：进场先把口径说清楚 -->
    <view class="scratch-tool__spec">
      <view class="scratch-tool__spec-row">
        <text class="scratch-tool__spec-chip">面值 {{ style.price }} 米贝</text>
        <text class="scratch-tool__spec-chip">最高奖励 {{ style.topPrize }} 米贝</text>
        <text class="scratch-tool__spec-chip scratch-tool__spec-chip--rate">中奖率 {{ winRateText }}</text>
      </view>
      <text class="scratch-tool__spec-rule">玩法：{{ style.rules }}</text>
    </view>

    <!-- 《喜乐满堂》票面 -->
    <view v-if="style.layout === 'xileman'" class="xileman" :style="{ borderColor: style.paint.blue, background: style.paint.red }">
      <!-- 票头：灯笼 + 喜乐满堂 + 招财猫 -->
      <view class="xileman__top">
        <view class="xileman__lantern">
          <view class="xileman__lantern-body">
            <text class="xileman__lantern-text">好事</text>
          </view>
          <view class="xileman__lantern-tassel" />
        </view>

        <view class="xileman__center">
          <text class="xileman__title" :style="{ color: style.paint.gold, textShadow: `3rpx 0 0 ${style.paint.blue}, -3rpx 0 0 ${style.paint.blue}, 0 3rpx 0 ${style.paint.blue}, 0 -3rpx 0 ${style.paint.blue}, 0 6rpx 10rpx rgba(80,10,10,0.45)` }">{{ style.title }}</text>
          <view class="xileman__cat">
            <view class="xileman__cat-ear xileman__cat-ear--l" />
            <view class="xileman__cat-ear xileman__cat-ear--r" />
            <view class="xileman__cat-face">
              <view class="xileman__cat-eye xileman__cat-eye--l" />
              <view class="xileman__cat-eye xileman__cat-eye--r" />
              <view class="xileman__cat-nose" />
              <view class="xileman__cat-blush xileman__cat-blush--l" />
              <view class="xileman__cat-blush xileman__cat-blush--r" />
            </view>
            <view class="xileman__ingot">
              <text class="xileman__ingot-text">{{ style.mascot }}</text>
            </view>
          </view>
        </view>

        <view class="xileman__lantern xileman__lantern--right">
          <view class="xileman__lantern-body">
            <text class="xileman__lantern-text">连连</text>
          </view>
          <view class="xileman__lantern-tassel" />
        </view>
      </view>

      <view class="xileman__badges">
        <view class="xileman__badge" :style="{ borderColor: style.paint.gold, background: `linear-gradient(180deg, ${style.paint.blue} 0%, ${style.paint.blue} 100%)` }">面值 {{ style.price }} 米贝</view>
        <view class="xileman__badge" :style="{ borderColor: style.paint.gold, background: `linear-gradient(180deg, ${style.paint.green} 0%, ${style.paint.greenDeep} 100%)` }">最高奖励 {{ style.topPrize }} 米贝</view>
        <view class="xileman__badge" :style="{ borderColor: style.paint.gold, background: `linear-gradient(180deg, ${style.paint.blue} 0%, ${style.paint.blue} 100%)` }">10 次中奖机会</view>
      </view>

      <!-- 刮奖区：红底 + 绿如意云纹包边，2×5 十枚铜钱当覆盖膜 -->
      <view
        class="xileman__play scratch-pad"
        :scene-cmd="sceneCmd"
        :change:scene-cmd="scratchPad.onCommand"
      >
        <view v-if="!padReady && !padFailed && !loadingDone" class="xileman__loading">
          <text class="xileman__loading-text">正在出票…</text>
        </view>
        <view v-if="padFailed" class="xileman__retry" @tap="draw">
          <text class="xileman__retry-text">刮奖区没加载出来</text>
          <text v-if="padBlocked" class="xileman__retry-code">原因：{{ padBlocked }}</text>
          <text class="xileman__retry-btn">点这里重新出票</text>
        </view>
      </view>

      <!-- 规则条 -->
      <view class="xileman__rule" :style="{ borderColor: style.paint.gold }">
        <text class="xileman__rule-text">{{ style.rules }}</text>
      </view>

      <!-- 保安区 -->
      <view class="xileman__security">
        <view class="xileman__security-banner" :style="{ background: style.paint.blue, color: style.paint.gold }">保安区刮开无效</view>
        <view class="xileman__barcode" />
        <view class="xileman__security-copy">
          <text class="xileman__security-code">{{ ticket.security }}</text>
          <text class="xileman__serial">票号 {{ ticket.serial }}</text>
        </view>
      </view>
    </view>

    <!-- 《璀璨宝石》《喜盈门》票面：整张票都画在 canvas 上 -->
    <view v-else class="gemstone" :style="{ background: style.paint.bgDeep || style.paint.blueDeep, borderColor: style.paint.gold }">
      <view
        class="gemstone__play scratch-pad"
        :class="`is-${style.layout}`"
        :scene-cmd="sceneCmd"
        :change:scene-cmd="scratchPad.onCommand"
      >
        <view v-if="!padReady && !padFailed && !loadingDone" class="xileman__loading">
          <text class="xileman__loading-text">正在出票…</text>
        </view>
        <view v-if="padFailed" class="xileman__retry" @tap="draw">
          <text class="xileman__retry-text">刮奖区没加载出来</text>
          <text v-if="padBlocked" class="xileman__retry-code">原因：{{ padBlocked }}</text>
          <text class="xileman__retry-btn">点这里重新出票</text>
        </view>
      </view>
    </view>

    <view class="scratch-tool__actions">
      <button
        v-if="!lockStyle || settled"
        class="scratch-tool__btn scratch-tool__btn--primary"
        hover-class="none"
        @tap="handlePrimaryAction"
      >
        {{ primaryLabel }}
      </button>
      <button
        v-if="!settled"
        class="scratch-tool__btn scratch-tool__btn--ghost"
        hover-class="none"
        @tap="requestScratchAll"
      >
        全部刮开
      </button>
    </view>

    <view class="scratch-tool__readout">
      <text class="scratch-tool__state">{{ stateText }}</text>
      <text class="scratch-tool__hint">{{ hintText }}</text>
    </view>

    <view class="scratch-tool__notice">
      <text class="scratch-tool__notice-title">温馨提示</text>
      <text class="scratch-tool__notice-text">米贝是站内虚拟积分，不可提现、不可兑换现金或实物，娱乐为主、理性参与。</text>
      <text class="scratch-tool__apple">{{ marketNotice.short }}</text>
      <text class="scratch-tool__rules" @tap="openRules">查看完整活动规则 ›</text>
    </view>
  </view>
</template>

<script>
import { recordScratchResult } from '@/utils/play-data'
import { buildTicket, getScratchStyle, getWinRate, SCRATCH_STYLES } from '@/utils/scratch-library'
import { getMarketNotice } from '@/utils/market-notice'

export default {
  name: 'ScratchCard',
  props: {
    scope: {
      type: String,
      default: 'guest'
    },
    kicker: {
      type: String,
      default: 'SCRATCH & WIN'
    },
    subtitle: {
      type: String,
      default: ''
    },
    /** 玩家已经买好的票面；由兑换流程决定，组件自己不换票种 */
    styleId: {
      type: String,
      default: ''
    },
    /** true = 票是花钱兑换来的：隐藏票种切换，「换一张」改成再去兑换 */
    lockStyle: {
      type: Boolean,
      default: false
    },
    /**
     * 父级付款时就定好的票面数据。
     * 有它就用它，组件自己不再 buildTicket ——
     * 否则重新挂载会变出一张内容不同的新票（等于白送一张）。
     */
    ticketData: {
      type: Object,
      default: null
    },
    /** true = 这张票已经刮完了：直接铺开显示结算结果，不允许再刮 */
    consumed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['result', 'back-to-store'],
  created () {
    this.activeStyleId = this.styleId || 'xileman'
    this.ticket = this.ticketData || buildTicket(this.activeStyleId)
    if (this.consumed) this.settled = true
  },
  data () {
    return {
      styles: SCRATCH_STYLES,
      /** 平台方无关声明：iOS 写 Apple，安卓写应用市场（审核 5.3.2 要求必须展示） */
      marketNotice: getMarketNotice(),
      activeStyleId: 'xileman',
      ticket: buildTicket('xileman'),
      progress: 0,
      settled: false,
      totalWon: 0,
      sceneCmd: { id: 0, type: '', payload: {} },
      cmdId: 0,
      padReady: false,
      padFailed: false,
      padBlocked: '',
      loadingDone: false,
      revealedCoins: 0,
      coinTotal: 10,
      drawTimers: []
    }
  },
  computed: {
    style () {
      return getScratchStyle(this.activeStyleId)
    },
    /** 票面说明里的中奖率文案（和出票逻辑同源，改一处即可） */
    winRateText () {
      const rate = typeof this.style.winRate === 'number'
        ? this.style.winRate
        : getWinRate(this.activeStyleId)
      return `${String(Math.round(rate * 1000) / 10).replace(/\.?0+$/, '')}%`
    },
    /**
     * 票是花钱兑换来的：
     * 刮完之后给「再选一张票」，回到选票列表自己挑（不是只能重复买同一种）；
     * 还没刮完就不显示这个按钮，避免误点把没刮的票扔掉。
     */
    primaryLabel () {
      if (this.lockStyle) return '再选一张票'
      return this.settled ? '再来一张' : '换一张'
    },
    stateText () {
      if (this.settled) return this.ticket.total ? `本票中 ${this.ticket.total} 米贝` : '本票未中奖'
      if (this.revealedCoins) {
        const unit = this.style.layout === 'gemstone' ? '颗宝石' : this.style.layout === 'xiyingmen' ? '格' : '枚铜钱'
        return `已揭开 ${this.revealedCoins} / ${this.coinTotal} ${unit}`
      }
      if (this.style.layout === 'xiyingmen') {
        if (this.progress > 0.03) return '继续刮，一格刮过半就自动开'
        return '用手指刮开红色覆膜，一格过半即开奖'
      }
      if (this.style.layout === 'gemstone') {
        if (this.progress > 0.03) return '继续刮，一颗刮到六成就自动开'
        return '用手指刮开宝石，一颗擦过六成即开奖'
      }
      if (this.progress > 0.03) return '继续刮，把铜钱下的字都刮出来'
      return '用手指刮开铜钱覆盖膜'
    },
    hintText () {
      if (this.settled) {
        // 游客没有米贝钱包，中奖金额不会入账，这里必须说清楚
        const isGuest = this.scope === 'guest'
        if (this.ticket.total) {
          return isGuest
            ? `本票中 ${this.ticket.total} 米贝（游客不入账，登录后中奖才进米贝）`
            : '刮出的米贝已记进「最近结果」。'
        }
        return isGuest
          ? '这张是空票。游客免费体验，登录后中奖才会入账。'
          : `这张是空票，整票中奖率 ${this.winRateText}，换一张试试。`
      }
      if (this.progress > 0.03) return `已刮开 ${Math.round(this.progress * 100)}%，刮到哪儿显哪儿；上下滑动可以翻页`
      if (this.style.layout === 'xiyingmen') return '25 格：刮出「喜」得该格米贝，「囍」得两倍。横向擦拭刮开，上下滑动翻页。'
      if (this.style.layout === 'gemstone') return '五局共 26 颗宝石：前四局刮出宝石即中，第五局号码对上中奖号码才算中。横向擦拭刮开，上下滑动翻页。'
      return '十枚铜钱，刮出福袋或奖励金额即中该格米贝；出现「谢」字本枚未中奖。'
    }
  },
  mounted () {
    /*
     * 已刮完的票：出票后立刻把膜全部擦掉，只展示结算结果。
     * 这样即使组件被重新挂载，也不会出现「重新盖上膜、又能白刮一次」。
     */
    this.$nextTick(() => {
      this.pushTicket()
    })
  },
  beforeUnmount () {
    this.clearDrawTimers()
  },
  methods: {
    /** 查看完整活动规则（审核 5.3.2 要求规则随时可查，票面下方也放一个入口） */
    openRules () {
      uni.navigateTo({ url: '/pages/rules/index' })
    },
    sendCommand (type, payload = {}) {
      this.cmdId += 1
      this.sceneCmd = { id: this.cmdId, type, payload }
    },
    /** 渲染层挂载晚于逻辑层，首帧 :change 不触发，所以要按几次重发 */
    pushTicket () {
      this.clearDrawTimers()
      this.padFailed = false
      this.loadingDone = false
      // 就算"就绪"消息没回传到逻辑层，4 秒后也要把占位层让开，
      // 否则会一直盖着已经画好的票面，用户根本刮不到
      this.drawTimers.push(setTimeout(() => { this.loadingDone = true }, 4000))
      /*
       * 真机上 App 启动比桌面慢得多，渲染层可能在好几秒后才挂载。
       * 原来只在 0~2.4 秒内重发 5 次，5 次发完渲染层还没起来就再也没有指令了，
       * 票面永远画不出来（手机上就是这个表现）。现在改成每 600ms 重发一次，
       * 一直发到渲染层回报 ready 为止，12 秒还没就绪就给出重试入口。
       */
      let attempts = 0
      const send = () => {
        if (this.padReady) return
        attempts += 1
        this.sendCommand('draw', {
          cells: this.ticket.cells,
          winningNumbers: this.ticket.winningNumbers || [],
          layout: this.style.layout,
          palette: this.style.paint,
          coinRings: this.style.coinRings,
          meta: {
            title: this.style.title,
            price: this.style.price,
            bannerTop: this.style.bannerTop,
            bannerSub: this.style.bannerSub,
            couplets: this.style.couplets || [],
            serial: this.ticket.serial,
            security: this.ticket.security
          }
        })
        if (attempts >= 20) {
          this.padFailed = true
          return
        }
        const timer = setTimeout(send, 600)
        this.drawTimers.push(timer)
      }
      send()
    },
    clearDrawTimers () {
      this.drawTimers.forEach((timer) => clearTimeout(timer))
      this.drawTimers = []
    },
    selectStyle (id) {
      if (this.lockStyle || id === this.activeStyleId) return
      this.activeStyleId = id
      this.padReady = false
      this.draw()
    },
    draw () {
      this.ticket = buildTicket(this.activeStyleId)
      this.progress = 0
      this.settled = false
      this.padReady = false
      this.$nextTick(() => this.pushTicket())
    },
    /** 票面是买的：不再自己出票，回选票列表由父级处理兑换 */
    handlePrimaryAction () {
      if (this.lockStyle) {
        this.$emit('back-to-store')
        return
      }
      this.draw()
    },
    /*
     * 注意：这个方法不能叫 scratchAll！
     * H5 里 renderjs 和逻辑层共用同一个组件实例，
     * renderjs 里也有一个 scratchAll（真正擦膜的），逻辑层同名方法会把它的覆盖掉：
     * onCommand → scratchAll(逻辑层) → sendCommand → sceneCmd 变化 → 又触发 onCommand，
     * 页面直接死循环卡死（点「全部刮开」就是这个表现）。
     * 所以逻辑层的统一加 request 前缀，和 renderjs 的方法名彻底分开。
     */
    requestScratchAll () {
      if (this.settled) return
      this.sendCommand('scratch-all')
    },
    onScratchEvent (payload) {
      const data = payload || {}
      if (data.type === 'progress') {
        this.progress = Math.max(this.progress, Number(data.ratio) || 0)
        return
      }
      if (data.type === 'ready') {
        this.padReady = true
        this.padFailed = false
        this.clearDrawTimers()
        /*
         * 已刮完的票：等渲染层就绪后再把膜全部擦掉。
         * 不能提前发指令，否则渲染层还没建好画布，指令会落空。
         */
        if (this.consumed) this.sendCommand('scratch-all')
        return
      }
      if (data.type === 'blocked') {
        // 渲染层明确报告卡在哪一步，界面直接把原因显示出来，便于定位
        this.padBlocked = data.reason || 'unknown'
        return
      }
      if (data.type === 'coin') {
        this.revealedCoins = Number(data.revealed) || 0
        this.coinTotal = Number(data.total) || this.ticket.cells.length
        // 触觉反馈：每揭开一枚都震一下，中奖的震两下
        try {
          uni.vibrateShort({ fail: () => {} })
        } catch (error) {
          // 部分设备不支持震动
        }
        if (this.revealedCoins >= this.coinTotal) this.finishTicket()
        return
      }
      if (data.type !== 'settled') return
      this.finishTicket()
    },
    /** 票面上的覆盖膜全部揭开（喜乐满堂 10 枚铜钱 / 璀璨宝石 26 颗宝石）才算完票，这时才记账 */
    finishTicket () {
      if (this.settled) return
      this.settled = true
      this.progress = 1
      this.totalWon += this.ticket.total
      const result = recordScratchResult(this.scope, {
        amount: this.ticket.total,
        themeTitle: this.style.title,
        topPrize: this.style.topPrize
      })
      if (result) this.$emit('result', result)
    }
  }
}
</script>

<script module="scratchPad" lang="renderjs">
/**
 * 刮奖区：一层画布画两层内容。
 *
 * 底层是红底 + 绿如意云纹包边 + 十枚铜钱的「字面」（喜 / 谢 + 米贝金额），
 * 上层是十枚金色铜钱覆盖膜，用 destination-out 按手指轨迹擦掉。
 * 刮下来的金屑画在第二层画布上。
 *
 * App 端逻辑层没有 DOM，这些都放在 renderjs；H5 上 renderjs 和逻辑层共用实例，
 * 内部字段统一加 pad 前缀避免互相覆盖。
 */
const DESIGN_W = 750
const DESIGN_H = 330
const COIN_COLS = 5
const COIN_ROWS = 2
/*
 * 刮除面积统计的采样网格。
 * 44 太粗：喜盈门的小圆格一共才采到十几个点，手指碰一下就算 100%。
 * 72 之后每个小圆格有四十多个采样点，50% / 60% 的判定才准。
 */
const COVERAGE_GRID = 72
const GEM_DESIGN_H = 1500
const GEM_COLS = [108, 242, 376, 510, 644]
/*
 * 打码体 / 粗圆体优先。中文字体各机型差异很大，这里挑的都是
 * 三端自带、笔画偏粗偏圆的，配合下面的喷印效果，接近刮刮乐票面的打码字。
 */
const FONT_STACK = '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", -apple-system, sans-serif'

/**
 * 《璀璨宝石》票面分区（750×1500 设计稿坐标）。
 * 分区框和宝石位置都从这里算，改布局只要动这一处。
 */
const GEM_ZONES_DESIGN = [
  { id: 1, x: 24, y: 312, w: 702, h: 232, color: 'orange', title: '第一局 · 幸运绿宝石', rule: '刮出宝石图案即中该格奖金' },
  { id: 2, x: 24, y: 560, w: 344, h: 148, color: 'red', title: '第二局 · 蓝宝石', rule: '刮出钻石即中' },
  { id: 3, x: 382, y: 560, w: 344, h: 148, color: 'red', title: '第三局 · 蓝宝石', rule: '刮出钻石即中' },
  { id: 4, x: 24, y: 724, w: 702, h: 176, color: 'orange', title: '第四局 · 紫蓝宝', rule: '刮出宝石即中' },
  { id: 5, x: 24, y: 916, w: 702, h: 482, color: 'orange', title: '第五局 · 中奖号码对对碰', rule: '' }
]
/** 第五局的 2 个中奖号码：直接印在票上，不盖膜 */
const GEM_LUCKY_SPOTS = [{ x: 486, y: 1010 }, { x: 626, y: 1010 }]
const GEM_LUCKY_R = 40
const GEM_RULES_LINE = '刮出宝石图案即中该格米贝 · 第五局号码与中奖号码相同即中'
const GEM_TAIL_RULE = '你的号码与中奖号码相同，即中该号码下方所示的米贝'

/**
 * 《喜盈门》票面分区（750×1500 设计稿坐标）。
 *
 * 版心是正方形：5 列 × 5 行等分（等价 CSS 的 repeat(5, 1fr)），
 * 所以每格都是正方形、每个涂层都是正圆，屏幕再宽再窄都不会压扁。
 *
 * 刮奖框左右各留出 12 个单位的红底，两侧对联（宽 50）摆在这条红带里，
 * 绝不会被刮奖框压住。
 */
const XX_CELL = 51
const XX_GAP = 11
const XX_STEP = XX_CELL * 2 + XX_GAP
const XX_PANEL = { x: 84, y: 366, w: 582, h: 582 }
/** 版心内衬：留出这段纸，圆形涂层才不会压到边框线上 */
const XX_INSET = 14
const XX_GRID_X = XX_PANEL.x + XX_INSET + XX_CELL
const XX_GRID_Y = XX_PANEL.y + XX_INSET + XX_CELL
const XX_COUPLET = { left: 22, right: 678, y: 336, w: 50, h: 642 }
const XX_RULES = '刮开覆盖膜，如果刮出「喜」图符，即可获得该图符下方所对应的米贝；'
  + '如果刮出「囍」图符，即可获得该图符下方所对应米贝的两倍。中奖米贝兼中兼得。'

function roundRect (ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 宝石顶点。
 * 45 度方钻 = 4 个顶点，六角宝 = 6 个顶点，椭圆取 12 个点近似。
 * 画切面、数顶点、命中判定全用这一套坐标，形状才对得上。
 */
/** 三次贝塞尔取点 */
function bezierAt (seg, t) {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * seg[0][0] + b * seg[1][0] + c * seg[2][0] + d * seg[3][0],
    a * seg[0][1] + b * seg[1][1] + c * seg[2][1] + d * seg[3][1]
  ]
}

/**
 * 水滴形轮廓（第一局翡翠用）：下摆圆润、顶端收成尖。
 * 四段三次贝塞尔拼成，和真宝石的切工轮廓接近。
 */
function dropSegments (cx, cy, rx, ry) {
  const top = [cx, cy - ry]
  const rightWide = [cx + rx, cy + ry * 0.2]
  const bottom = [cx, cy + ry]
  const leftWide = [cx - rx, cy + ry * 0.2]
  return [
    [top, [cx + rx * 0.34, cy - ry * 0.62], [cx + rx * 0.86, cy - ry * 0.28], rightWide],
    [rightWide, [cx + rx, cy + ry * 0.86], [cx + rx * 0.56, cy + ry], bottom],
    [bottom, [cx - rx * 0.56, cy + ry], [cx - rx, cy + ry * 0.86], leftWide],
    [leftWide, [cx - rx * 0.86, cy - ry * 0.28], [cx - rx * 0.34, cy - ry * 0.62], top]
  ]
}

function shapePoints (shape, cx, cy, rx, ry, scale) {
  const k = scale || 1
  const ax = rx * k
  const ay = ry * k
  if (shape === 'diamond') {
    return [[cx, cy - ay], [cx + ax, cy], [cx, cy + ay], [cx - ax, cy]]
  }
  if (shape === 'drop') {
    const segments = dropSegments(cx, cy, ax, ay)
    const points = []
    segments.forEach((seg) => {
      for (let i = 0; i < 3; i += 1) points.push(bezierAt(seg, i / 3))
    })
    return points
  }
  const count = shape === 'hex' ? 6 : 12
  const offset = shape === 'hex' ? -Math.PI / 2 : 0
  const list = []
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / count
    list.push([cx + Math.cos(angle) * ax, cy + Math.sin(angle) * ay])
  }
  return list
}

function polygonPath (ctx, points) {
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point[0], point[1])
    else ctx.lineTo(point[0], point[1])
  })
  ctx.closePath()
}

/**
 * 宝石轮廓。椭圆走 ellipse，方钻 / 六角宝走顶点。
 * 覆盖膜、票纸、擦除、「全部刮开」全走这一份路径，
 * 形状才不会变形，方钻和六角宝也不会留下擦不掉的尖角。
 */
function shapePath (ctx, shape, cx, cy, rx, ry, scale) {
  const k = scale || 1
  if (shape === 'drop') {
    // 走真实贝塞尔，边缘才顺；采样点只用来画切面和判定
    const segments = dropSegments(cx, cy, rx * k, ry * k)
    ctx.beginPath()
    ctx.moveTo(segments[0][0][0], segments[0][0][1])
    segments.forEach((seg) => {
      ctx.bezierCurveTo(seg[1][0], seg[1][1], seg[2][0], seg[2][1], seg[3][0], seg[3][1])
    })
    ctx.closePath()
    return
  }
  if (shape === 'diamond' || shape === 'hex') {
    polygonPath(ctx, shapePoints(shape, cx, cy, rx, ry, k))
    return
  }
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx * k, ry * k, 0, 0, Math.PI * 2)
}

function gemPath (ctx, gem, scale) {
  shapePath(ctx, gem.shape, gem.x, gem.y, gem.rx, gem.ry, scale)
}

/** 文字宽度：排版前先量一遍，才能保证字不溢出宝石 */
function textWidth (ctx, text, size, weight) {
  ctx.font = `${weight || 900} ${Math.round(size)}px ${FONT_STACK}`
  return ctx.measureText(String(text)).width
}

export default {
  data () {
    return { ready: false, disposed: false }
  },
  mounted () {
    this.buildPad()
  },
  beforeDestroy () {
    this.disposePad()
  },
  beforeUnmount () {
    this.disposePad()
  },
  methods: {
    notify (payload) {
      try {
        if (this.$ownerInstance && this.$ownerInstance.callMethod) {
          this.$ownerInstance.callMethod('onScratchEvent', payload)
        }
      } catch (error) {
        // 逻辑层已销毁
      }
    },

    onCommand (value) {
      const cmd = value || {}
      if (!cmd.type || cmd.id === this.padCmdId) return
      this.padCmdId = cmd.id
      if (cmd.type === 'draw') {
        this.padTicket = cmd.payload || null
        if (!this.padTicket) {
          this.notify({ type: 'blocked', reason: 'payload' })
          return
        }
        this.buildPad()
      } else if (cmd.type === 'scratch-all') {
        this.scratchAll()
      }
    },

    resolveHost () {
      // 两套票面的挂载元素用的是同一个类名，切换样式后也能找到
      const selector = '.scratch-pad'
      const root = this.$el
      if (root && root.classList && root.classList.contains('scratch-pad')) return root
      if (root && root.querySelector) {
        const found = root.querySelector(selector)
        if (found) return found
      }
      /*
       * App 端 renderjs 的 $el 作用域和 H5 不一样，只查 $el 会拿不到元素，
       * 结果是一块画布都建不出来（手机上就是"没有刮奖区域"）。
       * 和骰盅一样，$el 里找不到就全局再查一次。
       */
      if (typeof document !== 'undefined' && document.querySelector) {
        const found = document.querySelector(selector)
        if (found) return found
      }
      return null
    },

    buildPad () {
      if (this.disposed || !this.padTicket) return
      this.disposePad()
      const host = this.resolveHost()
      const rect = host ? host.getBoundingClientRect() : null
      if (!host || !rect || rect.width < 60 || rect.height < 40) {
        this.padRetry = (this.padRetry || 0) + 1
        if (this.padRetry <= 60) {
          setTimeout(() => this.buildPad(), 150)
        } else {
          this.notify({ type: 'blocked', reason: host ? 'size' : 'host', width: rect ? Math.round(rect.width) : 0, height: rect ? Math.round(rect.height) : 0 })
        }
        return
      }
      this.padRetry = 0
      this.padHost = host
      this.clearChildren(host)

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      /*
       * 画布尺寸必须等比缩放。
       * 之前给高度写死 900 的上限（按矮票估的），竖版票（1:2）需要的高度远不止，
       * 结果画布被裁成 1230×900 再用 CSS 拉伸铺满，纵向压扁近三倍——
       * 刮出来的字全是变形的就是这个原因。
       */
      let width = Math.round(rect.width * dpr)
      let height = Math.round(rect.height * dpr)
      const maxSide = 2600
      const shrink = Math.max(width / maxSide, height / maxSide, 1)
      if (shrink > 1) {
        width = Math.round(width / shrink)
        height = Math.round(height / shrink)
      }
      /* 三层画布：底层内容 / 上层涂层（可擦）/ 粒子 */
      const layer = (z, interactive) => {
        const el = document.createElement('canvas')
        el.width = width
        el.height = height
        /*
         * touch-action 必须是 pan-y，不能用 none。
         * 票面比屏幕高，手指基本都落在画布上，写 none 等于把整页的上下滑动
         * 全锁死了（刮完之后滑不动就是这个原因）。pan-y 之后：
         * 竖向手势交给浏览器翻页，横向手势留给刮奖。
         */
        el.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;z-index:${z};${interactive ? 'touch-action:pan-y;' : 'pointer-events:none;'}`
        host.appendChild(el)
        return el
      }
      const content = layer(1, false)
      const coat = layer(2, true)
      const dust = layer(3, false)

      this.padContent = content
      this.padCoat = coat
      this.padDust = dust
      this.padCanvas = coat
      this.padWidth = width
      this.padHeight = height
      this.padContentCtx = content.getContext('2d')
      this.padCtx = coat.getContext('2d')
      this.padDustCtx = dust.getContext('2d')
      this.padScale = width / DESIGN_W
      this.padDpr = dpr
      const layout = (this.padTicket && this.padTicket.layout) || 'xileman'
      this.padLayout = layout
      let rawGems = this.coinLayout()
      if (layout === 'gemstone') rawGems = this.gemstoneGems()
      else if (layout === 'xiyingmen') rawGems = this.doubleHappyGems()
      let prizeIndex = -1
      this.padCoins = rawGems.map((gem) => {
        if (gem.kind !== 'number') prizeIndex += 1
        return { ...gem, cellIndex: gem.kind === 'number' ? -1 : prizeIndex }
      })
      // 「中奖号码」那两颗不算中奖机会，进度只统计 26 颗奖项宝石
      this.padPrizeTotal = this.padCoins.filter((gem) => gem.kind !== 'number').length

      this.paintBase()
      this.paintCoating()
      this.bindEvents(coat)
      this.notify({ type: 'ready' })
      this.notify({ type: 'progress', ratio: 0 })
    },

    clearChildren (host) {
      if (!host || !host.querySelectorAll) return
      const stale = host.querySelectorAll('canvas')
      for (let i = 0; i < stale.length; i += 1) {
        if (host.removeChild) host.removeChild(stale[i])
      }
    },

    /** 十枚铜钱的位置：两行五列，整齐排布 */
    coinLayout () {
      const s = this.padScale
      const w = this.padWidth
      const h = this.padHeight
      const pad = 26 * s
      const gapX = 24 * s
      const gapY = 12 * s
      const d = (w - pad * 2 - gapX * (COIN_COLS - 1)) / COIN_COLS
      const totalH = COIN_ROWS * d + gapY * (COIN_ROWS - 1)
      const top = (h - totalH) / 2
      const list = []
      for (let r = 0; r < COIN_ROWS; r += 1) {
        for (let c = 0; c < COIN_COLS; c += 1) {
          list.push({
            x: pad + d / 2 + c * (d + gapX),
            y: top + d / 2 + r * (d + gapY),
            rx: d / 2,
            ry: d / 2,
            shape: 'circle',
            kind: 'prize'
          })
        }
      }
      return list
    },

    /**
     * 《璀璨宝石》26 个可刮宝石位，顺序必须和票面数据 cells 一致：
     * 第一局 10 → 第二局 1 → 第三局 1 → 第四局 4 → 第五局 10。
     * 2 个中奖号码是印上去的，不在这里（不盖膜，不参与刮开统计）。
     */
    gemstoneGems () {
      const s = this.padScale
      const list = []
      const push = (x, y, rx, ry, shape, tint) => {
        list.push({ x: x * s, y: y * s, rx: rx * s, ry: ry * s, shape, kind: 'prize', tint })
      }
      // 第一局：两行五列翡翠水滴形
      ;[414, 492].forEach((y) => GEM_COLS.forEach((x) => push(x, y, 52, 31, 'drop', 'green')))
      // 第二、三局：各一颗 45 度方钻
      push(196, 652, 50, 50, 'diamond', 'blue')
      push(554, 652, 50, 50, 'diamond', 'blue')
      // 第四局：四颗六角宝石
      ;[105, 285, 465, 645].forEach((x) => push(x, 840, 42, 42, 'hex', 'purple'))
      // 第五局：两行五列红宝石（你的号码，每个都带号码 + 金额）
      ;[1170, 1276].forEach((y) => GEM_COLS.forEach((x) => push(x, y, 56, 40, 'oval', 'ruby')))
      return list
    },

    /**
     * 《喜盈门》的 25 个圆形覆膜位：5 行 5 列。
     * 顺序就是票面数据 cells 的顺序，从左上到右下。
     */
    doubleHappyGems () {
      const s = this.padScale
      const list = []
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const x = (XX_GRID_X + col * XX_STEP) * s
          const y = (XX_GRID_Y + row * XX_STEP) * s
          list.push({
            x,
            y,
            rx: XX_CELL * s,
            ry: XX_CELL * s,
            shape: 'circle',
            kind: 'prize',
            tint: 'red'
          })
        }
      }
      return list
    },

    /**
     * 宝石命中判定：按真实多边形算，不用外接圆。
     * 用外接圆的话六角宝的四个角会被算进面积，60% 的判定就会偏。
     */
    insideGem (gem, x, y) {
      const dx = x - gem.x
      const dy = y - gem.y
      // 圆 / 椭圆 / 方钻直接用方程算，省掉建数组的开销（一次统计要跑几千遍）
      if (gem.shape === 'circle' || gem.shape === 'oval') {
        return (dx * dx) / (gem.rx * gem.rx) + (dy * dy) / (gem.ry * gem.ry) <= 1
      }
      if (gem.shape === 'diamond') {
        return Math.abs(dx) / gem.rx + Math.abs(dy) / gem.ry <= 1
      }
      const points = shapePoints(gem.shape, gem.x, gem.y, gem.rx, gem.ry, 1)
      let inside = false
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0]
        const yi = points[i][1]
        const xj = points[j][0]
        const yj = points[j][1]
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    },

    /* --------------------------- 底层票面 --------------------------- */

    paintBase () {
      const ctx = this.padContentCtx
      const w = this.padWidth
      const h = this.padHeight
      if (!ctx) return
      if (this.padLayout === 'gemstone') {
        this.paintGemKingBase(ctx, w, h)
        return
      }
      if (this.padLayout === 'xiyingmen') {
        this.paintXixiangBase(ctx, w, h)
        return
      }
      const s = this.padScale
      const p = this.padTicket.palette
      const cells = this.padTicket.cells || []

      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)

      // 红色票底
      const field = ctx.createLinearGradient(0, 0, 0, h)
      field.addColorStop(0, p.red)
      field.addColorStop(1, p.redDeep)
      ctx.fillStyle = field
      ctx.fillRect(0, 0, w, h)

      // 绿色如意云纹包边
      this.paintCloudBorder(ctx, w, h, s, p)

      // 每枚铜钱下面的字面
      this.padCoins.forEach((coin, index) => {
        const cell = cells[index] || { hit: false, amount: 0 }
        const radius = coin.rx - 6 * s
        ctx.beginPath()
        ctx.arc(coin.x, coin.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = p.cream
        ctx.fill()
        ctx.lineWidth = 3 * s
        ctx.strokeStyle = p.goldDeep
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (cell.hit) {
          /*
           * 中奖符号是「福袋」，不是「喜」字：
           * 喜乐满堂的规则是刮出福袋（或奖励金额）即中该格米贝，
           * 「喜」只是票面主题字。袋子上印「福」，避免和玩法混淆。
           */
          const bagW = 44 * s
          const bagH = 46 * s
          const bx = coin.x - bagW / 2
          const by = coin.y - radius * 0.52
          ctx.fillStyle = p.red
          ctx.beginPath()
          ctx.moveTo(bx, by + bagH * 0.28)
          ctx.quadraticCurveTo(bx - 4 * s, by + bagH, bx + bagW / 2, by + bagH)
          ctx.quadraticCurveTo(bx + bagW + 4 * s, by + bagH, bx + bagW, by + bagH * 0.28)
          ctx.quadraticCurveTo(bx + bagW * 0.72, by - 4 * s, bx + bagW * 0.5, by - 4 * s)
          ctx.quadraticCurveTo(bx + bagW * 0.28, by - 4 * s, bx, by + bagH * 0.28)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = p.gold
          ctx.fillRect(bx + bagW * 0.2, by + bagH * 0.2, bagW * 0.6, 8 * s)
          ctx.fillStyle = p.goldDeep
          ctx.font = `900 ${Math.round(20 * s)}px -apple-system, "PingFang SC", sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText('福', coin.x, by + bagH * 0.66)
          ctx.fillStyle = p.greenDeep
          ctx.font = `900 ${Math.round(24 * s)}px -apple-system, "PingFang SC", sans-serif`
          ctx.fillText(`${cell.amount}米贝`, coin.x, coin.y + radius * 0.72)
        } else {
          ctx.fillStyle = 'rgba(140, 30, 30, 0.55)'
          ctx.font = `900 ${Math.round(46 * s)}px -apple-system, "PingFang SC", sans-serif`
          ctx.fillText('谢', coin.x, coin.y - 6 * s)
          ctx.font = `700 ${Math.round(18 * s)}px -apple-system, "PingFang SC", sans-serif`
          ctx.fillText('谢谢参与', coin.x, coin.y + 34 * s)
        }
        ctx.textAlign = 'left'
      })
    },

    /** 如意云纹：沿四条边画连续的卷云 */
    paintCloudBorder (ctx, w, h, s, p) {
      const band = 20 * s
      ctx.save()
      ctx.strokeStyle = p.green
      ctx.lineWidth = band * 0.72
      ctx.lineCap = 'round'
      ctx.strokeRect(band * 0.5, band * 0.5, w - band, h - band)
      ctx.strokeStyle = p.greenDeep
      ctx.lineWidth = 2 * s
      ctx.strokeRect(band * 1.15, band * 1.15, w - band * 2.3, h - band * 2.3)
      // 卷云
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.lineWidth = 3 * s
      const step = 70 * s
      const drawCurl = (x, y, rotate) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rotate)
        ctx.beginPath()
        ctx.arc(0, 0, 10 * s, Math.PI * 0.2, Math.PI * 1.7)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(14 * s, 0, 6 * s, Math.PI * 0.1, Math.PI * 1.6)
        ctx.stroke()
        ctx.restore()
      }
      for (let x = step; x < w - step * 0.5; x += step) {
        drawCurl(x, band * 0.5, 0)
        drawCurl(x, h - band * 0.5, Math.PI)
      }
      for (let y = step; y < h - step * 0.5; y += step) {
        drawCurl(band * 0.5, y, Math.PI / 2)
        drawCurl(w - band * 0.5, y, -Math.PI / 2)
      }
      ctx.restore()
    },

    /* --------------------------- 铜钱覆盖膜 --------------------------- */

    paintCoating () {
      const ctx = this.padCtx
      const s = this.padScale
      const p = this.padTicket.palette
      if (!ctx) return
      if (this.padLayout === 'gemstone') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.clearRect(0, 0, this.padWidth, this.padHeight)
        // 整颗实色覆盖膜：底下的号码和金额一点都不能透出来
        this.padCoins.forEach((gem) => {
          this.drawFacetedGem(ctx, gem.shape, gem.x, gem.y, gem.rx, gem.ry, this.gemColors(gem.tint, p), s)
        })
        return
      }
      if (this.padLayout === 'xiyingmen') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.clearRect(0, 0, this.padWidth, this.padHeight)
        this.padCoins.forEach((gem) => this.paintXixiangCoat(ctx, gem, s, p))
        return
      }
      ctx.save()
      this.padCoins.forEach((coin) => {
        ctx.beginPath()
        ctx.arc(coin.x, coin.y, coin.rx, 0, Math.PI * 2)
        const grad = ctx.createLinearGradient(coin.x - coin.rx, coin.y - coin.rx, coin.x + coin.rx, coin.y + coin.rx)
        grad.addColorStop(0, '#F6E3A8')
        grad.addColorStop(0.35, p.gold)
        grad.addColorStop(0.62, '#B98F2E')
        grad.addColorStop(1, '#F1D98F')
        ctx.fillStyle = grad
        ctx.fill()
        ctx.lineWidth = 4 * s
        ctx.strokeStyle = p.goldDeep
        ctx.stroke()

        // 黄蓝红同心圆：真铜钱那种一圈圈的币面
        const rings = [
          { r: 0.86, color: '#F6E3A8', width: 5 },
          { r: 0.7, color: p.gold },
          { r: 0.55, color: '#2A3D8F', width: 4 },
          { r: 0.42, color: p.red, width: 4 }
        ]
        rings.forEach((ring) => {
          ctx.beginPath()
          ctx.arc(coin.x, coin.y, coin.rx * ring.r, 0, Math.PI * 2)
          ctx.lineWidth = (ring.width || 3) * s
          ctx.strokeStyle = ring.color
          ctx.stroke()
        })

        // 方孔
        const hole = coin.rx * 0.28
        ctx.fillStyle = p.redDeep
        ctx.fillRect(coin.x - hole / 2, coin.y - hole / 2, hole, hole)
        ctx.strokeStyle = '#8A6410'
        ctx.lineWidth = 2.5 * s
        ctx.strokeRect(coin.x - hole / 2, coin.y - hole / 2, hole, hole)

        // 币面「刮」字
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(120, 80, 10, 0.72)'
        ctx.font = `900 ${Math.round(16 * s)}px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText('刮', coin.x - coin.rx * 0.42, coin.y - coin.rx * 0.42)
        ctx.fillText('刮', coin.x + coin.rx * 0.42, coin.y - coin.rx * 0.42)
        ctx.fillText('刮', coin.x - coin.rx * 0.42, coin.y + coin.rx * 0.42)
        ctx.fillText('刮', coin.x + coin.rx * 0.42, coin.y + coin.rx * 0.42)
        ctx.textAlign = 'left'
      })
      ctx.restore()
    },

    /* ----------------------------- 手势 ----------------------------- */

    /* ------------------------ 《璀璨宝石》绘制 ------------------------ */

    /** 宝石配色：高光色 + 深色，做出宝石的透明感 */
    gemColors (tint, p) {
      const map = {
        green: ['#C9FFDE', p.green, '#0B6B36'],
        blue: ['#D6E4FF', p.blue, '#0B2C86'],
        purple: ['#E0D0FF', p.purple, '#43199B'],
        gold: ['#FFF6CC', p.gold, '#9A6C0C'],
        ruby: ['#FFD0D4', p.ruby, '#8C0E19']
      }
      return map[tint] || map.green
    },

    /**
     * 画一颗带切面的宝石（覆盖膜和票面小图案都用它）。
     *
     * 整颗必须是不透明的：它是覆盖膜，底下压着号码和金额，
     * 只要漏一点光就等于提前剧透。所以先把主体铺满，再在上面叠
     * 半透明的高光和暗面；最后沿轮廓描一圈实色边，把抗锯齿的半透明边盖掉。
     */
    drawFacetedGem (ctx, shape, cx, cy, rx, ry, colors, s, scale) {
      const [light, mid, dark] = colors
      const k = scale || 1
      const ax = rx * k
      const ay = ry * k
      ctx.save()
      shapePath(ctx, shape, cx, cy, rx, ry, k)
      ctx.clip()

      // 1) 主体：左上受光、右下背光
      const body = ctx.createLinearGradient(cx - ax, cy - ay, cx + ax, cy + ay)
      body.addColorStop(0, light)
      body.addColorStop(0.42, mid)
      body.addColorStop(1, dark)
      ctx.fillStyle = body
      ctx.fillRect(cx - ax, cy - ay, ax * 2, ay * 2)

      // 2) 台面：内圈切面，浅色的那一片
      polygonPath(ctx, shapePoints(shape, cx, cy, ax, ay, 0.56))
      const table = ctx.createLinearGradient(cx - ax * 0.6, cy - ay * 0.7, cx + ax * 0.5, cy + ay * 0.6)
      table.addColorStop(0, 'rgba(255, 255, 255, 0.78)')
      table.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
      table.addColorStop(1, 'rgba(255, 255, 255, 0.03)')
      ctx.fillStyle = table
      ctx.fill()

      // 3) 台面到外框的刻面线，宝石的立体感主要靠它
      const outer = shapePoints(shape, cx, cy, ax, ay, 1)
      const tablePoints = shapePoints(shape, cx, cy, ax, ay, 0.56)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)'
      ctx.lineWidth = Math.max(0.6, 1.1 * s)
      outer.forEach((point, index) => {
        const to = tablePoints[index % tablePoints.length]
        ctx.beginPath()
        ctx.moveTo(point[0], point[1])
        ctx.lineTo(to[0], to[1])
        ctx.stroke()
      })
      polygonPath(ctx, tablePoints)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.66)'
      ctx.lineWidth = Math.max(0.7, 1.3 * s)
      ctx.stroke()

      // 4) 顶面那一道高光
      ctx.beginPath()
      ctx.moveTo(cx - ax * 0.54, cy - ay * 0.48)
      ctx.lineTo(cx - ax * 0.1, cy - ay * 0.84)
      ctx.lineTo(cx + ax * 0.32, cy - ay * 0.32)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fill()

      // 5) 右下暗面
      ctx.beginPath()
      ctx.moveTo(cx + ax * 0.08, cy + ay * 0.88)
      ctx.lineTo(cx + ax * 0.88, cy + ay * 0.04)
      ctx.lineTo(cx + ax * 0.18, cy + ay * 0.2)
      ctx.closePath()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fill()

      // 6) 贴边暗圈，做出宝石的厚度
      shapePath(ctx, shape, cx, cy, ax, ay, 1)
      const rim = ctx.createRadialGradient(
        cx - ax * 0.3,
        cy - ay * 0.36,
        Math.min(ax, ay) * 0.12,
        cx,
        cy,
        Math.max(ax, ay) * 1.02
      )
      rim.addColorStop(0, 'rgba(255, 255, 255, 0)')
      rim.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)')
      rim.addColorStop(1, 'rgba(0, 0, 0, 0.44)')
      ctx.fillStyle = rim
      ctx.fill()
      ctx.restore()

      // 7) 实色外框：抗锯齿的半透明边会被这一圈盖住，不会再透出底下的字
      ctx.save()
      ctx.lineJoin = 'round'
      shapePath(ctx, shape, cx, cy, rx, ry, k)
      ctx.lineWidth = Math.max(1.4, 2.8 * s)
      ctx.strokeStyle = dark
      ctx.stroke()
      shapePath(ctx, shape, cx, cy, rx, ry, k)
      ctx.lineWidth = Math.max(0.9, 1.7 * s)
      ctx.strokeStyle = light
      ctx.stroke()
      ctx.restore()
    },

    /**
     * 打码体 / 喷印字：字距拉开，底下垫一层浅色压痕，
     * 看起来像印在纸上、微微凹进去的那种票面打码字。
     */
    /** 打码体一行的实际宽度（含字距），排版前先量 */
    codeTextWidth (ctx, text, size, ratio) {
      const chars = String(text).split('')
      const gap = size * (ratio === undefined ? 0.08 : ratio)
      const total = chars.reduce((sum, char) => sum + textWidth(ctx, char, size, 900), 0)
      return total + gap * Math.max(0, chars.length - 1)
    },

    /** 把字号缩到这一行放得下为止 */
    fitCodeSize (ctx, text, maxWidth, startSize, ratio) {
      let size = startSize
      let guard = 0
      while (this.codeTextWidth(ctx, text, size, ratio) > maxWidth && size > 8 && guard < 40) {
        size *= 0.94
        guard += 1
      }
      return size
    },

    paintCodeText (ctx, text, cx, y, size, color, ratio) {
      const chars = String(text).split('')
      const gap = size * (ratio === undefined ? 0.08 : ratio)
      const widths = chars.map((char) => textWidth(ctx, char, size, 900))
      const total = widths.reduce((sum, item) => sum + item, 0) + gap * (chars.length - 1)
      const lift = Math.max(1, size * 0.06)
      ctx.textAlign = 'left'
      ctx.font = `900 ${Math.round(size)}px ${FONT_STACK}`
      let cursor = cx - total / 2
      chars.forEach((char, index) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fillText(char, cursor, y + lift)
        ctx.fillStyle = color
        ctx.fillText(char, cursor, y)
        cursor += widths[index] + gap
      })
      ctx.textAlign = 'center'
    },

    /** 票头 3D 烫金标题：黑描边 + 金色挤出侧面 + 高光顶面 */
    paintJewelTitle (ctx, text, cx, y, size, p) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.font = `900 ${Math.round(size)}px ${FONT_STACK}`
      // 黑色外描边
      ctx.lineWidth = size * 0.2
      ctx.strokeStyle = p.ink
      ctx.strokeText(text, cx, y)
      // 挤出侧面
      const depth = Math.max(2, Math.round(size * 0.14))
      for (let i = depth; i >= 1; i -= 1) {
        ctx.fillStyle = i > depth * 0.55 ? p.goldDeep : '#7C5408'
        ctx.fillText(text, cx, y + i)
      }
      // 金色顶面
      const face = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.5)
      face.addColorStop(0, '#FFF8D6')
      face.addColorStop(0.42, '#F7D062')
      face.addColorStop(0.72, p.gold)
      face.addColorStop(1, '#C08A18')
      ctx.fillStyle = face
      ctx.fillText(text, cx, y)
      // 内圈亮边
      ctx.lineWidth = Math.max(1, size * 0.05)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.strokeText(text, cx, y - size * 0.03)
      ctx.restore()
    },

    /** 票面底：宝蓝晶体 + 星芒 + 金色外框 */
    paintGemKingBackdrop (ctx, w, h, s, p) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, p.bg)
      bg.addColorStop(1, p.bgDeep)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.globalAlpha = 0.13
      ctx.strokeStyle = '#BFD4FF'
      ctx.lineWidth = 2 * s
      for (let x = -h; x < w + h; x += 54 * s) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + h, h)
        ctx.stroke()
      }
      ctx.restore()

      // 星芒
      ctx.save()
      ctx.globalAlpha = 0.82
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < 90; i += 1) {
        const gx = Math.random() * w
        const gy = Math.random() * h
        const spark = (Math.random() * 1.8 + 0.8) * s
        ctx.fillRect(gx - spark * 1.8, gy, spark * 3.6, spark * 0.6)
        ctx.fillRect(gx, gy - spark * 1.8, spark * 0.6, spark * 3.6)
      }
      ctx.restore()

      // 金色双层外框
      ctx.save()
      ctx.lineJoin = 'round'
      roundRect(ctx, 8 * s, 8 * s, w - 16 * s, h - 16 * s, 18 * s)
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 5 * s
      ctx.stroke()
      roundRect(ctx, 16 * s, 16 * s, w - 32 * s, h - 32 * s, 14 * s)
      ctx.strokeStyle = 'rgba(255, 246, 204, 0.5)'
      ctx.lineWidth = 1.6 * s
      ctx.stroke()
      ctx.restore()
    },

    /** 右上角面值徽标 */
    paintFaceBadge (ctx, w, s, p, meta) {
      const gold = ctx.createLinearGradient(0, 30 * s, 0, 88 * s)
      gold.addColorStop(0, '#FFF6CE')
      gold.addColorStop(0.5, p.gold)
      gold.addColorStop(1, p.goldDeep)
      roundRect(ctx, w - 200 * s, 30 * s, 176 * s, 58 * s, 12 * s)
      ctx.fillStyle = gold
      ctx.fill()
      ctx.strokeStyle = p.ink
      ctx.lineWidth = 3 * s
      ctx.stroke()
      this.paintCodeText(ctx, `面值${meta.price || 30}米贝`, w - 112 * s, 60 * s, 24 * s, p.ink, 0.02)
    },

    /** 奖金条 + 一行总规则 */
    paintPrizeBanner (ctx, w, s, p, meta) {
      roundRect(ctx, 24 * s, 180 * s, w - 48 * s, 100 * s, 14 * s)
      const banner = ctx.createLinearGradient(0, 180 * s, 0, 280 * s)
      banner.addColorStop(0, p.red)
      banner.addColorStop(1, p.redDeep)
      ctx.fillStyle = banner
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 4 * s
      ctx.stroke()

      const top = meta.bannerTop || '最高奖励 100000 米贝'
      let size = 44 * s
      let guard = 0
      while (textWidth(ctx, top, size, 900) > w - 120 * s && size > 12 * s && guard < 30) {
        size *= 0.94
        guard += 1
      }
      ctx.font = `900 ${Math.round(size)}px ${FONT_STACK}`
      ctx.lineWidth = 6 * s
      ctx.strokeStyle = p.ink
      ctx.strokeText(top, w / 2, 216 * s)
      const gold = ctx.createLinearGradient(0, 190 * s, 0, 244 * s)
      gold.addColorStop(0, '#FFF9D8')
      gold.addColorStop(0.45, '#FFE45C')
      gold.addColorStop(1, '#E8A81E')
      ctx.fillStyle = gold
      ctx.fillText(top, w / 2, 216 * s)

      ctx.fillStyle = p.cream
      ctx.font = `900 ${Math.round(21 * s)}px ${FONT_STACK}`
      ctx.fillText(meta.bannerSub || '共有26次中奖机会', w / 2, 258 * s)

      ctx.fillStyle = 'rgba(255, 247, 224, 0.86)'
      ctx.font = `700 ${Math.round(15 * s)}px ${FONT_STACK}`
      ctx.fillText(GEM_RULES_LINE, w / 2, 298 * s)
    },

    /** 一个游戏区：底框 + 局名 + 区内规则 */
    paintZoneBox (ctx, zone, s, p) {
      const x = zone.x * s
      const y = zone.y * s
      roundRect(ctx, x, y, zone.w * s, zone.h * s, 14 * s)
      ctx.fillStyle = p[zone.color]
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 3 * s
      ctx.stroke()
      if (!zone.title) return
      const titleSize = 20 * s
      ctx.textAlign = 'left'
      ctx.fillStyle = p.ink
      ctx.font = `900 ${Math.round(titleSize)}px ${FONT_STACK}`
      ctx.fillText(zone.title, x + 18 * s, y + 26 * s)
      if (zone.rule) {
        ctx.fillStyle = 'rgba(10, 16, 48, 0.7)'
        ctx.font = `700 ${Math.round(14 * s)}px ${FONT_STACK}`
        ctx.fillText(zone.rule, x + 18 * s + textWidth(ctx, zone.title, titleSize, 900) + 12 * s, y + 27 * s)
      }
      ctx.textAlign = 'center'
    },

    /**
     * 宝石底下的内容（刮开才看得见）。
     *
     * 先垫一块米色「票纸」：深色字直接压在橙底/红底上对比度太低，
     * 刮出来糊成一片；垫上票纸就是印在纸上的字。
     *
     * 第一 ~ 第四局：出现小宝石图案 + 该格奖金；没中就是一个「谢」。
     * 第五局：号码 + 米贝，号码和中奖号码对上了才算中。
     */
    paintGemKingContent (ctx, s, p, cells) {
      const paper = (gem) => {
        gemPath(ctx, gem, 0.92)
        ctx.fillStyle = p.cream
        ctx.fill()
        ctx.lineWidth = Math.max(1, 1.4 * s)
        ctx.strokeStyle = 'rgba(168, 122, 18, 0.5)'
        ctx.stroke()
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      this.padCoins.forEach((gem) => {
        const cell = cells[gem.cellIndex] || {}
        paper(gem)
        if (cell.zone === 5) {
          const numberText = cell.number || '00'
          const numberSize = this.fitCodeSize(ctx, numberText, gem.rx * 1.5, Math.min(gem.ry * 0.8, 34 * s), 0.12)
          this.paintCodeText(ctx, numberText, gem.x, gem.y - gem.ry * 0.34, numberSize, p.ink, 0.12)
          const amountText = `${cell.amount || 0}米贝`
          const amountSize = this.fitCodeSize(ctx, amountText, gem.rx * 1.5, Math.min(gem.ry * 0.44, 22 * s), 0.04)
          this.paintCodeText(ctx, amountText, gem.x, gem.y + gem.ry * 0.44, amountSize, p.rubyDeep, 0.04)
          return
        }
        if (cell.hit) {
          const r = Math.min(gem.rx, gem.ry)
          const flatTop = gem.shape === 'oval' || gem.shape === 'drop'
          this.drawFacetedGem(
            ctx,
            gem.shape,
            gem.x,
            gem.y - gem.ry * 0.3,
            r * (flatTop ? 0.38 : 0.42),
            r * (flatTop ? 0.3 : 0.42),
            this.gemColors(gem.tint, p),
            s
          )
          const amountText = `${cell.amount}米贝`
          const amountSize = this.fitCodeSize(ctx, amountText, gem.rx * 1.6, Math.min(gem.ry * 0.52, 24 * s), 0.04)
          this.paintCodeText(ctx, amountText, gem.x, gem.y + gem.ry * 0.5, amountSize, p.rubyDeep, 0.04)
          return
        }
        const size = this.fitCodeSize(ctx, '谢', gem.rx * 1.3, Math.min(gem.ry * 1.05, 36 * s), 0)
        ctx.fillStyle = 'rgba(96, 74, 54, 0.58)'
        ctx.font = `900 ${Math.round(size)}px ${FONT_STACK}`
        ctx.fillText('谢', gem.x, gem.y)
      })
    },

    /** 票脚：保安区 + 条形码 + 二维码 + 票号 */
    paintGemKingFooter (ctx, w, s, p, meta) {
      ctx.save()
      ctx.textBaseline = 'middle'
      roundRect(ctx, 30 * s, 1412 * s, 240 * s, 46 * s, 10 * s)
      ctx.fillStyle = '#0B2C86'
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 2 * s
      ctx.stroke()
      ctx.fillStyle = p.cream
      ctx.textAlign = 'center'
      ctx.font = `900 ${Math.round(18 * s)}px ${FONT_STACK}`
      ctx.fillText('保安区刮开无效', 150 * s, 1435 * s)

      ctx.fillStyle = p.cream
      let barX = 296 * s
      for (let i = 0; i < 60 && barX < 588 * s; i += 1) {
        const barW = (i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1.4) * s
        if (i % 2 === 0) ctx.fillRect(barX, 1416 * s, barW, 38 * s)
        barX += barW + 2 * s
      }
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255, 247, 224, 0.85)'
      ctx.font = `700 ${Math.round(14 * s)}px ${FONT_STACK}`
      ctx.fillText(`票号 ${meta.serial || ''}`, 32 * s, 1482 * s)
      ctx.fillText(`兑奖凭证 ${meta.security || ''}`, 296 * s, 1482 * s)

      const qrSize = 88 * s
      const qrX = w - qrSize - 30 * s
      const qrY = 1406 * s
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(qrX, qrY, qrSize, qrSize)
      ctx.fillStyle = p.ink
      const cellN = 21
      const cs = qrSize / cellN
      for (let r = 0; r < cellN; r += 1) {
        for (let c = 0; c < cellN; c += 1) {
          const finder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
          const on = finder
            ? (r % 7 === 0 || r % 7 === 6 || c % 7 === 0 || c % 7 === 6 || (r % 7 > 1 && r % 7 < 5 && c % 7 > 1 && c % 7 < 5))
            : (r * 7 + c * 13) % 5 < 2
          if (on) ctx.fillRect(qrX + c * cs, qrY + r * cs, cs, cs)
        }
      }
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
    },

    paintGemKingBase (ctx, w, h) {
      const s = this.padScale
      const p = this.padTicket.palette
      const meta = this.padTicket.meta || {}
      const cells = this.padTicket.cells || []
      // 中奖号码由票面数据给，印在票上给玩家对照
      const winning = (this.padTicket.winningNumbers || []).slice(0, 2)

      ctx.globalCompositeOperation = 'source-over'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.clearRect(0, 0, w, h)

      this.paintGemKingBackdrop(ctx, w, h, s, p)
      this.paintJewelTitle(ctx, meta.title || '璀璨宝石', w / 2, 88 * s, 62 * s, p)
      this.paintFaceBadge(ctx, w, s, p, meta)
      this.paintPrizeBanner(ctx, w, s, p, meta)

      GEM_ZONES_DESIGN.forEach((zone) => this.paintZoneBox(ctx, zone, s, p))

      // 第四局的四个分局标签
      ctx.fillStyle = p.ink
      ctx.font = `900 ${Math.round(16 * s)}px ${FONT_STACK}`
      ;[105, 285, 465, 645].forEach((x, i) => {
        ctx.fillText(`第${i + 1}局`, x * s, 778 * s)
      })

      // 第五局：中奖号码（印上去、不盖膜）、你的号码标题、底部规则
      ctx.textAlign = 'left'
      ctx.fillStyle = p.ink
      ctx.font = `900 ${Math.round(18 * s)}px ${FONT_STACK}`
      ctx.fillText('中奖号码', 470 * s, 944 * s)
      ctx.font = `900 ${Math.round(20 * s)}px ${FONT_STACK}`
      ctx.fillText('你的号码', 44 * s, 1086 * s)
      ctx.textAlign = 'center'

      GEM_LUCKY_SPOTS.forEach((spot, index) => {
        this.drawFacetedGem(
          ctx,
          'hex',
          spot.x * s,
          spot.y * s,
          GEM_LUCKY_R * s,
          GEM_LUCKY_R * s,
          this.gemColors('gold', p),
          s
        )
        this.paintCodeText(ctx, winning[index] || '00', spot.x * s, spot.y * s, 30 * s, p.ink, 0.06)
      })

      ctx.fillStyle = 'rgba(10, 16, 48, 0.68)'
      ctx.font = `700 ${Math.round(16 * s)}px ${FONT_STACK}`
      ctx.fillText(GEM_TAIL_RULE, w / 2, 1356 * s)

      this.paintGemKingContent(ctx, s, p, cells)
      this.paintGemKingFooter(ctx, w, s, p, meta)
    },

    /* ------------------------ 《喜盈门》绘制 ------------------------ */

    /** 文字折行：中文按字断行，铺满规则条 */
    wrapText (ctx, text, maxWidth, size, weight) {
      ctx.font = `${weight || 700} ${Math.round(size)}px ${FONT_STACK}`
      const lines = []
      let line = ''
      String(text).split('').forEach((char) => {
        const next = line + char
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line)
          line = char
        } else {
          line = next
        }
      })
      if (line) lines.push(line)
      return lines
    },

    /**
     * 格子里的陪衬图案：祥云 / 礼盒 / 风铃 / 灯笼 / 笑脸 / 金币 / 笛子。
     * 纯矢量画法，不依赖任何图片资源。
     */
    drawXixiangIcon (ctx, kind, cx, cy, r, color) {
      ctx.save()
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      if (kind === '祥云') {
        ctx.beginPath()
        ctx.arc(cx - r * 0.45, cy + r * 0.12, r * 0.4, 0, Math.PI * 2)
        ctx.arc(cx, cy - r * 0.2, r * 0.52, 0, Math.PI * 2)
        ctx.arc(cx + r * 0.45, cy + r * 0.12, r * 0.4, 0, Math.PI * 2)
        ctx.rect(cx - r * 0.85, cy + r * 0.12, r * 1.7, r * 0.42)
        ctx.fill()
      } else if (kind === '礼盒') {
        ctx.fillRect(cx - r * 0.72, cy - r * 0.08, r * 1.44, r * 0.9)
        ctx.fillRect(cx - r * 0.86, cy - r * 0.34, r * 1.72, r * 0.28)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
        ctx.fillRect(cx - r * 0.11, cy - r * 0.34, r * 0.22, r * 1.16)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.ellipse(cx - r * 0.28, cy - r * 0.54, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2)
        ctx.ellipse(cx + r * 0.28, cy - r * 0.54, r * 0.28, r * 0.18, 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === '风铃') {
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.6, cy - r * 0.12)
        ctx.lineTo(cx + r * 0.6, cy - r * 0.12)
        ctx.lineTo(cx + r * 0.34, cy + r * 0.6)
        ctx.lineTo(cx - r * 0.34, cy + r * 0.6)
        ctx.closePath()
        ctx.fill()
        ctx.lineWidth = Math.max(1, r * 0.14)
        ctx.beginPath()
        ctx.moveTo(cx, cy - r * 0.9)
        ctx.lineTo(cx, cy - r * 0.12)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy + r * 0.8, r * 0.18, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === '灯笼') {
        ctx.beginPath()
        ctx.ellipse(cx, cy, r * 0.6, r * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(cx - r * 0.36, cy - r * 0.86, r * 0.72, r * 0.18)
        ctx.fillRect(cx - r * 0.36, cy + r * 0.68, r * 0.72, r * 0.18)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.lineWidth = Math.max(1, r * 0.1)
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.24, cy - r * 0.58)
        ctx.lineTo(cx - r * 0.24, cy + r * 0.58)
        ctx.stroke()
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(cx, cy + r * 0.86)
        ctx.lineTo(cx, cy + r * 1.16)
        ctx.stroke()
      } else if (kind === '笑脸') {
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFF7E6'
        ctx.beginPath()
        ctx.arc(cx - r * 0.28, cy - r * 0.22, r * 0.12, 0, Math.PI * 2)
        ctx.arc(cx + r * 0.28, cy - r * 0.22, r * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FFF7E6'
        ctx.lineWidth = Math.max(1.2, r * 0.13)
        ctx.beginPath()
        ctx.arc(cx, cy + r * 0.06, r * 0.4, 0.25 * Math.PI, 0.75 * Math.PI)
        ctx.stroke()
      } else if (kind === '金币') {
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFF7E6'
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = color
        ctx.fillRect(cx - r * 0.2, cy - r * 0.2, r * 0.4, r * 0.4)
      } else {
        // 笛子
        ctx.lineWidth = Math.max(2, r * 0.36)
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.88, cy + r * 0.3)
        ctx.lineTo(cx + r * 0.88, cy - r * 0.3)
        ctx.stroke()
        ctx.fillStyle = '#FFF7E6'
        ;[-0.42, -0.02, 0.38].forEach((offset) => {
          ctx.beginPath()
          ctx.arc(cx + r * offset, cy - r * offset * 0.34, r * 0.06, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      ctx.restore()
    },

    /** 单格底层内容：陪衬图案 + 数值 + 拼音，或者「喜 / 囍 + 米贝 + 拼音」 */
    paintXixiangCell (ctx, gem, cell, s, p, index) {
      const r = gem.rx
      const tint = index % 2 === 0 ? p.red : p.blue
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const amountText = String(cell.amount === undefined ? '' : cell.amount)
      const pinyinText = cell.pinyin || ''
      if (cell.hit) {
        // 刮出「喜」/「囍」：黑色书法大字 + 该格米贝 + 拼音
        ctx.fillStyle = p.ink
        ctx.font = `900 ${Math.round(r * 0.92)}px ${FONT_STACK}`
        ctx.fillText(cell.symbolType || '喜', gem.x, gem.y - r * 0.34)
        const amountSize = this.fitCodeSize(ctx, amountText, r * 1.42, r * 0.46, 0.04)
        this.paintCodeText(ctx, amountText, gem.x, gem.y + r * 0.2, amountSize, p.seal, 0.04)
        const pinyinSize = this.fitCodeSize(ctx, pinyinText, r * 1.34, r * 0.2, 0.06)
        this.paintCodeText(ctx, pinyinText, gem.x, gem.y + r * 0.66, pinyinSize, 'rgba(58, 64, 72, 0.78)', 0.06)
        return
      }

      // 没中奖：陪衬图案 + 数值 + 拼音
      this.drawXixiangIcon(ctx, cell.icon || '祥云', gem.x, gem.y - r * 0.34, r * 0.32, tint)
      const amountSize = this.fitCodeSize(ctx, amountText, r * 1.42, r * 0.44, 0.04)
      this.paintCodeText(ctx, amountText, gem.x, gem.y + r * 0.2, amountSize, p.ink, 0.04)
      const pinyinSize = this.fitCodeSize(ctx, pinyinText, r * 1.34, r * 0.2, 0.06)
      this.paintCodeText(ctx, pinyinText, gem.x, gem.y + r * 0.66, pinyinSize, 'rgba(58, 64, 72, 0.72)', 0.06)
    },

    /**
     * 圆形覆膜压在纸上的凹印：只在圆外画一圈很浅的暗环 + 右下角一道高光，
     * 像印章压进纸里。注意这里不画任何底色 —— 圆外必须透出票底的灰白防伪纸。
     */
    paintXixiangEmboss (ctx, gem, s) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(gem.x, gem.y, gem.rx * 1.035, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(72, 84, 104, 0.16)'
      ctx.lineWidth = Math.max(1, 2.4 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(gem.x, gem.y, gem.rx * 1.075, Math.PI * 0.15, Math.PI * 0.95)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.lineWidth = Math.max(1, 2 * s)
      ctx.stroke()
      ctx.restore()
    },

    /**
     * 刮奖框：印在红票面上的一个宝蓝云纹矩形框，
     * 里面是浅灰水波防伪纸 —— 不是浮在上面的白色卡片。
     */
    paintXixiangPanel (ctx, box, s, p) {
      const x = box.x * s
      const y = box.y * s
      const w = box.w * s
      const h = box.h * s

      // 灰白防伪纸
      ctx.save()
      roundRect(ctx, x, y, w, h, 4 * s)
      ctx.fillStyle = p.paper
      ctx.fill()
      ctx.restore()
      this.paintXixiangGuilloche(ctx, x, y, w, h, s)

      // 5×5 的印刷分格线（很浅，起定位作用，不是白框）
      ctx.save()
      ctx.strokeStyle = 'rgba(36, 62, 120, 0.14)'
      ctx.lineWidth = Math.max(0.6, 1 * s)
      for (let i = 1; i < 5; i += 1) {
        const gx = (box.x + XX_INSET + i * XX_STEP - XX_GAP / 2) * s
        const gy = (box.y + XX_INSET + i * XX_STEP - XX_GAP / 2) * s
        ctx.beginPath()
        ctx.moveTo(gx, y + XX_INSET * 0.5 * s)
        ctx.lineTo(gx, y + h - XX_INSET * 0.5 * s)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + XX_INSET * 0.5 * s, gy)
        ctx.lineTo(x + w - XX_INSET * 0.5 * s, gy)
        ctx.stroke()
      }
      ctx.restore()

      // 宝蓝双线边框 + 四角云纹
      ctx.save()
      ctx.lineJoin = 'round'
      roundRect(ctx, x, y, w, h, 4 * s)
      ctx.strokeStyle = p.blueDeep
      ctx.lineWidth = Math.max(2, 5 * s)
      ctx.stroke()
      roundRect(ctx, x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s, 3 * s)
      ctx.strokeStyle = p.blue
      ctx.lineWidth = Math.max(1, 1.6 * s)
      ctx.stroke()
      ctx.restore()

      ;[[x, y, 0], [x + w, y, Math.PI / 2], [x + w, y + h, Math.PI], [x, y + h, -Math.PI / 2]].forEach(([cx, cy, rotate]) => {
        this.paintCloudCurl(ctx, cx, cy, 26 * s, rotate, p.blueDeep, s)
      })
    },

    /** 传统卷云纹：一大一小两段弧，四个角各来一组 */
    paintCloudCurl (ctx, cx, cy, size, rotate, color, s) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotate)
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1, 2.2 * s)
      ctx.beginPath()
      ctx.arc(size * 0.42, size * 0.42, size * 0.42, Math.PI * 1.05, Math.PI * 0.35)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(size * 0.62, size * 0.62, size * 0.2, Math.PI * 1.1, Math.PI * 0.4)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 0.03, size * 0.03)
      ctx.lineTo(size * 0.34, size * 0.34)
      ctx.stroke()
      ctx.restore()
    },

    /** 烫金 3D 字：黑描边 + 金色渐变 + 顶部高光，用在票头徽章上 */
    paintGoldGlyph (ctx, text, cx, cy, size, p) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.font = `900 ${Math.round(size)}px ${FONT_STACK}`
      // 外描边
      ctx.lineWidth = size * 0.16
      ctx.strokeStyle = 'rgba(8, 26, 66, 0.9)'
      ctx.strokeText(text, cx, cy)
      // 投影
      ctx.fillStyle = 'rgba(8, 22, 58, 0.55)'
      ctx.fillText(text, cx + size * 0.05, cy + size * 0.08)
      // 金色渐变面
      const gold = ctx.createLinearGradient(0, cy - size * 0.6, 0, cy + size * 0.55)
      gold.addColorStop(0, '#FFFBE6')
      gold.addColorStop(0.36, '#F6D26A')
      gold.addColorStop(0.68, p.gold)
      gold.addColorStop(1, '#B07C12')
      ctx.fillStyle = gold
      ctx.fillText(text, cx, cy)
      // 顶部高光
      ctx.lineWidth = Math.max(0.8, size * 0.035)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.strokeText(text, cx, cy - size * 0.04)
      ctx.restore()
    },

    /** 浅灰色波浪防伪底纹 */
    paintXixiangGuilloche (ctx, x, y, w, h, s) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()
      ctx.strokeStyle = 'rgba(148, 158, 170, 0.3)'
      ctx.lineWidth = Math.max(0.8, 1.1 * s)
      const step = 15 * s
      for (let row = 0; row * step < h + step * 2; row += 1) {
        const baseY = y + row * step
        ctx.beginPath()
        for (let px = x; px <= x + w; px += 8 * s) {
          const wave = Math.sin(px / (17 * s) + row * 0.55) * 3.4 * s
          if (px === x) ctx.moveTo(px, baseY + wave)
          else ctx.lineTo(px, baseY + wave)
        }
        ctx.stroke()
      }
      ctx.restore()
    },

    /** 票面外壳：连体蓝圆票头 + 两侧对联 + 底部蓝框 + 保安区 */
    paintXixiangFrame (ctx, w, h, s, p, meta) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, p.red)
      bg.addColorStop(0.5, '#C22A2A')
      bg.addColorStop(1, p.redDeep)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.lineJoin = 'round'
      roundRect(ctx, 8 * s, 8 * s, w - 16 * s, h - 16 * s, 18 * s)
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 5 * s
      ctx.stroke()
      roundRect(ctx, 17 * s, 17 * s, w - 34 * s, h - 34 * s, 14 * s)
      ctx.strokeStyle = 'rgba(255, 243, 206, 0.55)'
      ctx.lineWidth = 1.6 * s
      ctx.stroke()
      ctx.restore()

      // 顶部三个连体圆形蓝框，一字一枚烫金字
      const chars = String(meta.title || '喜盈门').split('').slice(0, 3)
      ;[258, 375, 492].forEach((cx, index) => {
        const x = cx * s
        const y = 150 * s
        const radius = 60 * s
        const ball = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius)
        ball.addColorStop(0, '#2A7BD6')
        ball.addColorStop(0.45, p.blue)
        ball.addColorStop(1, p.blueDeep)
        // 徽章底下的投影，做出贴在票面上的厚度
        ctx.beginPath()
        ctx.arc(x, y + 3 * s, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(70, 8, 8, 0.35)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = ball
        ctx.fill()
        ctx.lineWidth = 3 * s
        ctx.strokeStyle = p.gold
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2)
        ctx.lineWidth = 1.2 * s
        ctx.strokeStyle = 'rgba(255, 243, 206, 0.7)'
        ctx.stroke()
        this.paintGoldGlyph(ctx, chars[index] || '', x, y, radius * 0.86, p)
      })

      // 最高奖励条
      const bannerY = 246 * s
      roundRect(ctx, w / 2 - 226 * s, bannerY, 452 * s, 62 * s, 12 * s)
      const banner = ctx.createLinearGradient(0, bannerY, 0, bannerY + 62 * s)
      banner.addColorStop(0, p.redDeep)
      banner.addColorStop(1, '#7E1212')
      ctx.fillStyle = banner
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 2.6 * s
      ctx.stroke()
      this.paintCodeText(ctx, meta.bannerTop || '最高奖励 100000 米贝', w / 2, bannerY + 31 * s, 27 * s, p.goldLight, 0.03)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255, 243, 206, 0.92)'
      ctx.font = `700 ${Math.round(16 * s)}px ${FONT_STACK}`
      ctx.fillText(meta.bannerSub || '共 25 次中奖机会', w / 2, 324 * s)

      // 左上角面值：票面必须印清楚这张票多少钱
      roundRect(ctx, 26 * s, 92 * s, 152 * s, 48 * s, 6 * s)
      ctx.fillStyle = p.blue
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 2.2 * s
      ctx.stroke()
      this.paintCodeText(ctx, `面值 ${meta.price || 20} 米贝`, 102 * s, 116 * s, 20 * s, p.goldLight, 0.02)

      // 两侧对联：垂直居中在刮奖框左右的红带里，不会被版心压住
      const couplets = [
        (meta.couplets && meta.couplets[0]) || '鹏程万里',
        (meta.couplets && meta.couplets[1]) || '鸿运千秋'
      ]
      ;[[XX_COUPLET.left, couplets[0]], [XX_COUPLET.right, couplets[1]]].forEach(([x, text]) => {
        roundRect(ctx, x * s, XX_COUPLET.y * s, XX_COUPLET.w * s, XX_COUPLET.h * s, 6 * s)
        ctx.fillStyle = p.blue
        ctx.fill()
        ctx.strokeStyle = p.gold
        ctx.lineWidth = 2.4 * s
        ctx.stroke()
        roundRect(ctx, (x + 5) * s, (XX_COUPLET.y + 5) * s, (XX_COUPLET.w - 10) * s, (XX_COUPLET.h - 10) * s, 4 * s)
        ctx.strokeStyle = 'rgba(255, 243, 206, 0.55)'
        ctx.lineWidth = 1 * s
        ctx.stroke()
        String(text).split('').forEach((char, index) => {
          this.paintGoldGlyph(ctx, char, (x + XX_COUPLET.w / 2) * s, (XX_COUPLET.y + 94 + index * 150) * s, 34 * s, p)
        })
      })

      // 底部蓝框
      roundRect(ctx, w / 2 - 150 * s, 1050 * s, 300 * s, 70 * s, 8 * s)
      ctx.fillStyle = p.blue
      ctx.fill()
      ctx.strokeStyle = p.gold
      ctx.lineWidth = 2.6 * s
      ctx.stroke()
      this.paintGoldGlyph(ctx, '金玉满堂', w / 2, 1085 * s, 34 * s, p)

      // 左下角保安区 + 右下角中奖机会
      const corner = (x, zw, text, size) => {
        roundRect(ctx, x * s, 1150 * s, zw * s, 46 * s, 8 * s)
        ctx.fillStyle = p.blue
        ctx.fill()
        ctx.strokeStyle = p.gold
        ctx.lineWidth = 2 * s
        ctx.stroke()
        this.paintCodeText(ctx, text, (x + zw / 2) * s, 1173 * s, size * s, p.goldLight, 0.03)
      }
      corner(30, 220, '保安区刮开无效', 18)
      corner(500, 220, '25次中奖机会', 18)

      // 底部装饰云带，别让票脚空着
      ctx.save()
      ctx.globalAlpha = 0.3
      const bandY = 1428 * s
      for (let x = 60 * s; x < w - 40 * s; x += 74 * s) {
        this.paintCloudCurl(ctx, x, bandY, 24 * s, 0, p.goldLight, s)
      }
      ctx.restore()
    },

    /** 《喜盈门》底层：国风外壳 + 灰白防伪纸 + 5×5 格子内容 + 规则文案 */
    paintXixiangBase (ctx, w, h) {
      const s = this.padScale
      const p = this.padTicket.palette
      const meta = this.padTicket.meta || {}
      const cells = this.padTicket.cells || []
      ctx.globalCompositeOperation = 'source-over'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.clearRect(0, 0, w, h)

      this.paintXixiangFrame(ctx, w, h, s, p, meta)
      this.paintXixiangPanel(ctx, XX_PANEL, s, p)

      // 25 格：先在纸上压出圆印，再印内容（圆外不画任何底色）
      this.padCoins.forEach((gem, index) => {
        const cell = cells[index] || { icon: '祥云', amount: '', pinyin: '' }
        this.paintXixiangEmboss(ctx, gem, s)
        this.paintXixiangCell(ctx, gem, cell, s, p, index)
      })

      // 规则文案：严格印在刮奖框正下方
      const lines = this.wrapText(ctx, XX_RULES, (w - 156 * s), 16 * s, 700)
      ctx.fillStyle = 'rgba(255, 243, 206, 0.92)'
      ctx.font = `700 ${Math.round(16 * s)}px ${FONT_STACK}`
      lines.forEach((line, index) => {
        ctx.fillText(line, w / 2, (988 + index * 28) * s)
      })

      // 票脚：票号 / 条码 / 二维码
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255, 243, 206, 0.85)'
      ctx.font = `700 ${Math.round(14 * s)}px ${FONT_STACK}`
      ctx.fillText(`票号 ${meta.serial || ''}`, 34 * s, 1236 * s)
      ctx.fillText(`兑奖凭证 ${meta.security || ''}`, 34 * s, 1262 * s)
      ctx.fillStyle = p.cream
      let barX = 34 * s
      for (let i = 0; i < 60 && barX < 420 * s; i += 1) {
        const barW = (i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1.4) * s
        if (i % 2 === 0) ctx.fillRect(barX, 1286 * s, barW, 36 * s)
        barX += barW + 2 * s
      }
      const qrSize = 96 * s
      const qrX = w - qrSize - 30 * s
      const qrY = 1258 * s
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(qrX, qrY, qrSize, qrSize)
      ctx.fillStyle = p.ink
      const cellN = 21
      const cs = qrSize / cellN
      for (let row = 0; row < cellN; row += 1) {
        for (let col = 0; col < cellN; col += 1) {
          const finder = (row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7)
          const on = finder
            ? (row % 7 === 0 || row % 7 === 6 || col % 7 === 0 || col % 7 === 6 ||
              (row % 7 > 1 && row % 7 < 5 && col % 7 > 1 && col % 7 < 5))
            : (row * 7 + col * 13) % 5 < 2
          if (on) ctx.fillRect(qrX + col * cs, qrY + row * cs, cs, cs)
        }
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
    },

    /**
     * 红色圆形覆膜：金属感红底 + 细金边 + 中央「囍」字印章。
     * 和宝石一样必须完全不透明——刮开之前一点内容都不许透出来。
     */
    paintXixiangCoat (ctx, gem, s, p) {
      const r = gem.rx
      ctx.save()
      ctx.beginPath()
      ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2)
      ctx.clip()
      const body = ctx.createRadialGradient(gem.x - r * 0.34, gem.y - r * 0.42, r * 0.12, gem.x, gem.y, r * 1.05)
      body.addColorStop(0, '#F4695A')
      body.addColorStop(0.42, p.red)
      body.addColorStop(1, p.redDeep)
      ctx.fillStyle = body
      ctx.fillRect(gem.x - r, gem.y - r, r * 2, r * 2)
      const shine = ctx.createLinearGradient(gem.x - r, gem.y - r, gem.x + r, gem.y + r)
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.34)')
      shine.addColorStop(0.34, 'rgba(255, 255, 255, 0)')
      shine.addColorStop(0.68, 'rgba(255, 255, 255, 0.1)')
      shine.addColorStop(1, 'rgba(255, 255, 255, 0.22)')
      ctx.fillStyle = shine
      ctx.fillRect(gem.x - r, gem.y - r, r * 2, r * 2)
      const rim = ctx.createRadialGradient(gem.x, gem.y, r * 0.55, gem.x, gem.y, r)
      rim.addColorStop(0, 'rgba(0, 0, 0, 0)')
      rim.addColorStop(1, 'rgba(90, 10, 10, 0.45)')
      ctx.fillStyle = rim
      ctx.fillRect(gem.x - r, gem.y - r, r * 2, r * 2)
      ctx.restore()

      ctx.beginPath()
      ctx.arc(gem.x, gem.y, r * 0.88, 0, Math.PI * 2)
      ctx.strokeStyle = p.gold
      ctx.lineWidth = Math.max(1, 2.2 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(gem.x, gem.y, r * 0.965, 0, Math.PI * 2)
      ctx.strokeStyle = p.goldLight
      ctx.lineWidth = Math.max(0.8, 1.2 * s)
      ctx.stroke()
      // 外圈实色边：把抗锯齿的半透明边盖掉，绝不漏光
      ctx.beginPath()
      ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2)
      ctx.strokeStyle = p.redDeep
      ctx.lineWidth = Math.max(1.6, 3.2 * s)
      ctx.stroke()

      // 中央「囍」字印章
      const seal = r * 0.7
      roundRect(ctx, gem.x - seal / 2, gem.y - seal / 2, seal, seal, seal * 0.14)
      ctx.fillStyle = p.cream
      ctx.fill()
      ctx.strokeStyle = p.goldDeep
      ctx.lineWidth = Math.max(1, 1.6 * s)
      ctx.stroke()
      ctx.fillStyle = p.seal
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${Math.round(seal * 0.84)}px ${FONT_STACK}`
      ctx.fillText('囍', gem.x, gem.y + seal * 0.03)
    },

    /* ----------------------------- 手势 ----------------------------- */

    bindEvents (canvas) {
      this.initCoverage()
      /*
       * 笔刷按"一颗宝石的大小"取，不能按画布高度取。
       * 按画布高度算，矮票上是 39px 正好，竖版票上变成 492px，
       * 手指按一下就把一大片涂层抹掉（"稍微刮了一下全没了"）。
       * 现在按最小的一颗宝石算，再乘 1.8：手机上大约 26 个 CSS 像素宽，
       * 和一根手指按下去的接触面差不多——按一下开不了，蹭一下就开一颗。
       */
      const gemSize = this.padCoins.reduce((min, gem) => Math.min(min, Math.min(gem.rx, gem.ry)), 9999)
      /*
       * 喜盈门是 5×5 的小圆格，格子本身比手指还小。
       * 笔刷取格子直径的四成半（手机上约 22 CSS 像素）：
       * 点一下只掉一小块，来回蹭两下才过 50% 开奖，手感更接近真刮。
       */
      const brushRatio = this.padLayout === 'xiyingmen' ? 0.9 : 1.8
      const brush = Math.max(16, Math.round(gemSize * brushRatio))
      this.padBrush = brush
      // 喜盈门是小圆格，50% 就算揭开；璀璨宝石按 60%
      this.padRevealAt = this.padLayout === 'xiyingmen' ? 0.5 : 0.6

      const pointOf = (event) => {
        const rect = canvas.getBoundingClientRect()
        const src = event.touches && event.touches[0] ? event.touches[0] : event
        return {
          x: (src.clientX - rect.left) * this.padDpr,
          y: (src.clientY - rect.top) * this.padDpr
        }
      }

      const erase = (event) => {
        if (!this.padPressing || !this.padCtx) return
        const point = pointOf(event)
        const ctx = this.padCtx
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = brush
        if (this.padLast) {
          ctx.beginPath()
          ctx.moveTo(this.padLast.x, this.padLast.y)
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(point.x, point.y, brush / 2, 0, Math.PI * 2)
        ctx.fill()
        if (!this.padTrail) this.padTrail = []
        this.padTrail.push(point)
        this.spawnDust(point)
        this.padLast = point
      }

      const start = (event) => {
        const src = event.touches && event.touches[0] ? event.touches[0] : event
        this.padTouch = Boolean(event.touches && event.touches.length)
        // 手指先按下去就算一笔，轻点也能刮掉一小块
        this.padGesture = { mode: this.padTouch ? 'pending' : 'scratch', x: src.clientX, y: src.clientY }
        this.padPressing = true
        this.padLast = null
        this.padTrail = []
        erase(event)
      }
      const move = (event) => {
        if (this.padGesture && this.padGesture.mode === 'scroll') return
        if (!this.padPressing) return
        const gesture = this.padGesture
        const src = event.touches && event.touches[0] ? event.touches[0] : event
        /*
         * 手指刚动的那几像素判断意图：
         * 明显是上下方向（竖直位移更大）就认定用户在翻页，
         * 这一笔不作数，也不 preventDefault，让页面正常滚上去。
         * 横向/斜向才当成刮奖。
         */
        if (gesture && gesture.mode === 'pending') {
          const dx = Math.abs(src.clientX - gesture.x)
          const dy = Math.abs(src.clientY - gesture.y)
          if (dy > 8 && dy > dx * 1.3) {
            gesture.mode = 'scroll'
            this.padPressing = false
            this.padLast = null
            // 已经刮掉的那一点照样计入进度，和画面对得上
            this.commitTrail()
            return
          }
          if (dx > 5 || dy > 5) gesture.mode = 'scratch'
        }
        if (event.type === 'touchmove' && event.cancelable) event.preventDefault()
        erase(event)
      }
      const end = () => {
        if (!this.padPressing) return
        this.padPressing = false
        this.padLast = null
        this.commitTrail()
      }

      canvas.addEventListener('touchstart', start, { passive: false })
      canvas.addEventListener('touchmove', move, { passive: false })
      canvas.addEventListener('touchend', end, { passive: true })
      canvas.addEventListener('touchcancel', end, { passive: true })
      canvas.addEventListener('mousedown', start)
      canvas.addEventListener('mousemove', move)
      canvas.addEventListener('mouseup', end)
      canvas.addEventListener('mouseleave', end)
      this.padListeners = [
        [canvas, 'touchstart', start],
        [canvas, 'touchmove', move],
        [canvas, 'touchend', end],
        [canvas, 'touchcancel', end],
        [canvas, 'mousedown', start],
        [canvas, 'mousemove', move],
        [canvas, 'mouseup', end],
        [canvas, 'mouseleave', end]
      ]
    },

    /* --------------------------- 金屑粒子 --------------------------- */

    spawnDust (point) {
      if (!this.padDustCtx) return
      if (!this.padParticles) this.padParticles = []
      if (this.padParticles.length > 120) return
      for (let i = 0; i < 2; i += 1) {
        this.padParticles.push({
          x: point.x,
          y: point.y,
          vx: (Math.random() - 0.5) * 1.8 * this.padScale,
          vy: (-0.5 - Math.random() * 1.2) * this.padScale,
          size: (Math.random() * 2 + 1) * this.padScale,
          life: 1,
          color: Math.random() > 0.5 ? '#E8C05A' : '#FFF0BE'
        })
      }
      this.startAnimLoop()
    },

    /** 一颗宝石刮够了 60%，从中心往外洒一圈金屑 */
    spawnGemBurst (gem) {
      if (!this.padDustCtx) return
      if (!this.padParticles) this.padParticles = []
      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4
        const reach = Math.min(gem.rx, gem.ry) * (0.7 + Math.random() * 0.5)
        this.padParticles.push({
          x: gem.x + Math.cos(angle) * reach,
          y: gem.y + Math.sin(angle) * reach,
          vx: Math.cos(angle) * 0.9 * this.padScale,
          vy: Math.sin(angle) * 0.9 * this.padScale - 0.4 * this.padScale,
          size: (Math.random() * 1.8 + 1) * this.padScale,
          life: 1,
          color: Math.random() > 0.4 ? '#FFE9A8' : '#FFF6D8'
        })
      }
      if (this.padParticles.length > 220) this.padParticles.splice(0, this.padParticles.length - 220)
      this.startAnimLoop()
    },

    /**
     * 金屑和「补刮」共用一个动画循环：
     * 60% 之后那一下要有个从中间扩散开的擦除动作，不能啪一下整颗消失。
     */
    startAnimLoop () {
      if (this.padAnimRaf) return
      const step = () => {
        this.padAnimRaf = null
        if (this.disposed) return
        this.stepWipes()
        this.stepDust()
        this.stepGlows()
        const busy = (this.padWipes && this.padWipes.length) ||
          (this.padParticles && this.padParticles.length) ||
          (this.padGlows && this.padGlows.length)
        if (busy) this.padAnimRaf = requestAnimationFrame(step)
      }
      this.padAnimRaf = requestAnimationFrame(step)
    },

    stepDust () {
      if (!this.padDustCtx) return
      const ctx = this.padDustCtx
      ctx.clearRect(0, 0, this.padDust.width, this.padDust.height)
      if (!this.padParticles || !this.padParticles.length) return
      const gravity = 0.06 * this.padScale
      const alive = []
      this.padParticles.forEach((p) => {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.04
        if (p.life <= 0) return
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
        alive.push(p)
      })
      ctx.globalAlpha = 1
      this.padParticles = alive
    },

    /** 中奖格的高亮：一圈会扩散的金光，「囍」再补一个 ×2 角标 */
    spawnGemGlow (gem, multiple, duration) {
      if (!this.padGlows) this.padGlows = []
      this.padGlows.push({
        gem,
        multiple: Number(multiple) || 1,
        start: Date.now(),
        duration: duration || 1200
      })
      this.startAnimLoop()
    },

    stepGlows () {
      const ctx = this.padDustCtx
      if (!ctx || !this.padGlows || !this.padGlows.length) return
      const now = Date.now()
      const keep = []
      this.padGlows.forEach((item) => {
        const t = (now - item.start) / item.duration
        if (t >= 1) return
        const gem = item.gem
        const base = Math.max(gem.rx, gem.ry)
        const fade = 1 - t
        ctx.save()
        // 三圈由内向外扩散的金光
        for (let i = 0; i < 3; i += 1) {
          const ring = (t + i * 0.16) % 1
          ctx.globalAlpha = fade * 0.85 * (1 - ring)
          ctx.strokeStyle = item.multiple > 1 ? '#FFB300' : '#FFD95C'
          ctx.lineWidth = Math.max(1.5, (2.4 - ring) * this.padScale)
          ctx.beginPath()
          ctx.arc(gem.x, gem.y, base * (1.02 + ring * 0.42), 0, Math.PI * 2)
          ctx.stroke()
        }
        if (item.multiple > 1) {
          const chip = Math.max(gem.rx, gem.ry) * 0.52
          ctx.globalAlpha = Math.min(1, fade * 1.6)
          roundRect(ctx, gem.x + base * 0.36, gem.y - base * 0.86, chip, chip * 0.62, chip * 0.2)
          ctx.fillStyle = '#FF7A00'
          ctx.fill()
          ctx.strokeStyle = '#FFF3CE'
          ctx.lineWidth = Math.max(1, 1.4 * this.padScale)
          ctx.stroke()
          ctx.fillStyle = '#FFF7E6'
          ctx.font = `900 ${Math.round(chip * 0.5)}px ${FONT_STACK}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('×2', gem.x + base * 0.36 + chip / 2, gem.y - base * 0.86 + chip * 0.33)
        }
        ctx.restore()
        keep.push(item)
      })
      this.padGlows = keep
    },

    /** 60% 之后，把这一颗剩下的涂层径向补着刮干净（只动这一颗） */
    stepWipes () {
      const ctx = this.padCtx
      if (!ctx || !this.padWipes || !this.padWipes.length) return
      const now = Date.now()
      const keep = []
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      this.padWipes.forEach((item) => {
        const gem = item.gem
        const t = Math.min(1, (now - item.start) / item.duration)
        const eased = 1 - Math.pow(1 - t, 2)
        const radius = Math.hypot(gem.rx, gem.ry) * eased + 2 * this.padScale
        ctx.save()
        // 稍微放大一点再裁剪，宝石外圈那点抗锯齿边也一起擦掉
        shapePath(ctx, gem.shape, gem.x, gem.y, gem.rx, gem.ry, 1.06)
        ctx.clip()
        ctx.beginPath()
        ctx.arc(gem.x, gem.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.restore()
        if (t < 1) keep.push(item)
      })
      ctx.restore()
      this.padWipes = keep
    },

    /* --------------------------- 覆盖比例 --------------------------- */

    initCoverage () {
      const n = COVERAGE_GRID
      // 每个格子属于哪枚铜钱（-1 表示落在铜钱外的红底上）
      this.padCellCoin = new Int16Array(n * n).fill(-1)
      this.padCoinCells = this.padCoins.map(() => [])
      for (let gy = 0; gy < n; gy += 1) {
        for (let gx = 0; gx < n; gx += 1) {
          const x = ((gx + 0.5) / n) * this.padWidth
          const y = ((gy + 0.5) / n) * this.padHeight
          const coinIndex = this.padCoins.findIndex((gem) => this.insideGem(gem, x, y))
          if (coinIndex < 0) continue
          const cell = gy * n + gx
          this.padCellCoin[cell] = coinIndex
          this.padCoinCells[coinIndex].push(cell)
        }
      }
      this.padMask = new Uint8Array(n * n)
      this.padCoinMarked = this.padCoins.map(() => 0)
      this.padRevealed = this.padCoins.map(() => false)
      this.padRevealedCount = 0
      this.padWipes = []
      this.padGlows = []
      this.padCoatable = this.padCoinCells.reduce((sum, list) => sum + list.length, 0) ||
        COVERAGE_GRID * COVERAGE_GRID
      this.padCovered = 0
      this.padTrail = []
      this.padProgress = 0
      this.padSettled = false
    },

    commitTrail () {
      const trail = this.padTrail
      this.padTrail = []
      if (!trail || !trail.length) return
      let previous = null
      trail.forEach((point) => {
        this.markCoverage(point, previous)
        previous = point
      })
      this.publishCoverage()
      this.checkCoins(trail)
    },

    markCoverage (point, previous) {
      const from = previous || point
      const dx = point.x - from.x
      const dy = point.y - from.y
      const length = Math.hypot(dx, dy)
      const cellW = this.padCanvas.width / COVERAGE_GRID
      const cellH = this.padCanvas.height / COVERAGE_GRID
      const step = Math.max(1, Math.min(cellW, cellH) * 0.5)
      const steps = Math.max(1, Math.ceil(length / step))
      const reach = this.padBrush * 0.5
      /*
       * 采样格是有大小的：按"格心落在笔刷范围内"来数，会把边缘多算半格，
       * 细笔刷时能虚报一倍（进度条上的百分比会比实际高很多）。
       * 两边各扣掉半格，数的才接近真实擦掉的面积。
       */
      const reachX = Math.max(cellW * 0.45, reach - cellW * 0.5)
      const reachY = Math.max(cellH * 0.45, reach - cellH * 0.5)
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps
        const px = from.x + dx * t
        const py = from.y + dy * t
        const minX = Math.max(0, Math.floor((px - reachX) / cellW))
        const maxX = Math.min(COVERAGE_GRID - 1, Math.floor((px + reachX) / cellW))
        const minY = Math.max(0, Math.floor((py - reachY) / cellH))
        const maxY = Math.min(COVERAGE_GRID - 1, Math.floor((py + reachY) / cellH))
        for (let gy = minY; gy <= maxY; gy += 1) {
          for (let gx = minX; gx <= maxX; gx += 1) {
            const index = gy * COVERAGE_GRID + gx
            if (this.padMask[index]) continue
            const coinIndex = this.padCellCoin[index]
            if (coinIndex < 0) continue
            this.padMask[index] = 1
            this.padCovered += 1
            this.padCoinMarked[coinIndex] += 1
          }
        }
      }
    },

    publishCoverage () {
      const ratio = this.padCovered / this.padCoatable
      if (ratio <= this.padProgress) return
      const now = Date.now()
      if (ratio < 1 && now - (this.padNotifyAt || 0) < 120) {
        this.padProgress = ratio
        return
      }
      this.padNotifyAt = now
      this.padProgress = ratio
      this.notify({ type: 'progress', ratio })
    },

    /**
     * 逐枚铜钱判定：单枚擦除超过 60% 就算这枚"已开奖"。
     * 注意这里只做判定和反馈——音效、震动、进度计数，
     * 不会替用户把剩下的覆盖膜清掉；刮到哪儿显哪儿。
     */
    /**
     * 判定这一笔碰到了哪些格子。
     *
     * 这里不用采样网格的比例——网格再密也有离散误差：
     * 一个小圆格一共才四十几个采样点，手指碰一下就会被算成六七成。
     * 改成直接读覆盖膜的像素：这颗宝石范围内有多少像素已经被擦掉了，
     * 算出来的是真实擦除比例，50% / 60% 的口径才站得住。
     */
    checkCoins (trail) {
      const points = trail && trail.length ? trail : this.padTrail
      const candidates = []
      ;(points || []).forEach((point) => {
        this.padCoins.forEach((gem, index) => {
          if (this.padRevealed[index] || candidates.indexOf(index) >= 0) return
          const reach = this.padBrush * 0.5
          if (Math.abs(point.x - gem.x) <= gem.rx + reach && Math.abs(point.y - gem.y) <= gem.ry + reach) {
            candidates.push(index)
          }
        })
      })
      candidates.forEach((index) => {
        if (this.padRevealed[index]) return
        if (this.gemErasedRatio(index) >= (this.padRevealAt || 0.6)) this.revealGem(index)
      })
    },

    /** 一颗宝石被擦掉的真实像素比例 */
    gemErasedRatio (index) {
      const gem = this.padCoins[index]
      const ctx = this.padCtx
      if (!gem || !ctx) return 0
      const pad = 2
      const x0 = Math.max(0, Math.round(gem.x - gem.rx) - pad)
      const y0 = Math.max(0, Math.round(gem.y - gem.ry) - pad)
      const w = Math.min(this.padWidth - x0, Math.round(gem.rx * 2) + pad * 2)
      const h = Math.min(this.padHeight - y0, Math.round(gem.ry * 2) + pad * 2)
      if (w < 2 || h < 2) return 0
      const data = ctx.getImageData(x0, y0, w, h).data
      let inside = 0
      let erased = 0
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (!this.insideGem(gem, x0 + x + 0.5, y0 + y + 0.5)) continue
          inside += 1
          if (data[(y * w + x) * 4 + 3] < 128) erased += 1
        }
      }
      return inside ? erased / inside : 0
    },

    /** 这一颗整颗算刮开：覆盖网格和进度都按整颗记 */
    markGemCovered (index) {
      this.padCoinCells[index].forEach((cell) => {
        if (this.padMask[cell]) return
        this.padMask[cell] = 1
        this.padCovered += 1
        this.padCoinMarked[index] += 1
      })
    },

    /**
     * 判定一颗宝石。
     *
     * 只有擦到 60% 才会走到这里（「全部刮开」是用户主动点的，另算）。
     * 到了 60%，把这一颗剩下的涂层补着刮干净并判定结果，
     * 但只动这一颗 —— 别的格子没刮到就是没刮到，绝不提前揭露。
     */
    revealGem (index, instant) {
      if (this.padRevealed[index]) return
      const gem = this.padCoins[index]
      if (!gem) return
      this.padRevealed[index] = true
      this.markGemCovered(index)
      this.padRevealedCount += 1
      const cell = gem.cellIndex >= 0 ? ((this.padTicket.cells || [])[gem.cellIndex] || {}) : {}
      // 第五局：号码和中奖号码相同才算中；前四局：格子里有宝石图案才算中
      const hit = Boolean(cell.hit)
      if (instant) {
        this.eraseGemNow(gem)
      } else {
        if (!this.padWipes) this.padWipes = []
        this.padWipes.push({ gem, start: Date.now(), duration: 260 })
        this.spawnGemBurst(gem)
        this.startAnimLoop()
      }
      if (hit) this.spawnGemGlow(gem, Number(cell.multiple) || 1)
      // 全部揭开：中奖的格子再一起亮一遍，就是结算动画
      if (this.padRevealedCount >= (this.padPrizeTotal || this.padCoins.length)) {
        this.padCoins.forEach((item) => {
          const itemCell = this.padTicket.cells[item.cellIndex] || {}
          if (itemCell.hit) this.spawnGemGlow(item, Number(itemCell.multiple) || 1, 1800)
        })
      }
      this.playChime(hit)
      if (!this.padBulk) {
        this.padNotifyAt = 0
        this.publishCoverage()
      }
      this.notify({
        type: 'coin',
        index,
        hit,
        zone: Number(cell.zone) || 0,
        number: cell.number || '',
        amount: Number(cell.amount) || 0,
        revealed: this.padRevealedCount,
        total: this.padPrizeTotal || this.padCoins.length
      })
    },

    /** 整颗一次擦干净（「全部刮开」用） */
    eraseGemNow (gem) {
      const ctx = this.padCtx
      if (!ctx) return
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      shapePath(ctx, gem.shape, gem.x, gem.y, gem.rx, gem.ry, 1.08)
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.restore()
    },

    /** 音效：WebAudio 直接合成，不用带音频文件。中奖是高音双响，没中是低音一下 */
    playChime (win) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        if (!this.padAudio) this.padAudio = new Ctx()
        const audio = this.padAudio
        if (audio.state === 'suspended' && audio.resume) audio.resume()
        const now = audio.currentTime
        const tone = (freq, start, duration, volume) => {
          const osc = audio.createOscillator()
          const gain = audio.createGain()
          osc.type = 'triangle'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.0001, now + start)
          gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
          osc.connect(gain)
          gain.connect(audio.destination)
          osc.start(now + start)
          osc.stop(now + start + duration + 0.02)
        }
        if (win) {
          tone(880, 0, 0.16, 0.16)
          tone(1320, 0.09, 0.22, 0.14)
        } else {
          tone(420, 0, 0.12, 0.08)
        }
      } catch (error) {
        // 静音不影响玩法
      }
    },

    scratchAll () {
      // 「全部刮开」是用户主动点的，这一下才真的把整张膜擦干净
      this.padBulk = true
      this.padCoins.forEach((gem, index) => this.revealGem(index, true))
      this.padBulk = false
      this.padCovered = this.padCoatable
      this.padNotifyAt = 0
      this.publishCoverage()
    },

    disposePad () {
      if (this.padAnimRaf) cancelAnimationFrame(this.padAnimRaf)
      this.padAnimRaf = null
      this.padWipes = []
      this.padParticles = []
      if (this.padListeners) {
        this.padListeners.forEach(([target, name, handler]) => target.removeEventListener(name, handler))
        this.padListeners = null
      }
      if (this.padCanvas && this.padCanvas.parentNode) this.padCanvas.parentNode.removeChild(this.padCanvas)
      if (this.padDust && this.padDust.parentNode) this.padDust.parentNode.removeChild(this.padDust)
      this.padCanvas = null
      this.padCtx = null
      this.padDust = null
      this.padDustCtx = null
      this.padPressing = false
      this.padLast = null
    }
  }
}
</script>

<style lang="scss" scoped>
.scratch-tool {
  /*
   * 这个模块不铺白底、不套卡片：
   * 票面直接落在页面背景上，上下控件各自留边距，
   * 中间那张票左右可以贴到模块边缘 —— 它是一件印刷品，不是弹窗。
   */
  padding: 0 0 24rpx;
  background: transparent;
}

.scratch-tool__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 24rpx;
}

.scratch-tool__copy {
  min-width: 0;
  flex: 1;
}

.scratch-tool__kicker {
  display: block;
  color: rgba(178, 130, 62, 0.95);
  font-size: 17rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.scratch-tool__title {
  display: block;
  margin-top: 8rpx;
  color: #241a15;
  font-size: 38rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.scratch-tool__subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(88, 70, 58, 0.6);
  font-size: 21rpx;
}

.scratch-tool__seal {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 3rpx;
  padding: 8rpx 14rpx;
  border: 2rpx solid rgba(163, 39, 32, 0.4);
  border-radius: 8rpx;
  background: rgba(163, 39, 32, 0.06);
}

.scratch-tool__seal-num {
  color: #A3271F;
  font-size: 28rpx;
  font-weight: 900;
}

.scratch-tool__seal-unit {
  color: rgba(163, 39, 32, 0.7);
  font-size: 16rpx;
  font-weight: 800;
}

/* ------------------------- 《喜乐满堂》票面 ------------------------- */

/* 票面样式切换 */
.scratch-tool__themes {
  display: flex;
  gap: 6rpx;
  margin-top: 18rpx;
  padding: 0 24rpx;
  overflow-x: auto;
  white-space: nowrap;
}

/* 票价 / 最高奖励 / 中奖率 / 玩法：就是一行说明，不做卡片 */
.scratch-tool__spec {
  margin: 14rpx 24rpx 0;
}

.scratch-tool__spec-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.scratch-tool__spec-chip {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  color: #8a2b1f;
  font-size: 20rpx;
  font-weight: 800;
  background: rgba(200, 150, 62, 0.16);
}

.scratch-tool__spec-chip--rate {
  color: #1b2a6b;
  background: rgba(27, 42, 107, 0.1);
}

.scratch-tool__spec-rule {
  display: block;
  margin-top: 8rpx;
  color: rgba(88, 70, 58, 0.8);
  font-size: 20rpx;
  line-height: 1.5;
}

.scratch-tool__theme {
  position: relative;
  flex: 0 0 auto;
  min-height: 62rpx;
  padding: 0 18rpx;
  border: 0;
  border-radius: 0;
  background: transparent;
  line-height: 62rpx;
}

.scratch-tool__theme-text {
  color: rgba(88, 68, 56, 0.6);
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.scratch-tool__theme.active .scratch-tool__theme-text {
  color: #A3271F;
  font-weight: 900;
}

.scratch-tool__theme-bar {
  position: absolute;
  left: 50%;
  bottom: 2rpx;
  width: 0;
  height: 4rpx;
  border-radius: 2rpx;
  background: linear-gradient(90deg, #C8963E, #A3271F);
  transform: translateX(-50%);
  transition: width 0.24s ease;
}

.scratch-tool__theme.active .scratch-tool__theme-bar {
  width: 40rpx;
}

/* ----------------------- 《璀璨宝石》票面 ----------------------- */

.gemstone {
  /*
   * 票面本体，不是卡片。
   * 不能有白底 / 阴影 / 圆角 / 内边距 —— 这层只是给 canvas 定位用的，
   * 票面的红底、金边、对联全部由 canvas 自己画，边上不能多出一圈"卡纸"。
   */
  position: relative;
  margin-top: 14rpx;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

/* 1:2 竖版票面，整张票由 canvas 绘制 */
.gemstone__play {
  position: relative;
  width: 100%;
  padding-top: 200%;
  border-radius: 0;
  overflow: hidden;
  background: transparent;
}

.xileman {
  position: relative;
  margin-top: 16rpx;
  padding: 14rpx;
  border: 5rpx solid #1B2A6B;
  border-radius: 12rpx;
  background: #D8232A;
  overflow: hidden;
}

.xileman__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10rpx;
}

/* 灯笼 */
.xileman__lantern {
  flex: 0 0 auto;
  width: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10rpx;
}

.xileman__lantern-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 84rpx;
  border-radius: 50% / 42%;
  border: 3rpx solid #E8C05A;
  background: linear-gradient(180deg, #F03A3A 0%, #B4121A 100%);
  box-shadow: inset 0 0 12rpx rgba(232, 192, 90, 0.6);
}

.xileman__lantern-text {
  color: #FFE7B0;
  font-size: 26rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.xileman__lantern-tassel {
  width: 4rpx;
  height: 26rpx;
  border-radius: 2rpx;
  background: #E8C05A;
}

.xileman__center {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 烫金描边标题 */
.xileman__title {
  color: #F7DFA0;
  font-size: 62rpx;
  font-weight: 900;
  letter-spacing: 10rpx;
  line-height: 1.1;
  text-shadow:
    3rpx 0 0 #1B2A6B,
    -3rpx 0 0 #1B2A6B,
    0 3rpx 0 #1B2A6B,
    0 -3rpx 0 #1B2A6B,
    0 6rpx 10rpx rgba(80, 10, 10, 0.45);
}

/* 招财猫 */
.xileman__cat {
  position: relative;
  width: 150rpx;
  height: 132rpx;
  margin-top: 6rpx;
}

.xileman__cat-ear {
  position: absolute;
  top: 20rpx;
  width: 0;
  height: 0;
  border-left: 20rpx solid transparent;
  border-right: 20rpx solid transparent;
  border-bottom: 30rpx solid #FFF6E2;
}

.xileman__cat-ear--l {
  left: 12rpx;
}

.xileman__cat-ear--r {
  right: 12rpx;
}

.xileman__cat-face {
  position: absolute;
  left: 20rpx;
  top: 34rpx;
  width: 110rpx;
  height: 76rpx;
  border-radius: 50%;
  border: 3rpx solid #1B2A6B;
  background: #FFF6E2;
}

.xileman__cat-eye {
  position: absolute;
  top: 30rpx;
  width: 22rpx;
  height: 12rpx;
  border-bottom: 3rpx solid #1B2A6B;
  border-radius: 0 0 50% 50%;
}

.xileman__cat-eye--l {
  left: 18rpx;
}

.xileman__cat-eye--r {
  right: 18rpx;
}

.xileman__cat-nose {
  position: absolute;
  left: 50%;
  top: 46rpx;
  width: 0;
  height: 0;
  margin-left: -8rpx;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-top: 10rpx solid #D8232A;
}

.xileman__cat-blush {
  position: absolute;
  top: 46rpx;
  width: 18rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(240, 130, 140, 0.85);
}

.xileman__cat-blush--l {
  left: 8rpx;
}

.xileman__cat-blush--r {
  right: 8rpx;
}

.xileman__ingot {
  position: absolute;
  left: 50%;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 40rpx;
  margin-left: -46rpx;
  border: 3rpx solid #B4862A;
  border-radius: 50% 50% 40% 40% / 70% 70% 40% 40%;
  background: linear-gradient(180deg, #F6E3A8 0%, #E8C05A 55%, #B4862A 100%);
}

.xileman__ingot-text {
  color: #7A5A10;
  font-size: 22rpx;
  font-weight: 900;
}

/* 徽标 */
.xileman__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.xileman__badge {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(232, 192, 90, 0.75);
  background: linear-gradient(180deg, #28B858 0%, #127A36 100%);
  color: #FFF6E2;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.xileman__badge--blue {
  border-color: rgba(255, 255, 255, 0.4);
  background: linear-gradient(180deg, #2A3D8F 0%, #1B2A6B 100%);
}

/* 刮奖区：高度按 750:330 的设计比例撑开 */
.xileman__play {
  position: relative;
  width: 100%;
  margin-top: 12rpx;
  /* 高度主要靠百分比内边距撑开；再给一个最小高度兜底，
     padding-top: 44%;
     万一某些 WebView 不认百分比内边距，刮奖区也不会塌成 0 高 */
  min-height: 260rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background: #D8232A;
}

.xileman__retry {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: rgba(120, 8, 14, 0.9);
}

.xileman__loading {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #D8232A;
  pointer-events: none;
}

.xileman__loading-text {
  color: rgba(255, 243, 214, 0.85);
  font-size: 22rpx;
  letter-spacing: 3rpx;
}

.xileman__retry-text {
  color: rgba(255, 243, 214, 0.8);
  font-size: 20rpx;
}

.xileman__retry-code {
  color: rgba(255, 231, 176, 0.72);
  font-size: 17rpx;
}

.xileman__retry-btn {
  padding: 8rpx 24rpx;
  border: 2rpx solid #E8C05A;
  border-radius: 999rpx;
  color: #FFE7B0;
  font-size: 22rpx;
  font-weight: 900;
}

/* 规则条 */
.xileman__rule {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  border-radius: 6rpx;
  border: 2rpx solid rgba(232, 192, 90, 0.6);
  background: rgba(120, 8, 14, 0.72);
}

.xileman__rule-text {
  color: #FFF3D6;
  font-size: 18rpx;
  line-height: 1.6;
}

/* 保安区 */
.xileman__security {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.xileman__security-banner {
  flex: 0 0 auto;
  padding: 8rpx 12rpx;
  border-radius: 4rpx;
  background: #1B2A6B;
  color: #FFE7B0;
  font-size: 16rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.xileman__barcode {
  flex: 0 0 auto;
  width: 150rpx;
  height: 42rpx;
  background: repeating-linear-gradient(
    90deg,
    #1a1a1a 0 2rpx,
    rgba(255, 255, 255, 0.9) 2rpx 4rpx,
    #1a1a1a 4rpx 7rpx,
    rgba(255, 255, 255, 0.9) 7rpx 10rpx,
    #1a1a1a 10rpx 11rpx,
    rgba(255, 255, 255, 0.9) 11rpx 15rpx,
    #1a1a1a 15rpx 18rpx,
    rgba(255, 255, 255, 0.9) 18rpx 21rpx
  );
}

.xileman__security-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.xileman__security-code {
  color: rgba(255, 243, 214, 0.9);
  font-size: 15rpx;
  letter-spacing: 1rpx;
}

.xileman__serial {
  color: rgba(255, 243, 214, 0.6);
  font-size: 14rpx;
  letter-spacing: 1rpx;
}

/* ------------------------------ 操作 ------------------------------ */

.scratch-tool__actions {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
  padding: 0 24rpx;
}

.scratch-tool__btn {
  flex: 1;
  min-height: 94rpx;
  border-radius: 999rpx;
  font-size: 29rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}

.scratch-tool__btn--primary {
  border: 1rpx solid rgba(232, 196, 132, 0.5);
  background: linear-gradient(180deg, #A8322C 0%, #8B2622 100%);
  color: #F8EBD2;
  letter-spacing: 8rpx;
  box-shadow:
    0 16rpx 32rpx rgba(120, 60, 40, 0.22),
    inset 0 1rpx 0 rgba(255, 236, 206, 0.34);
}

.scratch-tool__btn--ghost {
  flex: 0 0 auto;
  min-width: 190rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.28);
  background: rgba(255, 255, 255, 0.78);
  color: rgba(120, 88, 52, 0.92);
  font-size: 26rpx;
  letter-spacing: 2rpx;
}

.scratch-tool__readout {
  margin-top: 16rpx;
  padding: 0 24rpx;
}

/* 温馨提示：说清楚米贝是虚拟积分，避免被当成真钱抽奖 */
.scratch-tool__notice {
  margin: 14rpx 24rpx 0;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(178, 130, 62, 0.2);
  border-radius: 18rpx;
  background: rgba(255, 249, 235, 0.9);
}

.scratch-tool__notice text {
  display: block;
}

.scratch-tool__notice-title {
  margin-bottom: 8rpx;
  color: #8a6a3c;
  font-size: 23rpx;
  font-weight: 850;
}

.scratch-tool__notice-text {
  color: rgba(88, 70, 58, 0.8);
  font-size: 22rpx;
  line-height: 1.62;
}

/* 平台方无关声明：5.3.2 要求明确平台方不是赞助方（iOS 显示 Apple，安卓显示应用市场） */
.scratch-tool__apple {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed rgba(200, 16, 46, 0.22);
  color: #8c1f28;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.6;
}

.scratch-tool__rules {
  margin-top: 10rpx;
  color: var(--color-primary);
  font-size: 22rpx;
  font-weight: 800;
}

.scratch-tool__state {
  display: block;
  color: #241a15;
  font-size: 24rpx;
  font-weight: 900;
}

.scratch-tool__hint {
  display: block;
  margin-top: 5rpx;
  color: rgba(88, 70, 58, 0.62);
  font-size: 20rpx;
  line-height: 1.5;
}
</style>
