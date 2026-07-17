<template>
  <div class="auth-shell">
    <div class="auth-watermark" style="background-image:url(/mqpyqgao-logo.png)"></div>

    <div class="auth-logo anim-scale-in">
      <img src="/hero.png" alt="Nuzzly">
    </div>
    <p class="auth-subtitle anim-fade-up anim-delay-2">让每一次选择都值得信赖</p>

    <!-- 主登录区域 -->
    <div class="login-main anim-fade-up anim-delay-3">
      <!-- 本机号码一键登录 -->
      <button class="btn-primary-phone" @click="handleOneClickLogin">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        本机号码一键登录
      </button>

      <!-- 分割线 -->
      <div class="divider-text">
        <span>其他登录方式</span>
      </div>

      <!-- 第三方登录 -->
      <div class="social-row">
        <button class="social-btn wechat" aria-label="微信登录" @click="handleWechatLogin">
          <svg viewBox="0 0 24 24" fill="#07C160" xmlns="http://www.w3.org/2000/svg"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/></svg>
        </button>
        <button class="social-btn qq" aria-label="QQ登录" @click="handleQqLogin">
          <svg viewBox="0 0 24 24" fill="#12B7F5" xmlns="http://www.w3.org/2000/svg"><path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"/></svg>
        </button>
      </div>
    </div>

    <!-- 底部：手机号/邮箱登录 -->
    <div class="login-alt anim-fade-up anim-delay-4">
      <button class="btn-text" @click="showPhoneLogin = true">手机号登录</button>
      <span class="login-alt-dot">·</span>
      <button class="btn-text" @click="showEmailLogin = true">邮箱登录</button>
    </div>

    <!-- 协议 -->
    <div class="agreement anim-fade-up anim-delay-5">
      <label class="agreement-label">
        <input type="checkbox" v-model="agreed" />
        <span>登录即同意 <a href="javascript:void(0)" @click.stop="showTerms = true">《用户协议》</a>和<a href="javascript:void(0)" @click.stop="showPrivacy = true">《隐私政策》</a></span>
      </label>
    </div>

    <!-- 手机号登录弹窗 -->
    <Teleport to="body">
      <div v-if="showPhoneLogin" class="modal-overlay" @click.self="showPhoneLogin = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showPhoneLogin = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">手机号登录</span>
            <div style="width:32px"></div>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">手机号</label>
              <div class="form-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <input v-model="phone" type="tel" class="form-input" placeholder="请输入手机号" maxlength="11">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">验证码</label>
              <div class="form-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input v-model="code" type="text" class="form-input code-input" placeholder="请输入验证码" maxlength="6">
                <button type="button" class="code-btn" :disabled="countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </button>
              </div>
            </div>
            <button class="auth-submit" :disabled="!phone || !code || sending" @click="handlePhoneLogin">
              {{ sending ? '登录中...' : '登录 / 注册' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 邮箱登录弹窗 -->
    <Teleport to="body">
      <div v-if="showEmailLogin" class="modal-overlay" @click.self="showEmailLogin = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showEmailLogin = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">邮箱登录</span>
            <div style="width:32px"></div>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <div class="form-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input v-model="email" type="email" class="form-input" placeholder="请输入邮箱">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="form-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input v-model="emailPwd" :type="showEmailPwd ? 'text' : 'password'" class="form-input" placeholder="请输入密码">
                <button type="button" class="form-eye" @click="showEmailPwd = !showEmailPwd">
                  <svg v-if="!showEmailPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <button class="auth-submit" :disabled="!email || !emailPwd || sending" @click="handleEmailLogin">
              {{ sending ? '登录中...' : '登录 / 注册' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 用户协议弹窗 -->
    <Teleport to="body">
      <div v-if="showTerms" class="modal-overlay" @click.self="showTerms = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showTerms = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">用户协议</span>
            <div style="width:32px"></div>
          </div>
          <div class="modal-body agreement-body" ref="termsBody" @scroll="checkTermsScroll">
            <h3>一、服务条款</h3>
            <p>欢迎使用 Nuzzly 毛球镇。本应用为宠物主人提供社区交流、产品评测、健康管理等服务。</p>
            <p>您在使用本应用时，应遵守本协议的各项条款。如果您不同意本协议的任何条款，请停止使用本应用。</p>
            <h3>二、账号注册</h3>
            <p>您可以通过手机号注册账号。注册成功后，您将获得本应用的使用权。请妥善保管您的账号信息。</p>
            <p>您应对账号下的所有活动负责。如发现异常登录，请及时联系我们。</p>
            <h3>三、用户行为</h3>
            <p>用户应遵守中华人民共和国法律法规，不得发布违法违规内容。</p>
            <p>用户不得发布虚假信息、广告、垃圾内容、色情暴力等违规内容。</p>
            <p>用户不得恶意攻击、骚扰其他用户，不得侵犯他人合法权益。</p>
            <h3>四、内容规范</h3>
            <p>用户发布的内容应真实、客观、有价值。产品评测应基于真实使用体验。</p>
            <p>用户发布的内容版权归原作者所有，本应用有权在合理范围内使用。</p>
            <p>如用户发布的内容违反本协议，本应用有权删除相关内容并封禁账号。</p>
            <h3>五、知识产权</h3>
            <p>本应用的界面设计、图标、文字、软件等均为本应用的知识产权，受法律保护。</p>
            <p>未经授权，任何人不得复制、修改、传播本应用的任何内容。</p>
            <h3>六、免责声明</h3>
            <p>本应用不对用户发布的内容承担责任。用户应自行判断内容的真实性和可靠性。</p>
            <p>本应用保留随时修改本协议的权利。修改后的协议将在应用内公布。</p>
            <div class="agreement-spacer"></div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn" :disabled="!termsScrolled" @click="agreeTerms">
              {{ termsScrolled ? '同意并继续' : '请阅读到底部' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 隐私政策弹窗 -->
    <Teleport to="body">
      <div v-if="showPrivacy" class="modal-overlay" @click.self="showPrivacy = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showPrivacy = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">隐私政策</span>
            <div style="width:32px"></div>
          </div>
          <div class="modal-body agreement-body" ref="privacyBody" @scroll="checkPrivacyScroll">
            <h3>一、信息收集</h3>
            <p>我们收集以下信息以提供服务：</p>
            <p>1. 手机号码：用于登录验证和账号安全。</p>
            <p>2. 设备信息：包括设备型号、操作系统版本，用于优化应用体验。</p>
            <p>3. 发布内容：您发布的文字、图片等内容。</p>
            <h3>二、信息使用</h3>
            <p>我们收集的信息将用于：</p>
            <p>1. 提供、维护和改进我们的服务。</p>
            <p>2. 验证您的身份，保障账号安全。</p>
            <p>3. 向您发送服务通知和验证码。</p>
            <p>4. 根据《网络安全法》要求留存相关内容6个月。</p>
            <h3>三、信息保护</h3>
            <p>我们采用行业标准的加密技术保护您的个人信息安全。</p>
            <p>我们不会向第三方出售、出租或交易您的个人信息。</p>
            <p>我们仅在法律要求或必要情况下披露您的个人信息。</p>
            <h3>四、信息存储</h3>
            <p>您的个人信息存储在中华人民共和国境内的服务器中。</p>
            <p>我们将按照法律法规要求的期限保存您的个人信息。</p>
            <h3>五、您的权利</h3>
            <p>您有权查看、修改、删除您的个人信息。</p>
            <p>您有权注销账号。账号注销后，我们将停止提供服务并删除您的个人信息。</p>
            <p>您有权撤回同意。但撤回同意可能导致部分服务无法使用。</p>
            <h3>六、未成年人保护</h3>
            <p>我们非常重视未成年人个人信息的保护。如您为未成年人，请在监护人指导下使用本应用。</p>
            <h3>七、政策更新</h3>
            <p>我们可能会不时更新本隐私政策。更新后的政策将在应用内公布。</p>
            <div class="agreement-spacer"></div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn" :disabled="!privacyScrolled" @click="agreePrivacy">
              {{ privacyScrolled ? '同意并继续' : '请阅读到底部' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const { signIn, signUp } = useAuth()

// 协议
const agreed = ref(false)
const showTerms = ref(false)
const showPrivacy = ref(false)
const termsBody = ref(null)
const privacyBody = ref(null)
const termsScrolled = ref(false)
const privacyScrolled = ref(false)

// 手机号登录
const showPhoneLogin = ref(false)
const phone = ref('')
const code = ref('')
const countdown = ref(0)
const sending = ref(false)

// 邮箱登录
const showEmailLogin = ref(false)
const email = ref('')
const emailPwd = ref('')
const showEmailPwd = ref(false)

// 检查是否滚动到底部
function checkTermsScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    termsScrolled.value = true
  }
}

function checkPrivacyScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    privacyScrolled.value = true
  }
}

// 同意用户协议
function agreeTerms() {
  showTerms.value = false
  termsScrolled.value = false
  // 检查是否两个都同意了
  if (agreed.value) {
    agreed.value = true // 保持勾选
  }
}

// 同意隐私政策
function agreePrivacy() {
  showPrivacy.value = false
  privacyScrolled.value = false
}

// 本机号码一键登录
async function handleOneClickLogin() {
  if (!agreed.value) {
    Toast({ theme: 'warning', message: '请先阅读并同意用户协议和隐私政策' })
    return
  }
  // TODO: 接入运营商一键登录SDK（如极光认证、MobTech等）
  // 当前先跳转到手机号登录弹窗
  showPhoneLogin.value = true
}

// 微信登录
async function handleWechatLogin() {
  if (!agreed.value) {
    Toast({ theme: 'warning', message: '请先阅读并同意用户协议和隐私政策' })
    return
  }
  // TODO: 接入微信登录SDK
  Toast({ theme: 'warning', message: '微信登录暂未开放' })
}

// QQ登录
async function handleQqLogin() {
  if (!agreed.value) {
    Toast({ theme: 'warning', message: '请先阅读并同意用户协议和隐私政策' })
    return
  }
  // TODO: 接入QQ登录SDK
  Toast({ theme: 'warning', message: 'QQ登录暂未开放' })
}

// 发送验证码
async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    Toast({ theme: 'warning', message: '请输入正确的手机号' })
    return
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone: `+86${phone.value}` })
    if (error) throw error
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
    Toast({ theme: 'success', message: '验证码已发送' })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '验证码发送失败' })
  }
}

