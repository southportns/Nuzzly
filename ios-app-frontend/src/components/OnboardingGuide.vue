<template>
  <div v-if="!dismissed" class="onboard-card anim-fade-up">
    <div class="onboard-header">
      <span class="onboard-icon">✨</span>
      <h2 class="onboard-title">2 步开始精准推荐</h2>
    </div>
    <div class="onboard-steps">
      <div v-for="(s, i) in steps" :key="i" class="onboard-step">
        <div class="step-num">{{ i + 1 }}</div>
        <div class="step-body">
          <div class="step-icon" :style="{ background: s.color + '15', color: s.color }">{{ s.emoji }}</div>
          <div class="step-text">
            <div class="step-title">{{ s.title }}</div>
            <div class="step-desc">{{ s.desc }}</div>
          </div>
        </div>
        <div class="step-actions">
          <button v-if="s.skipable" class="step-skip" @click="dismissed = true">跳过</button>
          <button class="step-btn" :style="{ background: s.color }" @click="$router.push(s.href)">{{ s.action }}</button>
        </div>
      </div>
    </div>
    <div class="onboard-footer">
      <span class="onboard-hint">✓ 创建档案后即可获得个性化推荐</span>
      <button class="onboard-skip" @click="dismissed = true">稍后再说</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const dismissed = ref(false)

const steps = [
  { emoji: '🎨', title: '生成3D卡通形象', desc: '上传照片，AI生成专属卡通宠物', action: '去生成', href: '/avatar/generate', color: '#9B59B6', skipable: true },
  { emoji: '🐱', title: '创建宠物档案', desc: '记录品种、年龄、肠胃状况', action: '去创建', href: '/pet/create', color: '#FF7A59' },
]
</script>

<style scoped>
.onboard-card{margin:0 20px;padding:20px;background:linear-gradient(135deg,rgba(255,122,89,.05),rgba(255,149,0,.05));border-radius:24px;border:1px solid var(--border);box-shadow:var(--shadow-card)}
.onboard-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.onboard-icon{font-size:20px}
.onboard-title{font-size:17px;font-weight:700;color:var(--fg)}
.onboard-steps{display:flex;flex-direction:column;gap:12px}
.onboard-step{display:flex;align-items:center;gap:12px;padding:14px;background:var(--card);border-radius:16px;border:1px solid var(--border);position:relative}
.step-num{position:absolute;top:-6px;left:-6px;width:20px;height:20px;border-radius:50%;background:var(--brown);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.step-body{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.step-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.step-text{min-width:0}
.step-title{font-size:14px;font-weight:600;color:var(--fg)}
.step-desc{font-size:11px;color:var(--muted);margin-top:2px}
.step-actions{display:flex;gap:8px;flex-shrink:0}
.step-btn{padding:6px 14px;border-radius:var(--radius-btn);color:#fff;font-size:12px;font-weight:500;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0}
.step-btn:active{transform:scale(.95)}
.step-skip{padding:6px 12px;border-radius:var(--radius-btn);background:transparent;color:var(--muted);font-size:12px;font-weight:500;border:1px solid var(--border);cursor:pointer;white-space:nowrap;flex-shrink:0}
.step-skip:active{transform:scale(.95)}
.onboard-footer{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.onboard-hint{font-size:11px;color:var(--muted)}
.onboard-skip{background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;padding:4px 8px}
.onboard-skip:active{color:var(--fg)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
</style>
