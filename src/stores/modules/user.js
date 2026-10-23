import { defineStore } from 'pinia'
import { deleteAccount as deleteAccountApi, fetchUserProfile, loginByCode, loginByPassword, signOut } from '@/api/account'
import { getToken, isGuestSession, removeGuestSession, removeToken, setGuestSession, setToken } from '@/utils/auth'
import { encryptPassword } from '@/utils/crypto'
import { getLoginPlatform } from '@/utils/platform'
import { getRuntimeAppName } from '@/utils/app-info'
import { clearToolboxSyncCache, syncToolboxWithCloud } from '@/utils/toolbox-cloud'
import { clearCoupleDataCache, syncCoupleWithCloud } from '@/utils/couple-data'
import { clearRecordsSyncCache, syncRecordsWithCloud } from '@/utils/records-cloud'
import { flushRecordsSync } from '@/utils/records-sync-queue'

function getDeviceInfo () {
  try {
    return uni.getSystemInfoSync() || {}
  } catch (error) {
    return {}
  }
}

function readIdentity (profile = {}) {
  return String(
    profile.mobile ||
    profile.phone ||
    profile.userMobile ||
    profile.userName ||
    profile.userAccount ||
    profile.account ||
    ''
  ).trim()
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    guest: isGuestSession(),
    profile: {}
  }),
  getters: {
    /**
     * 展示名只认后台的 nickName 字段：
     * 昵称没填、或者接口没返回，就退回「米贝嗨乐用户」，
     * 不要拿账号、手机号之类的字段顶上（界面上出现手机号很不礼貌）。
     * 注意：账号身份（做云端存储 key 用）仍然走 readIdentity()，那是账号标识不是名字。
     */
    displayName: (state) => {
      if (state.guest) return '游客'
      const profile = state.profile || {}
      return String(profile.nickName || '').trim() || `${getRuntimeAppName()}用户`
    }
  },
  actions: {
    async login ({ mode, mobile, userName, account, code = '', password = '' }) {
      const systemInfo = getDeviceInfo()
      const isCodeMode = mode === 'code'
      const loginName = String(userName || account || mobile || '').trim()
      const payload = {
        sysType: 0,
        socialType: getLoginPlatform(),
        tempUid: '',
        userName: loginName,
        appBrand: getRuntimeAppName(),
        osName: systemInfo.osName || systemInfo.platform || '',
        loginStatus: isCodeMode ? 1 : 2,
        mobile: isCodeMode ? loginName : undefined,
        validCode: isCodeMode ? code : undefined,
        passWord: isCodeMode ? undefined : encryptPassword(password)
      }
      const result = await (isCodeMode ? loginByCode(payload) : loginByPassword(payload))
      if (!result?.accessToken) throw new Error('登录响应中缺少 accessToken')

      setToken(result.accessToken)
      removeGuestSession()
      this.token = result.accessToken
      this.guest = false
      clearToolboxSyncCache()
      clearCoupleDataCache()
      clearRecordsSyncCache()

      try {
        await this.fetchProfile()
        const userMobile = await this.getUserMobile()
        // 登录时把云端那份拉下来（工具箱 / 情侣 / 米贝与玩法记录）
        await syncCoupleWithCloud(userMobile, { force: true })
        await syncToolboxWithCloud(userMobile, { force: true })
        await syncRecordsWithCloud(userMobile, { force: true })
      } catch (error) {
        this.profile = { mobile: loginName, userName: loginName }
      }

      return result
    },
    /**
     * 进应用时后台同步一次账号数据（30 秒内不重复拉）。
     * 返回 true 表示这次采用了云端数据，页面可以据此刷新一遍。
     */
    async syncCloudData () {
      if (this.guest || !getToken()) return false
      try {
        const scope = await this.getUserMobile()
        const adopted = await syncRecordsWithCloud(scope)
        await syncToolboxWithCloud(scope)
        return adopted
      } catch (error) {
        return false
      }
    },
    async fetchProfile ({ fresh = false } = {}) {
      if (this.guest) return this.profile || {}
      if (!getToken()) return this.profile || {}
      const profile = await fetchUserProfile({ fresh })
      this.profile = profile || {}
      return this.profile
    },
    /**
     * 本地先合并一份资料，界面立刻生效（比如刚换完头像），
     * 不用等后台那一次请求回来。
     */
    patchProfile (patch = {}) {
      this.profile = { ...(this.profile || {}), ...patch }
      return this.profile
    },
    async getInfo () {
      return this.fetchProfile()
    },
    async getUserMobile () {
      if (this.guest) return 'guest'
      let mobile = readIdentity(this.profile)
      if (!mobile && getToken()) {
        await this.fetchProfile()
        mobile = readIdentity(this.profile)
      }
      if (!mobile) throw new Error('当前账号缺少身份标识')
      return mobile
    },
    async logOut () {
      try {
        // 退出前把攒着还没推的改动补一次，免得刚花的米贝没上云
        await flushRecordsSync()
      } catch (error) {}
      try {
        await signOut()
      } finally {
        this.clearSession()
      }
    },
    async destroyAccount () {
      await deleteAccountApi(false)
      this.clearSession()
    },
    enterGuestMode () {
      this.guest = true
      setGuestSession(true)
      clearToolboxSyncCache()
      clearCoupleDataCache()
      clearRecordsSyncCache()
    },
    clearSession () {
      removeToken()
      removeGuestSession()
      this.token = ''
      this.guest = false
      this.profile = {}
      clearToolboxSyncCache()
      clearCoupleDataCache()
      clearRecordsSyncCache()
    }
  }
})
