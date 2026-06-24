import { defineConfig } from 'vite';
import pxToViewportPkg from 'postcss-px-to-viewport';

const pxToViewport = pxToViewportPkg.default || pxToViewportPkg;

// iOS 全机型适配：基于 375px 设计稿，所有 px 在构建时自动转 vw
// 覆盖 iPhone SE(375) / 14(390) / 14 Pro(393) / 14 Plus(428) / 14 Pro Max(430)
const VIEWPORT_WIDTH = 375;

/**
 * Vite 插件：把 HTML 里的 inline style="..." 中所有 px 转成 vw
 * 解决 postcss-px-to-viewport 不处理 inline 样式的问题
 */
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
              const num = parseFloat(value);
              if (num === 0) return '0';
              const vw = (num / viewportWidth) * 100;
              return parseFloat(vw.toFixed(5)) + 'vw';
            }
          );
          return `style="${newCss}"`;
        });
      }
    }
  };
}

export default defineConfig({
  plugins: [inlinePxToVw(VIEWPORT_WIDTH)],
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
          selectorBlackList: ['.ignore-vw'],
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
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: 'index.html',
        butler: 'butler.html',
        community: 'community.html',
        profile: 'profile.html',
        settings: 'settings.html',
        editProfile: 'edit-profile.html'
      }
    }
  }
});
