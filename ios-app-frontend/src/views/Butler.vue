<template>
  <div class="app-shell" ref="appShell">
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar"><img src="/mqpyqgao-logo.png" alt="nuzzly"></div>
        <div class="header-actions">
          <button class="action-circle ignore-vw" aria-label="设置">
            <svg viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M553.7 753.4h-59.9c-12.8 0-23.3-10.4-23.3-23.3v-52c-10.8-3.4-21.2-7.7-31.2-13l-32.1 32.1c-5.5 5.5-13.2 8.6-21.2 8.6s-15.7-3.2-21.2-8.7l-37.6-37.6c-5.7-5.7-8.8-13.2-8.8-21.2s3.1-15.5 8.8-21.2l32.1-32.1c-5.2-10-9.6-20.4-12.9-31.2H301c-16.5 0-29.9-13.4-29.9-29.9v-53.2c0-16.5 13.4-29.9 29.9-29.9h45.3c3.4-10.8 7.7-21.2 12.9-31.2l-32.1-32.1c-5.7-5.7-8.8-13.2-8.8-21.2s3.1-15.5 8.8-21.2l37.7-37.7c-5.5-5.5-13.2-8.6-21.2-8.6s-15.7 3.2-21.2 8.7l32 32c10-5.3 20.5-9.6 31.2-13v-52c0-12.8 10.4-23.3 23.3-23.3h59.9c16.5 0 29.9 13.4 29.9 29.9v45.3c10.8 3.4 21.2 7.7 31.2 13l32.1-32.1c5.5-5.5 13.2-8.6 21.2-8.6s15.7 3.2 21.2 8.7l37.6 37.6c5.7 5.7 8.8 13.2 8.8 21.2s-3.1 15.5-8.8 21.2l-32.1 32.1c5.2 10 9.6 20.4 12.9 31.2h45.3c16.5 0 29.9 13.4 29.9 29.9V524c0 16.5-13.4 29.9-29.9 29.9h-45.3c-3.4 10.8-7.7 21.2-12.9 31.2l32.1 32.1c5.7 5.7 8.8 13.2 8.8 21.2s-3.1 15.5-8.8 21.2l-37.7 37.7c-5.5 5.5-13.2 8.6-21.2 8.6s-15.7-3.2-21.2-8.7l-32-32c-10 5.3-20.5 9.6-31.2 13v45.3c0.1 16.5-13.3 29.9-29.8 29.9z m-54-29.2h54l0.8-68.6 11.1-2.7c15.6-3.8 30.5-10 44.2-18.3l9.8-5.9 48 48 38.8-37.6-48-49.1 5.9-9.8c8.3-13.7 14.5-28.6 18.3-44.2l2.7-11.1h67.8l0.8-0.8v-53.2l-68.6-0.8-2.7-11.1c-3.9-15.6-10-30.5-18.3-44.2l-5.9-9.8 48-48-37.6-38.8-49.1 48-9.8-5.9c-13.8-8.3-28.7-14.5-44.2-18.3l-11.1-2.7v-67.8l-54.8-0.7v68.5l-11.1 2.7c-15.6 3.8-30.5 10-44.2 18.3l-9.8 5.9-48-48-38.8 37.6 48 49.1-5.9 9.8c-8.3 13.7-14.5 28.6-18.3 44.2L369 470h-68l-0.8 54 68.6 0.8 2.7 11.1c3.9 15.6 10 30.5 18.3 44.2l5.9 9.8-48 48 37.6 38.8 49.1-48 9.8 5.9c13.8 8.3 28.7 14.5 44.2 18.3l11.1 2.7v68.6z" fill="currentColor"/><path d="M527.1 599.5c-56.3 0-102.1-45.8-102.1-102.1s45.8-102.1 102.1-102.1 102.1 45.8 102.1 102.1-45.9 102.1-102.1 102.1z m0-175c-40.2 0-72.9 32.7-72.9 72.9s32.7 72.9 72.9 72.9 72.9-32.7 72.9-72.9-32.7-72.9-72.9-72.9z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
      <h1 class="page-title">管家</h1>
    </header>

    <div class="pet-strip anim-fade-up anim-delay-1">
      <div v-for="pet in pets" :key="pet.name" class="pet-card" @click="$router.push('/pets/' + pet.id)">
        <div class="pet-avatar-lg">{{ pet.emoji }}</div>
        <span class="pet-name-sm">{{ pet.name }}</span>
      </div>
      <div class="pet-card" @click="$router.push('/pet/create')">
        <div class="pet-avatar-lg add-pet">+</div>
        <span class="pet-name-sm" style="color:var(--muted)">添加宠物</span>
      </div>
    </div>

    <div class="chat-area" ref="chatArea">
      <div v-if="!welcomeHidden" id="welcomeContent">
        <div class="ai-welcome anim-fade-up anim-delay-2">
          <div class="ai-avatar"><img src="/mqpyqgao-logo.png" alt="Nuzzly" /></div>
          <div class="ai-bubble">
            <div class="ai-name">Nuzzly 管家</div>
            <p>您好 <strong>{{ userName }}</strong>，我是毛球镇的专属管家，有什么需要帮忙呢？🐾</p>
          </div>
        </div>
        <div class="quick-prompts anim-fade-up anim-delay-3">
          <div v-for="prompt in prompts" :key="prompt.text" class="prompt-chip" @click="sendMessage(prompt.text)">{{ prompt.label }}</div>
        </div>
      </div>
      <div class="chat-messages" ref="chatMessages">
        <div v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.type">
          <div v-if="msg.type === 'ai' || msg.type === 'typing'" class="ai-avatar" style="width:32px;height:32px;border-radius:12px;background:var(--brown);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 3l1.9 5.4a2 2 0 0 0 1.3 1.3L21 12l-5.8 2.3a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.4a2 2 0 0 0-1.3-1.3L3 12l5.8-2.3a2 2 0 0 0 1.3-1.3z"/></svg>
          </div>
          <div class="msg-bubble" :class="msg.type">
            <template v-if="msg.type === 'typing'">
              <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
            </template>
            <template v-else>
              <p v-for="(line, lineIdx) in formatMessage(msg.text)" :key="lineIdx" class="msg-line">
                <template v-for="(part, partIdx) in line.parts" :key="partIdx">
                  <strong v-if="part.bold">{{ part.text }}</strong>
                  <template v-else>{{ part.text }}</template>
                </template>
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <div class="input-wrap">
        <input type="text" class="input-field" v-model="inputText" placeholder="问我任何关于宠物的问题…" autocomplete="off" @keydown.enter.prevent="sendMessage(inputText)">
        <button class="send-btn" :disabled="!inputText.trim()" @click="sendMessage(inputText)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.153 3.553L11.176 21.004l-1.67-8.596L2 7.898zM9.456 12.444l12.696-8.89"/></svg>
        </button>
      </div>
    </div>
  </div>
  <TabBar active-tab="butler" />
