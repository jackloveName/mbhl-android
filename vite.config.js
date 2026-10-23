import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'
import h5ProdEffectPlugin from 'uni-vite-plugin-h5-prod-effect'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    uni(),
    h5ProdEffectPlugin()
  ].concat(process.env.UNI_PLATFORM === 'h5'
    ? [
        legacy({
          targets: ['Android >= 7', 'chrome >= 51', 'firefox >= 54', 'ios >= 10']
        })
      ]
    : []),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    open: false
  },
  build: {
    minify: 'terser'
  }
})
