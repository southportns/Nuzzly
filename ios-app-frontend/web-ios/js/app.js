/* nuzzly web-ios - 应用框架：auth 守卫、TabBar 注入、工具函数、体重轮播 */
(function () {
  const sb = window.sb

  /* ---------- auth 守卫 ---------- */
  async function requireAuth() {
    const { data } = await sb.auth.getSession()
    if (!data.session) {
      location.replace('login.html')
      return null
    }
    return data.session.user
  }

  /* ---------- 问候语 ---------- */
  function getGreeting(d) {
    const h = (d || new Date()).getHours()
    if (h < 6) return '夜深了'
    if (h < 11) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  }

  /* ---------- 数字动画（hero-score） ---------- */
  function animateCount(el, target, dur = 1200) {
    if (!el) return
    const start = performance.now()
    const from = 0
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
    function tick(now) {
      const p = Math.min(1, (now - start) / dur)
      el.textContent = Math.round(from + (target - from) * easeOutCubic(p))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /* ---------- TabBar 图标（iconoir 风格） ---------- */
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.8L18.6 9.6 13.8 11.4 12 16.2 10.2 11.4 5.4 9.6 10.2 7.8z"/><path d="M19 14l.7 1.9L21.6 16.6 19.7 17.3 19 19.2 18.3 17.3 16.4 16.6 18.3 15.9z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
  }

  /* ---------- 注入底部 TabBar ---------- */
  function injectTabBar(active) {
    const items = [
      { key: 'home', label: '首页', href: 'home.html', icon: ICONS.home },
      { key: 'products', label: '产品库', href: 'products.html', icon: ICONS.grid },
      { key: 'community', label: '', href: 'community.html', center: true },
      { key: 'ai', label: '镇长', href: 'aihub.html', icon: ICONS.sparkles },
      { key: 'profile', label: '我的', href: 'profile.html', icon: ICONS.user }
    ]
    const html = '<nav class="tab-bar ignore-vw">' + items.map(it => {
      if (it.center) {
        return `<a class="tab-item tab-center" href="${it.href}" data-tab="${it.key}">
          <div class="tab-center-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" fill="#8B5E46" stroke="#8B5E46"/><circle cx="9.5" cy="11" r="1.2" fill="#fff" stroke="none"/><circle cx="14.5" cy="11" r="1.2" fill="#fff" stroke="none"/><path d="M9.5 14.5c.8.8 4.2.8 5 0" stroke="#fff"/></svg>
          </div></a>`
      }
      return `<a class="tab-item ${active === it.key ? 'active' : ''}" href="${it.href}" data-tab="${it.key}">${it.icon}<span>${it.label}</span></a>`
    }).join('') + '</nav>'
    const wrap = document.createElement('div')
    wrap.innerHTML = html
    document.body.appendChild(wrap.firstElementChild)
  }

  /* ---------- 体重轮播（复刻 WeightCarousel.vue） ---------- */
  function initWeightCarousel(container, items, onRecord) {
    const BASE = 155, GAP = 8
    let active = 0, delta = 0, dragging = false, sx = 0, timer = null
    if (!items.length) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px">暂无体重记录</div>'
      return
    }
    container.innerHTML = `
      <div class="carousel-track"></div>
      ${items.length > 1 ? '<div class="carousel-indicators"></div>' : ''}
      <div class="carousel-action">记录<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg></div>`
    const track = container.querySelector('.carousel-track')
    const ind = container.querySelector('.carousel-indicators')
    track.innerHTML = items.map((it, i) => `
      <div class="carousel-item" data-i="${i}">
        <div class="item-icon" style="background:${it.color || 'rgba(139,94,70,.1)'}">
          ${it.avatar ? `<img src="${it.avatar}" class="item-avatar"/>` : `<span class="item-emoji">${it.emoji || '🐾'}</span>`}
        </div>
        <div class="item-body">
          <div class="item-weight">${it.weight ?? '--'}<span class="item-unit">kg</span></div>
          <div class="item-name">${it.name || ''}</div>
          <div class="item-label">今日体重</div>
        </div>
      </div>`).join('')
    if (ind) ind.innerHTML = items.map((_, i) => `<button class="indicator ${i === 0 ? 'active' : 'inactive'}" data-i="${i}"></button>`).join('')

    function itemStyle(i) {
      const d = Math.abs(i - active)
      return `transform:scale(${d === 0 ? 1 : d === 1 ? 0.92 : 0.82});opacity:${d === 0 ? 1 : d === 1 ? 0.6 : 0.3};width:${BASE}px`
    }
    function render() {
      const off = -active * (BASE + GAP) + delta
      track.style.transition = dragging ? 'none' : 'transform .35s cubic-bezier(.22,1,.36,1)'
      track.style.transform = `translateX(${off}px)`
      track.querySelectorAll('.carousel-item').forEach((el, i) => { el.style.cssText = itemStyle(i) })
      if (ind) ind.querySelectorAll('.indicator').forEach((el, i) => {
        el.className = 'indicator ' + (i === active ? 'active' : 'inactive')
      })
    }
    function goTo(i) { active = Math.max(0, Math.min(items.length - 1, i)); render() }
    function startAuto() {
      stopAuto()
      if (items.length <= 1) return
      timer = setInterval(() => goTo((active + 1) % items.length), 3000)
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null } }

    track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; delta = 0; dragging = true; stopAuto() }, { passive: true })
    track.addEventListener('touchmove', e => {
      if (!dragging) return
      const dx = e.touches[0].clientX - sx
      delta = dx; render()
    }, { passive: true })
    track.addEventListener('touchend', () => {
      dragging = false
      const th = BASE * 0.2
      if (delta < -th && active < items.length - 1) active++
      else if (delta > th && active > 0) active--
      delta = 0; render(); startAuto()
    })
    // 鼠标拖拽（桌面预览）
    let md = false, mx = 0
    track.addEventListener('mousedown', e => { md = true; mx = e.clientX; delta = 0; dragging = true; stopAuto() })
    window.addEventListener('mousemove', e => { if (md) { delta = e.clientX - mx; render() } })
    window.addEventListener('mouseup', () => {
      if (!md) return; md = false; dragging = false
      const th = BASE * 0.2
      if (delta < -th && active < items.length - 1) active++
      else if (delta > th && active > 0) active--
      delta = 0; render(); startAuto()
    })
    if (ind) ind.addEventListener('click', e => {
      const b = e.target.closest('.indicator'); if (b) { goTo(+b.dataset.i); startAuto() }
    })
    const act = container.querySelector('.carousel-action')
    if (act) act.addEventListener('click', () => onRecord && onRecord())

    render(); startAuto()
    return { goTo, startAuto, stopAuto }
  }

  /* ---------- 滚动渐隐 header ---------- */
  function bindHeaderFade(headerEl) {
    if (!headerEl) return
    const shell = document.querySelector('.app-shell')
    const target = shell || window
    target.addEventListener('scroll', () => {
      const s = target.scrollTop
      headerEl.style.opacity = Math.max(0, 1 - s / 200)
      headerEl.style.transform = `translateY(${-s * 0.15}px)`
    }, { passive: true })
  }

  /* ---------- 任务状态 -> tag ---------- */
  function scoreTag(score) {
    if (score >= 80) return { cls: 'good', text: '今日状态良好' }
    if (score >= 50) return { cls: 'warn', text: '还有任务待完成' }
    return { cls: 'bad', text: '需要关注' }
  }

  /* ---------- 宠物头像 ---------- */
  function petAvatar(pet) {
    return pet?.avatar_url || pet?.photo_url || 'assets/cat.png'
  }

  window.NuzzlyApp = {
    requireAuth, getGreeting, animateCount, injectTabBar,
    initWeightCarousel, bindHeaderFade, scoreTag, petAvatar, ICONS
  }
})()
