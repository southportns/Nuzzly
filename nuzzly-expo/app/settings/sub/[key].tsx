import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, shadows, typography, sizes } from '../../../src/theme/tokens';
import PageHeader from '../../../src/components/PageHeader';
import FormField from '../../../src/components/FormField';
import ChipGroup from '../../../src/components/ChipGroup';
import ToastContainer from '../../../src/components/ToastContainer';
import { useToast } from '../../../src/hooks/useToast';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePets, Pet } from '../../../src/hooks/usePets';
import { useAuthStore } from '../../../src/stores/authStore';
import { supabase } from '../../../src/lib/supabase';
import { writeGateway } from '../../../src/lib/gateway';
import { ChevronRightIcon, AlertTriangleIcon } from '../../../src/components/Icons';

type SettingKey =
  | 'account'
  | 'pets'
  | 'membership'
  | 'language'
  | 'fontsize'
  | 'notification'
  | 'general'
  | 'privacy'
  | 'content'
  | 'interaction'
  | 'about'
  | 'feedback';

const TITLE_MAP: Record<SettingKey, string> = {
  account: '账号与安全',
  pets: '宠物档案',
  membership: '会员',
  language: '语言',
  fontsize: '文字大小',
  notification: '通知',
  general: '通用',
  privacy: '隐私',
  content: '我的内容',
  interaction: '互动设置',
  about: '关于我们',
  feedback: '帮助与反馈',
};

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const FEEDBACK_TYPES = ['功能建议', '问题反馈', '体验问题', '其他'];

const STORAGE_KEYS = {
  notif: 'nuzzly_notif',
  lang: 'nuzzly_lang',
  fontsize: 'nuzzly_fontsize',
  general: 'nuzzly_general',
  privacy: 'nuzzly_privacy',
  interaction: 'nuzzly_interaction',
  feedback: 'nuzzly_feedback',
};

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) || fallback : fallback;
  } catch {
    return fallback;
  }
}