// 手机号登录/注册
async function handlePhoneLogin() {
  if (!phone.value || !code.value) return
  sending.value = true
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+86${phone.value}`,
      token: code.value,
      type: 'sms'
    })
    if (error) throw error

    // 如果是新用户，自动创建 profile
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: phone.value.slice(-4),
          display_name: `用户${phone.value.slice(-4)}`
        })
      }
    }

    Toast({ theme: 'success', message: '登录成功' })
    showPhoneLogin.value = false
    router.push('/')
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '登录失败' })
  } finally {
    sending.value = false
  }
}

// 邮箱登录/注册
async function handleEmailLogin() {
  if (!email.value || !emailPwd.value) return
  sending.value = true
  try {
    // 先尝试登录
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: emailPwd.value
    })

    if (signInError) {
      // 如果用户不存在，尝试注册
      if (signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.value.trim(),
          password: emailPwd.value
        })
        if (signUpError) throw signUpError

        // 注册成功，自动登录
        if (signUpData.user) {
          const { error: signInAgainError } = await supabase.auth.signInWithPassword({
            email: email.value.trim(),
            password: emailPwd.value
          })
          if (signInAgainError) throw signInAgainError

          // 创建 profile
          await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username: email.value.split('@')[0],
            display_name: email.value.split('@')[0]
          })
        }
      } else {
        throw signInError
      }
    }

    Toast({ theme: 'success', message: '登录成功' })
    showEmailLogin.value = false
    router.push('/')
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '登录失败' })
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.auth-shell{width:100%;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:0 32px calc(40px + var(--safe-bottom));position:relative;overflow:hidden}
.auth-watermark{position:absolute;top:-80px;right:-60px;width:min(280px,70vw);aspect-ratio:1;opacity:.04;pointer-events:none;background-repeat:no-repeat;background-size:contain;background-position:center}
.auth-logo{width:clamp(120px,40vw,200px);aspect-ratio:1;overflow:hidden;margin-top:12vh;margin-bottom:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.auth-logo img{width:100%;height:100%;object-fit:contain;display:block}

.auth-subtitle{font-size:14px;color:var(--muted);margin-bottom:28px;letter-spacing:.01em}

/* 主登录区域 */
.login-main{width:100%;max-width:clamp(280px,80vw,400px);display:flex;flex-direction:column;align-items:center}

/* 本机号码一键登录按钮 */
.btn-primary-phone{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:15px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;box-shadow:var(--shadow-btn);transition:transform .15s;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.01em}
.btn-primary-phone:active{transform:scale(.97)}
.btn-primary-phone svg{width:18px;height:18px;stroke:#fff}

/* 分割线 */
.divider-text{display:flex;align-items:center;gap:12px;width:100%;margin:20px 0 16px}
.divider-text::before,.divider-text::after{content:'';flex:1;height:1px;background:var(--border)}
.divider-text span{font-size:12px;color:var(--muted);white-space:nowrap;letter-spacing:.02em}

/* 第三方登录 */
.social-row{display:flex;justify-content:center;gap:20px}
.social-btn{width:48px;height:48px;border-radius:50%;background:var(--card);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 8px rgba(0,0,0,.03);padding:12px;box-sizing:border-box}
.social-btn:active{transform:scale(.9);box-shadow:0 1px 4px rgba(0,0,0,.06)}
.social-btn svg{width:100%;height:100%;display:block;flex-shrink:0}
.social-btn.wechat svg{fill:#07C160}
.social-btn.qq svg{fill:#12B7F5}

/* 底部其他登录方式 */
.login-alt{margin-top:24px;display:flex;align-items:center;justify-content:center;gap:4px}
.btn-text{background:none;border:none;color:var(--brown);font-size:13px;font-weight:500;cursor:pointer;padding:6px 10px;letter-spacing:.01em}
.btn-text:active{opacity:.7}
.login-alt-dot{color:var(--muted);font-size:13px}

/* 协议 */
.agreement{margin-top:20px;max-width:320px}
.agreement-label{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--muted);cursor:pointer;line-height:1.5}
.agreement-label input{margin-top:2px;accent-color:var(--brown)}
.agreement-label a{color:var(--brown);text-decoration:none}

/* 表单组件 */
.form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.form-label{font-size:13px;font-weight:500;color:var(--muted);letter-spacing:.02em;padding-left:4px}
.form-input{width:100%;height:48px;border-radius:var(--radius-btn);border:1.5px solid var(--border);background:var(--card);padding:0 16px;font-size:15px;font-family:var(--font-body);color:var(--fg);outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
.form-input:focus{border-color:var(--brown);box-shadow:0 0 0 3px rgba(139,94,70,.1)}
.form-input::placeholder{color:rgba(123,123,123,.5)}
.form-input-icon{position:relative}
.form-input-icon .form-input{padding-left:44px;padding-right:44px}
.form-input-icon svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--muted);pointer-events:none;transition:color .2s}
.form-input-icon:focus-within svg{color:var(--brown)}
.code-input{padding-right:110px}
.code-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:0 12px;height:32px;border-radius:16px;border:none;background:var(--brown);color:#fff;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .2s}
.code-btn:disabled{opacity:.4;cursor:not-allowed}
.auth-submit{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:15px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;box-shadow:var(--shadow-btn);transition:transform .15s,opacity .15s;margin-top:8px}
.auth-submit:active{transform:scale(.97)}
.auth-submit:disabled{opacity:.45;cursor:not-allowed;transform:none}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center}
.modal-content{width:100%;max-width:500px;background:var(--bg);border-radius:24px 24px 0 0;max-height:85vh;display:flex;flex-direction:column;animation:slideUp .3s ease}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--sep);flex-shrink:0}
.modal-close{width:32px;height:32px;border:none;background:rgba(0,0,0,.05);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.modal-close svg{width:16px;height:16px;color:var(--muted)}
.modal-title{font-size:16px;font-weight:600}
.modal-body{padding:20px;overflow-y:auto;flex:1}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}

/* 协议正文 */
.agreement-body h3{font-size:15px;font-weight:600;color:var(--fg);margin:16px 0 8px}
.agreement-body h3:first-child{margin-top:0}
.agreement-body p{font-size:13px;line-height:1.8;color:var(--muted);margin-bottom:4px}
.agreement-spacer{height:60px}

/* Modal Footer */
.modal-footer{padding:12px 20px calc(12px + var(--safe-bottom));border-top:1px solid var(--sep);flex-shrink:0}
.modal-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:15px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;box-shadow:var(--shadow-btn);transition:transform .15s,opacity .15s}
.modal-btn:active{transform:scale(.97)}
.modal-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;background:var(--muted)}

/* 密码可见按钮 */
.form-eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:24px;height:24px;color:var(--muted);cursor:pointer;background:none;border:none;padding:2px;transition:color .2s;z-index:1}
.form-eye:active{color:var(--fg)}

/* 动画 */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}
.anim-delay-2{animation-delay:.2s}
.anim-delay-3{animation-delay:.3s}
.anim-delay-4{animation-delay:.4s}
.anim-delay-5{animation-delay:.5s}
.anim-scale-in{opacity:0;animation:scaleIn .5s cubic-bezier(.22,1,.36,1) forwards}
</style>
