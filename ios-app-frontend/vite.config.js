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
    open: false
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