</template>

<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'
import TabBar from '../components/TabBar.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { api } from '../lib/api'

const { profile } = useAuth()
const { pets: rawPets, fetchPets } = usePets()

const appShell = ref(null)
const chatArea = ref(null)
const chatMessages = ref(null)
const inputText = ref('')
const messages = ref([])
const welcomeHidden = ref(false)

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const pets = computed(() => rawPets.value.map(p => ({
  id: p.id, emoji: SPECIES_EMOJI[p.species] || '🐾', name: p.name
})))
const userName = computed(() => profile.value?.display_name || profile.value?.username || '铲屎官')

onMounted(() => { fetchPets() })

const prompts = [
  { text: '今天的健康状况如何？', label: '🩺 健康状况' },
  { text: '推荐一下适合的猫粮', label: '🍖 饮食推荐' },
  { text: '帮我预约下周的疫苗接种', label: '💉 预约疫苗' },
  { text: '最近体重变化怎么样？', label: '📊 体重趋势' }
]

// 本地兜底回复（API 不可用时使用）
function getFallback(text) {
  const name = pets.value[0]?.name || '你的宠物'
  const fallbackMap = {
    '健康': `${name}今天的健康状况良好！建议继续保持目前的饮食和运动习惯 🩺`,
    '猫粮': `根据${name}的年龄和体重，建议选择高蛋白、适合其年龄段的猫粮。可以到产品库查看详细评价 🍖`,
    '疫苗': `建议定期为${name}接种疫苗，可咨询当地宠物医院预约接种 💉`,
    '体重': `建议定期记录${name}的体重变化，保持健康范围内 📊`
  }
  for (const key in fallbackMap) {
    if (text.indexOf(key) !== -1) return fallbackMap[key]
  }
  return `收到！关于「${text}」，让我为您查一下…\n\n目前我可以帮您：\n• 🩺 查看宠物健康状况\n• 🍖 推荐饮食方案\n• 💉 预约医疗服务\n• 📊 查看成长数据`
}

async function getAIResponse(text) {
  try {
    const data = await api('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ message: text, pets: pets.value })
    })
    return data.reply || data.message || data.answer || getFallback(text)
  } catch (e) {
    console.warn('[Butler] AI API 不可用，降级本地回复', e.message)
    return getFallback(text)
  }
}

function formatMessage(text) {
  return text.split('\n').map((line) => ({
    parts: line.split(/(\*\*.*?\*\*)/).filter(Boolean).map((part) => ({
      text: part.startsWith('**') && part.endsWith('**') ? part.slice(2, -2) : part,
      bold: part.startsWith('**') && part.endsWith('**')
    }))
  }))
}

