import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
 View,
 Text,
 StyleSheet,
 ScrollView,
 TouchableOpacity,
 TextIn,
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

const TABS = [{ value: 'chat', label: 'Chat' },
 { value: 'recommend', label: 'Smart Recommend' },
 { value: 'ingredients', label: 'Ingredients' },
 { value: 'compare', label: 'Compare' },];

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

const CHAT_SUGGESTIONS = ['5-year-old Ragdoll cat with sensitive stomach, which cat food should I choose?',
 "How to tell if a cat food's protein source is high quality?",
 'Which is better: Orijen Six Fish or Acana Farm Harvest?',
 'Is grain-free cat food really better than grain-inclusive?',];

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
 return v === 'sensitive'? 'Sensitive': v === 'very_sensitive'? 'Very Sensitive': 'Normal';
}

function scoreColor(s: number) {
 const pct = Math.round(s * 100);
 return pct >= 80? '#34C759': pct >= 60? colors.warning: colors.danger;
}

function dimLabel(k: string) {
 const map: Record<string, string> = {
 overall_rating: 'Score',
 stomach_match: 'Stomach Match',
 stool_safety: 'Stool Safety',
 long_term_stability: 'Long-term Stability',
 repurchase_rate: 'Repurchase Rate',
 breed_match: 'Breed Match',
 };
 return map[k] || k;
}