async function saveJson(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function SettingsSubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const settingKey = (key || '') as SettingKey;
  const title = TITLE_MAP[settingKey] || '设置';

  const { session } = useAuth();
  const { pets, fetchPets } = usePets();
  const signOut = useAuthStore((s) => s.signOut);
  const { toasts, show } = useToast();

  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [feedbackForm, setFeedbackForm] = useState({ type: '功能建议', content: '', contact: '' });
  const [notif, setNotif] = useState({ push: true, diet: true, vaccine: true, social: false });
  const [lang, setLang] = useState('zh-CN');
  const [fontSize, setFontSize] = useState(14);
  const [general, setGeneral] = useState({ darkMode: false, autoPlay: true, highQuality: true });
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showReviews: true,
    allowRecommend: true,
    shareData: false,
  });
  const [interaction, setInteraction] = useState({
    allowComment: true,
    allowFollow: true,
    likeNotify: true,
    commentNotify: true,
  });

  const userEmail = session?.user?.email || '';

  useEffect(() => {
    const load = async () => {
      if (settingKey === 'pets') fetchPets();
      if (settingKey === 'notification') setNotif(await loadJson(STORAGE_KEYS.notif, notif));
      if (settingKey === 'language') {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.lang);
        setLang(stored || 'zh-CN');
      }
      if (settingKey === 'fontsize') {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.fontsize);
        setFontSize(Number(stored) || 14);
      }
      if (settingKey === 'general') setGeneral(await loadJson(STORAGE_KEYS.general, general));
      if (settingKey === 'privacy') setPrivacy(await loadJson(STORAGE_KEYS.privacy, privacy));
      if (settingKey === 'interaction')
        setInteraction(await loadJson(STORAGE_KEYS.interaction, interaction));
    };
    load();
  }, [settingKey]);

  const updateNotif = (k: keyof typeof notif, v: boolean) => setNotif((p) => ({ ...p, [k]: v }));
  const updateGeneral = (k: keyof typeof general, v: boolean) =>
    setGeneral((p) => ({ ...p, [k]: v }));
  const updatePrivacy = (k: keyof typeof privacy, v: boolean) =>
    setPrivacy((p) => ({ ...p, [k]: v }));
  const updateInteraction = (k: keyof typeof interaction, v: boolean) =>
    setInteraction((p) => ({ ...p, [k]: v }));

  const saveLocal = async (msg: string, value: any, key: string) => {
    await saveJson(key, value);
    show(msg, 'success');
  };

  const handleChangePassword = async () => {
    if (saving) return;
    if (!pwForm.password || pwForm.password.length < 6) {
      show('密码至少 6 位', 'warning');
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      show('两次密码不一致', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.password });
      if (error) throw new Error(error.message);
      show('密码已更新', 'success');
      setPwForm({ password: '', confirm: '' });
    } catch (e: any) {
      show(e.message || '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting || deleteConfirmText !== '注销') return;
    setDeleting(true);
    try {
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr || !data.user) throw new Error('未登录');
      const result = await writeGateway('SOFT_DELETE_PROFILE', { id: data.user.id });
      if (result?.error) throw new Error(result.error);
      await signOut();
      show('账号已注销', 'success');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      router.replace('/login');
    } catch (e: any) {
      show(e.message || '注销失败，请联系客服', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePet = (pet: Pet) => {
    Alert.alert(
      '删除宠物档案',
      `确定要删除「${pet.name}」的档案吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pets')
                .update({ is_active: false })
                .eq('id', pet.id);
              if (error) throw error;
              show('已删除', 'success');
              fetchPets();
            } catch (e: any) {
              show(e.message || '删除失败', 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleFeedback = async () => {
    if (saving) return;
    if (!feedbackForm.content.trim()) {
      show('请填写描述', 'warning');
      return;
    }
    setSaving(true);
    try {
      const list = await loadJson<{ type: string; content: string; contact: string; created_at: string }[]>(
        STORAGE_KEYS.feedback,
        []
      );
      list.push({ ...feedbackForm, created_at: new Date().toISOString() });
      await saveJson(STORAGE_KEYS.feedback, list);
      show('反馈已提交，感谢支持', 'success');
      setFeedbackForm({ type: '功能建议', content: '', contact: '' });
      router.back();
    } catch {
      show('提交失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFontSize = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.fontsize, String(fontSize));
    show('文字大小已保存', 'success');
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nuzzlyKeys = keys.filter((k) => k.startsWith('nuzzly_'));
      await AsyncStorage.multiRemove(nuzzlyKeys);
      show('缓存已清除', 'success');
    } catch {
      show('清除失败', 'error');
    }
  };

  const renderCell = useCallback(
    (label: string, right?: React.ReactNode, onPress?: () => void, isLast = false) => (
      <TouchableOpacity
        key={label}
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
        style={[styles.cell, !isLast && styles.cellBorder]}
        disabled={!onPress}
      >
        <Text style={styles.cellLabel}>{label}</Text>
        {right || null}
      </TouchableOpacity>
    ),
    []
  );

  const renderAccount = () => (
    <View>
      <FormField label="邮箱" type="readonly" value={userEmail || '未登录'} />
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>新密码</Text>
        <TextInput
          value={pwForm.password}
          onChangeText={(v) => setPwForm((p) => ({ ...p, password: v }))}
          placeholder="至少 6 位"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>确认新密码</Text>
        <TextInput
          value={pwForm.confirm}
          onChangeText={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
          placeholder="再次输入"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={handleChangePassword}
        disabled={saving}
      >
        <Text style={styles.primaryBtnText}>{saving ? '更新中' : '更新密码'}</Text>
      </TouchableOpacity>

      <View style={styles.deleteSection}>
        <View style={styles.deleteWarning}>
          <AlertTriangleIcon size={18} color={colors.danger} />
          <Text style={styles.deleteWarningText}>注销账号后，所有数据将被永久删除且无法恢复</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.deleteBtn}
          onPress={() => setShowDeleteConfirm(true)}
        >
          <Text style={styles.deleteBtnText}>注销账号</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>确认注销账号？</Text>
            <Text style={styles.modalDesc}>
              此操作将永久删除您的账号及所有关联数据，包括宠物档案、评价记录、健康数据等，且
              <Text style={{ color: colors.danger, fontWeight: typography.weights.bold }}>无法恢复</Text>
              。
            </Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>
                请输入 <Text style={{ color: colors.fg, fontWeight: typography.weights.bold }}>注销</Text>{' '}
                以确认
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="输入「注销」"
                placeholderTextColor={colors.muted}
                style={styles.modalInput}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modalCancel}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.modalConfirm,
                  (deleteConfirmText !== '注销' || deleting) && styles.modalConfirmDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== '注销' || deleting}
              >
                <Text style={styles.modalConfirmText}>
                  {deleting ? '注销中…' : '确认注销'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderPets = () => (
    <View>
      {pets.length === 0 ? <Text style={styles.emptyHint}>还没有宠物档案</Text> : null}
      {pets.map((p) => (
        <View key={p.id} style={styles.petRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.petRowMain}
            onPress={() => router.push(`/pets/${p.id}` as any)}
          >
            <View style={styles.petEmoji}>
              <Text style={styles.petEmojiText}>{SPECIES_EMOJI[p.species] || '🐾'}</Text>
            </View>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{p.name}</Text>
              <Text style={styles.petMeta}>
                {p.breed || p.species} · {p.age_years || 0}岁{p.age_months || 0}月 ·{' '}
                {p.weight_kg ? Number(p.weight_kg).toFixed(1) : '--'}kg
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={styles.petDelBtn} onPress={() => handleDeletePet(p)}>
            <Text style={styles.petDelBtnText}>删除</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={() => router.push('/pet/create')}>
        <Text style={styles.primaryBtnText}>+ 添加宠物</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAbout = () => (
    <View>
      <View style={[styles.card, styles.centerCard]}>
        <Text style={styles.appLogo}>🐾</Text>
        <Text style={styles.appName}>毛球镇 Nuzzly</Text>
        <Text style={styles.appVersion}>版本 1.0.0</Text>
      </View>
      <View style={styles.card}>
        {renderCell('用户协议', <ChevronRightIcon size={16} color={colors.muted} />)}
        {renderCell('隐私政策', <ChevronRightIcon size={16} color={colors.muted} />)}
        {renderCell('开源许可', <ChevronRightIcon size={16} color={colors.muted} />, undefined, true)}
      </View>
    </View>
  );

  const renderFeedback = () => (
    <View>
      <FormField label="反馈类型" required>
        <ChipGroup
          options={FEEDBACK_TYPES.map((t) => ({ value: t, label: t }))}
          value={feedbackForm.type}
          onChange={(v) => setFeedbackForm((p) => ({ ...p, type: v }))}
        />
      </FormField>
      <FormField
        label="详细描述"
        type="textarea"
        value={feedbackForm.content}
        onChange={(v) => setFeedbackForm((p) => ({ ...p, content: String(v) }))}
        placeholder="请描述您遇到的问题或建议…"
      />
      <FormField
        label="联系方式（可选）"
        type="input"
        value={feedbackForm.contact}
        onChange={(v) => setFeedbackForm((p) => ({ ...p, contact: String(v) }))}
        placeholder="邮箱或手机号"
      />
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={handleFeedback}
        disabled={saving}
      >
        <Text style={styles.primaryBtnText}>{saving ? '提交中' : '提交反馈'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotification = () => (
    <View>
      <View style={styles.card}>
        {renderCell(
          '推送通知',
          <Switch
            value={notif.push}
            onValueChange={(v) => updateNotif('push', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '饮食提醒',
          <Switch
            value={notif.diet}
            onValueChange={(v) => updateNotif('diet', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '疫苗提醒',
          <Switch
            value={notif.vaccine}
            onValueChange={(v) => updateNotif('vaccine', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '社区互动',
          <Switch
            value={notif.social}
            onValueChange={(v) => updateNotif('social', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />,
          undefined,
          true
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={() => saveLocal('通知设置已保存', notif, STORAGE_KEYS.notif)}
      >
        <Text style={styles.primaryBtnText}>保存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMembership = () => (
    <View>
      <View style={styles.membershipCard}>
        <Text style={styles.membershipBadge}>🌟</Text>
        <Text style={styles.membershipTitle}>基础会员</Text>
        <Text style={styles.membershipDesc}>享受所有核心功能</Text>
      </View>
      <View style={styles.card}>
        {renderCell('专属推荐', <Text style={styles.cellValue}>已解锁</Text>)}
        {renderCell('AI 问答', <Text style={styles.cellValue}>已解锁</Text>)}
        {renderCell('长期追踪', <Text style={styles.cellValue}>已解锁</Text>)}
        {renderCell('社区互动', <Text style={styles.cellValue}>已解锁</Text>, undefined, true)}
      </View>
      <Text style={styles.hintText}>更多高级功能即将推出，敬请期待</Text>
    </View>
  );

  const renderLanguage = () => (
    <View>
      <View style={styles.card}>
        {renderCell(
          '简体中文',
          lang === 'zh-CN' ? <Text style={styles.check}>✓</Text> : null,
          () => {
            setLang('zh-CN');
            AsyncStorage.setItem(STORAGE_KEYS.lang, 'zh-CN');
          }
        )}
        {renderCell(
          'English',
          lang === 'en' ? <Text style={styles.check}>✓</Text> : null,
          () => {
            setLang('en');
            AsyncStorage.setItem(STORAGE_KEYS.lang, 'en');
          }
        )}
        {renderCell(
          '日本語',
          lang === 'ja' ? <Text style={styles.check}>✓</Text> : null,
          () => {
            setLang('ja');
            AsyncStorage.setItem(STORAGE_KEYS.lang, 'ja');
          },
          true
        )}
      </View>
      <Text style={styles.hintText}>语言切换将在下次启动时生效</Text>
    </View>
  );

  const renderFontSize = () => (
    <View>
      <View style={[styles.card, styles.fontsizePreview]}>
        <Text style={[styles.fontsizePreviewText, { fontSize }]}>这是预览文字效果</Text>
        <Text style={[styles.fontsizePreviewSmall, { fontSize: 12 }]}>较小的辅助文字</Text>
      </View>
      <View style={styles.fontsizeControl}>
        <Text style={styles.fontsizeLabel}>A</Text>
        {/* @ts-ignore React Native Slider not available; use minimal buttons */}
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => setFontSize((s) => Math.max(12, s - 1))}
          >
            <Text style={styles.sliderBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.fontsizeValue}>{fontSize}px</Text>
          <TouchableOpacity
            style={styles.sliderBtn}
            onPress={() => setFontSize((s) => Math.min(20, s + 1))}
          >
            <Text style={styles.sliderBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.fontsizeLabel, styles.fontsizeLabelBig]}>A</Text>
      </View>
      <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={handleSaveFontSize}>
        <Text style={styles.primaryBtnText}>保存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGeneral = () => (
    <View>
      <View style={styles.card}>
        {renderCell(
          '深色模式',
          <Switch
            value={general.darkMode}
            onValueChange={(v) => updateGeneral('darkMode', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '自动播放视频',
          <Switch
            value={general.autoPlay}
            onValueChange={(v) => updateGeneral('autoPlay', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '图片高质量加载',
          <Switch
            value={general.highQuality}
            onValueChange={(v) => updateGeneral('highQuality', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />,
          undefined,
          true
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={() => saveLocal('通用设置已保存', general, STORAGE_KEYS.general)}
      >
        <Text style={styles.primaryBtnText}>保存</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85} style={styles.dangerBtn} onPress={clearCache}>
        <Text style={styles.dangerBtnText}>清除缓存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPrivacy = () => (
    <View>
      <View style={styles.card}>
        {renderCell(
          '公开我的主页',
          <Switch
            value={privacy.publicProfile}
            onValueChange={(v) => updatePrivacy('publicProfile', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '显示评价记录',
          <Switch
            value={privacy.showReviews}
            onValueChange={(v) => updatePrivacy('showReviews', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '允许推荐算法',
          <Switch
            value={privacy.allowRecommend}
            onValueChange={(v) => updatePrivacy('allowRecommend', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '分享使用数据',
          <Switch
            value={privacy.shareData}
            onValueChange={(v) => updatePrivacy('shareData', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />,
          undefined,
          true
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={() => saveLocal('隐私设置已保存', privacy, STORAGE_KEYS.privacy)}
      >
        <Text style={styles.primaryBtnText}>保存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <View style={styles.card}>
      {renderCell(
        '我的评价',
        <ChevronRightIcon size={16} color={colors.muted} />,
        () => router.push('/followups' as any)
      )}
      {renderCell(
        '长期追踪',
        <ChevronRightIcon size={16} color={colors.muted} />,
        () => router.push('/followups' as any)
      )}
      {renderCell(
        '收藏的产品',
        <ChevronRightIcon size={16} color={colors.muted} />,
        () => router.push('/products'),
        true
      )}
    </View>
  );

  const renderInteraction = () => (
    <View>
      <View style={styles.card}>
        {renderCell(
          '允许评论',
          <Switch
            value={interaction.allowComment}
            onValueChange={(v) => updateInteraction('allowComment', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '允许关注',
          <Switch
            value={interaction.allowFollow}
            onValueChange={(v) => updateInteraction('allowFollow', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '点赞通知',
          <Switch
            value={interaction.likeNotify}
            onValueChange={(v) => updateInteraction('likeNotify', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        )}
        {renderCell(
          '评论通知',
          <Switch
            value={interaction.commentNotify}
            onValueChange={(v) => updateInteraction('commentNotify', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />,
          undefined,
          true
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryBtn}
        onPress={() => saveLocal('互动设置已保存', interaction, STORAGE_KEYS.interaction)}
      >
        <Text style={styles.primaryBtnText}>保存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBody = () => {
    switch (settingKey) {
      case 'account':
        return renderAccount();
      case 'pets':
        return renderPets();
      case 'about':
        return renderAbout();
      case 'feedback':
        return renderFeedback();
      case 'notification':
        return renderNotification();
      case 'membership':
        return renderMembership();
      case 'language':
        return renderLanguage();
      case 'fontsize':
        return renderFontSize();
      case 'general':
        return renderGeneral();
      case 'privacy':
        return renderPrivacy();
      case 'content':
        return renderContent();
      case 'interaction':
        return renderInteraction();
      default:
        return <Text style={styles.emptyHint}>未知设置项</Text>;
    }
  };

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title={title} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>{renderBody()}</View>
      </ScrollView>
      <ToastContainer toasts={toasts} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  centerCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: 6,
  },
  inputGroup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  input: {
    height: sizes.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.fg,
    backgroundColor: colors.bg,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  cellBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cellLabel: {
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  cellValue: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
  },
  check: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  primaryBtn: {
    height: sizes.button,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    color: colors.card,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
  dangerBtn: {
    height: sizes.button,
    borderRadius: radius.btn,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
  deleteSection: {
    marginTop: spacing['3xl'],
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(255,59,48,0.05)',
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  deleteWarningText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.danger,
    lineHeight: 20,
  },
  deleteBtn: {
    height: sizes.button,
    borderRadius: radius.btn,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  modalBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.xl,
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginBottom: spacing.sm,
  },
  modalDesc: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalInputGroup: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  modalInput: {
    width: '100%',
    height: sizes.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.fg,
    backgroundColor: colors.bg,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: radius.btn,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: typography.sizes.md,
    color: colors.fg,
    fontWeight: typography.weights.medium,
  },
  modalConfirm: {
    flex: 1,
    height: 44,
    borderRadius: radius.btn,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.4,
  },
  modalConfirmText: {
    fontSize: typography.sizes.md,
    color: colors.card,
    fontWeight: typography.weights.medium,
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  petRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  petEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petEmojiText: {
    fontSize: 24,
  },
  petInfo: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  petMeta: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  petDelBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petDelBtnText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: typography.sizes.base,
    paddingVertical: spacing.xl,
  },
  appLogo: {
    fontSize: 48,
  },
  appName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginTop: 4,
  },
  appVersion: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
  },
  hintText: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.muted,
    paddingVertical: spacing.lg,
  },
  membershipCard: {
    backgroundColor: colors.primary,
    borderRadius: radius['2xl'],
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  membershipBadge: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  membershipTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.card,
  },
  membershipDesc: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  fontsizePreview: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  fontsizePreviewText: {
    color: colors.fg,
    marginBottom: spacing.sm,
  },
  fontsizePreviewSmall: {
    color: colors.muted,
  },
  fontsizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  fontsizeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    fontWeight: typography.weights.medium,
  },
  fontsizeLabelBig: {
    fontSize: 20,
  },
  sliderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sliderBtnText: {
    fontSize: typography.sizes.lg,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  fontsizeValue: {
    fontSize: typography.sizes.base,
    color: colors.fg,
    fontWeight: typography.weights.medium,
  },
});
