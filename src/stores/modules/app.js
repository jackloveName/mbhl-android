import { defineStore } from 'pinia'
import { getRuntimeAppName } from '@/utils/app-info'

export const useAppStore = defineStore('app', {
  state: () => ({
    appName: getRuntimeAppName(),
    // 首页快捷入口想打开的玩法（wheel / lots / dice / truth）
    activePlayTool: 'wheel',
    /*
     * 兑换中心刚买好的刮刮乐票面。
     * 兑换页扣完米贝把它放这儿，决断页取走后直接开刮，
     * 避免「兑换了却不知道该刮哪张」。
     */
    pendingScratch: null,
    safeArea: {
      statusBarHeight: 0,
      windowWidth: 0,
      windowHeight: 0
    }
  }),
  actions: {
    setActivePlayTool (toolId = 'wheel') {
      this.activePlayTool = toolId || 'wheel'
    },
    setPendingScratch (styleId = '') {
      this.pendingScratch = styleId
        ? { styleId, token: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
        : null
    },
    consumePendingScratch () {
      const pending = this.pendingScratch
      this.pendingScratch = null
      return pending
    },
    setSystemInfo (info = {}) {
      this.safeArea = {
        statusBarHeight: info.statusBarHeight || 0,
        windowWidth: info.windowWidth || 0,
        windowHeight: info.windowHeight || 0
      }
    }
  }
})
