<template>
  <div class="app-shell">
    <div class="ai-layout">
      <aside class="ai-sidebar">

    <!-- Header (与首页一致) -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar">
          <img src="/mqpyqgao-logo.png" alt="nuzzly logo">
        </div>
        <div class="header-actions">
          <button class="action-circle" aria-label="通知" @click="$router.push('/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 3D 镇长模型 - Hero 风格布局（配色对齐 web 端 ai-sidebar） -->
    <div class="mayor-card anim-fade-up anim-delay-1">
      <div class="mayor-left">
        <div class="mayor-name-row">
          <h2 class="mayor-name">球球</h2>
          <div class="mayor-status">
            <span class="mayor-status-dot"></span>
            <span class="mayor-status-text">在线 · 随时为你服务</span>
          </div>
        </div>
        <p class="mayor-desc">基于社区真实数据<br>提供个性化推荐与分析</p>
      </div>
      <div class="mayor-right">
        <div class="globe-container">
          <!-- 柔光背景 -->
          <div class="mayor-glow"></div>
          <!-- 地面阴影 -->
          <div class="mayor-shadow"></div>
          <model-viewer
            src="/qiuqiu.glb"
            alt="球球 镇长 3D 模型"
            interaction-prompt="none"
            camera-orbit="0deg 70deg 1.5m"
            field-of-view="35deg"
            shadow-intensity="0.3"
            shadow-softness="1"
            exposure="1.1"
            disable-zoom
            loading="eager"
            reveal="auto"
            class="mayor-model"
            @load="onModelLoad"
          ></model-viewer>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="seg-bar anim-fade-up anim-delay-1">
      <div v-for="t in TABS" :key="t.value" class="seg-item" :class="{ active: tab === t.value }" @click="tab = t.value">
        {{ t.label }}
      </div>
    </div>
      </aside>
      <main class="ai-main">

    <!-- 智能推荐 -->
    <div v-if="tab === 'recommend'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">AI 智能产品推荐</span>
        </div>
        <p class="card-desc">基于社区真实长期反馈数据，为你的宠物精准匹配最适合的产品</p>

        <div v-if="loadingPets" class="skeleton-line"></div>
        <div v-else-if="!pets.length" class="empty-hint">
          还没有宠物档案，请先 <span class="link" @click="$router.push('/pet/create')">添加宠物</span>
        </div>
        <template v-else>
          <div class="field" style="position:relative">
            <label class="field-label">选择宠物</label>
            <div class="custom-select" @click="showPetPicker = !showPetPicker">
              <span v-if="selectedPet" class="select-value">{{ selectedPet.name }} · {{ selectedPet.breed || '未知品种' }}{{ selectedPet.stomach_health === 'sensitive' ? ' · 肠胃敏感' : '' }}</span>
              <span v-else class="select-placeholder">选择要推荐的宠物…</span>
              <svg class="select-arrow" :class="{ open: showPetPicker }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div v-if="showPetPicker" class="dropdown-menu">
              <div v-for="p in pets" :key="p.id" class="dropdown-item" :class="{ active: selectedPetId === p.id }" @click="selectPet(p.id)">
                <span class="dd-emoji">{{ SPECIES_EMOJI[p.species] || '🐾' }}</span>
                <div class="dd-info">
                  <span class="dd-name">{{ p.name }}</span>
                  <span class="dd-meta">{{ p.breed || '未知品种' }}{{ p.stomach_health === 'sensitive' ? ' · 肠胃敏感' : '' }}</span>
                </div>
                <span v-if="selectedPetId === p.id" class="dd-check">✓</span>
              </div>
            </div>
          </div>
          <div class="field">
            <label class="field-label">具体需求或症状（可选）</label>
            <input v-model="recommendQuery" class="field-input" placeholder="例如：布偶猫长期软便、低敏幼猫粮…" />
          </div>
          <button class="submit-btn" :disabled="!selectedPetId || recommendLoading" @click="handleRecommend">
            {{ recommendLoading ? '正在分析…' : '获取智能推荐' }}
          </button>
        </template>
      </div>

      <!-- 推荐结果 -->
      <div v-if="recommendError" class="error-card">{{ recommendError }}</div>

      <div v-if="recommendResult" class="result-area">
        <div class="summary-card">
          <span class="summary-label">分析结果</span>
          <span class="summary-text">{{ recommendResult.summary }}</span>
        </div>

        <div v-if="recommendResult.pet_context" class="context-tags">
          <span class="ctx-tag">品种：{{ recommendResult.pet_context.breed }}</span>
          <span class="ctx-tag">年龄：{{ recommendResult.pet_context.age }}</span>
          <span class="ctx-tag" :class="{ warn: recommendResult.pet_context.stomach_health === 'sensitive' || recommendResult.pet_context.stomach_health === 'very_sensitive' }">
            肠胃：{{ stomachLabel(recommendResult.pet_context.stomach_health) }}
          </span>
        </div>

        <div v-for="(r, i) in recommendResult.recommendations" :key="r.product.id" class="rec-card">
          <div class="rec-rank">#{{ i + 1 }}</div>
          <div class="rec-body">
            <div class="rec-name">{{ r.product.name }}</div>
            <div class="rec-brand">{{ r.product.brand }}</div>
            <div v-if="r.product.price_max" class="rec-price">¥{{ r.product.price_max }}</div>
            <div class="rec-score" :style="{ color: scoreColor(r.score) }">{{ Math.round(r.score * 100) }}分</div>
            <div v-if="r.explanation" class="rec-reason">{{ r.explanation }}</div>
            <div class="rec-dims">
              <span v-for="(v, k) in r.dimensions" :key="k" class="dim-chip">{{ dimLabel(k) }} {{ Math.round(v * 100) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="recommendResult.warnings?.length" class="warning-card">
          <div class="warning-title">⚠️ 风险提示</div>
          <div v-for="w in recommendResult.warnings" :key="w.product.id" class="warning-item">
            <span>{{ w.product.brand }} {{ w.product.name }}</span>
            <span class="warning-reason">{{ w.reason }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成分分析 -->
    <div v-if="tab === 'ingredients'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">成分分析</span>
        </div>
        <p class="card-desc">上传成分表图片或粘贴文字，AI 将自动分析风险等级和适配性</p>

        <!-- 输入方式切换 -->
        <div class="input-mode-toggle">
          <button class="mode-btn" :class="{ active: ingredientMode === 'text' }" @click="ingredientMode = 'text'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            文字输入
          </button>
          <button class="mode-btn" :class="{ active: ingredientMode === 'image' }" @click="ingredientMode = 'image'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            图片识别
          </button>
        </div>

        <!-- 文字输入模式 -->
        <div v-if="ingredientMode === 'text'">
          <textarea v-model="ingredientInput" class="field-textarea" rows="5" placeholder="例如：鸡肉粉、鱼肉、玉米、糙米、鸡脂肪、啤酒酵母…"></textarea>
          <button class="submit-btn" :disabled="!ingredientInput.trim() || ingredientLoading" @click="handleAnalyze">
            {{ ingredientLoading ? '分析中…' : '开始分析' }}
          </button>
        </div>

        <!-- 图片上传模式 -->
        <div v-else class="image-upload-area">
          <div v-if="!ingredientImagePreview" class="upload-dropzone" @click="triggerImageUpload" @dragover.prevent @drop.prevent="handleImageDrop">
            <input ref="ingredientImageInput" type="file" accept="image/*" class="hidden-input" @change="handleImageSelect" />
            <div class="upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p class="upload-text">点击或拖拽上传成分表图片</p>
            <p class="upload-hint">支持 JPG、PNG 格式，建议清晰拍摄</p>
          </div>

          <!-- 图片预览 -->
          <div v-else class="image-preview-container">
            <img :src="ingredientImagePreview" class="image-preview" alt="成分表图片" />
            <button class="remove-image-btn" @click="removeIngredientImage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <button class="submit-btn" :disabled="!ingredientImage || ingredientLoading" @click="handleImageAnalyze">
            {{ ingredientLoading ? '识别分析中…' : '图片识别分析' }}
          </button>
        </div>
      </div>
      <div v-if="ingredientError" class="error-card">{{ ingredientError }}</div>
      <div v-if="ingredientResult" class="card result-card">
        <div class="result-label">AI 分析摘要</div>
        <div class="result-text"><MarkdownRenderer :content="ingredientResult" /></div>
      </div>
      <div class="tip-card">
        <div class="tip-title">使用示例</div>
        <div class="tip-item">• 上传猫粮包装背面的成分表图片</div>
        <div class="tip-item">• 或直接粘贴成分表文字内容</div>
        <div class="tip-item">• AI 会识别主要蛋白来源、填充物、添加剂等</div>
        <div class="tip-item">• 给出风险评估和品种适配建议</div>
      </div>
    </div>

    <!-- 产品对比 -->
    <div v-if="tab === 'compare'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">产品对比</span>
        </div>
        <p class="card-desc">从数据库选取或手动输入 2-4 款产品，AI 将多维度对比分析</p>
        <div class="compare-list">
          <div v-for="(p, i) in compareProducts" :key="i" class="compare-row">
            <span class="compare-num">{{ i + 1 }}</span>
            <div class="compare-input-wrap">
              <input
                v-model="compareProducts[i]"
                class="field-input compare-input"
                placeholder="搜索或输入产品名称…"
                @focus="openProductSearch(i)"
                @input="onCompareSearch(i)"
              />
              <div v-if="searchOpenIdx === i && searchResults.length" class="compare-dropdown">
                <div v-for="item in searchResults" :key="item.id" class="compare-dd-item" @click="pickCompareProduct(i, item)">
                  <span class="dd-prod-name">{{ item.name }}</span>
                  <span class="dd-prod-brand">{{ item.brand }}</span>
                </div>
              </div>
            </div>
            <button v-if="compareProducts.length > 2" class="compare-del" @click="removeProduct(i)">×</button>
          </div>
        </div>
        <button v-if="compareProducts.length < 4" class="add-btn" @click="addProduct">+ 添加产品</button>
        <button class="submit-btn" :disabled="compareProducts.filter(p => p.trim()).length < 2 || compareLoading" @click="handleCompare">
          {{ compareLoading ? '对比中…' : '开始对比' }}
        </button>
      </div>
      <div v-if="compareError" class="error-card">{{ compareError }}</div>
      <div v-if="compareResult" class="card result-card">
        <div class="result-text"><MarkdownRenderer :content="compareResult" /></div>
      </div>
      <div class="tip-card">
        <div class="tip-title">对比维度</div>
        <div class="tip-grid">
          <span>• 适口性评分</span><span>• 软便反馈率</span>
          <span>• 复购率</span><span>• 成分优劣</span>
          <span>• 价格区间</span><span>• 适合品种</span>
        </div>
      </div>
    </div>

    <!-- 自由问答 -->
    <div v-if="tab === 'chat'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card chat-card">
        <!-- 预览态：未进入全屏时显示欢迎卡片 -->
        <div v-if="!chatFullscreen" class="chat-welcome">
          <div class="chat-welcome-icon"><svg t="1783042766015" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13929" width="32" height="32"><path d="M896.1 567.94c0-156.78-102.32-450.89-106.67-463.34-0.07-0.19-0.14-0.37-0.22-0.56s-0.1-0.28-0.16-0.43c-0.14-0.34-0.28-0.68-0.44-1a0.75 0.75 0 0 0-0.06-0.13 23 23 0 0 0-2-3.53c-0.25-0.37-0.52-0.73-0.79-1.08A23.54 23.54 0 0 0 782 94l-0.15-0.11c-0.27-0.22-0.55-0.44-0.84-0.64l-0.28-0.21-0.75-0.5-0.34-0.22-0.74-0.44-0.35-0.2q-0.46-0.26-0.93-0.48l-0.18-0.09c-0.37-0.18-0.75-0.35-1.13-0.51l-0.33-0.13c-0.28-0.12-0.56-0.22-0.84-0.33l-0.39-0.13-0.84-0.27-0.36-0.1-1-0.25h-0.24a23 23 0 0 0-4-0.53L246.52 63.89a23.53 23.53 0 0 0-23.6 16.89C219 94.07 126.65 407.48 126.65 522c0 111.56 8.52 323.86 8.61 326a23.61 23.61 0 0 0 19.31 22.35l490.36 88.85h0.23c0.53 0.09 1.07 0.16 1.61 0.22h0.32c0.66 0.06 1.33 0.1 2 0.1a23.09 23.09 0 0 0 4-0.37h0.1c0.63-0.12 1.26-0.26 1.89-0.43h0.18c0.61-0.17 1.22-0.36 1.83-0.58h0.06l1-0.4 224.57-95.63a23.69 23.69 0 0 0 14.35-22c0.04-1.27-0.97-119.53-0.97-272.17zM181.43 827.05c-2.08-54.64-7.83-214-7.83-305.07 0-92.81 69.44-341.2 89.15-409.86l263.67 12.6c105.52 5 180.11 105.17 154.85 207.74-25.72 104.46-39.85 184-47.6 239.37-13.14 93.89-11.39 140.4-11.06 146.79l2.6 188.83z m490.64 73.29l-2.52-182.88v-1.21c-0.1-1.64-8.61-158.81 98.71-525.53 30.64 97.47 80.93 273.32 80.93 377.22 0 120.33 0.64 219.35 0.91 256.62z" fill="#8B5E46" p-id="13930"></path><path d="M304.31 652.28a88.63 86.62 0 1 0 177.26 0 88.63 86.62 0 1 0-177.26 0z m105.567-118.999a38.85 47.1 9.21 1 0 15.077-92.985 38.85 47.1 9.21 1 0-15.077 92.985z m94.453 51.739a38.85 47.1 9.21 1 0 15.076-92.985 38.85 47.1 9.21 1 0-15.077 92.986z m-200.036-28.285a38.85 47.1 9.21 1 0 15.077-92.986 38.85 47.1 9.21 1 0-15.077 92.986z" fill="#8B5E46" p-id="13931"></path></svg></div>
          <h3 class="chat-welcome-title">AI 宠物营养助手</h3>
          <p class="chat-welcome-desc">基于毛球镇村民们真实长期反馈数据，为你的毛球提供个性化推荐与分析</p>
          <div class="chat-suggestions">
            <div v-for="s in CHAT_SUGGESTIONS" :key="s" class="suggestion-chip" @click="openChatFullscreen(s)">{{ s }}</div>
          </div>
          <!-- 点击触发全屏弹出（用 div 模拟输入框，避免移动端 input 唤起键盘） -->
          <div class="chat-input-bar chat-input-bar-preview" @click="openChatFullscreen()">
            <div class="chat-input chat-input-fake" role="button" tabindex="0" aria-label="开始对话">问我任何关于宠物食品的问题…</div>
            <div class="chat-send" role="button" tabindex="0" aria-label="开始对话">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
      </main>
    </div>
  </div>

  <!-- 全屏聊天子页面：点击输入框或建议时弹出，独立于底部 TabBar -->
  <Teleport to="body">
    <transition name="chat-fs">
      <div v-if="chatFullscreen" class="chat-fullscreen">
        <!-- 品牌 header（与首页一致） -->
        <header class="header chat-fs-brand-header">
          <div class="header-row">
            <div class="avatar"><img src="/mqpyqgao-logo.png" alt="nuzzly logo"></div>
          </div>
        </header>
        <!-- 聊天功能导航栏 -->
        <header class="chat-fs-header">
          <button class="chat-fs-icon-btn" aria-label="返回" @click="closeChatFullscreen">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><title>chevron-left</title><g fill="#212121"><path d="m7.75,11c-.192,0-.384-.073-.53-.22L2.97,6.53c-.293-.293-.293-.768,0-1.061L7.22,1.22c.293-.293.768-.293,1.061,0s.293.768,0,1.061l-3.72,3.72,3.72,3.72c.293.293.293.768,0,1.061-.146.146-.338.22-.53.22Z" stroke-width="0" fill="#212121"></path></g></svg>
          </button>
          <div class="chat-fs-title">
            <span class="chat-fs-title-main">球球</span>
            <span class="chat-fs-status">
              <span class="chat-fs-status-dot"></span>
              <span>在线</span>
            </span>
          </div>
          <button class="chat-fs-icon-btn" aria-label="历史记录" @click="openChatHistory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button class="chat-fs-icon-btn" aria-label="新对话" @click="startNewChat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </header>

        <!-- 消息列表：点击空白区域收起键盘 -->
        <div class="chat-fs-messages" ref="chatMessagesRef" @click="blurChatInput">
          <div v-if="!chatMessages.length" class="chat-fs-empty">
            <img src="/mqpyqgao-logo.png" alt="球球" class="chat-fs-empty-avatar" />
            <h3 class="chat-fs-empty-title">你好，我是球球</h3>
            <p class="chat-fs-empty-desc">基于社区真实长期反馈数据，为你的毛球提供个性化推荐与分析</p>
          </div>
          <div v-for="(m, i) in chatMessages" :key="i" class="chat-row" :class="m.role">
            <img v-if="m.role === 'assistant'" src="/mqpyqgao-logo.png" alt="球球" class="chat-avatar ai" />
            <div class="chat-bubble" :class="m.role">
              <template v-if="m.role === 'assistant' && !m.content && chatLoading">
                <div class="thinking-indicator">
                  <svg class="thinking-paw" viewBox="0 0 24 24" fill="currentColor"><path d="M11.35 3.836c-.885-.27-2.085-.348-3.038.025-.43-.642-1.012-1.103-1.622-1.348-.78-.318-1.754-.318-2.534 0-.85.347-1.421 1.087-1.662 1.97-.24.882-.16 1.92.31 2.81.39.74.99 1.34 1.69 1.74.06.42.22.83.46 1.19.27.4.62.74 1.04.99.4.24.86.39 1.34.43.41.04.83-.01 1.22-.13.39.43.88.78 1.43 1.01.55.23 1.15.35 1.76.35s1.21-.12 1.76-.35c.55-.23 1.04-.58 1.43-1.01.39.12.81.17 1.22.13.48-.04.94-.19 1.34-.43.42-.25.77-.59 1.04-.99.24-.36.4-.77.46-1.19.7-.4 1.3-1 1.69-1.74.47-.89.55-1.928.31-2.81-.241-.883-.812-1.623-1.662-1.97-.78-.318-1.754-.318-2.534 0-.61.245-1.192.706-1.622 1.348-.953-.373-2.153-.295-3.038-.025Z"/><circle cx="6.5" cy="9.5" r="1.5"/><circle cx="17.5" cy="9.5" r="1.5"/><circle cx="9" cy="6.5" r="1.5"/><circle cx="15" cy="6.5" r="1.5"/></svg>
                  <span class="thinking-text">球球正在思考中</span>
                  <span class="thinking-dots">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                  </span>
                </div>
              </template>
              <template v-else-if="m.role === 'assistant'">
                <MarkdownRenderer :content="m.content" />
              </template>
              <template v-else>
                <span class="chat-user-text">{{ m.content }}</span>
              </template>
            </div>
            <img v-if="m.role === 'user'" :src="userAvatar" alt="我" class="chat-avatar user" />
          </div>
        </div>

        <!-- 底部输入区 -->
        <div class="chat-fs-input-bar">
          <input
            v-model="chatInput"
            class="chat-fs-input"
            placeholder="问我任何关于宠物食品的问题…"
            inputmode="text"
            enterkeyhint="send"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown.enter.prevent="onChatSend"
          />
          <button class="chat-fs-send" :disabled="!chatInput.trim() || chatLoading" @click="onChatSend">
            <svg v-if="chatLoading" class="chat-send-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/></svg>
          </button>
        </div>

        <!-- 历史记录弹出框（右上角小圆角矩形） -->
        <transition name="chat-popover">
          <div v-if="chatHistoryOpen" class="chat-history-popover">
            <div class="chat-history-header">
              <span>历史记录</span>
              <button class="chat-history-close" aria-label="关闭" @click="chatHistoryOpen = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="chat-history-list">
              <div v-if="chatHistoryLoading" class="chat-history-empty">加载中…</div>
              <div v-else-if="!chatHistoryItems.length" class="chat-history-empty">暂无历史记录</div>
              <div
                v-for="item in chatHistoryItems"
                :key="item.id"
                class="chat-history-item"
                @click="loadHistoryItem(item)"
              >
                <div class="chat-history-q">{{ item.user_message }}</div>
                <div class="chat-history-time">{{ formatHistoryTime(item.created_at) }}</div>
                <button
                  class="chat-history-del"
                  aria-label="删除"
                  @click.stop="deleteHistoryItem(item.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </transition>
        <!-- 透明遮罩：点击外部关闭弹出框 -->
        <div v-if="chatHistoryOpen" class="chat-history-backdrop" @click="chatHistoryOpen = false"></div>
      </div>
    </transition>
  </Teleport>

  <div class="tab-bar-wrapper">
    <TabBar active-tab="butler" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import TabBar from '../components/TabBar.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { useNotifications } from '../composables/useNotifications'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { ssePost } from '../lib/sse'
import { compressImage } from '../lib/image'

const { profile } = useAuth()
const { pets, fetchPets } = usePets()
const { unreadCount, fetchNotifications } = useNotifications()

const userName = computed(() => profile.value?.display_name || profile.value?.username || '铲屎官')
// 用户头像：优先用 profile.avatar_url，fallback 到默认 logo
const userAvatar = computed(() => profile.value?.avatar_url || '/mqpyqgao-logo.png')

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const showPetPicker = ref(false)
const selectedPet = computed(() => pets.value.find(p => p.id === selectedPetId.value) || null)

function selectPet(id) {
  selectedPetId.value = id
  showPetPicker.value = false
}

function onModelLoad() {
  // 模型加载完成后淡入显示
  const model = document.querySelector('.mayor-model')
  if (model) {
    setTimeout(() => { model.style.opacity = '1' }, 100)
  }
}

const TABS = [
  { value: 'chat', label: '自由问答' },
  { value: 'recommend', label: '智能推荐' },
  { value: 'ingredients', label: '成分分析' },
  { value: 'compare', label: '产品对比' },
]
const tab = ref('chat')

// === 推荐 ===
const selectedPetId = ref('')
const recommendQuery = ref('')
const recommendLoading = ref(false)
const recommendResult = ref(null)
const recommendError = ref('')
const loadingPets = ref(true)

async function handleRecommend() {
  if (!selectedPetId.value) return
  recommendLoading.value = true
  recommendError.value = ''
  recommendResult.value = null
  try {
    const data = await api('/api/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({ petId: selectedPetId.value, query: recommendQuery.value })
    })
    if (data.error) throw new Error(data.error)
    recommendResult.value = data
  } catch (e) {
    recommendError.value = e.message || '推荐失败'
  } finally {
    recommendLoading.value = false
  }
}

function stomachLabel(v) {
  return v === 'sensitive' ? '敏感' : v === 'very_sensitive' ? '极易敏感' : '正常'
}
function scoreColor(s) {
  const pct = Math.round(s * 100)
  return pct >= 80 ? '#34C759' : pct >= 60 ? '#FF9500' : '#FF3B30'
}
function dimLabel(k) {
  const map = { overall_rating: '评分', stomach_match: '肠胃匹配', stool_safety: '软便安全', long_term_stability: '长期稳定', repurchase_rate: '复购率', breed_match: '品种适配' }
  return map[k] || k
}

// === 成分分析 ===
const ingredientMode = ref('text')
const ingredientInput = ref('')
const ingredientImage = ref(null)
const ingredientImagePreview = ref('')
const ingredientImageInput = ref(null)
const ingredientLoading = ref(false)
const ingredientResult = ref('')
const ingredientError = ref('')

async function handleAnalyze() {
  if (!ingredientInput.value.trim()) return
  ingredientLoading.value = true
  ingredientError.value = ''
  ingredientResult.value = ''
  // 对齐 web 端：SSE 流式输出 + loopGuard 防 LLM 循环
  const prompt = `请分析以下猫粮成分表，给出每个成分的风险等级、主要蛋白来源、适合的猫咪品种，以及整体评价：\n\n${ingredientInput.value}`
  await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
    loopGuard: true,
    onDelta: (_t, full) => { ingredientResult.value = full },
    onDone: (full) => { ingredientResult.value = full || '分析完成' },
    onError: (e) => { ingredientError.value = e.message || '分析失败' }
  })
  ingredientLoading.value = false
}

