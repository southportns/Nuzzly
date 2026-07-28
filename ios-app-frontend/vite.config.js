import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'

const VIEWPORT_WIDTH = 375

function inlinePxToVw(viewportWidth) {
  return {
    name: 'inline-px-to-vw',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/style="([^"]+)"/g, (match, css) => {
          const newCss = css.replace(
            /(-?\d*\.?\d+)px/g,
            (_, value) => {
              const num = parseFloat(value)
              if (num === 0) return '0'
              const vw = (num / viewportWidth) * 100
              return parseFloat(vw.toFixed(5)) + 'vw'
            }
          )
          return `style="${newCss}"`
        })
      }
    }
  }
}

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'model-viewer'
      }
    }
  }), inlinePxToVw(VIEWPORT_WIDTH)],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      // 代理 /api 请求到 web 后端，避免浏览器跨域 (CORS)
      // 开发时前端 localhost:5173 → 后端 localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // SSE 流式响应需要禁用 buffer，否则数据会攒批才推送
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive')
          })
        }
      },
      // 代理 Fluent Emoji 3D 资源到 web 后端（与 web 端共用图集，避免重复部署）
      '/fluentui-emoji': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        pxToViewport({
          unitToConvert: 'px',
          viewportWidth: VIEWPORT_WIDTH,
          unitPrecision: 5,
          propList: ['*'],
          viewportUnit: 'vw',
          fontViewportUnit: 'vw',
          selectorBlackList: ['.ignore-vw', '.action-btn.secondary'],
          minPixelValue: 1,
          mediaQuery: false,
          replace: true,
          exclude: [/node_modules/],
          landscape: false
        })
      ]
    }
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})
