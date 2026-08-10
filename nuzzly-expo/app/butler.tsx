import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 TextIn,
 Image,
 StyleSheet,
 KeyboardAvoidingView,
 Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { usePets } from '../src/hooks/usePets';
import { api } from '../src/lib/api';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

const QUICK_PROMPTS = [{ text: 'How is my pet's health today?', label: '🩺 Health Status' },
 { text: 'Recommend suitable cat food', label: '🍖 Diet Recommendation' },
 { text: 'Help me book next week's vaccination ', label: '💉 Book Vaccine' },
 { text: 'How is the weight trend recently?', label: '📊 Weight Trend' },];

interface Message {
 type: 'user' | 'ai' | 'typing';
 text: string;
}

interface FormattedLine {
 parts: { text: string; bold: boolean }[];
}

function formatMessage(text: string): FormattedLine[] {
 return text.split('\n').map((line) => ({
 parts: line.split(/(\*\*.*?\*\*)/).filter(Boolean).map((part) => ({
 text: part.startsWith('**') && part.endsWith('**')? part.slice(2, -2): part,
 bold: part.startsWith('**') && part.endsWith('**'),
 })),
 }));
}

export default function ButlerScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { profile } = useAuth();
 const { pets: rawPets, fetchPets } = usePets();

 const [inText, setInText] = useState('');
 const [messages, setMessages] = useState<Message[]>([]);
 const [welcomeHidden, setWelcomeHidden] = useState(false);
 const chatScrollRef = useRef<ScrollView>(null);

 const petItems = useMemo(() => rawPets.map((p) => ({ id: p.id, emoji: SPECIES_EMOJI[p.species] || '🐾', name: p.name })),
 [rawPets],);
 const userName = useMemo(() => (profile as any)?.display_name || (profile as any)?.username || 'Pet Parent',
 [profile],);

 useEffect(() => {
 fetchPets();
 }, [fetchPets]);

 const scrollToBottom = useCallback(() => {
 setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
 }, []);

 function getFallback(text: string): string {
 const name = petItems[0]?.name || ' Pet';
 const fallbackMap: Record<string, string> = {
 'Health': `${name}Today Health StatusGood!AdviceContinueago Dietand 🩺`,
 'Cat Food': `Root${name} AgeandWeight, AdviceSelectpremium, its Age Cat Food. to ProductsViewDetailedReview 🍖`,
 'Vaccine': `Adviceterm ${name} Vaccine, Pet 💉`,
 'Weight': `AdvicetermRecord${name} WeightChange, Healthwithin 📊`,
 };
 for (const key in fallbackMap) {
 if (text.indexOf(key)!== -1) return fallbackMap[key];
 }
 return `to!About「${text}」, let your1next...\n\nago your: \n• 🩺 ViewPetHealth Status\n• 🍖 RecommendationsDiet\n• 💉 \n• 📊 ViewlongData`;
 }

 async function getAIResponse(text: string): Promise<string> {
 try {
 const data = await api('/api/ai/chat', {
 method: 'POST',
 body: JSON.stringify({ message: text, pets: petItems }),
 });
 return data.reply || data.message || data.answer || getFallback(text);
 } catch (e: any) {
 console.warn('[Butler] AI API Not use, this Reply', e.message);
 return getFallback(text);
 }
 }

 async function sendMessage(text: string) {
 if (!text ||!text.trim()) return;
 const trimmed = text.trim();
 if (!welcomeHidden) setWelcomeHidden(true);

 setMessages((prev) => [...prev, { type: 'user', text: trimmed }]);
 setInText('');
 scrollToBottom();

 setMessages((prev) => [...prev, { type: 'typing', text: '' }]);
 scrollToBottom();

 const reply = await getAIResponse(trimmed);

 setMessages((prev) => {
 const withoutTyping = prev.filter((m) => m.type!== 'typing');
 return [...withoutTyping, { type: 'ai', text: reply }];
 });
 scrollToBottom();
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 {/* Header */}
 <View style={styles.header}>
 <View style={styles.headerRow}>
 <View style={styles.headerLeft}>
 <TouchableOpacity
 activeOpacity={0.7}
 style={styles.actionCircle}
 onPress={() => router.back()}
 >
 <Ionicons name="chevron-back" size={20} color={colors.fg} />
 </TouchableOpacity>
 <View style={styles.avatar}>
 <Image source={require('../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />
 </View>
 </View>
 <View style={styles.headerActions}>
 <TouchableOpacity
 activeOpacity={0.7}
 style={styles.actionCircle}
 onPress={() => router.push('/settings')}
 >
 <Ionicons name="settings-outline" size={20} color={colors.fg} />
 </TouchableOpacity>
 </View>
 </View>
 <Text style={styles.pageTitle}>Butler</Text>
 </View>

 {/* Pet Strip */}
 <ScrollView
 horizontal
 showsHorizontalScrollIndicator={false}
 contentContainerStyle={styles.petStrip}
 >
 {petItems.map((pet) => (<TouchableOpacity
 key={pet.id}
 activeOpacity={0.7}
 style={styles.petCard}
 onPress={() => router.push(`/pets/${pet.id}`)}
 >
 <View style={styles.petAvatarLg}>
 <Text style={styles.petEmoji}>{pet.emoji}</Text>
 </View>
 <Text style={styles.petNameSm}>{pet.name}</Text>
 </TouchableOpacity>))}
 <TouchableOpacity
 activeOpacity={0.7}
 style={styles.petCard}
 onPress={() => router.push('/pet/create')}
 >
 <View style={[styles.petAvatarLg, styles.addPetAvatar]}>
 <Text style={styles.addPetPlus}>+</Text>
 </View>
 <Text style={[styles.petNameSm, { color: colors.muted }]}>Add a Pet</Text>
 </TouchableOpacity>
 </ScrollView>

 {/* Chat Area */}
 <View style={styles.chatArea}>
 <KeyboardAvoidingView
 style={{ flex: 1 }}
 behavior={Platform.OS === 'ios'? 'padding': undefined}
 keyboardVerticalOffset={insets.bottom + 60}
 >
 <ScrollView
 ref={chatScrollRef}
 style={styles.chatScroll}
 contentContainerStyle={styles.chatContent}
 showsVerticalScrollIndicator={false}
 onContentSizeChange={scrollToBottom}
 >
 {/* Welcome */}
 {!welcomeHidden && (<View>
 <View style={styles.aiWelcome}>
 <View style={styles.aiAvatar}>
 <Image
 source={require('../assets/images/mqpyqgao-logo.png')}
 style={styles.aiAvatarImg}
 />
 </View>
 <View style={styles.aiBubble}>
 <Text style={styles.aiName}>Nuzzly Butler</Text>
 <Text style={styles.aiBubbleText}>
 yourgood <Text style={{ fontWeight: typography.weights.bold }}>{userName}</Text>, YesNuzzly Town exclusiveButler, what?🐾
 </Text>
 </View>
 </View>
 <View style={styles.quickPrompts}>
 {QUICK_PROMPTS.map((prompt) => (<TouchableOpacity
 key={prompt.text}
 activeOpacity={0.7}
 style={styles.promptChip}
 onPress={() => sendMessage(prompt.text)}
 >
 <Text style={styles.promptChipText}>{prompt.label}</Text>
 </TouchableOpacity>))}
 </View>
 </View>)}

 {/* Messages */}
 {messages.map((msg, i) => {
 const isUser = msg.type === 'user';
 return (<View key={i} style={[styles.msgRow, isUser && styles.msgRowUser]}>
 {(msg.type === 'ai' || msg.type === 'typing') && (<View style={styles.msgAiAvatar}>
 <Text style={{ fontSize: 12 }}>✨</Text>
 </View>)}
 <View style={[styles.msgBubble, isUser? styles.msgBubbleUser: styles.msgBubbleAi]}>
 {msg.type === 'typing'? (<View style={styles.typingIndicator}>
 <View style={styles.typingDot} />
 <View style={[styles.typingDot, { opacity: 0.6 }]} />
 <View style={[styles.typingDot, { opacity: 0.3 }]} />
 </View>): (formatMessage(msg.text).map((line, lineIdx) => (<Text
 key={lineIdx}
 style={[styles.msgLine, isUser && { color: '#fff' }]}
 >
 {line.parts.map((part, partIdx) =>
 part.bold? (<Text key={partIdx} style={{ fontWeight: typography.weights.bold }}>
 {part.text}
 </Text>): (<Text key={partIdx}>{part.text}</Text>),)}
 </Text>)))}
 </View>
 </View>);
 })}
 </ScrollView>

 {/* In Bar */}
 <View style={[styles.inBar, { paddingBottom: insets.bottom + 16 }]}>
 <View style={styles.inWrap}>
 <TextIn
 style={styles.inField}
 value={inText}
 onChangeText={setInText}
 placeholder="askAboutPet Question..."
 placeholderTextColor={colors.muted}
 returnKeyType="send"
 onSubmitEditing={() => sendMessage(inText)}
 />
 <TouchableOpacity
 activeOpacity={0.8}
 style={[styles.sendBtn,!inText.trim() && { opacity: 0.4 }]}
 disabled={!inText.trim()}
 onPress={() => sendMessage(inText)}
 >
 <Ionicons name="send" size={18} color="#fff" />
 </TouchableOpacity>
 </View>
 </View>
 </KeyboardAvoidingView>
 </View>
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 header: {
 paddingHorizontal: spacing['2xl'],
 paddingTop: 0,
 zIndex: 1,
 },
 headerRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 },
 headerLeft: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 },
 avatar: {
 width: sizes.avatarSm,
 height: sizes.avatarSm,
 borderRadius: sizes.avatarSm / 2,
 backgroundColor: colors.secondary,
 alignItems: 'center',
 justifyContent: 'center',
 overflow: 'hidden',...shadows.sm,
 },
 avatarImg: {
 width: '100%',
 height: '100%',
 borderRadius: sizes.avatarSm / 2,
 },
 headerActions: {
 flexDirection: 'row',
 gap: spacing.sm,
 },
 actionCircle: {
 width: 36,
 height: 36,
 borderRadius: radius.pill,
 backgroundColor: colors.card,...shadows.sm,
 alignItems: 'center',
 justifyContent: 'center',
 borderWidth: 1,
 borderColor: colors.border,
 },
 pageTitle: {
 marginTop: spacing.sm,
 fontSize: 28,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 letterSpacing: -0.5,
 },
 petStrip: {
 paddingTop: spacing.xl,
 paddingHorizontal: spacing['2xl'],
 gap: spacing.lg,
 },
 petCard: {
 width: 80,
 alignItems: 'center',
 gap: spacing.sm,
 },
 petAvatarLg: {
 width: 72,
 height: 72,
 borderRadius: 28,
 backgroundColor: 'rgba(215, 181, 147, 0.12)',
 alignItems: 'center',
 justifyContent: 'center',
 borderWidth: 2,
 borderColor: 'rgba(255, 255, 255, 0.8)',...shadows.sm,
 },
 petEmoji: {
 fontSize: 36,
 },
 addPetAvatar: {
 backgroundColor: 'rgba(0, 0, 0, 0.03)',
 borderStyle: 'dashed',
 },
 addPetPlus: {
 fontSize: 20,
 color: colors.muted,
 },
 petNameSm: {
 fontSize: typography.sizes.xs,
 color: colors.fg,
 fontWeight: typography.weights.medium,
 textAlign: 'center',
 },
 chatArea: {
 flex: 1,
 backgroundColor: colors.card,
 borderTopLeftRadius: radius['3xl'],
 borderTopRightRadius: radius['3xl'],
 marginTop: spacing.xl,
 zIndex: 1,
 },
 chatScroll: {
 flex: 1,
 },
 chatContent: {
 padding: spacing['2xl'],
 paddingBottom: spacing.md,
 gap: spacing.lg,
 },
 aiWelcome: {
 flexDirection: 'row',
 gap: spacing.md,
 alignItems: 'flex-start',
 },
 aiAvatar: {
 width: 44,
 height: 44,
 borderRadius: radius.xl,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 overflow: 'hidden',...shadows.btn,
 },
 aiAvatarImg: {
 width: '100%',
 height: '100%',
 borderRadius: radius.xl,
 },
 aiBubble: {
 backgroundColor: colors.card,
 borderRadius: radius['3xl'],
 borderTopLeftRadius: radius.xs,
 padding: spacing.lg,...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 maxWidth: '80%',
 },
 aiName: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginBottom: spacing.xs,
 letterSpacing: 0.2,
 },
 aiBubbleText: {
 fontSize: typography.sizes.md,
 lineHeight: 24,
 color: colors.fg,
 },
 quickPrompts: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: spacing.sm,
 paddingHorizontal: 56,
 marginTop: spacing.sm,
 },
 promptChip: {
 paddingVertical: spacing.sm,
 paddingHorizontal: spacing.lg,
 borderRadius: radius.btn,
 backgroundColor: colors.card,
 borderWidth: 1,
 borderColor: colors.border,...shadows.sm,
 },
 promptChipText: {
 fontSize: typography.sizes.sm,
 color: colors.fg,
 letterSpacing: 0.1,
 },
 msgRow: {
 flexDirection: 'row',
 gap: spacing.sm,
 alignItems: 'flex-end',
 },
 msgRowUser: {
 flexDirection: 'row-reverse',
 },
 msgAiAvatar: {
 width: 32,
 height: 32,
 borderRadius: radius.lg,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
 msgBubble: {
 paddingVertical: 14,
 paddingHorizontal: 18,
 borderRadius: 20,
 maxWidth: '75%',
 },
 msgBubbleAi: {
 backgroundColor: colors.card,
 borderWidth: 1,
 borderColor: colors.border,
 borderBottomLeftRadius: radius.xs,...shadows.sm,
 },
 msgBubbleUser: {
 backgroundColor: colors.primary,
 borderBottomRightRadius: radius.xs,...shadows.btn,
 },
 msgLine: {
 fontSize: typography.sizes.base,
 lineHeight: 22,
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 typingIndicator: {
 flexDirection: 'row',
 gap: spacing.xs,
 paddingVertical: spacing.sm,
 },
 typingDot: {
 width: 6,
 height: 6,
 borderRadius: radius.pill,
 backgroundColor: colors.muted,
 },
 inBar: {
 paddingHorizontal: spacing['2xl'],
 paddingTop: spacing.md,
 },
 inWrap: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.btn,
 paddingLeft: spacing.xl,
 paddingRight: spacing.sm,
 paddingVertical: spacing.sm,
 },
 inField: {
 flex: 1,
 fontSize: typography.sizes.md,
 color: colors.fg,
 minHeight: 36,
 paddingVertical: 0,
 },
 sendBtn: {
 width: 40,
 height: 40,
 borderRadius: radius.pill,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
});
