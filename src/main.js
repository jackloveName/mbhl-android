import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'
import { setupRouter } from './router'
import applyCompatPatches from './plugin/compat'

applyCompatPatches()

export function createApp () {
  const app = createSSRApp(App)

  app.use(Pinia.createPinia())
  setupRouter(app)

  return {
    app,
    Pinia
  }
}
