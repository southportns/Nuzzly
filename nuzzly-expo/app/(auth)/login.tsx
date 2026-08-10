import React, { useState, useRef } from 'react';
import { CurvedIn, type CurvedInHandle } from '../../src/components/CurvedIn';
import {
 View,
 Text,
 Image,
 TouchableOpacity,
 Modal,
 ScrollView,
 StyleSheet,
 KeyboardAvoidingView,
 Platform,
 ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { writeGateway } from '../../src/lib/gateway';
import { useToast } from '../../src/hooks/useToast';
import ToastContainer from '../../src/components/ToastContainer';
import {
 PhoneIcon,
 MailIcon,
 CloseIcon,
 WechatIcon,
 AppleIcon,
 ChevronLeftIcon,
} from '../../src/components/Icons';

// ── Arc layout comation (matches web's comeArcPositions) ──

const BTN_SIZE = 44;
const BTN_GAP = 20;
const BTN_BEND = -12;

type LoginMethod = 'phone' | 'wechat' | 'apple' | 'email';

interface MethodInfo {
 id: LoginMethod;
 icon: React.FC<{ size?: number; color?: string; fill?: string }>;
 size: number;
}

const METHODS: MethodInfo[] = [{ id: 'phone', icon: PhoneIcon, size: 22 },
 { id: 'wechat', icon: WechatIcon, size: 26 },
 { id: 'apple', icon: AppleIcon, size: 30 },
 { id: 'email', icon: MailIcon, size: 22 },];

function comeArcPositions(count: number, size: number, gap: number, bend: number) {
 const span = (count - 1) * (size + gap);
 const a = Math.max(0.1, Math.abs(bend));
 const R = (span * span * 0.25 + a * a) / (2 * a);
 const phi = Math.asin(Math.min(1, span / (2 * R)));
 const dir = bend >= 0? 1: -1;
 const raw = Array.from({ length: count }, (_, i) => {
 const t = count === 1? 0: (i / (count - 1)) * 2 - 1;
 const theta = t * phi;
 const x = R * Math.sin(theta);
 const y = dir * (-R + R * Math.cos(theta));
 return { x, y };
 });
 const minY = Math.min(...raw.map((p) => p.y));
 return raw.map((p) => ({ x: p.x, y: p.y - minY }));
}

const ARC_POSITIONS = comeArcPositions(METHODS.length, BTN_SIZE, BTN_GAP, BTN_BEND);
const ARC_HEIGHT = BTN_SIZE + Math.max(...ARC_POSITIONS.map((p) => p.y));

export default function Login() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { toasts, show } = useToast();
 const verifyOtp = useAuthStore((s) => s.verifyOtp);
 const signInWithOtp = useAuthStore((s) => s.signInWithOtp);

 // ── Agreement ──
 const [agreed, setAgreed] = useState(false);
 const [showTerms, setShowTerms] = useState(false);
 const [showPrivacy, setShowPrivacy] = useState(false);
 const [termsScrolled, setTermsScrolled] = useState(false);
 const [privacyScrolled, setPrivacyScrolled] = useState(false);

 // ── Phone OTP (inline, integrated into login flow) ──
 const [phone, setPhone] = useState('');
 const [code, setCode] = useState('');
 const [countdown, setCountdown] = useState(0);
 const [phoneSending, setPhoneSending] = useState(false);

 // ── Email login (inline, matching web) ──
 const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [step, setStep] = useState<'email' | 'password'>('email');
 const [Mode, setMode] = useState<'login' | 'signup'>('login');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const termsRef = useRef<ScrollView>(null);
 const privacyRef = useRef<ScrollView>(null);
 const inRef = useRef<CurvedInHandle>(null);

 // ── Method selection (matches web's selectMethod) ──
 function selectMethod(method: LoginMethod) {
 setError('');
 if (method === 'wechat') {
 if (!requireAgreement()) return;
 show('WeChat sign-in is not yet available', 'warning');
 return;
 }
 if (method === 'apple') {
 if (!requireAgreement()) return;
 show('Apple account sign-in is not yet available', 'warning');
 return;
 }
 // phone and email both use inline step flow
 setLoginMethod(method);
 setStep('email');
 setPhone('');
 setCode('');
 setEmail('');
 setPassword('');
 }

 function requireAgreement() {
 if (!agreed) {
 show('Please read and agree to the Terms of Service and Privacy Policy first', 'warning');
 return false;
 }
 return true;
 }

 // ── Account validation ──
 function validateAccount(value: string) {
 if (loginMethod === 'phone') {
 return /^1\d{10}$/.test(value);
 }
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 }

 // ── Account submit (step 1 → step 2) ──
 function handleAccountSubmit() {
 if (loginMethod === 'phone') {
 // Phone: send OTP code, then go to code step
 if (!validateAccount(phone)) {
 setError('Please enter a valid phone number');
 return;
 }
 setError('');
 sendCode();
 return;
 }
 // Email: validate, then go to password step
 if (!validateAccount(email)) {
 setError('Please enter a valid email address');
 return;
 }
 setError('');
 setStep('password');
 setTimeout(() => inRef.current?.focus(), 100);
 }

 // ── Password submit (matches web's handlePasswordSubmit) ──
 async function handlePasswordSubmit() {
 if (!password) return;
 setError('');
 setLoading(true);

 try {
 if (Mode === 'login') {
 const { error: signInError } = await supabase.auth.signInWithPassword({
 email: email.trim(),
 password,
 });
 if (signInError) {
 // If invalid credentials, try signup
 if (signInError.message.includes('Invalid login credentials')) {
 const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
 email: email.trim(),
 password,
 });
 if (signUpError) throw signUpError;
 if (signUpData.user) {
 const { error: signInAgainError } = await supabase.auth.signInWithPassword({
 email: email.trim(),
 password,
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
 } else {
 const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
 email: email.trim(),
 password,
 });
 if (signUpError) throw signUpError;
 if (signUpData.user) {
 const { error: signInAgainError } = await supabase.auth.signInWithPassword({
 email: email.trim(),
 password,
 });
 if (signInAgainError) throw signInAgainError;
 const { error: profileErr } = await writeGateway('CREATE_PROFILE', {
 id: signUpData.user.id,
 username: email.split('@')[0],
 display_name: email.split('@')[0],
 });
 if (profileErr) console.error('[Login] create profile failed:', profileErr);
 }
 }
 show('Sign In Successful', 'success');
 router.replace('/');
 } catch (e: any) {
 setError(e.message || 'Sign In Failed');
 } finally {
 setLoading(false);
 }
 }

 // ── Back to account step ──
 function handleBack() {
 setStep('email');
 if (loginMethod === 'phone') {
 setCode('');
 } else {
 setPassword('');
 }
 setError('');
 setTimeout(() => inRef.current?.focus(), 100);
 }

 // ── Phone OTP functions ──
 async function sendCode() {
 if (!/^1\d{10}$/.test(phone)) {
 show('Please enter a valid phone number', 'warning');
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
 show('Verification code sent', 'success');
 setStep('password');
 setTimeout(() => inRef.current?.focus(), 100);
 } catch (e: any) {
 setError(e.message || 'Failed to send verification code');
 }
 }

 async function handlePhoneLogin() {
 if (!phone ||!code) return;
 setPhoneSending(true);
 try {
 await verifyOtp(`+86${phone}`, code);
 show('Sign In Successful', 'success');
 router.replace('/');
 } catch (e: any) {
 setError(e.message || 'Sign In Failed');
 } finally {
 setPhoneSending(false);
 }
 }

 // ── Agreement scroll handlers ──
 function checkTermsScroll(event: any) {
 const { layoutMeasurement, contentOffset, contentSize } = event.nativeevent;
 if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 10) {
 setTermsScrolled(true);
 }
 }

 function checkPrivacyScroll(event: any) {
 const { layoutMeasurement, contentOffset, contentSize } = event.nativeevent;
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

 // ── Toggle login/signup (matches web) ──
 function toggleMode() {
 const newMode = Mode === 'login'? 'signup': 'login';
 setMode(newMode);
 setError('');
 setStep('email');
 setPassword('');
 }

 // ── Come CurvedIn props (single instance, no remounting) ──
 const isPhone = loginMethod === 'phone';
 const isAccountStep = step === 'email';

 const inValue = isAccountStep? (isPhone? phone: email): (isPhone? code: password);

 const inPlaceholder = isAccountStep? (isPhone? 'Enter phone number': 'your@email.com'): (isPhone? 'Enter verification code': 'Enter password');

 const inButtonText = isAccountStep? (isPhone? (countdown > 0? `${countdown}s`: 'Get Code'): 'Next'): (isPhone? (phoneSending? 'Signing in...': 'Sign In'): (Mode === 'login'? 'Sign In': 'Sign Up'));

 const inButtonDisabled = isAccountStep? (isPhone? countdown > 0: false): (isPhone? (!phone ||!code || phoneSending): false);

 const inKeyboardType = isAccountStep? (isPhone? 'phone-pad': 'email-address'): (isPhone? 'number-pad': 'default');

 const inMaxLength: number | undefined = isAccountStep? (isPhone? 11: undefined): (isPhone? 6: undefined);

 const inSecureTextEntry =!isAccountStep &&!isPhone;

 const inButtonColor = isAccountStep? '#FF7A59': '#8B5E46';

 const handleSubmit = () => {
 if (isAccountStep) {
 handleAccountSubmit();
 } else if (isPhone) {
 handlePhoneLogin();
 } else {
 handlePasswordSubmit();
 }
 };

 const handleInChange = (v: string) => {
 setError('');
 if (isAccountStep) {
 if (isPhone) setPhone(v);
 else setEmail(v);
 } else {
 if (isPhone) setCode(v);
 else setPassword(v);
 }
 };

 // ── Agreement content ──
 const termsBody = (<>
 <Text style={styles.agreementH3}>1. Terms of Service</Text>
 <Text style={styles.agreementP}>Welcome to Nuzzly Town.This app provides pet owners with community interaction, product reviews, and health management services.</Text>
 <Text style={styles.agreementP}>By using this app, you agree to these terms. If you do not agree, please stop using the app.</Text>
 <Text style={styles.agreementH3}>2. Account Registration</Text>
 <Text style={styles.agreementP}>You can register an account using your phone number or email. Please keep your account credentials secure.</Text>
 <Text style={styles.agreementP}>You are responsible for all activities under your account. Please contact us if you notice any unusual login activity.</Text>
 <Text style={styles.agreementH3}>3. User Behavior</Text>
 <Text style={styles.agreementP}>Users must comply with applicable laws and regulations. Do not post illegal or prohibited content.</Text>
 <Text style={styles.agreementP}>Users must not post false information, advertisements, spam, adult content, or violent content.</Text>
 <Text style={styles.agreementP}>Users must not maliciously attack, harass other users, or infringe on others' rights.</Text>
 <Text style={styles.agreementH3}>4. Content Standards</Text>
 <Text style={styles.agreementP}>Posted content should be authentic, objective, and valuable. Product reviews should be based on genuine experiences.</Text>
 <Text style={styles.agreementP}>Users retain copyright of their content. The app may use content within reasonable bounds.</Text>
 <Text style={styles.agreementP}>If content violates this agreement, the app reserves the right to delete it and suspend accounts.</Text>
 <Text style={styles.agreementH3}>5. Intellectual Property</Text>
 <Text style={styles.agreementP}>The app's interface design, icons, text, and software are protected intellectual property.</Text>
 <Text style={styles.agreementP}>No one may copy, modify, or distribute the app's content without authorization.</Text>
 <Text style={styles.agreementH3}>6. Disclaimer</Text>
 <Text style={styles.agreementP}>The app is not responsible for user-posted content. Users should judge content authenticity independently.</Text>
 <Text style={styles.agreementP}>The app reserves the right to modify this agreement. Updates will be published within the app.</Text>
 <View style={styles.agreementSpacer} />
 </>);

 const privacyBody = (<>
 <Text style={styles.agreementH3}>1. Information Collection</Text>
 <Text style={styles.agreementP}>We collect the following information to provide our services:</Text>
 <Text style={styles.agreementP}>1. Phone number: Used for login verification and account security.</Text>
 <Text style={styles.agreementP}>2. Device information: Including device Model and OS version, used to optimize app experience.</Text>
 <Text style={styles.agreementP}>3. Posted content: Text and images you post.</Text>
 <Text style={styles.agreementH3}>2. Information Usage</Text>
 <Text style={styles.agreementP}>The information we collect is used for:</Text>
 <Text style={styles.agreementP}>1. Providing, maintaining, and improving our services.</Text>
 <Text style={styles.agreementP}>2. Verifying your identity and ensuring account security.</Text>
 <Text style={styles.agreementP}>3. Sending you service notifications and verification codes.</Text>
 <Text style={styles.agreementP}>4. Retaining relevant content as required by law.</Text>
 <Text style={styles.agreementH3}>3. Information Protection</Text>
 <Text style={styles.agreementP}>We use industry-standard encryption to protect your personal information.</Text>
 <Text style={styles.agreementP}>We will not sell, rent, or trade your personal information to third parties.</Text>
 <Text style={styles.agreementP}>We only disclose personal information when required by law or necessity.</Text>
 <Text style={styles.agreementH3}>4. Data Storage</Text>
 <Text style={styles.agreementP}>Your personal information is stored on secure servers.</Text>
 <Text style={styles.agreementP}>We retain your personal information as required by applicable laws.</Text>
 <Text style={styles.agreementH3}>5. Your Rights</Text>
 <Text style={styles.agreementP}>You have the right to view, modify, and delete your personal information.</Text>
 <Text style={styles.agreementP}>You have the right to delete your account. Upon deletion, we will stop providing services and delete your information.</Text>
 <Text style={styles.agreementP}>You have the right to withdraw consent. However, this may affect service availability.</Text>
 <Text style={styles.agreementH3}>6. Minor Protection</Text>
 <Text style={styles.agreementP}>We take minor protection seriously. If you are a minor, please use this app under guardian supervision.</Text>
 <Text style={styles.agreementH3}>7. Policy Updates</Text>
 <Text style={styles.agreementP}> Not Updatethis Privacy Policy. Updateafter use withinMale. </Text>
 <View style={styles.agreementSpacer} />
 </>);

 const renderAgreementModal = (visible: boolean,
 title: string,
 body: React.ReactNode,
 scrolled: boolean,
 onClose: () => void,
 onAgree: () => void,
 ref: React.RefObject<ScrollView | null>) => (<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
 onScroll={title === 'Terms of Service'? checkTermsScroll: checkPrivacyScroll}
 scrolleventThrottle={16}
 >
 {body}
 </ScrollView>
 <View style={[styles.modalFooter, { paddingBottom: insets.bottom? 0: 12 }]}>
 <TouchableOpacity
 activeOpacity={0.9}
 style={[styles.modalBtn,!scrolled && styles.modalBtnDisabled]}
 disabled={!scrolled}
 onPress={onAgree}
 >
 <Text style={[styles.modalBtnText,!scrolled && styles.modalBtnTextDisabled]}>
 {scrolled? 'Agree and Continue': 'Please scroll to the bottom'}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </View>
 </Modal>);

 return (<View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
 <ToastContainer toasts={toasts} />
 <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.watermark} />

 <KeyboardAvoidingView
 style={{ flex: 1 }}
 behavior={Platform.OS === 'ios'? 'padding': undefined}
 >
 <ScrollView
 style={{ flex: 1 }}
 contentContainerStyle={styles.scrollContent}
 keyboardShouldPersistTaps="handled"
 keyboardDismissMode="on-drag"
 showsVerticalScrollIndicator={false}
 >
 {/* Logo */}
 <View style={styles.logo}>
 <Image source={require('../../assets/images/hero.png')} style={styles.logoImg} />
 </View>

 {/* Title (matches web: "Sign In" / "Sign Up") */}
 <Text style={styles.title}>{Mode === 'login'? 'Sign In': 'Sign Up'}</Text>

 {/* ── Login form (matches web LoginForm) ── */}
 <View style={styles.formContainer}>
 {/* Header area: fixed height to prevent layout shift when switching steps */}
 <View style={styles.headerArea}>
 {step === 'email'? (/* Arc icons (only in account step, matches web) */
 <View style={[styles.arcContainer, { height: ARC_HEIGHT }]}>
 {METHODS.map((m, i) => {
 const isActive = loginMethod === m.id;
 const Icon = m.icon;
 const pos = ARC_POSITIONS[i];
 return (<TouchableOpacity
 key={m.id}
 activeOpacity={0.7}
 onPress={() => selectMethod(m.id)}
 style={[styles.arcBtn,
 {
 left: '50%',
 marginLeft: pos.x - BTN_SIZE / 2,
 top: pos.y,
 transform: [{ translateY: isActive? -5: 0 }],
 },]}
 >
 <Icon size={m.size} color="#000000" />
 </TouchableOpacity>);
 })}
 </View>): (/* Password step header (matches web) */
 <View style={styles.pwdHeader}>
 <TouchableOpacity
 onPress={handleBack}
 style={styles.backBtn}
 hitSlop={8}
 >
 <ChevronLeftIcon size={20} color="#6B6B6B" />
 </TouchableOpacity>
 <Text style={styles.pwdSeparator}>|</Text>
 <Text style={styles.pwdEmail} numberOfLines={1}>
 {loginMethod === 'phone'? phone: email}
 </Text>
 </View>)}
 </View>

 {/* Single CurvedIn - stays mounted across method/step switches */}
 <CurvedIn
 ref={inRef}
 value={inValue}
 onChangeText={handleInChange}
 onSubmit={handleSubmit}
 onButtonPress={handleSubmit}
 placeholder={inPlaceholder}
 buttonText={inButtonText}
 buttonDisabled={inButtonDisabled}
 secureTextEntry={inSecureTextEntry}
 keyboardType={inKeyboardType}
 maxLength={inMaxLength}
 returnKeyType="go"
 blurOnSubmit
 showButton
 bend={12}
 height={52}
 fontSize={14}
 backgroundColor="#ffffff"
 textColor="#111111"
 placeholderColor="#b0b0b0"
 borderColor="#e5e5e5"
 buttonColor={inButtonColor}
 buttonTextColor="#ffffff"
 shadowColor={inButtonColor}
 />

 {/* Status area: fixed height to prevent layout shift */}
 <View style={styles.statusArea}>
 {error? (<Text style={styles.errorText}>{error}</Text>): loading? (<View style={styles.loadingContainer}>
 <ActivityIndicator size="small" color="#8B5E46" />
 </View>): null}
 </View>

 {/* Toggle login/signup (only for email method) */}
 {loginMethod === 'email' && (<View style={styles.toggleRow}>
 <Text style={styles.toggleText}>
 {Mode === 'login'? "Don't have an account?": 'Already have an account?'}
 </Text>
 <TouchableOpacity onPress={toggleMode}>
 <Text style={styles.toggleLink}>
 {Mode === 'login'? 'Sign Up Free': 'Sign In Now'}
 </Text>
 </TouchableOpacity>
 </View>)}
 </View>

 {/* Agreement checkbox */}
 <TouchableOpacity
 activeOpacity={0.8}
 style={styles.agreement}
 onPress={() => setAgreed((v) =>!v)}
 >
 <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
 {agreed && <Text style={styles.checkMark}>✓</Text>}
 </View>
 <Text style={styles.agreementText}>
 By signing in, you agree to
 <Text style={styles.agreementLink} onPress={() => setShowTerms(true)}>
 Terms of Service
 </Text>
 and
 <Text style={styles.agreementLink} onPress={() => setShowPrivacy(true)}>
 Privacy Policy
 </Text>
 </Text>
 </TouchableOpacity>
 </ScrollView>
 </KeyboardAvoidingView>

 {renderAgreementModal(showTerms, 'Terms of Service', termsBody, termsScrolled, () => setShowTerms(false), agreeTerms, termsRef)}
 {renderAgreementModal(showPrivacy,
 'Privacy Policy',
 privacyBody,
 privacyScrolled,
 () => setShowPrivacy(false),
 agreePrivacy,
 privacyRef)}
 </View>);
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
 },
 scrollContent: {
 flexGrow: 1,
 alignItems: 'center',
 justifyContent: 'center',
 paddingHorizontal: 32,
 },
 logo: {
 width: 140,
 height: 180,
 marginBottom: 8,
 alignItems: 'center',
 justifyContent: 'center',
 },
 logoImg: {
 width: '100%',
 height: '100%',
 resizeMode: 'contain',
 },
 title: {
 fontSize: 28,
 fontWeight: '700',
 color: '#111111',
 marginTop: 4,
 marginBottom: 24,
 letterSpacing: -0.005,
 },
 formContainer: {
 width: '100%',
 maxWidth: 400,
 alignItems: 'center',
 },
 // ── Header area: fixed height to prevent layout shift ──
 headerArea: {
 width: '100%',
 height: ARC_HEIGHT + 16,
 justifyContent: 'flex-end',
 alignItems: 'center',
 },
 // ── Arc icons (matches web arc layout) ──
 arcContainer: {
 width: '100%',
 position: 'relative',
 },
 arcBtn: {
 position: 'absolute',
 width: BTN_SIZE,
 height: BTN_SIZE,
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: 'transparent',
 },
 // ── Password step header (matches web) ──
 pwdHeader: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 8,
 },
 backBtn: {
 width: 32,
 height: 32,
 alignItems: 'center',
 justifyContent: 'center',
 },
 pwdSeparator: {
 fontSize: 13,
 color: '#999',
 },
 pwdEmail: {
 fontSize: 13,
 color: '#6B6B6B',
 maxWidth: 200,
 },
 // ── Status area: fixed height for error/loading ──
 statusArea: {
 height: 32,
 justifyContent: 'center',
 alignItems: 'center',
 marginTop: 8,
 },
 errorText: {
 fontSize: 13,
 color: '#ff3b30',
 textAlign: 'center',
 },
 loadingContainer: {
 alignItems: 'center',
 justifyContent: 'center',
 },
 // ── Toggle login/signup (matches web) ──
 toggleRow: {
 flexDirection: 'row',
 justifyContent: 'center',
 alignItems: 'center',
 marginTop: 8,
 },
 toggleText: {
 fontSize: 13,
 color: '#6B6B6B',
 },
 toggleLink: {
 fontSize: 13,
 color: '#FF7A59',
 fontWeight: '500',
 },
 // ── Agreement ──
 agreement: {
 marginTop: 24,
 alignSelf: 'center',
 flexDirection: 'row',
 alignItems: 'center',
 gap: 8,
 },
 checkbox: {
 width: 16,
 height: 16,
 borderRadius: 4,
 borderWidth: 1.5,
 borderColor: colors.border,
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
 flexShrink: 1,
 fontSize: 12,
 color: colors.muted,
 lineHeight: 18,
 },
 agreementLink: {
 color: colors.primary,
 fontWeight: '500',
 },
 // ── Modal styles ──
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
 justifyContent: 'center',...shadows.btn,
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
