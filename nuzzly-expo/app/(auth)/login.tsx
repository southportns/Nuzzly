import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { writeGateway } from '../../src/lib/gateway';
import { useToast } from '../../src/hooks/useToast';
import ToastContainer from '../../src/components/ToastContainer';
import {
  PhoneIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CloseIcon,
  WechatIcon,
  QQIcon,
} from '../../src/components/Icons';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toasts, show } = useToast();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signInWithOtp = useAuthStore((s) => s.signInWithOtp);

  const [agreed, setAgreed] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  const [email, setEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [showEmailPwd, setShowEmailPwd] = useState(false);

  const termsRef = useRef<ScrollView>(null);
  const privacyRef = useRef<ScrollView>(null);

  function requireAgreement() {
    if (!agreed) {
      show('请先阅读并同意用户协议和隐私政策', 'warning');
      return false;
    }
    return true;
  }

  async function handleOneClickLogin() {
    if (!requireAgreement()) return;
    setShowPhoneLogin(true);
  }

  function handleWechatLogin() {
    if (!requireAgreement()) return;
    show('微信登录暂未开放', 'warning');
  }

  function handleQqLogin() {
    if (!requireAgreement()) return;
    show('QQ登录暂未开放', 'warning');
  }

  async function sendCode() {
    if (!/^1\d{10}$/.test(phone)) {
      show('请输入正确的手机号', 'warning');
      return;
    }
    try {
      await signInWithOtp(`+86${phone}`);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) clearInterval(timer);
          return Math.max(0, c - 1);
        });
      }, 1000);
      show('验证码已发送', 'success');
    } catch (e: any) {
      show(e.message || '验证码发送失败', 'error');
    }
  }

  async function handlePhoneLogin() {
    if (!phone || !code) return;
    setSending(true);
    try {
      await verifyOtp(`+86${phone}`, code);
      show('登录成功', 'success');
      setShowPhoneLogin(false);
      router.replace('/');
    } catch (e: any) {
      show(e.message || '登录失败', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleEmailLogin() {
    if (!email || !emailPwd) return;
    setSending(true);
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: emailPwd,
      });
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: emailPwd,
          });
          if (signUpError) throw signUpError;
          if (signUpData.user) {
            const { error: signInAgainError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: emailPwd,
            });
            if (signInAgainError) throw signInAgainError;
            const { error: profileErr } = await writeGateway('CREATE_PROFILE', {
              id: signUpData.user.id,
              username: email.split('@')[0],
              display_name: email.split('@')[0],
            });
            if (profileErr) console.error('[Login] create profile failed:', profileErr);
          }
        } else {
          throw signInError;
        }
      }
      show('登录成功', 'success');
      setShowEmailLogin(false);
      router.replace('/');
    } catch (e: any) {
      show(e.message || '登录失败', 'error');
    } finally {
      setSending(false);
    }
  }

  function checkTermsScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 10) {
      setTermsScrolled(true);
    }
  }

  function checkPrivacyScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 10) {
      setPrivacyScrolled(true);
    }
  }

  function agreeTerms() {
    setShowTerms(false);
    setTermsScrolled(false);
    setAgreed(true);
  }

  function agreePrivacy() {
    setShowPrivacy(false);
    setPrivacyScrolled(false);
    setAgreed(true);
  }

  const renderPhoneModal = () => (
    <Modal visible={showPhoneLogin} transparent animationType="slide" onRequestClose={() => setShowPhoneLogin(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalOverlayHit} activeOpacity={1} onPress={() => setShowPhoneLogin(false)} />
        <View style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPhoneLogin(false)}>
              <CloseIcon size={16} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>手机号登录</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>手机号</Text>
              <View style={styles.inputWrap}>
                <PhoneIcon size={18} color={colors.muted} />
                <TextInput
                  style={styles.formInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入手机号"
                  keyboardType="phone-pad"
                  maxLength={11}
                  placeholderTextColor="rgba(123,123,123,0.5)"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>验证码</Text>
              <View style={styles.inputWrap}>
                <LockIcon size={18} color={colors.muted} />
                <TextInput
                  style={[styles.formInput, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="请输入验证码"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor="rgba(123,123,123,0.5)"
                />
                <TouchableOpacity
                  style={[styles.codeBtn, countdown > 0 && styles.codeBtnDisabled]}
                  disabled={countdown > 0}
                  onPress={sendCode}
                >
                  <Text style={styles.codeBtnText}>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.authSubmit, (!phone || !code || sending) && styles.authSubmitDisabled]}
              disabled={!phone || !code || sending}
              onPress={handlePhoneLogin}
            >
              <Text style={styles.authSubmitText}>{sending ? '登录中...' : '登录 / 注册'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderEmailModal = () => (
    <Modal visible={showEmailLogin} transparent animationType="slide" onRequestClose={() => setShowEmailLogin(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalOverlayHit} activeOpacity={1} onPress={() => setShowEmailLogin(false)} />
        <View style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowEmailLogin(false)}>
              <CloseIcon size={16} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>邮箱登录</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>邮箱</Text>
              <View style={styles.inputWrap}>
                <MailIcon size={18} color={colors.muted} />
                <TextInput
                  style={styles.formInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="请输入邮箱"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="rgba(123,123,123,0.5)"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>密码</Text>
              <View style={styles.inputWrap}>
                <LockIcon size={18} color={colors.muted} />
                <TextInput
                  style={[styles.formInput, { paddingRight: 50 }]}
                  value={emailPwd}
                  onChangeText={setEmailPwd}
                  placeholder="请输入密码"
                  secureTextEntry={!showEmailPwd}
                  placeholderTextColor="rgba(123,123,123,0.5)"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowEmailPwd((v) => !v)}>
                  {showEmailPwd ? <EyeOffIcon size={18} color={colors.muted} /> : <EyeIcon size={18} color={colors.muted} />}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.authSubmit, (!email || !emailPwd || sending) && styles.authSubmitDisabled]}
              disabled={!email || !emailPwd || sending}
              onPress={handleEmailLogin}
            >
              <Text style={styles.authSubmitText}>{sending ? '登录中...' : '登录 / 注册'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const termsBody = (
    <>
      <Text style={styles.agreementH3}>一、服务条款</Text>
      <Text style={styles.agreementP}>欢迎使用 Nuzzly 毛球镇。本应用为宠物主人提供社区交流、产品评测、健康管理等服务。</Text>
      <Text style={styles.agreementP}>您在使用本应用时，应遵守本协议的各项条款。如果您不同意本协议的任何条款，请停止使用本应用。</Text>
      <Text style={styles.agreementH3}>二、账号注册</Text>
      <Text style={styles.agreementP}>您可以通过手机号注册账号。注册成功后，您将获得本应用的使用权。请妥善保管您的账号信息。</Text>
      <Text style={styles.agreementP}>您应对账号下的所有活动负责。如发现异常登录，请及时联系我们。</Text>
      <Text style={styles.agreementH3}>三、用户行为</Text>
      <Text style={styles.agreementP}>用户应遵守中华人民共和国法律法规，不得发布违法违规内容。</Text>
      <Text style={styles.agreementP}>用户不得发布虚假信息、广告、垃圾内容、色情暴力等违规内容。</Text>
      <Text style={styles.agreementP}>用户不得恶意攻击、骚扰其他用户，不得侵犯他人合法权益。</Text>
      <Text style={styles.agreementH3}>四、内容规范</Text>
      <Text style={styles.agreementP}>用户发布的内容应真实、客观、有价值。产品评测应基于真实使用体验。</Text>
      <Text style={styles.agreementP}>用户发布的内容版权归原作者所有，本应用有权在合理范围内使用。</Text>
      <Text style={styles.agreementP}>如用户发布的内容违反本协议，本应用有权删除相关内容并封禁账号。</Text>
      <Text style={styles.agreementH3}>五、知识产权</Text>
      <Text style={styles.agreementP}>本应用的界面设计、图标、文字、软件等均为本应用的知识产权，受法律保护。</Text>
      <Text style={styles.agreementP}>未经授权，任何人不得复制、修改、传播本应用的任何内容。</Text>
      <Text style={styles.agreementH3}>六、免责声明</Text>
      <Text style={styles.agreementP}>本应用不对用户发布的内容承担责任。用户应自行判断内容的真实性和可靠性。</Text>
      <Text style={styles.agreementP}>本应用保留随时修改本协议的权利。修改后的协议将在应用内公布。</Text>
      <View style={styles.agreementSpacer} />
    </>
  );

  const privacyBody = (
    <>
      <Text style={styles.agreementH3}>一、信息收集</Text>
      <Text style={styles.agreementP}>我们收集以下信息以提供服务：</Text>
      <Text style={styles.agreementP}>1. 手机号码：用于登录验证和账号安全。</Text>
      <Text style={styles.agreementP}>2. 设备信息：包括设备型号、操作系统版本，用于优化应用体验。</Text>
      <Text style={styles.agreementP}>3. 发布内容：您发布的文字、图片等内容。</Text>
      <Text style={styles.agreementH3}>二、信息使用</Text>
      <Text style={styles.agreementP}>我们收集的信息将用于：</Text>
      <Text style={styles.agreementP}>1. 提供、维护和改进我们的服务。</Text>
      <Text style={styles.agreementP}>2. 验证您的身份，保障账号安全。</Text>
      <Text style={styles.agreementP}>3. 向您发送服务通知和验证码。</Text>
      <Text style={styles.agreementP}>4. 根据《网络安全法》要求留存相关内容6个月。</Text>
      <Text style={styles.agreementH3}>三、信息保护</Text>
      <Text style={styles.agreementP}>我们采用行业标准的加密技术保护您的个人信息安全。</Text>
      <Text style={styles.agreementP}>我们不会向第三方出售、出租或交易您的个人信息。</Text>
      <Text style={styles.agreementP}>我们仅在法律要求或必要情况下披露您的个人信息。</Text>
      <Text style={styles.agreementH3}>四、信息存储</Text>
      <Text style={styles.agreementP}>您的个人信息存储在中华人民共和国境内的服务器中。</Text>
      <Text style={styles.agreementP}>我们将按照法律法规要求的期限保存您的个人信息。</Text>
      <Text style={styles.agreementH3}>五、您的权利</Text>
      <Text style={styles.agreementP}>您有权查看、修改、删除您的个人信息。</Text>
      <Text style={styles.agreementP}>您有权注销账号。账号注销后，我们将停止提供服务并删除您的个人信息。</Text>
      <Text style={styles.agreementP}>您有权撤回同意。但撤回同意可能导致部分服务无法使用。</Text>
      <Text style={styles.agreementH3}>六、未成年人保护</Text>
      <Text style={styles.agreementP}>我们非常重视未成年人个人信息的保护。如您为未成年人，请在监护人指导下使用本应用。</Text>
      <Text style={styles.agreementH3}>七、政策更新</Text>
      <Text style={styles.agreementP}>我们可能会不时更新本隐私政策。更新后的政策将在应用内公布。</Text>
      <View style={styles.agreementSpacer} />
    </>
  );

  const renderAgreementModal = (
    visible: boolean,
    title: string,
    body: React.ReactNode,
    scrolled: boolean,
    onClose: () => void,
    onAgree: () => void,
    ref: React.RefObject<ScrollView | null>
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalOverlayHit} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <CloseIcon size={16} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView
            ref={ref}
            style={styles.modalBody}
            onScroll={title === '用户协议' ? checkTermsScroll : checkPrivacyScroll}
            scrollEventThrottle={16}
          >
            {body}
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom ? 0 : 12 }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalBtn, !scrolled && styles.modalBtnDisabled]}
              disabled={!scrolled}
              onPress={onAgree}
            >
              <Text style={[styles.modalBtnText, !scrolled && styles.modalBtnTextDisabled]}>
                {scrolled ? '同意并继续' : '请阅读到底部'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ToastContainer toasts={toasts} />
      <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.watermark} />

      <View style={styles.content}>
        <View style={styles.logo}>
          <Image source={require('../../assets/images/hero.png')} style={styles.logoImg} />
        </View>
        <Text style={styles.subtitle}>让每一次选择都值得信赖</Text>

        <View style={styles.loginMain}>
          <TouchableOpacity activeOpacity={0.9} style={styles.btnPrimaryPhone} onPress={handleOneClickLogin}>
            <PhoneIcon size={18} color="#fff" />
            <Text style={styles.btnPrimaryPhoneText}>本机号码一键登录</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>其他登录方式</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.socialBtn} onPress={handleWechatLogin}>
              <WechatIcon size={26} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.socialBtn} onPress={handleQqLogin}>
              <QQIcon size={26} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.loginAlt}>
          <TouchableOpacity onPress={() => setShowPhoneLogin(true)}>
            <Text style={styles.btnText}>手机号登录</Text>
          </TouchableOpacity>
          <Text style={styles.loginAltDot}>·</Text>
          <TouchableOpacity onPress={() => setShowEmailLogin(true)}>
            <Text style={styles.btnText}>邮箱登录</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.agreement}
          onPress={() => setAgreed((v) => !v)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.agreementText}>
            登录即同意
            <Text style={styles.agreementLink} onPress={() => setShowTerms(true)}>
              《用户协议》
            </Text>
            和
            <Text style={styles.agreementLink} onPress={() => setShowPrivacy(true)}>
              《隐私政策》
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {renderPhoneModal()}
      {renderEmailModal()}
      {renderAgreementModal(showTerms, '用户协议', termsBody, termsScrolled, () => setShowTerms(false), agreeTerms, termsRef)}
      {renderAgreementModal(
        showPrivacy,
        '隐私政策',
        privacyBody,
        privacyScrolled,
        () => setShowPrivacy(false),
        agreePrivacy,
        privacyRef
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  watermark: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    opacity: 0.04,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 160,
    height: 160,
    marginTop: '12%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 28,
    letterSpacing: 0.01,
  },
  loginMain: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  btnPrimaryPhone: {
    width: '100%',
    height: 48,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.btn,
  },
  btnPrimaryPhoneText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.01,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.02,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  loginAlt: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnText: {
    backgroundColor: 'transparent',
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 6,
    paddingHorizontal: 10,
    letterSpacing: 0.01,
  },
  loginAltDot: {
    color: colors.muted,
    fontSize: 13,
  },
  agreement: {
    marginTop: 20,
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  agreementText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  agreementLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayHit: {
    flex: 1,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.fg,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.sep,
  },
  modalBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
  },
  modalBtnDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.4,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnTextDisabled: {
    color: 'rgba(255,255,255,0.8)',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
    letterSpacing: 0.02,
    marginBottom: 6,
    paddingLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radius.btn,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    gap: 10,
  },
  formInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.fg,
  },
  codeInput: {
    paddingRight: 90,
  },
  codeBtn: {
    position: 'absolute',
    right: 8,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBtnDisabled: {
    opacity: 0.4,
  },
  codeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  eyeBtn: {
    position: 'absolute',
    right: 11,
    padding: 4,
  },
  authSubmit: {
    width: '100%',
    height: 48,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
    marginTop: 8,
  },
  authSubmitDisabled: {
    opacity: 0.45,
  },
  authSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  agreementH3: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.fg,
    marginTop: 16,
    marginBottom: 8,
  },
  agreementP: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 4,
  },
  agreementSpacer: {
    height: 60,
  },
});