function triggerImageUpload() {
  ingredientImageInput.value?.click()
}

function handleImageSelect(e) {
  const file = e.target.files[0]
  if (file) processImageFile(file)
}

function handleImageDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) processImageFile(file)
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    ingredientError.value = '请上传图片文件'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ingredientError.value = '图片大小不能超过10MB'
    return
  }
  ingredientImage.value = file
  ingredientError.value = ''
  const reader = new FileReader()
  reader.onload = (e) => { ingredientImagePreview.value = e.target.result }
  reader.readAsDataURL(file)
}

function removeIngredientImage() {
  ingredientImage.value = null
  ingredientImagePreview.value = ''
  if (ingredientImageInput.value) ingredientImageInput.value.value = ''
}

async function handleImageAnalyze() {
  if (!ingredientImage.value) return
  ingredientLoading.value = true
  ingredientError.value = ''
  ingredientResult.value = ''
  try {
    // 对齐 web 端：Canvas 压缩去 EXIF，最长边 1280，JPEG 0.85
    const dataUrl = await compressImage(ingredientImage.value, 1280, 0.85)
    const pet = selectedPet.value
    const body = {
      image: dataUrl,
      ...(pet && {
        petId: pet.id,
        petContext: { name: pet.name, breed: pet.breed, species: pet.species, stomach_health: pet.stomach_health }
      })
    }
    // 对齐 web 端：真实图片识别 API + loopGuard 防 GLM-4V-Flash 循环
    await ssePost('/api/ai/ingredient-vision', body, {
      loopGuard: true,
      onDelta: (_t, full) => { ingredientResult.value = full },
      onDone: (full) => { ingredientResult.value = full || '分析完成' },
      onError: (e) => { ingredientError.value = e.message || '图片识别失败' }
    })
  } catch (e) {
    ingredientError.value = e.message || '图片识别失败'
  } finally {
    ingredientLoading.value = false
  }
}