function formatHistoryTime(iso?: string) {
 if (!iso) return '';
 const d = new Date(iso);
 if (isNaN(d.getTime())) return '';
 const now = Date.now();
 const diff = (now - d.getTime()) / 1000;
 if (diff < 60) return 'Just now';
 if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
 if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
 if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
 return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function readLocalChatHistory(): Promise<ChatHistoryItem[]> {
 try {
 const raw = await AsyncStorage.getItem(CHAT_HISTORY_LS_KEY);
 return raw? JSON.parse(raw): [];
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
 if (!userMessage?.trim() ||!aiResponse?.trim()) return;
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
 const items = (await readLocalChatHistory()).filter((x) => x.id!== id);
 await writeLocalChatHistory(items);
}

function mergeChatHistory(remoteItems: ChatHistoryItem[] = [], localItems: ChatHistoryItem[] = []) {
 const map = new Map<string, ChatHistoryItem>();
 remoteItems.forEach((x) => { if (x.id && x.user_message?.trim()) map.set(x.id, x); });
 localItems.forEach((x) => {
 if (!x.user_message?.trim()) return;
 const dup = remoteItems.find((r) =>
 r.user_message?.trim() === x.user_message.trim() &&
 Math.abs(new Date(r.created_at).getTime() - new Date(x.created_at).getTime()) < 5 * 60 * 1000);
 if (!dup &&!map.has(x.id)) map.set(x.id, x);
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
 const [ingredientIn, setIngredientIn] = useState('');
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
 const [chatIn, setChatIn] = useState('');
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
 if (!loadingPets && pets.length &&!selectedPetId) {
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
 setRecommendError(e.message || 'Recommendation Failed');
 } finally {
 setRecommendLoading(false);
 }
 }, [selectedPetId, recommendQuery]);

 // ingredients handlers
 const handleAnalyze = useCallback(async () => {
 if (!ingredientIn.trim()) return;
 setIngredientLoading(true);
 setIngredientError('');
 setIngredientResult('');
 const prompt = `Please analyze the following cat food ingredient list, providing risk level, main protein source, suitable breeds, and overall review for each ingredient:\n\n${ingredientIn}`;
 await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
 loopGuard: true,
 onDelta: (_t, full) => setIngredientResult(full),
 onDone: (full) => setIngredientResult(full || 'Analysis Complete'),
 onError: (e) => setIngredientError(e.message || 'Analysis Failed'),
 });
 setIngredientLoading(false);
 }, [ingredientIn]);

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
 onDone: (full) => setIngredientResult(full || 'Analysis Complete'),
 onError: (e) => setIngredientError(e.message || 'Image Recognition Failed'),
 });
 } catch (e: any) {
 setIngredientError(e.message || 'Image Recognition Failed');
 } finally {
 setIngredientLoading(false);
 }
 }, [ingredientImage, selectedPet]);

 // compare handlers
 const addProduct = useCallback(() => {
 setCompareProducts((prev) => (prev.length < 4? [...prev, '']: prev));
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
 const { data } = await supabase.from('products').select('id, name, brand').or(`name.ilike.%${q}%,brand.ilike.%${q}%`).limit(6);
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
 const { data } = await supabase.from('products').select('id, name, brand').or(`name.ilike.%${q}%,brand.ilike.%${q}%`).limit(6);
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
 const prompt = `Please compare the following cat food products across palatability, stool safety, repurchase rate, price, ingredient quality, and breed suitability:\n\n${valid.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
 await ssePost('/api/ai/chat', { messages: [{ role: 'user', content: prompt }] }, {
 onDelta: (_t, full) => setCompareResult(full),
 onDone: (full) => setCompareResult(full || ' Analysis Complete'),
 onError: (e) => setCompareError(e.message || 'Comparison Failed'),
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
 setChatIn('');
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
 setChatMessages([{ role: 'user', content: item.user_message || '' },
 { role: 'assistant', content: item.ai_response || '' },]);
 setChatHistoryOpen(false);
 }, []);

 const deleteHistoryItem = useCallback(async (id: string) => {
 if (String(id).startsWith('local_')) {
 await removeLocalChatHistory(id);
 setChatHistoryItems((prev) => prev.filter((x) => x.id!== id));
 return;
 }
 try {
 await api('/api/ai/chat/history', { method: 'DELETE', body: JSON.stringify({ id }) });
 setChatHistoryItems((prev) => prev.filter((x) => x.id!== id));
 } catch (e) {
 console.warn('[chat history] delete failed', e);
 }
 }, []);

 const sendChatMessage = useCallback(async (text?: string) => {
 const msg = (text?? chatIn).trim();
 if (!msg || chatLoading) return;
 setChatIn('');
 setChatMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '' }]);
 setChatLoading(true);

 const history = chatMessages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content)).map((m) => ({ role: m.role, content: m.content }));

 await ssePost('/api/ai/chat', { messages: [...history, { role: 'user', content: msg }] }, {
 onDelta: (_t, full) => {
 setChatMessages((prev) => {
 const next = [...prev];
 next[next.length - 1] = { role: 'assistant', content: full };
 return next;
 });
 },
 onDone: (full) => {
 const content = full || 'Got it, let me think...';
 setChatMessages((prev) => {
 const next = [...prev];
 next[next.length - 1] = { role: 'assistant', content };
 return next;
 });
 addLocalChatHistory(msg, content);
 },
 onError: () => {
 const content = 'Connection failed, please try again later.';
 setChatMessages((prev) => {
 const next = [...prev];
 next[next.length - 1] = { role: 'assistant', content };
 return next;
 });
 addLocalChatHistory(msg, content);
 },
 });

 setChatLoading(false);
 }, [chatIn, chatLoading, chatMessages]);

 const openChatFullscreen = async (initialText?: string) => {
 setChatFullscreen(true);
 if (initialText) {
 setChatIn(initialText);
 await sendChatMessage(initialText);
 }
 };

 const renderHeader = () => (<View style={styles.header}>
 <View style={styles.avatar}>
 <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />
 </View>
 <TouchableOpacity style={styles.actionCircle} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
 <Ionicons name="notifications-outline" size={18} color={colors.fg} />
 {unreadCount > 0 && (<View style={styles.notifBadge}>
 <Text style={styles.notifBadgeText}>{unreadCount > 99? '99+': unreadCount}</Text>
 </View>)}
 </TouchableOpacity>
 </View>);

 const renderMayorCard = () => (<View style={styles.mayorCard}>
 <View style={styles.mayorLeft}>
 <View style={styles.mayorNameRow}>
 <Text style={styles.mayorName}>Pomi</Text>
 <View style={styles.mayorStatus}>
 <View style={styles.mayorStatusDot} />
 <Text style={styles.mayorStatusText}>Online · for you</Text>
 </View>
 </View>
 <Text style={styles.mayorDesc}>Powered by real long-term community feedback data{'\n'}providing personalized product recommendations and nutrition analysis for your pet</Text>
 </View>
 <View style={styles.mayorRight}>
 <View style={styles.globeContainer}>
 <QiuqiuModel />
 </View>
 </View>
 </View>);

 const renderSegBar = () => (<View style={styles.segBar}>
 {TABS.map((t) => (<TouchableOpacity
 key={t.value}
 style={[styles.segItem, tab === t.value && styles.segItemActive]}
 onPress={() => setTab(t.value)}
 activeOpacity={0.8}
 >
 <Text style={[styles.segItemText, tab === t.value && styles.segItemTextActive]}>{t.label}</Text>
 </TouchableOpacity>))}
 </View>);

 const renderRecommendTab = () => (<View style={styles.tabContent}>
 <View style={styles.card}>
 <Text style={styles.cardTitle}>AI Smart Product Recommendation</Text>
 <Text style={styles.cardDesc}>Powered by real long-term community feedback data to precisely match the best products for your pet</Text>

 {loadingPets? (<View style={styles.skeletonLine} />): pets.length === 0? (<Text style={styles.emptyHint}>
 No pet profile yet, Please first <Text style={styles.link} onPress={() => router.push('/pet/create')}>Add a Pet</Text>
 </Text>): (<>
 <View style={styles.field}>
 <Text style={styles.fieldLabel}>Select Pet</Text>
 <TouchableOpacity style={styles.customSelect} onPress={() => setShowPetPicker((v) =>!v)} activeOpacity={0.8}>
 {selectedPet? (<Text style={styles.selectValue} numberOfLines={1}>
 {selectedPet.name} · {selectedPet.breed || 'Unknown Breed'}
 {selectedPet.stomach_health === 'sensitive'? ' · Sensitive Stomach': ''}
 </Text>): (<Text style={styles.selectPlaceholder}>Select a pet for recommendations...</Text>)}
 <Ionicons name={showPetPicker? 'chevron-up': 'chevron-down'} size={16} color={colors.muted} />
 </TouchableOpacity>
 {showPetPicker && (<View style={styles.dropdownMenu}>
 {pets.map((p) => (<TouchableOpacity
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
 {p.breed || 'Unknown Breed'}{p.stomach_health === 'sensitive'? ' · Sensitive Stomach': ''}
 </Text>
 </View>
 {selectedPetId === p.id && <Text style={styles.ddCheck}>✓</Text>}
 </TouchableOpacity>))}
 </View>)}
 </View>
 <View style={styles.field}>
 <Text style={styles.fieldLabel}>Specific needs or symptoms (Optional)</Text>
 <TextIn
 value={recommendQuery}
 onChangeText={setRecommendQuery}
 placeholder="e.g., Ragdoll with chronic soft stool, hypoallergenic kitten food..."
 placeholderTextColor={colors.muted}
 style={styles.fieldIn}
 />
 </View>
 <TouchableOpacity
 style={[styles.submitBtn, (!selectedPetId || recommendLoading) && styles.submitBtnDisabled]}
 disabled={!selectedPetId || recommendLoading}
 onPress={handleRecommend}
 activeOpacity={0.8}
 >
 <Text style={styles.submitBtnText}>{recommendLoading? 'Analyzing...': 'Smart Recommend'}</Text>
 </TouchableOpacity>
 </>)}
 </View>

 {recommendError? <Text style={styles.errorCard}>{recommendError}</Text>: null}

 {recommendResult && (<View style={styles.resultArea}>
 <View style={styles.summaryCard}>
 <Text style={styles.summaryLabel}>Analysis Result</Text>
 <Text style={styles.summaryText}>{recommendResult.summary}</Text>
 </View>
 {recommendResult.pet_context && (<View style={styles.contextTags}>
 <Text style={styles.ctxTag}>Breed: {recommendResult.pet_context.breed}</Text>
 <Text style={styles.ctxTag}>Age: {recommendResult.pet_context.age}</Text>
 <Text style={[styles.ctxTag, (recommendResult.pet_context.stomach_health === 'sensitive' || recommendResult.pet_context.stomach_health === 'very_sensitive') && styles.ctxTagWarn]}>
 Stomach: {stomachLabel(recommendResult.pet_context.stomach_health)}
 </Text>
 </View>)}
 {recommendResult.recommendations.map((r, i) => (<View key={r.product.id} style={styles.recCard}>
 <Text style={styles.recRank}>#{i + 1}</Text>
 <View style={styles.recBody}>
 <Text style={styles.recName} numberOfLines={1}>{r.product.name}</Text>
 <Text style={styles.recBrand}>{r.product.brand}</Text>
 {!!r.product.price_max && <Text style={styles.recPrice}>${r.product.price_max}</Text>}
 <Text style={[styles.recScore, { color: scoreColor(r.score) }]}>{Math.round(r.score * 100)}pts</Text>
 {r.explanation? <Text style={styles.recReason}>{r.explanation}</Text>: null}
 <View style={styles.recDims}>
 {Object.entries(r.dimensions).map(([k, v]) => (<Text key={k} style={styles.dimChip}>{dimLabel(k)} {Math.round(v * 100)}%</Text>))}
 </View>
 </View>
 </View>))}
 {recommendResult.warnings && recommendResult.warnings.length > 0 && (<View style={styles.warningCard}>
 <Text style={styles.warningTitle}>⚠️ Risk Notice</Text>
 {recommendResult.warnings.map((w) => (<View key={w.product.id} style={styles.warningItem}>
 <Text style={styles.warningItemText}>{w.product.brand} {w.product.name}</Text>
 <Text style={styles.warningReason}>{w.reason}</Text>
 </View>))}
 </View>)}
 </View>)}
 </View>);

 const renderIngredientsTab = () => (<View style={styles.tabContent}>
 <View style={styles.card}>
 <Text style={styles.cardTitle}>Ingredients</Text>
 <Text style={styles.cardDesc}>UploadIngredientsImageor Paste, AI AnalysisRiskGradeand</Text>

 <View style={styles.inModeToggle}>
 <TouchableOpacity
 style={[styles.ModeBtn, ingredientMode === 'text' && styles.ModeBtnActive]}
 onPress={() => setIngredientMode('text')}
 activeOpacity={0.8}
 >
 <Ionicons name="document-text-outline" size={16} color={ingredientMode === 'text'? colors.primary: colors.muted} />
 <Text style={[styles.ModeBtnText, ingredientMode === 'text' && styles.ModeBtnTextActive]}>Text In</Text>
 </TouchableOpacity>
 <TouchableOpacity
 style={[styles.ModeBtn, ingredientMode === 'image' && styles.ModeBtnActive]}
 onPress={() => setIngredientMode('image')}
 activeOpacity={0.8}
 >
 <Ionicons name="image-outline" size={16} color={ingredientMode === 'image'? colors.primary: colors.muted} />
 <Text style={[styles.ModeBtnText, ingredientMode === 'image' && styles.ModeBtnTextActive]}>Image Recognition</Text>
 </TouchableOpacity>
 </View>

 {ingredientMode === 'text'? (<>
 <TextIn
 value={ingredientIn}
 onChangeText={setIngredientIn}
 placeholder="e.g., chicken meal, fish, corn, brown rice, chicken fat, brewer's yeast..."
 placeholderTextColor={colors.muted}
 multiline
 numberOfLines={5}
 style={styles.fieldTextarea}
 textAlignVertical="top"
 />
 <TouchableOpacity
 style={[styles.submitBtn, (!ingredientIn.trim() || ingredientLoading) && styles.submitBtnDisabled]}
 disabled={!ingredientIn.trim() || ingredientLoading}
 onPress={handleAnalyze}
 activeOpacity={0.8}
 >
 <Text style={styles.submitBtnText}>{ingredientLoading? 'Analyzing...': 'Start Analysis'}</Text>
 </TouchableOpacity>
 </>): (<View style={styles.imageUploadArea}>
 {!ingredientImagePreview? (<TouchableOpacity style={styles.uploadDropzone} onPress={triggerImageUpload} activeOpacity={0.8}>
 <View style={styles.uploadIcon}>
 <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
 </View>
 <Text style={styles.uploadText}>Tap to upload ingredient list image</Text>
 <Text style={styles.uploadHint}>Supports JPG, PNG. Please ensure clear photo.</Text>
 </TouchableOpacity>): (<View style={styles.imagePreviewContainer}>
 <Image source={{ uri: ingredientImagePreview }} style={styles.imagePreview} resizeMode="contain" />
 <TouchableOpacity style={styles.removeImageBtn} onPress={removeIngredientImage} activeOpacity={0.8}>
 <Ionicons name="close" size={14} color="#fff" />
 </TouchableOpacity>
 </View>)}
 <TouchableOpacity
 style={[styles.submitBtn, (!ingredientImage || ingredientLoading) && styles.submitBtnDisabled]}
 disabled={!ingredientImage || ingredientLoading}
 onPress={handleImageAnalyze}
 activeOpacity={0.8}
 >
 <Text style={styles.submitBtnText}>{ingredientLoading? 'Analyzing...': 'Image RecognitionAnalysis'}</Text>
 </TouchableOpacity>
 </View>)}
 </View>

 {ingredientError? <Text style={styles.errorCard}>{ingredientError}</Text>: null}
 {ingredientResult? (<View style={[styles.card, styles.resultCard]}>
 <Text style={styles.resultLabel}>AI Analysis Summary</Text>
 <MarkdownText content={ingredientResult} />
 </View>): null}
 <View style={styles.tipCard}>
 <Text style={styles.tipTitle}>Usage Examples</Text>
 <Text style={styles.tipItem}>• Upload a photo of the ingredient list on the back of cat food packaging</Text>
 <Text style={styles.tipItem}>• Or paste the ingredient list text directly</Text>
 <Text style={styles.tipItem}>• AI will identify main protein sources, fillers, additives, etc.</Text>
 <Text style={styles.tipItem}>• to RiskandBreed MatchAdvice</Text>
 </View>
 </View>);

 const renderCompareTab = () => (<View style={styles.tabContent}>
 <View style={styles.card}>
 <Text style={styles.cardTitle}>Compare</Text>
 <Text style={styles.cardDesc}>Select from database or manually enter 2-4 products for AI multi-dimensional comparison</Text>
 <View style={styles.compareList}>
 {compareProducts.map((p, i) => (<View key={i} style={styles.compareRow}>
 <Text style={styles.compareNum}>{i + 1}</Text>
 <View style={styles.compareInWrap}>
 <TextIn
 value={p}
 onChangeText={(text) => onCompareSearch(i, text)}
 onFocus={() => openProductSearch(i)}
 placeholder="Search or enter product name..."
 placeholderTextColor={colors.muted}
 style={[styles.fieldIn, styles.compareIn]}
 />
 {searchOpenIdx === i && searchResults.length > 0 && (<View style={styles.compareDropdown}>
 {searchResults.map((item) => (<TouchableOpacity
 key={item.id}
 style={styles.compareDdItem}
 onPress={() => pickCompareProduct(i, item)}
 activeOpacity={0.7}
 >
 <Text style={styles.compareDdName} numberOfLines={1}>{item.name}</Text>
 <Text style={styles.compareDdBrand}>{item.brand}</Text>
 </TouchableOpacity>))}
 </View>)}
 </View>
 {compareProducts.length > 2 && (<TouchableOpacity style={styles.compareDel} onPress={() => removeProduct(i)} activeOpacity={0.7}>
 <Text style={styles.compareDelText}>×</Text>
 </TouchableOpacity>)}
 </View>))}
 </View>
 {compareProducts.length < 4 && (<TouchableOpacity style={styles.addBtn} onPress={addProduct} activeOpacity={0.7}>
 <Text style={styles.addBtnText}>+ Add Product</Text>
 </TouchableOpacity>)}
 <TouchableOpacity
 style={[styles.submitBtn, (compareProducts.filter((p) => p.trim()).length < 2 || compareLoading) && styles.submitBtnDisabled]}
 disabled={compareProducts.filter((p) => p.trim()).length < 2 || compareLoading}
 onPress={handleCompare}
 activeOpacity={0.8}
 >
 <Text style={styles.submitBtnText}>{compareLoading? 'Comparing...': 'Start Comparison'}</Text>
 </TouchableOpacity>
 </View>

 {compareError? <Text style={styles.errorCard}>{compareError}</Text>: null}
 {compareResult? (<View style={[styles.card, styles.resultCard]}>
 <MarkdownText content={compareResult} />
 </View>): null}
 <View style={styles.tipCard}>
 <Text style={styles.tipTitle}>Comparison Dimensions</Text>
 <View style={styles.tipGrid}>
 <Text style={styles.tipGridItem}>• Palatability Score</Text>
 <Text style={styles.tipGridItem}>• Stool Safety Rate</Text>
 <Text style={styles.tipGridItem}>• Repurchase Rate</Text>
 <Text style={styles.tipGridItem}>• Ingredient Quality</Text>
 <Text style={styles.tipGridItem}>• Price Range</Text>
 <Text style={styles.tipGridItem}>• Suitable Breeds</Text>
 </View>
 </View>
 </View>);

 const renderChatWelcome = () => (<View style={styles.tabContent}>
 <View style={[styles.card, styles.chatCard]}>
 <View style={styles.chatWelcome}>
 <View style={styles.chatWelcomeIcon}>
 <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.chatWelcomeIconImg} />
 </View>
 <Text style={styles.chatWelcomeTitle}>AI Pet Nutrition Assistant</Text>
 <Text style={styles.chatWelcomeDesc}>on Nuzzly TownTrueLong-termFeedbackData, Fur Ballproviding personalized recommendations and analysis</Text>
 <View style={styles.chatSuggestions}>
 {CHAT_SUGGESTIONS.map((s) => (<TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => openChatFullscreen(s)} activeOpacity={0.8}>
 <Text style={styles.suggestionChipText} numberOfLines={1}>{s}</Text>
 </TouchableOpacity>))}
 </View>
 <TouchableOpacity style={styles.chatInBarPreview} onPress={() => openChatFullscreen()} activeOpacity={0.9}>
 <View style={[styles.chatIn, styles.chatInFake]}>
 <Text style={styles.chatInFakeText} numberOfLines={1}>Ask me anything about pet food...</Text>
 </View>
 <View style={styles.chatSend}>
 <Ionicons name="send" size={18} color="#fff" />
 </View>
 </TouchableOpacity>
 </View>
 </View>
 </View>);

 const renderFullscreenChat = () => (<Modal visible={chatFullscreen} animationType="slide" transparent={false} onRequestClose={closeChatFullscreen}>
 <KeyboardAvoidingView behavior={Platform.OS === 'ios'? 'padding': 'height'} style={styles.chatFullscreen}>
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
 <Text style={styles.chatFsTitleMain}>Pomi</Text>
 <View style={styles.chatFsStatus}>
 <View style={styles.chatFsStatusDot} />
 <Text style={styles.chatFsStatusText}>Online</Text>
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
 {chatMessages.length === 0? (<View style={styles.chatFsEmpty}>
 <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.chatFsEmptyAvatar} />
 <Text style={styles.chatFsEmptyTitle}>Hi, I'm Pomi — Mayor of Nuzzly Town</Text>
 <Text style={styles.chatFsEmptyDesc}>Powered by real long-term community feedback data, I provide personalized product recommendations and nutrition analysis for your pet — and can even help you record pet profiles automatically~</Text>
 </View>): (chatMessages.map((m, i) => (<View key={i} style={[styles.chatRow, m.role === 'user' && styles.chatRowUser]}>
 {m.role === 'assistant' && <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={[styles.chatAvatar, styles.chatAvatarAi]} />}
 <View style={[styles.chatBubble, m.role === 'assistant'? styles.chatBubbleAssistant: styles.chatBubbleUser]}>
 {m.role === 'assistant' &&!m.content && chatLoading? (<View style={styles.thinkingIndicator}>
 <Ionicons name="paw" size={14} color={colors.primary} />
 <Text style={styles.thinkingText}>Pomi is thinking</Text>
 <View style={styles.thinkingDots}>
 <View style={styles.thinkingDot} />
 <View style={[styles.thinkingDot, styles.thinkingDotDelay1]} />
 <View style={[styles.thinkingDot, styles.thinkingDotDelay2]} />
 </View>
 </View>): m.role === 'assistant'? (<MarkdownText content={m.content} />): (<Text style={styles.chatUserText}>{m.content}</Text>)}
 </View>
 {m.role === 'user' && (<Image source={typeof userAvatar === 'string'? { uri: userAvatar }: userAvatar} style={[styles.chatAvatar, styles.chatAvatarUser]} />)}
 </View>)))}
 </ScrollView>

 <View style={styles.chatFsInBar}>
 <TextIn
 value={chatIn}
 onChangeText={setChatIn}
 placeholder="Ask me anything about pet food..."
 placeholderTextColor={colors.muted}
 style={styles.chatFsIn}
 returnKeyType="send"
 onSubmitEditing={() => sendChatMessage()}
 />
 <TouchableOpacity
 style={[styles.chatFsSend, (!chatIn.trim() || chatLoading) && styles.chatFsSendDisabled]}
 disabled={!chatIn.trim() || chatLoading}
 onPress={() => sendChatMessage()}
 activeOpacity={0.8}
 >
 {chatLoading? <ActivityIndicator size="small" color="#fff" />: <Ionicons name="send" size={18} color="#fff" />}
 </TouchableOpacity>
 </View>

 {chatHistoryOpen && (<>
 <Pressable style={styles.chatHistoryBackdrop} onPress={() => setChatHistoryOpen(false)} />
 <View style={[styles.chatHistoryPopover, { top: insets.top + 96 }]}>
 <View style={styles.chatHistoryHeader}>
 <Text style={styles.chatHistoryHeaderText}>HistoryRecord</Text>
 <TouchableOpacity style={styles.chatHistoryClose} onPress={() => setChatHistoryOpen(false)} activeOpacity={0.7}>
 <Ionicons name="close" size={14} color={colors.muted} />
 </TouchableOpacity>
 </View>
 <ScrollView style={styles.chatHistoryList}>
 {chatHistoryLoading? (<Text style={styles.chatHistoryEmpty}>Loading...</Text>): chatHistoryItems.length === 0? (<Text style={styles.chatHistoryEmpty}>No chat history</Text>): (chatHistoryItems.map((item) => (<TouchableOpacity key={item.id} style={styles.chatHistoryItem} onPress={() => loadHistoryItem(item)} activeOpacity={0.7}>
 <Text style={styles.chatHistoryQ} numberOfLines={2}>{item.user_message}</Text>
 <Text style={styles.chatHistoryTime}>{formatHistoryTime(item.created_at)}</Text>
 <TouchableOpacity style={styles.chatHistoryDel} onPress={() => deleteHistoryItem(item.id)} activeOpacity={0.7}>
 <Ionicons name="trash-outline" size={13} color="#ccc" />
 </TouchableOpacity>
 </TouchableOpacity>)))}
 </ScrollView>
 </View>
 </>)}
 </KeyboardAvoidingView>
 </Modal>);

 return (<View style={[styles.container, { paddingTop: insets.top }]}>
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
 </View>);
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
 overflow: 'hidden',...shadows.sm,
 },
 avatarImg: {
 width: '100%',
 height: '100%',
 },
 actionCircle: {
 width: 41.31,
 height: 41.31,
 borderRadius: 20.65,
 backgroundColor: colors.card,...shadows.sm,
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
 borderRadius: radius.lg,...shadows.sm,
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
 backgroundColor: colors.card,...shadows.sm,
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
 padding: spacing.md,...shadows.sm,
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
 fieldIn: {
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
 borderRadius: 16,...shadows.md,
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
 justifyContent: 'center',...shadows.btn,
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
 padding: 14,...shadows.sm,
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
 inModeToggle: {
 flexDirection: 'row',
 gap: 8,
 marginBottom: 12,
 },
 ModeBtn: {
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
 ModeBtnActive: {
 backgroundColor: 'rgba(139,94,70,0.08)',
 borderColor: colors.primary,
 },
 ModeBtnText: {
 fontSize: 12,
 fontWeight: typography.weights.medium,
 color: colors.muted,
 },
 ModeBtnTextActive: {
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
 compareInWrap: {
 flex: 1,
 position: 'relative',
 },
 compareIn: {
 flex: undefined,
 width: '100%',
 },
 compareDropdown: {
 position: 'absolute',
 left: 0,
 right: 0,
 top: 46,
 backgroundColor: 'rgba(255,255,255,0.95)',
 borderRadius: 12,...shadows.md,
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
 chatInBarPreview: {
 flexDirection: 'row',
 gap: 8,
 padding: 12,
 marginTop: 16,
 alignItems: 'center',
 width: '100%',
 },
 chatIn: {
 flex: 1,
 height: 42,
 borderWidth: 1,
 borderColor: 'rgba(0,0,0,0.06)',
 borderRadius: 21,
 paddingHorizontal: 18,
 fontSize: typography.sizes.base,
 backgroundColor: colors.card,
 color: colors.fg,...shadows.sm,
 },
 chatInFake: {
 justifyContent: 'center',
 },
 chatInFakeText: {
 color: '#B0B0AE',
 },
 chatSend: {
 width: 42,
 height: 42,
 borderRadius: 14,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
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
 chatAvatarAi: {...shadows.sm,
 backgroundColor: colors.card,
 },
 chatAvatarUser: {...shadows.sm,
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
 chatFsInBar: {
 flexDirection: 'row',
 gap: 5,
 paddingHorizontal: 12,
 paddingVertical: 8,
 backgroundColor: '#F7F6F3',
 borderTopWidth: 1,
 borderTopColor: 'rgba(0,0,0,0.04)',
 alignItems: 'center',
 },
 chatFsIn: {
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
 justifyContent: 'center',...shadows.btn,
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
 borderRadius: 16,...shadows.md,
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
