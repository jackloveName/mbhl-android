<script>
import { useAppStore } from '@/stores'
import { enforcePageAccess } from '@/router'

export default {
  onLaunch () {
    /*
     * 这里不再自动写游客态：登录和游客必须是用户自己选的，
     * 自动写就等于永远跳过登录页（见 router/index.js 的登录门槛）。
     */
    /*
     * 音频会话：App 端默认跟随系统静音键，iPhone 拨到静音就整段没声。
     * 游戏音效（转盘咔哒）设成不跟随，想安静的人用页面上的音效开关关。
     * 放在启动阶段设，比等第一次播音再设更稳。
     */
    try {
      uni.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOther: true,
        success: () => {},
        fail: () => {}
      })
    } catch (error) {}

    uni.getSystemInfo({
      success: (res) => {
        useAppStore().setSystemInfo(res)
      }
    })
  },
  onShow () {
    enforcePageAccess()
  },
  onPageNotFound () {
    uni.reLaunch({
      url: '/pages/home/index'
    })
  },
  globalData: {
    requestQueue: [],
    requestAbortQueue: [],
    currentReqCounts: 0,
    isLanding: false,
    sysInfo: {}
  }
}
</script>

<style lang="scss">
@import '@/styles/index.scss';
</style>
