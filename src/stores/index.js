import { useAppStore } from './modules/app'
import { useUserStore } from './modules/user'

/** 页面里统一从 '@/stores' 取，别直接引 modules 下面的文件 */
export { useAppStore, useUserStore }
