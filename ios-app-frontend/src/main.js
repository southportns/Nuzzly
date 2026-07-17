import { createApp } from 'vue'
import TDesign from 'tdesign-mobile-vue'
import 'tdesign-mobile-vue/dist/tdesign.css'
import '@google/model-viewer'
import App from './App.vue'
import router from './router'
import '../css/common.css'
import '../css/design-tokens.css'
import { initTracker } from './lib/intent-tracker'

const APP_VERSION = '2.0.3'
const savedVersion = localStorage.getItem('nuzzly_version')
if (savedVersion && savedVersion !== APP_VERSION) location.reload()
localStorage.setItem('nuzzly_version', APP_VERSION)

createApp(App).use(TDesign).use(router).mount('#app')

initTracker()
