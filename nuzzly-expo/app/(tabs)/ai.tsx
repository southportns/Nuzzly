import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';
import { api } from '../../src/lib/api';
import { ssePost } from '../../src/lib/sse';
import { compressImage } from '../../src/lib/image';
import { useAuth } from '../../src/hooks/useAuth';
import { usePets, Pet } from '../../src/hooks/usePets';
import { useNotifications } from '../../src/hooks/useNotifications';
import QiuqiuModel from '../../src/components/QiuqiuModel';
import MarkdownText from '../../src/components/MarkdownText';
import { colors, spacing, radius, sizes, typography, shadows } from '../../src/theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

const TABS = [
  { value: 'chat', label: '自由问答' },
  { value: 'recommend', label: '智能推荐' },
  { value: 'ingredients', label: '成分分析' },
  { value: 'compare', label: '产品对比' },
];

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

const CHAT_SUGGESTIONS = [
  '5岁布偶猫，肠胃敏感，应该选什么猫粮？',
  '如何判断猫粮蛋白质来源是否优质？',
  '渴望六种鱼和爱肯拿农场盛宴哪个好？',
  '无谷猫粮真的比有谷猫粮好吗？',
];

const CHAT_HISTORY_LS_KEY = 'nuzzly_chat_history_v1';

interface RecommendResult {
  summary: string;
  pet_context?: {
    breed: string;
    age: string;
    stomach_health?: string;
  };
  recommendations: {
    product: { id: string; name: string; brand: string; price_max?: number };
    score: number;
    explanation?: string;
    dimensions: Record<string, number>;
  }[];
  warnings?: {
    product: { id: string; name: string; brand: string };
    reason: string;
  }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryItem {
  id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  local_only?: boolean;
}

function stomachLabel(v?: string) {
  return v === 'sensitive' ? '敏感' : v === 'very_sensitive' ? '极易敏感' : '正常';
}

function scoreColor(s: number) {
  const pct = Math.round(s * 100);
  return pct >= 80 ? '#34C759' : pct >= 60 ? colors.warning : colors.danger;
}

function dimLabel(k: string) {
  const map: Record<string, string> = {
    overall_rating: '评分',
    stomach_match: '肠胃匹配',
    stool_safety: '软便安全',
    long_term_stability: '长期稳定',
    repurchase_rate: '复购率',
    breed_match: '品种适配',
  };
  return map[k] || k;
}

function formatHistoryTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function readLocalChatHistory(): Promise<ChatHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeLocalChatHistory(items: ChatHistoryItem[]) {
  try {
    await AsyncStorage.setItem(CHAT_HISTORY_LS_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {}
}

async function addLocalChatHistory(userMessage: string, aiResponse: string) {
  if (!userMessage?.trim() || !aiResponse?.trim()) return;
  const items = await readLocalChatHistory();
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  items.unshift({
    id,
    user_message: userMessage.trim(),
    ai_response: aiResponse.trim(),
    created_at: new Date().toISOString(),
    local_only: true,
  });
  await writeLocalChatHistory(items);
}

async function removeLocalChatHistory(id: string) {
  const items = (await readLocalChatHistory()).filter((x) => x.id !== id);
  await writeLocalChatHistory(items);
}

function mergeChatHistory(remoteItems: ChatHistoryItem[] = [], localItems: ChatHistoryItem[] = []) {
  const map = new Map<string, ChatHistoryItem>();
  remoteItems.forEach((x) => { if (x.id && x.user_message?.trim()) map.set(x.id, x); });
  localItems.forEach((x) => {
    if (!x.user_message?.trim()) return;
    const dup = remoteItems.find(
      (r) =>
        r.user_message?.trim() === x.user_message.trim() &&
        Math.abs(new Date(r.created_at).getTime() - new Date(x.created_at).getTime()) < 5 * 60 * 1000
    );
    if (!dup && !map.has(x.id)) map.set(x.id, x);
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function AIHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { pets, fetchPets } = usePets();
  const { unreadCount, fetchNotifications } = useNotifications();

  const userAvatar = profile?.avatar_url || require('../../assets/images/mqpyqgao-logo.png');

  const [tab, setTab] = useState('chat');
  const [loadingPets, setLoadingPets] = useState(true);

  // recommend
  const [selectedPetId, setSelectedPetId] = useState('');
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [recommendQuery, setRecommendQuery] = useState('');
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendResult, setRecommendResult] = useState<RecommendResult | null>(null);
  const [recommendError, setRecommendError] = useState('');

  // ingredients
  const [ingredientMode, setIngredientMode] = useState<'text' | 'image'>('text');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientImage, setIngredientImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [ingredientImagePreview, setIngredientImagePreview] = useState('');
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [ingredientResult, setIngredientResult] = useState('');
  const [ingredientError, setIngredientError] = useState('');

  // compare
  const [compareProducts, setCompareProducts] = useState(['', '']);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState('');
  const [compareError, setCompareError] = useState('');
  const [searchOpenIdx, setSearchOpenIdx] = useState(-1);
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; brand: string }[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [chatHistoryItems, setChatHistoryItems] = useState<ChatHistoryItem[]>([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  useEffect(() => {
    (async () => {
      await Promise.all([fetchPets(), fetchNotifications()]);
      setLoadingPets(false);
    })();
  }, [fetchPets, fetchNotifications]);

  useEffect(() => {
    if (!loadingPets && pets.length && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [loadingPets, pets, selectedPetId]);

  // scroll to bottom on chat update
  useEffect(() => {
    if (chatFullscreen && chatMessages.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [chatMessages, chatFullscreen]);

  // recommend handlers
  const handleRecommend = useCallback(async () => {
    if (!selectedPetId) return;
    setRecommendLoading(true);
    setRecommendError('');
    setRecommendResult(null);
    try {
      const data = await api('/api/ai/recommend', {
        method: 'POST',
        body: JSON.stringify({ petId: selectedPetId, query: recommendQuery }),
      });
      if (data.error) throw new Error(data.error);
      setRecommendResult(data as RecommendResult);
    } catch (e: any) {
      setRecommendError(e.message || '推荐失败');
    } finally {
      setRecommendLoading(false);
    }
  }, [selectedPetId, recommendQuery]);

  // ingredients handlers
  const handleAnalyze = useCallback(async () => {
    if (!ingredientInput.trim()) return;
    setIngredientLoading(true);
    setIngredientError('');
    setIngredientResult('');
    const prompt = `请分析以下猫粮成分表，给出每个成分的风险等级、主要蛋白来源、适合的猫咪品种，以及整体评价：\n\n${ingredientInput}`;
    await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
      loopGuard: true,
      onDelta: (_t, full) => setIngredientResult(full),
      onDone: (full) => setIngredientResult(full || '分析完成'),
      onError: (e) => setIngredientError(e.message || '分析失败'),
    });
    setIngredientLoading(false);
  }, [ingredientInput]);

  const triggerImageUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIngredientImage({ uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' });
      setIngredientImagePreview(asset.uri);
      setIngredientResult('');
    }
  }, []);

  const removeIngredientImage = useCallback(() => {
    setIngredientImage(null);
    setIngredientImagePreview('');
  }, []);

  const handleImageAnalyze = useCallback(async () => {
    if (!ingredientImage) return;
    setIngredientLoading(true);
    setIngredientError('');
    setIngredientResult('');
    try {
      const dataUrl = await compressImage(ingredientImage.uri, 1280, 0.85);
      const pet = selectedPet;
      const body: any = { image: dataUrl };
      if (pet) {
        body.petId = pet.id;
        body.petContext = {
          name: pet.name,
          breed: pet.breed,
          species: pet.species,
          stomach_health: pet.stomach_health,
        };
      }
      await ssePost('/api/ai/ingredient-vision', body, {
        loopGuard: true,
        onDelta: (_t, full) => setIngredientResult(full),
        onDone: (full) => setIngredientResult(full || '分析完成'),
        onError: (e) => setIngredientError(e.message || '图片识别失败'),
      });
    } catch (e: any) {
      setIngredientError(e.message || '图片识别失败');
    } finally {
      setIngredientLoading(false);
    }
  }, [ingredientImage, selectedPet]);

  // compare handlers
  const addProduct = useCallback(() => {
    setCompareProducts((prev) => (prev.length < 4 ? [...prev, ''] : prev));
  }, []);

  const removeProduct = useCallback((i: number) => {
    setCompareProducts((prev) => {
      const next = [...prev];
      next.splice(i, 1);
      return next;
    });
    if (searchOpenIdx === i) {
      setSearchOpenIdx(-1);
      setSearchResults([]);
    }
  }, [searchOpenIdx]);

  const openProductSearch = useCallback((i: number) => {
    setSearchOpenIdx(i);
    if (compareProducts[i].trim()) {
      // trigger search immediately
      const q = compareProducts[i].trim();
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const { data } = await supabase
            .from('products')
            .select('id, name, brand')
            .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
            .limit(6);
          setSearchResults((data || []) as { id: string; name: string; brand: string }[]);
        } catch {
          setSearchResults([]);
        }
      }, 300);
    }
  }, [compareProducts]);

  const onCompareSearch = useCallback((i: number, text: string) => {
    const next = [...compareProducts];
    next[i] = text;
    setCompareProducts(next);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = text.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, brand')
          .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
          .limit(6);
        setSearchResults((data || []) as { id: string; name: string; brand: string }[]);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, [compareProducts]);

  const pickCompareProduct = useCallback((i: number, item: { id: string; name: string; brand: string }) => {
    const next = [...compareProducts];
    next[i] = `${item.brand} ${item.name}`;
    setCompareProducts(next);
    setSearchOpenIdx(-1);
    setSearchResults([]);
  }, [compareProducts]);

  const handleCompare = useCallback(async () => {
    const valid = compareProducts.filter((p) => p.trim());
    if (valid.length < 2) return;
    setCompareLoading(true);
    setCompareError('');
    setCompareResult('');
    const prompt = `请对比以下猫粮产品，从适口性、软便率、复购率、价格、成分优劣、适合品种等维度进行详细对比分析：\n\n${valid.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
    await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
      onDelta: (_t, full) => setCompareResult(full),
      onDone: (full) => setCompareResult(full || '对比分析完成'),
      onError: (e) => setCompareError(e.message || '对比失败'),
    });
    setCompareLoading(false);
  }, [compareProducts]);

  // chat handlers
  const closeChatFullscreen = useCallback(() => {
    setChatFullscreen(false);
    setChatHistoryOpen(false);
  }, []);

  const startNewChat = useCallback(() => {
    setChatMessages([]);
    setChatInput('');
  }, []);

  const openChatHistory = useCallback(async () => {
    setChatHistoryOpen(true);
    setChatHistoryLoading(true);
    try {
      const res = await api('/api/ai/chat/history');
      const remoteItems = (res?.sessions || []) as ChatHistoryItem[];
      const localItems = await readLocalChatHistory();
      setChatHistoryItems(mergeChatHistory(remoteItems, localItems));
    } catch (e) {
      setChatHistoryItems(await readLocalChatHistory());
    } finally {
      setChatHistoryLoading(false);
    }
  }, []);

  const loadHistoryItem = useCallback((item: ChatHistoryItem) => {
    setChatMessages([
      { role: 'user', content: item.user_message || '' },
      { role: 'assistant', content: item.ai_response || '' },
    ]);
    setChatHistoryOpen(false);
  }, []);

  const deleteHistoryItem = useCallback(async (id: string) => {
    if (String(id).startsWith('local_')) {
      await removeLocalChatHistory(id);
      setChatHistoryItems((prev) => prev.filter((x) => x.id !== id));
      return;
    }
    try {
      await api('/api/ai/chat/history', { method: 'DELETE', body: JSON.stringify({ id }) });
      setChatHistoryItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.warn('[chat history] delete failed', e);
    }
  }, []);

  const sendChatMessage = useCallback(async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '' }]);
    setChatLoading(true);

    const history = chatMessages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({ role: m.role, content: m.content }));

    await ssePost('/api/ai/chat', { messages: [...history, { role: 'user', content: msg }] }, {
      onDelta: (_t, full) => {
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: full };
          return next;
        });
      },
      onDone: (full) => {
        const content = full || '收到，让我想想…';
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content };
          return next;
        });
        addLocalChatHistory(msg, content);
      },
      onError: () => {
        const content = '连接失败，请稍后重试。';
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content };
          return next;
        });
        addLocalChatHistory(msg, content);
      },
    });

    setChatLoading(false);
  }, [chatInput, chatLoading, chatMessages]);

  const openChatFullscreen = async (initialText?: string) => {
    setChatFullscreen(true);
    if (initialText) {
      setChatInput(initialText);
      await sendChatMessage(initialText);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />
      </View>
      <TouchableOpacity style={styles.actionCircle} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
        <Ionicons name="notifications-outline" size={18} color={colors.fg} />
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMayorCard = () => (
    <View style={styles.mayorCard}>
      <View style={styles.mayorLeft}>
        <View style={styles.mayorNameRow}>
          <Text style={styles.mayorName}>球球</Text>
          <View style={styles.mayorStatus}>
            <View style={styles.mayorStatusDot} />
            <Text style={styles.mayorStatusText}>在线 · 随时为你服务</Text>
          </View>
        </View>
        <Text style={styles.mayorDesc}>基于社区真实数据{'\n'}提供个性化推荐与分析</Text>
      </View>
      <View style={styles.mayorRight}>
        <View style={styles.globeContainer}>
          <QiuqiuModel />
        </View>
      </View>
    </View>
  );

  const renderSegBar = () => (
    <View style={styles.segBar}>
      {TABS.map((t) => (
        <TouchableOpacity
          key={t.value}
          style={[styles.segItem, tab === t.value && styles.segItemActive]}
          onPress={() => setTab(t.value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.segItemText, tab === t.value && styles.segItemTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecommendTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI 智能产品推荐</Text>
        <Text style={styles.cardDesc}>基于社区真实长期反馈数据，为你的宠物精准匹配最适合的产品</Text>

        {loadingPets ? (
          <View style={styles.skeletonLine} />
        ) : pets.length === 0 ? (
          <Text style={styles.emptyHint}>
            还没有宠物档案，请先 <Text style={styles.link} onPress={() => router.push('/pet/create')}>添加宠物</Text>
          </Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>选择宠物</Text>
              <TouchableOpacity style={styles.customSelect} onPress={() => setShowPetPicker((v) => !v)} activeOpacity={0.8}>
                {selectedPet ? (
                  <Text style={styles.selectValue} numberOfLines={1}>
                    {selectedPet.name} · {selectedPet.breed || '未知品种'}
                    {selectedPet.stomach_health === 'sensitive' ? ' · 肠胃敏感' : ''}
                  </Text>
                ) : (
                  <Text style={styles.selectPlaceholder}>选择要推荐的宠物…</Text>
                )}
                <Ionicons name={showPetPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
              </TouchableOpacity>
              {showPetPicker && (
                <View style={styles.dropdownMenu}>
                  {pets.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.dropdownItem, selectedPetId === p.id && styles.dropdownItemActive]}
                      onPress={() => { setSelectedPetId(p.id); setShowPetPicker(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.ddEmoji}>
                        <Text style={styles.ddEmojiText}>{SPECIES_EMOJI[p.species] || '🐾'}</Text>
                      </View>
                      <View style={styles.ddInfo}>
                        <Text style={styles.ddName}>{p.name}</Text>
                        <Text style={styles.ddMeta}>
                          {p.breed || '未知品种'}{p.stomach_health === 'sensitive' ? ' · 肠胃敏感' : ''}
                        </Text>
                      </View>
                      {selectedPetId === p.id && <Text style={styles.ddCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>具体需求或症状（可选）</Text>
              <TextInput
                value={recommendQuery}
                onChangeText={setRecommendQuery}
                placeholder="例如：布偶猫长期软便、低敏幼猫粮…"
                placeholderTextColor={colors.muted}
                style={styles.fieldInput}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, (!selectedPetId || recommendLoading) && styles.submitBtnDisabled]}
              disabled={!selectedPetId || recommendLoading}
              onPress={handleRecommend}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>{recommendLoading ? '正在分析…' : '获取智能推荐'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {recommendError ? <Text style={styles.errorCard}>{recommendError}</Text> : null}

      {recommendResult && (
        <View style={styles.resultArea}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>分析结果</Text>
            <Text style={styles.summaryText}>{recommendResult.summary}</Text>
          </View>
          {recommendResult.pet_context && (
            <View style={styles.contextTags}>
              <Text style={styles.ctxTag}>品种：{recommendResult.pet_context.breed}</Text>
              <Text style={styles.ctxTag}>年龄：{recommendResult.pet_context.age}</Text>
              <Text style={[styles.ctxTag, (recommendResult.pet_context.stomach_health === 'sensitive' || recommendResult.pet_context.stomach_health === 'very_sensitive') && styles.ctxTagWarn]}>
                肠胃：{stomachLabel(recommendResult.pet_context.stomach_health)}
              </Text>
            </View>
          )}
          {recommendResult.recommendations.map((r, i) => (
            <View key={r.product.id} style={styles.recCard}>
              <Text style={styles.recRank}>#{i + 1}</Text>
              <View style={styles.recBody}>
                <Text style={styles.recName} numberOfLines={1}>{r.product.name}</Text>
                <Text style={styles.recBrand}>{r.product.brand}</Text>
                {!!r.product.price_max && <Text style={styles.recPrice}>¥{r.product.price_max}</Text>}
                <Text style={[styles.recScore, { color: scoreColor(r.score) }]}>{Math.round(r.score * 100)}分</Text>
                {r.explanation ? <Text style={styles.recReason}>{r.explanation}</Text> : null}
                <View style={styles.recDims}>
                  {Object.entries(r.dimensions).map(([k, v]) => (
                    <Text key={k} style={styles.dimChip}>{dimLabel(k)} {Math.round(v * 100)}%</Text>
                  ))}
                </View>
              </View>
            </View>
          ))}
          {recommendResult.warnings && recommendResult.warnings.length > 0 && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ 风险提示</Text>
              {recommendResult.warnings.map((w) => (
                <View key={w.product.id} style={styles.warningItem}>
                  <Text style={styles.warningItemText}>{w.product.brand} {w.product.name}</Text>
                  <Text style={styles.warningReason}>{w.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderIngredientsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>成分分析</Text>
        <Text style={styles.cardDesc}>上传成分表图片或粘贴文字，AI 将自动分析风险等级和适配性</Text>

        <View style={styles.inputModeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, ingredientMode === 'text' && styles.modeBtnActive]}
            onPress={() => setIngredientMode('text')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color={ingredientMode === 'text' ? colors.primary : colors.muted} />
            <Text style={[styles.modeBtnText, ingredientMode === 'text' && styles.modeBtnTextActive]}>文字输入</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, ingredientMode === 'image' && styles.modeBtnActive]}
            onPress={() => setIngredientMode('image')}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={16} color={ingredientMode === 'image' ? colors.primary : colors.muted} />
            <Text style={[styles.modeBtnText, ingredientMode === 'image' && styles.modeBtnTextActive]}>图片识别</Text>
          </TouchableOpacity>
        </View>

        {ingredientMode === 'text' ? (
          <>
            <TextInput
              value={ingredientInput}
              onChangeText={setIngredientInput}
              placeholder="例如：鸡肉粉、鱼肉、玉米、糙米、鸡脂肪、啤酒酵母…"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={5}
              style={styles.fieldTextarea}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitBtn, (!ingredientInput.trim() || ingredientLoading) && styles.submitBtnDisabled]}
              disabled={!ingredientInput.trim() || ingredientLoading}
              onPress={handleAnalyze}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>{ingredientLoading ? '分析中…' : '开始分析'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.imageUploadArea}>
            {!ingredientImagePreview ? (
              <TouchableOpacity style={styles.uploadDropzone} onPress={triggerImageUpload} activeOpacity={0.8}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.uploadText}>点击上传成分表图片</Text>
                <Text style={styles.uploadHint}>支持 JPG、PNG 格式，建议清晰拍摄</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: ingredientImagePreview }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={removeIngredientImage} activeOpacity={0.8}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, (!ingredientImage || ingredientLoading) && styles.submitBtnDisabled]}
              disabled={!ingredientImage || ingredientLoading}
              onPress={handleImageAnalyze}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>{ingredientLoading ? '识别分析中…' : '图片识别分析'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {ingredientError ? <Text style={styles.errorCard}>{ingredientError}</Text> : null}
      {ingredientResult ? (
        <View style={[styles.card, styles.resultCard]}>
          <Text style={styles.resultLabel}>AI 分析摘要</Text>
          <MarkdownText content={ingredientResult} />
        </View>
      ) : null}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>使用示例</Text>
        <Text style={styles.tipItem}>• 上传猫粮包装背面的成分表图片</Text>
        <Text style={styles.tipItem}>• 或直接粘贴成分表文字内容</Text>
        <Text style={styles.tipItem}>• AI 会识别主要蛋白来源、填充物、添加剂等</Text>
        <Text style={styles.tipItem}>• 给出风险评估和品种适配建议</Text>
      </View>
    </View>
  );

  const renderCompareTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>产品对比</Text>
        <Text style={styles.cardDesc}>从数据库选取或手动输入 2-4 款产品，AI 将多维度对比分析</Text>
        <View style={styles.compareList}>
          {compareProducts.map((p, i) => (
            <View key={i} style={styles.compareRow}>
              <Text style={styles.compareNum}>{i + 1}</Text>
              <View style={styles.compareInputWrap}>
                <TextInput
                  value={p}
                  onChangeText={(text) => onCompareSearch(i, text)}
                  onFocus={() => openProductSearch(i)}
                  placeholder="搜索或输入产品名称…"
                  placeholderTextColor={colors.muted}
                  style={[styles.fieldInput, styles.compareInput]}
                />
                {searchOpenIdx === i && searchResults.length > 0 && (
                  <View style={styles.compareDropdown}>
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.compareDdItem}
                        onPress={() => pickCompareProduct(i, item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.compareDdName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.compareDdBrand}>{item.brand}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              {compareProducts.length > 2 && (
                <TouchableOpacity style={styles.compareDel} onPress={() => removeProduct(i)} activeOpacity={0.7}>
                  <Text style={styles.compareDelText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        {compareProducts.length < 4 && (
          <TouchableOpacity style={styles.addBtn} onPress={addProduct} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ 添加产品</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (compareProducts.filter((p) => p.trim()).length < 2 || compareLoading) && styles.submitBtnDisabled]}
          disabled={compareProducts.filter((p) => p.trim()).length < 2 || compareLoading}
          onPress={handleCompare}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>{compareLoading ? '对比中…' : '开始对比'}</Text>
        </TouchableOpacity>
      </View>

      {compareError ? <Text style={styles.errorCard}>{compareError}</Text> : null}
      {compareResult ? (
        <View style={[styles.card, styles.resultCard]}>
          <MarkdownText content={compareResult} />
        </View>
      ) : null}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>对比维度</Text>
        <View style={styles.tipGrid}>
          <Text style={styles.tipGridItem}>• 适口性评分</Text>
          <Text style={styles.tipGridItem}>• 软便反馈率</Text>
          <Text style={styles.tipGridItem}>• 复购率</Text>
          <Text style={styles.tipGridItem}>• 成分优劣</Text>
          <Text style={styles.tipGridItem}>• 价格区间</Text>
          <Text style={styles.tipGridItem}>• 适合品种</Text>
        </View>
      </View>
    </View>
  );

  const renderChatWelcome = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, styles.chatCard]}>
        <View style={styles.chatWelcome}>
          <View style={styles.chatWelcomeIcon}>
            <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.chatWelcomeIconImg} />
          </View>
          <Text style={styles.chatWelcomeTitle}>AI 宠物营养助手</Text>
          <Text style={styles.chatWelcomeDesc}>基于毛球镇村民们真实长期反馈数据，为你的毛球提供个性化推荐与分析</Text>
          <View style={styles.chatSuggestions}>
            {CHAT_SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => openChatFullscreen(s)} activeOpacity={0.8}>
                <Text style={styles.suggestionChipText} numberOfLines={1}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.chatInputBarPreview} onPress={() => openChatFullscreen()} activeOpacity={0.9}>
            <View style={[styles.chatInput, styles.chatInputFake]}>
              <Text style={styles.chatInputFakeText} numberOfLines={1}>问我任何关于宠物食品的问题…</Text>
            </View>
            <View style={styles.chatSend}>
              <Ionicons name="send" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFullscreenChat = () => (
    <Modal visible={chatFullscreen} animationType="slide" transparent={false} onRequestClose={closeChatFullscreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatFullscreen}>
        <View style={[styles.chatFsBrandHeader, { paddingTop: insets.top }]}>
          <View style={styles.avatar}>
            <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />
          </View>
        </View>
        <View style={styles.chatFsHeader}>
          <TouchableOpacity style={styles.chatFsIconBtn} onPress={closeChatFullscreen} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.fg} />
          </TouchableOpacity>
          <View style={styles.chatFsTitle}>
            <Text style={styles.chatFsTitleMain}>球球</Text>
            <View style={styles.chatFsStatus}>
              <View style={styles.chatFsStatusDot} />
              <Text style={styles.chatFsStatusText}>在线</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.chatFsIconBtn} onPress={openChatHistory} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={20} color={colors.fg} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatFsIconBtn} onPress={startNewChat} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={colors.fg} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={chatScrollRef}
          style={styles.chatFsMessages}
          contentContainerStyle={styles.chatFsMessagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.length === 0 ? (
            <View style={styles.chatFsEmpty}>
              <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.chatFsEmptyAvatar} />
              <Text style={styles.chatFsEmptyTitle}>你好，我是球球</Text>
              <Text style={styles.chatFsEmptyDesc}>基于社区真实长期反馈数据，为你的毛球提供个性化推荐与分析</Text>
            </View>
          ) : (
            chatMessages.map((m, i) => (
              <View key={i} style={[styles.chatRow, m.role === 'user' && styles.chatRowUser]}>
                {m.role === 'assistant' && <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={[styles.chatAvatar, styles.chatAvatarAi]} />}
                <View style={[styles.chatBubble, m.role === 'assistant' ? styles.chatBubbleAssistant : styles.chatBubbleUser]}>
                  {m.role === 'assistant' && !m.content && chatLoading ? (
                    <View style={styles.thinkingIndicator}>
                      <Ionicons name="paw" size={14} color={colors.primary} />
                      <Text style={styles.thinkingText}>球球正在思考中</Text>
                      <View style={styles.thinkingDots}>
                        <View style={styles.thinkingDot} />
                        <View style={[styles.thinkingDot, styles.thinkingDotDelay1]} />
                        <View style={[styles.thinkingDot, styles.thinkingDotDelay2]} />
                      </View>
                    </View>
                  ) : m.role === 'assistant' ? (
                    <MarkdownText content={m.content} />
                  ) : (
                    <Text style={styles.chatUserText}>{m.content}</Text>
                  )}
                </View>
                {m.role === 'user' && (
                  <Image source={typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar} style={[styles.chatAvatar, styles.chatAvatarUser]} />
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.chatFsInputBar}>
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="问我任何关于宠物食品的问题…"
            placeholderTextColor={colors.muted}
            style={styles.chatFsInput}
            returnKeyType="send"
            onSubmitEditing={() => sendChatMessage()}
          />
          <TouchableOpacity
            style={[styles.chatFsSend, (!chatInput.trim() || chatLoading) && styles.chatFsSendDisabled]}
            disabled={!chatInput.trim() || chatLoading}
            onPress={() => sendChatMessage()}
            activeOpacity={0.8}
          >
            {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

        {chatHistoryOpen && (
          <>
            <Pressable style={styles.chatHistoryBackdrop} onPress={() => setChatHistoryOpen(false)} />
            <View style={[styles.chatHistoryPopover, { top: insets.top + 96 }]}>
              <View style={styles.chatHistoryHeader}>
                <Text style={styles.chatHistoryHeaderText}>历史记录</Text>
                <TouchableOpacity style={styles.chatHistoryClose} onPress={() => setChatHistoryOpen(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={14} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.chatHistoryList}>
                {chatHistoryLoading ? (
                  <Text style={styles.chatHistoryEmpty}>加载中…</Text>
                ) : chatHistoryItems.length === 0 ? (
                  <Text style={styles.chatHistoryEmpty}>暂无历史记录</Text>
                ) : (
                  chatHistoryItems.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.chatHistoryItem} onPress={() => loadHistoryItem(item)} activeOpacity={0.7}>
                      <Text style={styles.chatHistoryQ} numberOfLines={2}>{item.user_message}</Text>
                      <Text style={styles.chatHistoryTime}>{formatHistoryTime(item.created_at)}</Text>
                      <TouchableOpacity style={styles.chatHistoryDel} onPress={() => deleteHistoryItem(item.id)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={13} color="#ccc" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderMayorCard()}
        {renderSegBar()}
        {tab === 'chat' && renderChatWelcome()}
        {tab === 'recommend' && renderRecommendTab()}
        {tab === 'ingredients' && renderIngredientsTab()}
        {tab === 'compare' && renderCompareTab()}
      </ScrollView>
      {renderFullscreenChat()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  actionCircle: {
    width: 41.31,
    height: 41.31,
    borderRadius: 20.65,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  mayorCard: {
    marginHorizontal: spacing.lg,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,122,89,0.06)',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    position: 'relative',
    overflow: 'visible',
  },
  mayorLeft: {
    flex: 1,
    gap: 6,
  },
  mayorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mayorName: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.fg,
  },
  mayorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168,197,160,0.15)',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  mayorStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A8C5A0',
  },
  mayorStatusText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: '#5A8A52',
  },
  mayorDesc: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 20,
  },
  mayorRight: {
    width: '46%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  globeContainer: {
    width: '100%',
    height: '100%',
  },
  segBar: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.lg,
    marginTop: 8,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.md,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  segItemActive: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  segItemText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  segItemTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 18,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  fieldInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: typography.sizes.base,
    backgroundColor: colors.card,
    color: colors.fg,
  },
  fieldTextarea: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: typography.sizes.base,
    backgroundColor: colors.card,
    color: colors.fg,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  customSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  selectValue: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.muted,
  },
  dropdownMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 70,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    zIndex: 50,
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(139,94,70,0.08)',
  },
  ddEmoji: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(215,181,147,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ddEmojiText: {
    fontSize: 18,
  },
  ddInfo: {
    flex: 1,
    gap: 1,
  },
  ddName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  ddMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  ddCheck: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
  submitBtn: {
    width: '100%',
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  skeletonLine: {
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  emptyHint: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontSize: 13,
    color: colors.muted,
  },
  link: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },
  resultArea: {
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,122,89,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,89,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  summaryText: {
    fontSize: 13,
    color: colors.muted,
    marginLeft: 6,
  },
  contextTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  ctxTag: {
    fontSize: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    color: colors.fg,
  },
  ctxTagWarn: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    color: colors.danger,
  },
  recCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  recRank: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    width: 32,
    textAlign: 'center',
  },
  recBody: {
    flex: 1,
    minWidth: 0,
  },
  recName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  recBrand: {
    fontSize: 11,
    color: colors.muted,
  },
  recPrice: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 4,
  },
  recScore: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    marginTop: 4,
  },
  recReason: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  recDims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  dimChip: {
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    color: colors.muted,
  },
  warningCard: {
    backgroundColor: 'rgba(255,149,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.warning,
    marginBottom: 8,
  },
  warningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  warningItemText: {
    fontSize: 12,
    color: colors.fg,
    flex: 1,
  },
  warningReason: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 8,
  },
  resultCard: {
    marginTop: 12,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: 8,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 22,
  },
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tipGridItem: {
    width: '50%',
    fontSize: 12,
    color: colors.muted,
    lineHeight: 22,
  },
  inputModeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(139,94,70,0.08)',
    borderColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  modeBtnTextActive: {
    color: colors.primary,
  },
  imageUploadArea: {
    gap: 12,
  },
  uploadDropzone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,94,70,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 11,
    color: colors.muted,
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareList: {
    gap: 8,
    marginBottom: 8,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,122,89,0.1)',
    color: colors.primary,
    fontSize: 12,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    lineHeight: 24,
  },
  compareInputWrap: {
    flex: 1,
    position: 'relative',
  },
  compareInput: {
    flex: undefined,
    width: '100%',
  },
  compareDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 46,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    zIndex: 50,
    overflow: 'hidden',
  },
  compareDdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  compareDdName: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.fg,
    flex: 1,
    marginRight: 8,
  },
  compareDdBrand: {
    fontSize: 11,
    color: colors.muted,
  },
  compareDel: {
    padding: 4,
  },
  compareDelText: {
    color: colors.muted,
    fontSize: 18,
  },
  addBtn: {
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 13,
  },
  chatCard: {
    flexDirection: 'column',
    padding: 0,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 360,
  },
  chatWelcome: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,
  },
  chatWelcomeIcon: {
    marginBottom: 6,
  },
  chatWelcomeIconImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatWelcomeTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginBottom: 4,
  },
  chatWelcomeDesc: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 12,
  },
  chatSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 2,
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    maxWidth: 240,
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#444',
  },
  chatInputBarPreview: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  chatInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 21,
    paddingHorizontal: 18,
    fontSize: typography.sizes.base,
    backgroundColor: colors.card,
    color: colors.fg,
    ...shadows.sm,
  },
  chatInputFake: {
    justifyContent: 'center',
  },
  chatInputFakeText: {
    color: '#B0B0AE',
  },
  chatSend: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
  },
  chatFullscreen: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  chatFsBrandHeader: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#F7F6F3',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    height: 44,
    justifyContent: 'center',
  },
  chatFsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7F6F3',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  chatFsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFsTitle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFsTitleMain: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  chatFsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  chatFsStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#A8C5A0',
  },
  chatFsStatusText: {
    fontSize: 10,
    color: '#5A8A52',
  },
  chatFsMessages: {
    flex: 1,
  },
  chatFsMessagesContent: {
    paddingVertical: 12,
    gap: 10,
  },
  chatFsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  chatFsEmptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  chatFsEmptyTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginBottom: 6,
  },
  chatFsEmptyDesc: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
  },
  chatRowUser: {
    justifyContent: 'flex-end',
  },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0EFED',
  },
  chatAvatarAi: {
    ...shadows.sm,
    backgroundColor: colors.card,
  },
  chatAvatarUser: {
    ...shadows.sm,
  },
  chatBubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chatBubbleAssistant: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderTopLeftRadius: 6,
  },
  chatBubbleUser: {
    backgroundColor: colors.primary,
  },
  chatUserText: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#fff',
  },
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thinkingText: {
    fontSize: 12.5,
    color: colors.muted,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  thinkingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  thinkingDotDelay1: {
    opacity: 0.6,
  },
  thinkingDotDelay2: {
    opacity: 0.3,
  },
  chatFsInputBar: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7F6F3',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  chatFsInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 21,
    paddingHorizontal: 18,
    fontSize: typography.sizes.base,
    backgroundColor: colors.card,
    color: colors.fg,
  },
  chatFsSend: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
  },
  chatFsSendDisabled: {
    backgroundColor: '#F0EFED',
  },
  chatHistoryBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 214,
  },
  chatHistoryPopover: {
    position: 'absolute',
    right: 12,
    width: Math.min(280, screenWidth - 24),
    maxHeight: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    ...shadows.md,
    zIndex: 215,
    overflow: 'hidden',
  },
  chatHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  chatHistoryHeaderText: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  chatHistoryClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHistoryList: {
    flex: 1,
    padding: 6,
  },
  chatHistoryEmpty: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    paddingVertical: 32,
  },
  chatHistoryItem: {
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  chatHistoryQ: {
    fontSize: 12.5,
    color: colors.fg,
    lineHeight: 20,
    paddingRight: 22,
  },
  chatHistoryTime: {
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 4,
  },
  chatHistoryDel: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