async function sendMessage(text) {
  if (!text || !text.trim()) return
  text = text.trim()
  if (!welcomeHidden.value) welcomeHidden.value = true
  messages.value.push({ type: 'user', text })
  inputText.value = ''
  await nextTick()
  if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight
  messages.value.push({ type: 'typing', text: '' })
  await nextTick()
  if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight
  const reply = await getAIResponse(text)
  const typingIndex = messages.value.findIndex(m => m.type === 'typing')
  if (typingIndex !== -1) messages.value.splice(typingIndex, 1)
  messages.value.push({ type: 'ai', text: reply })
  await nextTick()
  if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight
}
</script>

<style scoped>
.app-shell{width:100%;height:100vh;height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;position:relative;display:flex;flex-direction:column}
.header{position:relative;padding:4px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:10px}
.action-circle{width:36px;height:36px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:18px;height:18px;color:var(--fg)}
.action-circle.ignore-vw svg{width:36px;height:36px}
.page-title{margin-top:8px;font-family:var(--font-display);font-size:28px;font-weight:700;line-height:1.15;letter-spacing:-.02em}
.pet-strip{padding:20px 24px 0;display:flex;gap:16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;z-index:1}
.pet-strip::-webkit-scrollbar{display:none}
.pet-card{flex-shrink:0;width:80px;display:flex;flex-direction:column;align-items:center;gap:8px}
.pet-avatar-lg{width:72px;height:72px;border-radius:28px;background:linear-gradient(160deg,rgba(215,181,147,.2),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 4px 16px rgba(0,0,0,.04);border:2px solid rgba(255,255,255,.8)}
.pet-avatar-lg.add-pet{background:rgba(0,0,0,.03);border-style:dashed;font-size:20px;color:var(--muted)}
.pet-name-sm{font-size:12px;color:var(--fg);font-weight:500;text-align:center;letter-spacing:.01em}
.chat-area{flex:1;display:flex;flex-direction:column;padding:20px 24px 0;gap:16px;z-index:1;min-height:0;background:var(--card);border-radius:36px 36px 0 0;margin-bottom:-120px;padding-bottom:140px}
.ai-welcome{display:flex;gap:12px;align-items:flex-start}
.ai-avatar{width:44px;height:44px;border-radius:16px;background:var(--brown);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-btn);overflow:hidden}
.ai-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.ai-bubble{background:var(--card);border-radius:24px;border-top-left-radius:4px;padding:16px 20px;box-shadow:var(--shadow-card);border:1px solid var(--border);max-width:80%}
.ai-bubble p{font-size:15px;line-height:1.6;color:var(--fg)}
.ai-bubble .ai-name{font-size:12px;color:var(--muted);margin-bottom:4px;letter-spacing:.02em}
.quick-prompts{display:flex;flex-wrap:wrap;gap:10px;padding:0 56px}
.prompt-chip{padding:10px 18px;border-radius:var(--radius-btn);background:var(--card);border:1px solid var(--border);font-size:13px;color:var(--fg);cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.03);letter-spacing:.01em}
.prompt-chip:active{background:var(--brown);color:#fff;border-color:var(--brown);transform:scale(.96)}
.chat-messages{flex:1;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-bottom:8px;min-height:0}
.msg-row{display:flex;gap:10px;align-items:flex-end}
.msg-row.user{flex-direction:row-reverse}
.msg-bubble{padding:14px 18px;border-radius:20px;font-size:14px;line-height:1.55;max-width:75%;word-break:break-word}
.msg-bubble.ai{background:var(--card);border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.03);border-bottom-left-radius:4px;color:var(--fg)}
.msg-bubble.user{background:var(--brown);color:#fff;border-bottom-right-radius:4px;box-shadow:var(--shadow-btn)}
.msg-line{margin:0 0 8px;line-height:1.55}
.msg-line:last-child{margin-bottom:0}
.input-bar{padding:12px 24px calc(12px + var(--safe-bottom));z-index:2;background:transparent}
.input-wrap{display:flex;align-items:center;gap:10px;background:transparent;border-radius:var(--radius-btn);border:1px solid var(--border);padding:6px 6px 6px 20px}
.input-field{flex:1;border:none;outline:none;font-size:15px;font-family:var(--font-body);color:var(--fg);background:transparent;min-height:36px;line-height:1.4}
.input-field::placeholder{color:var(--muted)}
.send-btn{width:40px;height:40px;border-radius:50%;background:var(--brown);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;flex-shrink:0}
.send-btn:active{transform:scale(.9)}
.send-btn svg{width:18px;height:18px;color:#fff}
.send-btn:disabled{opacity:.4;cursor:default}
.typing-indicator{display:flex;gap:4px;padding:8px 4px}
.typing-dot{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:typingBounce 1.2s ease-in-out infinite}
.typing-dot:nth-child(2){animation-delay:.2s}
.typing-dot:nth-child(3){animation-delay:.4s}
@keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}
.anim-delay-2{animation-delay:.2s}
.anim-delay-3{animation-delay:.3s}
.status-bar-spacer{height:var(--safe-top)}
</style>