// === 产品对比 ===
const compareProducts = ref(['', ''])
const compareLoading = ref(false)
const compareResult = ref('')
const compareError = ref('')
const searchOpenIdx = ref(-1)
const searchResults = ref([])
let searchTimer = null

function addProduct() { if (compareProducts.value.length < 4) compareProducts.value.push('') }
function removeProduct(i) {
  compareProducts.value.splice(i, 1)
  if (searchOpenIdx.value === i) { searchOpenIdx.value = -1; searchResults.value = [] }
}

function openProductSearch(i) {
  searchOpenIdx.value = i
  if (compareProducts.value[i].trim()) onCompareSearch(i)
}

async function onCompareSearch(i) {
  clearTimeout(searchTimer)
  const q = compareProducts.value[i].trim()
  if (!q) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, brand')
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
        .limit(6)
      searchResults.value = data || []
    } catch { searchResults.value = [] }
  }, 300)
}

function pickCompareProduct(i, item) {
  compareProducts.value[i] = `${item.brand} ${item.name}`
  searchOpenIdx.value = -1
  searchResults.value = []
}

async function handleCompare() {
  const valid = compareProducts.value.filter(p => p.trim())
  if (valid.length < 2) return
  compareLoading.value = true
  compareError.value = ''
  compareResult.value = ''
  // 对齐 web 端：SSE 流式输出
  const prompt = `请对比以下猫粮产品，从适口性、软便率、复购率、价格、成分优劣、适合品种等维度进行详细对比分析：\n\n${valid.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
  await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
    onDelta: (_t, full) => { compareResult.value = full },
    onDone: (full) => { compareResult.value = full || '对比分析完成' },
    onError: (e) => { compareError.value = e.message || '对比失败' }
  })
  compareLoading.value = false
}

// === 自由问答 ===
const CHAT_SUGGESTIONS = [
  '5岁布偶猫，肠胃敏感，应该选什么猫粮？',
  '如何判断猫粮蛋白质来源是否优质？',
  '渴望六种鱼和爱肯拿农场盛宴哪个好？',
  '无谷猫粮真的比有谷猫粮好吗？'
]
const chatMessages = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessagesRef = ref(null)
// 全屏聊天子页面：点击输入框触发，独立于底部 TabBar，避免输入法遮挡
const chatFullscreen = ref(false)
// 历史记录侧滑面板
const chatHistoryOpen = ref(false)
const chatHistoryItems = ref([])
const chatHistoryLoading = ref(false)
// 本地历史记录兜底：即使后端保存延迟或失败，也能立即查看刚结束的对话
const CHAT_HISTORY_LS_KEY = 'nuzzly_chat_history_v1'

function readLocalChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function writeLocalChatHistory(items) {
  try {
    localStorage.setItem(CHAT_HISTORY_LS_KEY, JSON.stringify(items.slice(0, 200)))
  } catch {}
}
function addLocalChatHistory(userMessage, aiResponse) {
  if (!userMessage?.trim() || !aiResponse?.trim()) return
  const items = readLocalChatHistory()
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  items.unshift({
    id,
    user_message: userMessage.trim(),
    ai_response: aiResponse.trim(),
    created_at: new Date().toISOString(),
    local_only: true
  })
  writeLocalChatHistory(items)
}
function removeLocalChatHistory(id) {
  const items = readLocalChatHistory().filter(x => x.id !== id)
  writeLocalChatHistory(items)
}
function mergeChatHistory(remoteItems = [], localItems = []) {
  const map = new Map()
  remoteItems.forEach(x => { if (x.id && x.user_message?.trim()) map.set(x.id, x) })
  // 本地记录按 user_message + 创建时间（5 分钟窗口）去重，避免和后端重复显示
  localItems.forEach(x => {
    if (!x.user_message?.trim()) return
    const dup = remoteItems.find(r =>
      r.user_message?.trim() === x.user_message.trim() &&
      Math.abs(new Date(r.created_at).getTime() - new Date(x.created_at).getTime()) < 5 * 60 * 1000
    )
    if (!dup && !map.has(x.id)) map.set(x.id, x)
  })
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// 打开全屏对话子页面；可选传入初始提问文本（点击建议时）
async function openChatFullscreen(initialText) {
  chatFullscreen.value = true
  // 锁定背景滚动
  document.body.style.overflow = 'hidden'
  await nextTick()
  // 不主动 focus 输入框——移动端会立即唤起键盘，改为用户点击输入框时才唤起
  if (initialText) {
    chatInput.value = initialText
    await sendChatMessage(initialText)
  } else {
    await nextTick()
    if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// 关闭全屏对话，恢复背景滚动；保留 chatMessages 以便再次打开时延续
function closeChatFullscreen() {
  chatFullscreen.value = false
  chatHistoryOpen.value = false
  document.body.style.overflow = ''
}

// 开始新对话：清空当前消息列表
function startNewChat() {
  chatMessages.value = []
  chatInput.value = ''
}

// 加载历史记录列表（对齐 web 端 /api/ai/chat/history）
async function openChatHistory() {
  chatHistoryOpen.value = true
  chatHistoryLoading.value = true
  try {
    const res = await api('/api/ai/chat/history')
    const remoteItems = res?.sessions || []
    const localItems = readLocalChatHistory()
    chatHistoryItems.value = mergeChatHistory(remoteItems, localItems)
  } catch (e) {
    console.warn('[chat history] load failed', e)
    chatHistoryItems.value = readLocalChatHistory()
  } finally {
    chatHistoryLoading.value = false
  }
}

// 历史时间格式化
function formatHistoryTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  if (diff < 604800) return Math.floor(diff / 86400) + ' 天前'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 加载单条历史到当前对话
function loadHistoryItem(item) {
  chatMessages.value = [
    { role: 'user', content: item.user_message || '' },
    { role: 'assistant', content: item.ai_response || '' }
  ]
  chatHistoryOpen.value = false
  nextTick(() => {
    if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  })
}

// 删除单条历史
async function deleteHistoryItem(id) {
  // 本地记录直接删除
  if (String(id).startsWith('local_')) {
    removeLocalChatHistory(id)
    chatHistoryItems.value = chatHistoryItems.value.filter(x => x.id !== id)
    return
  }
  try {
    await api('/api/ai/chat/history', { method: 'DELETE', body: JSON.stringify({ id }) })
    chatHistoryItems.value = chatHistoryItems.value.filter(x => x.id !== id)
  } catch (e) {
    console.warn('[chat history] delete failed', e)
  }
}

// 点击对话框空白区域收起键盘
function blurChatInput(e) {
  // 如果点击的是消息气泡内的可交互元素（如链接），不收起键盘
  if (e.target.closest('a, button, input, textarea')) return
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur()
  }
}

// 回车/键盘"发送"触发：发送消息并收起键盘
async function onChatSend() {
  // 收起键盘
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur()
  }
  await sendChatMessage(chatInput.value)
}

async function sendChatMessage(text) {
  if (!text?.trim() || chatLoading.value) return
  text = text.trim()
  chatInput.value = ''
  chatMessages.value.push({ role: 'user', content: text })
  chatMessages.value.push({ role: 'assistant', content: '' })
  chatLoading.value = true
  await nextTick()
  if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight

  // 对齐 web 端：SSE 流式 + messages 数组格式
  const history = chatMessages.value
    .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
    .slice(0, -1) // 排除刚加入的空 assistant
    .map(m => ({ role: m.role, content: m.content }))

  await ssePost('/api/ai/chat', { messages: [...history, { role: 'user', content: text }] }, {
    onDelta: (_t, full) => {
      const updated = [...chatMessages.value]
      updated[updated.length - 1] = { role: 'assistant', content: full }
      chatMessages.value = updated
      nextTick(() => { if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight })
    },
    onDone: (full) => {
      const content = full || '收到，让我想想…'
      const updated = [...chatMessages.value]
      updated[updated.length - 1] = { role: 'assistant', content }
      chatMessages.value = updated
      // 本地兜底保存：即使后端保存延迟或失败，历史记录面板也能立即显示
      addLocalChatHistory(text, content)
    },
    onError: () => {
      const content = '连接失败，请稍后重试。'
      const updated = [...chatMessages.value]
      updated[updated.length - 1] = { role: 'assistant', content }
      chatMessages.value = updated
      addLocalChatHistory(text, content)
    }
  })

  chatLoading.value = false
  await nextTick()
  if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
}

onMounted(async () => {
  await Promise.all([fetchPets(), fetchNotifications()])
  loadingPets.value = false
  if (pets.value.length) selectedPetId.value = pets.value[0].id
})
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(80px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.header{position:relative;padding:4px 24px 0;z-index:1}
.tab-bar-wrapper{position:fixed;bottom:0;left:0;right:0;z-index:50;padding:5px 0}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:10px}
.action-circle{width:41.31px;height:41.31px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:18px;height:18px;color:var(--fg)}
.notif-badge{position:absolute;top:6px;right:6px;min-width:16px;height:16px;border-radius:8px;background:#FF3B30;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1}

/* 镇长 3D 模型 - Hero 风格布局（配色对齐 web 端 ai-sidebar.tsx） */
.mayor-card{margin:8px 20px 0;background:#fff;border-radius:var(--radius-card);box-shadow:0 2px 12px rgba(0,0,0,0.04);border:1px solid rgba(255,122,89,0.06);padding:16px 16px 13px;display:flex;align-items:flex-end;gap:12px;position:relative;z-index:1;overflow:visible}
.mayor-left{flex:0 0 clamp(140px,35%,200px);display:flex;flex-direction:column;gap:6px;padding-left:3px}
.mayor-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mayor-name{font-family:var(--font-display);font-size:clamp(20px,5.5vw,28px);font-weight:700;color:#111111;letter-spacing:-.01em;margin:0;line-height:1.1}
.mayor-status{display:inline-flex;align-items:center;gap:5px;background:rgba(168,197,160,0.15);padding:3px 9px;border-radius:10px}
.mayor-status-dot{width:6px;height:6px;border-radius:50%;background:#A8C5A0;position:relative}
.mayor-status-dot::after{content:'';position:absolute;inset:-2px;border-radius:50%;background:rgba(168,197,160,0.5);animation:status-ping 1.6s ease-in-out infinite}
@keyframes status-ping{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.6);opacity:0}}
.mayor-status-text{font-size:10px;font-weight:500;color:#5A8A52;letter-spacing:.02em}
.mayor-subtitle{font-size:11px;color:#6B6B6B;letter-spacing:.04em;margin:0}
.mayor-desc{font-size:12.5px;color:#6B6B6B;margin:2px 0 0;line-height:1.5}
.mayor-right{position:absolute;right:24px;top:0;bottom:0;width:46%;display:flex;align-items:flex-end;justify-content:flex-start;pointer-events:none;z-index:10;transform-origin:left bottom}
.globe-container{width:100%;height:clamp(110px,40vw,168px);border-radius:12px;box-sizing:border-box;overflow:visible;pointer-events:auto;position:relative}
.mayor-glow{position:absolute;top:50%;left:50%;width:120px;height:120px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,184,154,0.35) 0%,rgba(255,212,196,0.2) 40%,transparent 70%);filter:blur(20px);animation:mascot-pulse 3s ease-in-out infinite;pointer-events:none;z-index:0}
.mayor-shadow{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:80px;height:8px;border-radius:50%;background:rgba(255,122,89,0.12);filter:blur(4px);animation:mascot-shadow 3s ease-in-out infinite;pointer-events:none;z-index:0}
.mayor-model{width:110%;height:110%;--poster-color:transparent;background:transparent!important;position:relative;z-index:1;opacity:0;transition:opacity 700ms}
.mayor-model::part(default-progress-bar){display:none}
@keyframes mascot-pulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.<PASSWORD>)}}
@keyframes mascot-shadow{0%,100%{transform:translateX(-50%) scaleX(1);opacity:0.6}50%{transform:translateX(-50%) scaleX(0.9);opacity:0.4}}
.seg-bar{display:flex;gap:4px;margin:8px 20px 0;padding:4px;background:rgba(0,0,0,.03);border-radius:var(--radius-btn)}
.seg-item{flex:1;text-align:center;padding:10px 4px;border-radius:var(--radius-btn);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s}
.seg-item.active{background:var(--card);color:var(--brown);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.tab-content{padding:10px 16px 30px;height:470px}
.card{background:var(--card);border-radius:1px;padding:12px;box-shadow:var(--shadow-card);border:1px solid var(--border);margin-bottom:10px}
.card-header{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.card-title{font-size:15px;font-weight:700;color:var(--fg)}
.card-desc{font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5}
.field{margin-bottom:12px}
.field-label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
.field-input,.field-select,.field-textarea{width:100%;border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-size:14px;background:var(--card);color:var(--fg);outline:none;font-family:var(--font-body)}
.custom-select{display:flex;align-items:center;justify-content:space-between;width:100%;border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-size:14px;background:var(--card);color:var(--fg);cursor:pointer;transition:border-color .2s}
.custom-select:active{border-color:var(--brown)}
.select-value{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select-placeholder{flex:1;color:var(--muted)}
.select-arrow{width:16px;height:16px;color:var(--muted);flex-shrink:0;transition:transform .2s}
.select-arrow.open{transform:rotate(180deg)}
.dropdown-menu{position:absolute;left:0;right:0;top:100%;margin-top:6px;background:rgba(255,255,255,.82);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,.6);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:50;overflow:hidden;max-height:240px;overflow-y:auto}
.dropdown-item{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;transition:background .15s}
.dropdown-item:active{background:rgba(0,0,0,.04)}
.dropdown-item.active{background:rgba(139,94,70,.08)}
.dd-emoji{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(215,181,147,.2),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.dd-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dd-name{font-size:14px;font-weight:600;color:var(--fg)}
.dd-meta{font-size:11px;color:var(--muted)}
.dd-check{color:var(--brown);font-size:15px;font-weight:700}
.field-input::placeholder,.field-textarea::placeholder{color:var(--muted)}
.field-textarea{resize:vertical;min-height:80px}
.submit-btn{width:100%;height:44px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-btn)}
.submit-btn:disabled{opacity:.4;cursor:default}
.submit-btn:active{transform:scale(.97)}
.skeleton-line{height:40px;border-radius:12px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.empty-hint{text-align:center;padding:16px;font-size:13px;color:var(--muted)}
.link{color:var(--brown);font-weight:500}
.error-card{background:rgba(255,59,48,.05);border:1px solid rgba(255,59,48,.15);border-radius:12px;padding:12px 14px;font-size:13px;color:#FF3B30;margin-bottom:12px}
.result-area{margin-top:12px}
.summary-card{background:rgba(255,122,89,.05);border:1px solid rgba(255,122,89,.15);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.summary-label{font-size:13px;font-weight:600;color:var(--brown)}
.summary-text{font-size:13px;color:var(--muted);margin-left:6px}
.context-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.ctx-tag{font-size:12px;padding:5px 12px;border-radius:var(--radius-btn);background:rgba(0,0,0,.04);color:var(--fg)}
.ctx-tag.warn{background:rgba(255,59,48,.08);color:#FF3B30}
.rec-card{display:flex;gap:12px;background:var(--card);border-radius:16px;padding:14px;box-shadow:var(--shadow-card);border:1px solid var(--border);margin-bottom:10px}
.rec-rank{font-size:18px;font-weight:800;color:var(--brown);font-family:var(--font-num);width:32px;text-align:center;flex-shrink:0}
.rec-body{flex:1;min-width:0}
.rec-name{font-size:14px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rec-brand{font-size:11px;color:var(--muted)}
.rec-price{font-size:14px;font-weight:700;color:var(--brown);font-family:var(--font-num);margin-top:4px}
.rec-score{font-size:20px;font-weight:700;font-family:var(--font-num);margin-top:4px}
.rec-reason{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5}
.rec-dims{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.dim-chip{font-size:10px;padding:3px 8px;border-radius:var(--radius-btn);background:rgba(0,0,0,.04);color:var(--muted)}
.warning-card{background:rgba(255,149,0,.05);border:1px solid rgba(255,149,0,.15);border-radius:12px;padding:12px 14px;margin-top:12px}
.warning-title{font-size:13px;font-weight:600;color:#FF9500;margin-bottom:8px}
.warning-item{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.warning-item:last-child{border-bottom:none}
.warning-reason{color:var(--muted)}
.result-card{margin-top:12px}
.result-label{font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.result-text{font-size:13px;color:var(--muted);line-height:1.7;white-space:pre-wrap}
.tip-card{background:var(--card);border:1px dashed var(--border);border-radius:16px;padding:14px;margin-top:12px}
.tip-title{font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.tip-item{font-size:12px;color:var(--muted);line-height:1.8}
.tip-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.tip-grid span{font-size:12px;color:var(--muted)}
.compare-list{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
.compare-row{display:flex;align-items:center;gap:8px}
.compare-num{width:24px;height:24px;border-radius:50%;background:rgba(255,122,89,.1);color:var(--brown);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.compare-input{flex:1}
.compare-input-wrap{flex:1;position:relative}
.compare-dropdown{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:rgba(255,255,255,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.5);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;overflow:hidden}
.compare-dd-item{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(0,0,0,.04)}
.compare-dd-item:last-child{border-bottom:none}
.compare-dd-item:active{background:rgba(139,94,70,.06)}
.dd-prod-name{font-size:13px;font-weight:500;color:var(--fg)}
.dd-prod-brand{font-size:11px;color:var(--muted)}
.compare-del{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px}
.compare-del:active{color:#FF3B30}
.add-btn{background:none;border:none;color:var(--brown);font-size:13px;cursor:pointer;padding:4px 0;margin-bottom:12px}
.add-btn:active{opacity:.7}
/* Chat */
.chat-card{display:flex;flex-direction:column;padding:0;margin-bottom:0;border-radius:16px;overflow:hidden}
.chat-welcome{display:flex;flex-direction:column;align-items:center;padding:2px 16px;margin-top:20px}
.chat-welcome-icon{margin-top:2px;margin-bottom:6px;display:flex;align-items:center;justify-content:center}
.chat-welcome-icon svg{width:48px;height:48px}
.chat-welcome-title{font-size:16px;font-weight:700;color:#111111;margin-bottom:4px}
.chat-welcome-desc{font-size:12px;color:#6B6B6B;text-align:center;max-width:260px;margin-bottom:12px}
.chat-suggestions{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:2px}
.suggestion-chip{padding:8px 12px;border-radius:14px;background:#fff;border:1px solid rgba(0,0,0,0.06);font-size:11px;color:#444444;cursor:pointer;max-width:240px;transition:all .2s}
.suggestion-chip:active{background:linear-gradient(135deg,#FFB89A,#FF7A59);color:#fff;border-color:#FF7A59}
.chat-messages{flex:1;min-height:clamp(200px,45vh,300px);overflow-y:auto;padding:8px 4px;display:flex;flex-direction:column;gap:10px}
/* 头像在气泡顶部对齐（"输出框上方"），与 web 端 ChatMessageItem flex 默认 stretch + 头像 size-8 一致 */
.chat-row{display:flex;align-items:flex-start;gap:8px;padding:0 12px}
.chat-row.user{justify-content:flex-end}
/* 头像：圆形图片 + 阴影，对齐 web 端 AssistantAvatar（logo + 橙色阴影）和 user 头像 */
.chat-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#F0EFED}
.chat-avatar.ai{box-shadow:0 2px 8px rgba(255,122,89,0.2);background:#fff}
.chat-avatar.user{box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.chat-bubble{max-width:78%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.7;color:#333333;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
.chat-bubble.assistant{background:#fff;border:1px solid rgba(0,0,0,0.05);border-top-left-radius:6px}
.chat-bubble.user{background:linear-gradient(135deg,#FFB89A,#FF7A59);color:#fff;border-top-right-radius:6px}
.chat-user-text{white-space:pre-wrap}
/* 思考动画：对齐 web 端 ThinkingIndicator */
.thinking-indicator{display:flex;align-items:center;gap:6px;padding:2px 0;color:#A0A09E}
.thinking-paw{width:14px;height:14px;color:#FF7A59;animation:thinking-bounce 1s ease-in-out infinite}
.thinking-text{font-size:12.5px;color:#A0A09E}
.thinking-dots{display:flex;gap:3px;margin-left:2px}
.thinking-dot{width:4px;height:4px;border-radius:50%;background:#FFB89A;animation:thinking-bounce 1s ease-in-out infinite}
.thinking-dot:nth-child(2){animation-delay:.15s}
.thinking-dot:nth-child(3){animation-delay:.3s}
@keyframes thinking-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-3px)}}
/* 输入框：撑满容器，仅留小间距 */
.chat-input-bar{display:flex;gap:8px;padding:12px 12px 8px;margin:0;border:0;flex-shrink:0;align-items:center}
.chat-input{flex:1;height:42px;border:1px solid rgba(0,0,0,0.06);border-radius:21px;padding:0 18px;font-size:14px;background:#fff;color:#111111;outline:none;font-family:var(--font-body);box-shadow:0 2px 12px rgba(0,0,0,0.04);transition:border-color .2s,box-shadow .2s;min-width:0}
.chat-input:focus{border-color:rgba(255,184,154,0.5);box-shadow:0 4px 20px rgba(255,122,89,0.1)}
.chat-input::placeholder{color:#B0B0AE}
.chat-send{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#FFB89A,#FF7A59);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(255,122,89,0.25);transition:transform .15s}
.chat-send:disabled{background:#F0EFED;color:#B0B0AE;box-shadow:none;cursor:default}
.chat-send:active{transform:scale(.95)}
.chat-send svg{width:18px;height:18px}
.chat-send-spin{animation:chat-spin 1s linear infinite}
@keyframes chat-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.status-bar-spacer{height:var(--safe-top)}

/* 预览态输入框：点击触发全屏 */
.chat-input-bar-preview{cursor:pointer;margin-top:16px}
.chat-input-bar-preview .chat-input{cursor:pointer;background:#F7F6F3}
.chat-input-bar-preview .chat-send{opacity:.85}
/* div 模拟 input：placeholder 灰色 + 居中 + 禁止选中 */
.chat-input-fake{
  color:#B0B0AE;
  user-select:none;
  -webkit-user-select:none;
  -webkit-touch-callout:none;
  display:flex;
  align-items:center;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* === 全屏聊天子页面 === */
.chat-fullscreen{
  position:fixed;
  inset:0;
  z-index:200;
  background:#F7F6F3;
  display:flex;
  flex-direction:column;
  padding-top:var(--safe-top);
  padding-bottom:var(--safe-bottom);
}
/* 顶部导航栏 */
.chat-fs-header{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 12px;
  background-color:#f7f6f3;
  border-bottom:1px solid rgba(228, 19, 19, 0.04);
  flex-shrink:0;
  box-shadow:0 1px 3px rgba(0,0,0,0.02);
}
.chat-fs-icon-btn{
  width:36px;
  height:36px;
  border-radius:50%;
  border:none;
  background:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  color:#333;
  flex-shrink:0;
  transition:background .2s;
}
.chat-fs-icon-btn:active{background:rgba(0,0,0,0.05)}
.chat-fs-icon-btn svg{width:20px;height:20px}
.chat-fs-title{
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  line-height:1.2;
}
.chat-fs-title-main{
  font-size:15px;
  font-weight:600;
  color:#111;
}
.chat-fs-status{
  display:flex;
  align-items:center;
  gap:4px;
  font-size:10px;
  color:#5A8A52;
  margin-top:1px;
}
.chat-fs-status-dot{
  width:5px;
  height:5px;
  border-radius:50%;
  background:#A8C5A0;
}
/* 消息列表 */
.chat-fs-messages{
  flex:1;
  overflow-y:auto;
  padding:12px 0 16px;
  -webkit-overflow-scrolling:touch;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.chat-fs-empty{
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:24px 32px;
  text-align:center;
}
.chat-fs-empty-avatar{
  width:64px;
  height:64px;
  border-radius:50%;
  object-fit:cover;
  margin-bottom:12px;
  box-shadow:0 4px 16px rgba(255,122,89,0.2);
}
.chat-fs-empty-title{
  font-size:17px;
  font-weight:700;
  color:#111;
  margin:0 0 6px;
}
.chat-fs-empty-desc{
  font-size:12.5px;
  color:#6B6B6B;
  line-height:1.6;
  max-width:260px;
  margin:0;
}
/* 底部输入区 */
.chat-fs-input-bar{
  display:flex;
  gap:5px;
  padding:0 12px;
  background-color:#f7f6f3;
  border-top:1px solid rgba(0,0,0,0.04);
  flex-shrink:0;
  align-items:center;
  height:45px;
}
.chat-fs-input{
  flex:1;
  height:42px;
  border:1px solid rgba(0,0,0,0.06);
  border-radius:21px;
  padding:0 18px;
  font-size:14px;
  background-color:#ffffff;
  color:#111;
  outline:none;
  font-family:var(--font-body);
  min-width:0;
  transition:border-color .2s,background .2s;
}
.chat-fs-input:focus{
  border-color:rgba(255,184,154,0.5);
  background:#fff;
}
.chat-fs-input::placeholder{color:#B0B0AE}
.chat-fs-send{
  width:42px;
  height:42px;
  border-radius:14px;
  background:linear-gradient(135deg,#FFB89A,#FF7A59);
  color:#fff;
  border:none;
  cursor:pointer;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 2px 8px rgba(255,122,89,0.25);
  transition:transform .15s;
}
.chat-fs-send:disabled{background:#F0EFED;color:#ffffff;box-shadow:none;cursor:default}
.chat-fs-send:disabled svg{color:#f59a19}
.chat-fs-send:active{transform:scale(.95)}
.chat-fs-send svg{width:18px;height:18px}

/* 全屏过渡动画：自下而上滑入 */
.chat-fs-enter-active,.chat-fs-leave-active{transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .28s}
.chat-fs-enter-from{transform:translateY(100%);opacity:0}
.chat-fs-leave-to{transform:translateY(100%);opacity:0}

/* === 品牌 header（全屏聊天顶部，复用首页 .header 样式） === */
.chat-fs-brand-header{
  padding:4px 24px 0;
  background-color:#f7f6f3;
  border-bottom:1px solid rgba(0,0,0,0.03);
  flex-shrink:0;
  height:33px;
}

/* === 历史记录弹出框（右上角小圆角矩形） === */
.chat-history-backdrop{
  position:absolute;
  inset:0;
  z-index:214;
  background:transparent;
}
.chat-history-popover{
  position:absolute;
  top:calc(var(--safe-top) + 96px);
  right:12px;
  width:min(280px,calc(100vw - 24px));
  max-height:min(420px,55vh);
  background:#fff;
  border-radius:16px;
  box-shadow:0 8px 32px rgba(0,0,0,0.12);
  z-index:215;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}
.chat-history-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:12px 14px;
  border-bottom:1px solid rgba(0,0,0,0.06);
  font-size:14px;
  font-weight:600;
  color:#111;
  flex-shrink:0;
}
.chat-history-close{
  width:26px;
  height:26px;
  border:none;
  background:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  color:#666;
  border-radius:50%;
}
.chat-history-close:active{background:rgba(0,0,0,0.05)}
.chat-history-close svg{width:14px;height:14px}
.chat-history-list{
  flex:1;
  overflow-y:auto;
  padding:6px;
  -webkit-overflow-scrolling:touch;
}
.chat-history-empty{
  text-align:center;
  color:#999;
  font-size:12px;
  padding:32px 12px;
}
.chat-history-item{
  position:relative;
  padding:10px 10px 10px 12px;
  border-radius:10px;
  cursor:pointer;
  transition:background .15s;
  border-left:3px solid transparent;
}
.chat-history-item:active{background:#F7F6F3;border-left-color:#FF7A59}
.chat-history-q{
  font-size:12.5px;
  color:#333;
  line-height:1.5;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  padding-right:22px;
}
.chat-history-time{
  font-size:10.5px;
  color:#999;
  margin-top:4px;
}
.chat-history-del{
  position:absolute;
  top:8px;
  right:6px;
  width:22px;
  height:22px;
  border:none;
  background:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  color:#ccc;
  border-radius:50%;
}
.chat-history-del:active{background:rgba(255,59,48,0.1);color:#FF3B30}
.chat-history-del svg{width:13px;height:13px}
/* 弹出框动画：从右上角缩放淡入 */
.chat-popover-enter-active,.chat-popover-leave-active{transition:opacity .18s,transform .18s}
.chat-popover-enter-from,.chat-popover-leave-to{opacity:0;transform:translateY(-8px) scale(.96);transform-origin:top right}

/* Input Mode Toggle */
.input-mode-toggle{display:flex;gap:8px;margin-bottom:12px}
.mode-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--muted);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s}
.mode-btn svg{width:16px;height:16px}
.mode-btn.active{background:rgba(139,94,70,.08);border-color:var(--brown);color:var(--brown)}
.mode-btn:active{transform:scale(.98)}

/* Image Upload Area */
.image-upload-area{display:flex;flex-direction:column;gap:12px}
.upload-dropzone{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;border:2px dashed var(--border);border-radius:16px;background:rgba(0,0,0,.02);cursor:pointer;transition:all .2s}
.upload-dropzone:active{border-color:var(--brown);background:rgba(139,94,70,.04)}
.upload-icon{width:48px;height:48px;border-radius:50%;background:rgba(139,94,70,.08);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.upload-icon svg{width:24px;height:24px;color:var(--brown)}
.upload-text{font-size:14px;font-weight:500;color:var(--fg);margin-bottom:4px}
.upload-hint{font-size:11px;color:var(--muted)}
.hidden-input{display:none}

/* Image Preview */
.image-preview-container{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--border)}
.image-preview{width:100%;max-height:200px;object-fit:contain;background:rgba(0,0,0,.02);display:block}
.remove-image-btn{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.remove-image-btn:active{background:rgba(255,59,48,.8)}
.remove-image-btn svg{width:14px;height:14px;color:#fff}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}

/* ===== 桌面端左右布局（≥768px）=====
   说明：postcss-px-to-viewport 配置 mediaQuery:false，@media 块内的 px 不会被转换为 vw，
   故此处 px 均为真实像素；窄屏样式（@media 外）仍按 375 基准转 vw，互不干扰。 */
@media (min-width:768px){
  .app-shell{padding-top:0;padding-bottom:100px;overflow:visible}
  .ai-layout{display:flex;flex-direction:row;gap:28px;max-width:1200px;margin:0 auto;padding:28px 28px 0;align-items:flex-start}
  .ai-sidebar{flex:0 0 260px;position:sticky;top:28px;display:flex;flex-direction:column;gap:16px;max-height:calc(100vh - 56px);overflow-y:auto}
  .ai-main{flex:1;min-width:0}

  /* 侧栏 header */
  .ai-sidebar .header{padding:0}
  .ai-sidebar .avatar{width:40px;height:40px}
  .ai-sidebar .action-circle{width:40px;height:40px}
  .ai-sidebar .action-circle svg{width:18px;height:18px}
  .ai-sidebar .notif-badge{min-width:16px;height:16px;font-size:10px}

  /* 镇长卡片：横向→纵向，缩小作为侧栏品牌点缀 */
  .ai-sidebar .mayor-card{flex-direction:column;align-items:stretch;gap:10px;margin:0;padding:16px;border-radius:16px}
  .ai-sidebar .mayor-left{flex:none;padding-left:0}
  .ai-sidebar .mayor-name{font-size:22px}
  .ai-sidebar .mayor-status{font-size:11px;padding:3px 11px}
  .ai-sidebar .mayor-desc{font-size:10px;margin-top:-3px;margin-bottom:-3px}
  .ai-sidebar .mayor-right{position:static;width:100%;height:130px;right:auto}
  .ai-sidebar .globe-container{height:130px}
  .ai-sidebar .mayor-glow{width:100px;height:100px}
  .ai-sidebar .mayor-shadow{width:60px;height:6px}
  .ai-sidebar .mayor-model{width:173px}

  /* 横向分段条→纵向导航列表 */
  .ai-sidebar .seg-bar{flex-direction:column;gap:4px;margin:0;padding:6px;background:rgba(0,0,0,.03);border-radius:14px}
  .ai-sidebar .seg-item{text-align:left;padding:12px 14px;font-size:14px;border-radius:10px}
  .ai-sidebar .seg-item.active{background:var(--card);box-shadow:0 2px 8px rgba(0,0,0,.06)}

  /* 右侧内容区 */
  .ai-main .tab-content{height:auto;min-height:calc(100vh - 140px);padding:0 0 24px}
  .ai-main .card{padding:18px;margin-bottom:14px;border-radius:14px}
  .ai-main .card-title{font-size:16px}
  .ai-main .card-desc{font-size:13px;margin-bottom:14px}
  .ai-main .field{margin-bottom:14px}
  .ai-main .field-label{font-size:13px;margin-bottom:6px}
  .ai-main .field-input,.ai-main .field-textarea,.ai-main .custom-select{font-size:14px;padding:10px 14px;border-radius:10px}
  .ai-main .field-textarea{min-height:90px}
  .ai-main .submit-btn{height:44px;font-size:14px;border-radius:10px}
  .ai-main .dropdown-menu{border-radius:12px;max-height:260px}
  .ai-main .dropdown-item{padding:10px 14px}
  .ai-main .dd-emoji{width:36px;height:36px;font-size:18px;border-radius:10px}
  .ai-main .dd-name{font-size:14px}
  .ai-main .dd-meta{font-size:12px}

  /* 推荐结果 */
  .ai-main .summary-card,.ai-main .rec-card,.ai-main .warning-card,.ai-main .error-card{padding:14px;border-radius:12px}
  .ai-main .summary-label,.ai-main .summary-text{font-size:13px}
  .ai-main .ctx-tag{font-size:12px;padding:5px 12px}
  .ai-main .rec-rank{font-size:18px;width:32px}
  .ai-main .rec-name{font-size:15px}
  .ai-main .rec-brand{font-size:12px}
  .ai-main .rec-price{font-size:15px}
  .ai-main .rec-score{font-size:22px}
  .ai-main .rec-reason{font-size:13px}
  .ai-main .dim-chip{font-size:11px;padding:3px 8px}
  .ai-main .warning-title{font-size:13px}
  .ai-main .warning-item{font-size:12px;padding:4px 0}

  /* 对比 */
  .ai-main .compare-num{width:24px;height:24px;font-size:12px}
  .ai-main .compare-dd-item{padding:10px 14px}
  .ai-main .dd-prod-name{font-size:13px}
  .ai-main .dd-prod-brand{font-size:12px}
  .ai-main .compare-del{font-size:18px}
  .ai-main .add-btn{font-size:13px}

  /* 结果/提示卡 */
  .ai-main .result-card{margin-top:14px}
  .ai-main .result-label{font-size:13px}
  .ai-main .result-text{font-size:13px}
  .ai-main .tip-card{padding:14px;border-radius:12px;margin-top:14px}
  .ai-main .tip-title{font-size:13px}
  .ai-main .tip-item,.ai-main .tip-grid span{font-size:12px}

  /* 输入模式 / 上传 */
  .ai-main .input-mode-toggle{gap:8px;margin-bottom:14px}
  .ai-main .mode-btn{padding:10px;font-size:13px;border-radius:10px}
  .ai-main .mode-btn svg{width:16px;height:16px}
  .ai-main .upload-dropzone{padding:24px 16px;border-radius:12px}
  .ai-main .upload-icon{width:48px;height:48px;margin-bottom:12px;border-radius:50%}
  .ai-main .upload-icon svg{width:24px;height:24px}
  .ai-main .upload-text{font-size:14px}
  .ai-main .upload-hint{font-size:12px}
  .ai-main .image-preview-container{border-radius:12px}
  .ai-main .image-preview{max-height:240px}
  .ai-main .remove-image-btn{width:28px;height:28px;top:8px;right:8px}

  /* 聊天区 */
  .ai-main .chat-card{min-height:calc(100vh - 140px);height:300px}
  .ai-main .chat-welcome{margin-top:48px;height:300px}
  .ai-main .chat-input-bar-preview{margin-top:0}
  .ai-main .chat-welcome-icon svg{width:48px;height:48px}
  .ai-main .chat-welcome-title{font-size:18px}
  .ai-main .chat-welcome-desc{font-size:13px;max-width:360px}
  .ai-main .suggestion-chip{padding:8px 14px;font-size:13px;border-radius:14px;max-width:320px}
  .ai-main .chat-messages{min-height:calc(100vh - 260px);padding:10px 4px;gap:12px}
  .ai-main .chat-row{padding:0 16px;gap:12px}
  .ai-main .chat-avatar{width:36px;height:36px}
  .ai-main .chat-bubble{max-width:75%;padding:12px 16px;font-size:14px;border-radius:16px}
  .ai-main .chat-input-bar{padding:16px 16px 10px;gap:10px}
  .ai-main .chat-input{height:46px;font-size:14px;border-radius:23px;padding:0 20px}
  .ai-main .chat-send{width:46px;height:46px;border-radius:14px}
  .ai-main .chat-send svg{width:20px;height:20px}

  /* 空态/骨架 */
  .ai-main .empty-hint{font-size:13px;padding:16px}
  .ai-main .skeleton-line{height:40px;border-radius:10px}
}
</style>
