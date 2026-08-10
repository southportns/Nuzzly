import { useEffect, useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 Image,
 Alert,
 StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePets } from '../src/hooks/usePets';
import { useHealthReminders, HealthReminder } from '../src/hooks/useHealthReminders';
import PetChipGroup from '../src/components/PetChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const TYPE_FILTERS = [{ value: 'all', label: 'All' },
 { value: 'vaccination', label: 'Vaccine' },
 { value: 'medication', label: 'Medication' },
 { value: 'checkup', label: 'Check-up' },
 { value: 'custom', label: 'Custom' },];

const TYPE_ICON: Record<string, string> = {
 vaccination: '💉',
 medication: '💊',
 checkup: '🩺',
 custom: '📌',
};

const TYPE_LABEL: Record<string, string> = {
 vaccination: 'Vaccine',
 medication: 'Medication',
 checkup: 'Check-up',
 custom: 'Custom',
};

const REPEAT_LABEL: Record<string, string> = {
 monthly: 'Monthly',
 quarterly: 'Quarterly',
 yearly: 'Yearly',
};

const TYPE_BG: Record<string, string> = {
 vaccination: 'rgba(108,138,105,0.1)',
 medication: 'rgba(59,130,246,0.1)',
 checkup: 'rgba(215,181,147,0.15)',
 custom: 'rgba(0,0,0,0.04)',
};

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

export default function HealthRemindersScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { pets, fetchPets } = usePets();
 const { reminders, loading, fetchReminders, completeReminder, deleteReminder } =
 useHealthReminders();

 const [selectedPet, setSelectedPet] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');

 const petChips = useMemo(() => pets.map((p) => ({ id: p.id, name: p.name, emoji: SPECIES_EMOJI[p.species] || '🐾' })),
 [pets]);

 const filteredReminders = useMemo(() => {
 let list = reminders.filter((r) => r.pet_id === selectedPet);
 if (typeFilter!== 'all') {
 list = list.filter((r) => r.reminder_type === typeFilter);
 }
 return list;
 }, [reminders, selectedPet, typeFilter]);

 useEffect(() => {
 fetchPets().then(() => {
 if (pets.length &&!selectedPet) {
 setSelectedPet(pets[0].id);
 }
 });
 }, []);

 useEffect(() => {
 if (selectedPet) fetchReminders(selectedPet);
 }, [selectedPet]);

 function isOverdue(r: HealthReminder) {
 if (r.is_completed) return false;
 return r.due_date < new Date().toISOString().slice(0, 10);
 }

 function formatDate(d: string) {
 if (!d) return '';
 const date = new Date(d + 'T00:00:00');
 const now = new Date();
 const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
 if (diff === 0) return 'Today';
 if (diff === 1) return 'next days';
 if (diff === -1) return 'last days';
 if (diff > 0 && diff <= 7) return `${diff} daysafter`;
 return `${date.getMonth() + 1}M${date.getDate()}D`;
 }

 async function handleComplete(r: HealthReminder) {
 try {
 await completeReminder(r.id);
 } catch (e: any) {
 Alert.alert('DoneFailed', e.message);
 }
 }

 async function handleDelete(r: HealthReminder) {
 Alert.alert('Delete Reminder', `OKDelete"${r.title}"?`, [{ text: 'Cancel', style: 'cancel' },
 {
 text: 'Delete',
 style: 'destructive',
 onPress: async () => {
 try {
 await deleteReminder(r.id);
 } catch (e: any) {
 Alert.alert('Delete Failed', e.message);
 }
 },
 },]);
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <ScrollView
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
 showsVerticalScrollIndicator={false}
 >
 <View style={styles.header}>
 <View style={styles.headerRow}>
 <Image source={require('../assets/images/nuzzly-zuhe.png')} style={styles.brandLogo} />
 <TouchableOpacity
 activeOpacity={0.8}
 onPress={() => router.push('/notifications')}
 style={styles.actionCircle}
 >
 <Ionicons name="notifications-outline" size={18} color={colors.fg} />
 </TouchableOpacity>
 </View>
 </View>

 <PetChipGroup pets={petChips} selectedId={selectedPet} onSelect={setSelectedPet} />

 <ScrollView
 horizontal
 showsHorizontalScrollIndicator={false}
 contentContainerStyle={styles.typeFilter}
 >
 {TYPE_FILTERS.map((t) => {
 const active = typeFilter === t.value;
 return (<TouchableOpacity
 key={t.value}
 activeOpacity={0.8}
 onPress={() => setTypeFilter(t.value)}
 style={[styles.typeChip, active && styles.typeChipActive]}
 >
 <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
 {t.label}
 </Text>
 </TouchableOpacity>);
 })}
 </ScrollView>

 <View style={styles.remindersList}>
 {loading? (<View style={styles.emptyState}>
 <Text style={styles.emptyText}>Loading...</Text>
 </View>): filteredReminders.length === 0? (<View style={styles.emptyState}>
 <Text style={styles.emptyIcon}>🔔</Text>
 <Text style={styles.emptyTitle}>NoneHealthReminder</Text>
 <Text style={styles.emptyDesc}>rightnext + Add Reminder</Text>
 </View>): (filteredReminders.map((r) => (<View
 key={r.id}
 style={[styles.reminderCard,
 r.is_completed && styles.completedCard,
 isOverdue(r) &&!r.is_completed && styles.overdueCard,]}
 >
 <View style={[styles.reminderIcon, { backgroundColor: TYPE_BG[r.reminder_type] }]}>
 <Text style={styles.reminderIconText}>{TYPE_ICON[r.reminder_type] || '📌'}</Text>
 </View>
 <View style={styles.reminderBody}>
 <Text style={styles.reminderTitle}>{r.title}</Text>
 <View style={styles.reminderMeta}>
 <View style={styles.typeTag}>
 <Text style={styles.typeTagText}>{TYPE_LABEL[r.reminder_type]}</Text>
 </View>
 {r.repeat_interval && r.repeat_interval!== 'none'? (<View style={styles.repeatTag}>
 <Text style={styles.repeatTagText}>
 🔁 {REPEAT_LABEL[r.repeat_interval]}
 </Text>
 </View>): null}
 </View>
 {r.description? <Text style={styles.reminderDesc}>{r.description}</Text>: null}
 <Text
 style={[styles.reminderDate,
 isOverdue(r) &&!r.is_completed && styles.reminderDateOverdue,]}
 >
 {isOverdue(r) &&!r.is_completed? 'Overdue · ': ''}
 {formatDate(r.due_date)}
 </Text>
 </View>
 <View style={styles.reminderActions}>
 {!r.is_completed? (<TouchableOpacity
 activeOpacity={0.7}
 onPress={() => handleComplete(r)}
 style={[styles.actionBtn, styles.doneBtn]}
 >
 <Ionicons name="checkmark" size={16} color={colors.success} />
 </TouchableOpacity>): null}
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => handleDelete(r)}
 style={[styles.actionBtn, styles.delBtn]}
 >
 <Ionicons name="close" size={14} color={colors.muted} />
 </TouchableOpacity>
 </View>
 </View>)))}
 </View>
 </ScrollView>

 <TouchableOpacity
 activeOpacity={0.8}
 onPress={() => router.push({ pathname: '/health-reminders/create', params: { petId: selectedPet } })}
 style={[styles.fab, { bottom: 24 + insets.bottom }]}
 >
 <Ionicons name="add" size={24} color="#fff" />
 </TouchableOpacity>
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 header: {
 paddingHorizontal: spacing.pageX,
 paddingTop: 4,
 paddingBottom: 0,
 },
 headerRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 },
 brandLogo: {
 height: 32,
 width: 120,
 },
 actionCircle: {
 width: 41.31,
 height: 41.31,
 borderRadius: 999,
 backgroundColor: colors.card,...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
 },
 typeFilter: {
 flexDirection: 'row',
 gap: 6,
 paddingHorizontal: spacing.pageX,
 paddingTop: spacing.md,
 },
 typeChip: {
 paddingVertical: 6,
 paddingHorizontal: 14,
 borderRadius: radius.pill,
 backgroundColor: colors.card,
 borderWidth: 1,
 borderColor: colors.border,
 },
 typeChipActive: {
 backgroundColor: colors.primary,
 borderColor: colors.primary,
 },
 typeChipText: {
 fontSize: 12,
 fontWeight: typography.weights.medium,
 color: colors.muted,
 },
 typeChipTextActive: {
 color: colors.card,
 },
 remindersList: {
 paddingHorizontal: 20,
 paddingTop: spacing.md,
 },
 emptyState: {
 alignItems: 'center',
 paddingVertical: 48,
 paddingHorizontal: 24,
 },
 emptyIcon: {
 fontSize: 40,
 marginBottom: 12,
 },
 emptyTitle: {
 fontSize: 16,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: 4,
 },
 emptyDesc: {
 fontSize: 13,
 color: colors.muted,
 },
 emptyText: {
 fontSize: 14,
 color: colors.muted,
 },
 reminderCard: {
 flexDirection: 'row',
 alignItems: 'flex-start',
 gap: 12,
 padding: 16,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 borderWidth: 1,
 borderColor: colors.border,...shadows.card,
 marginBottom: 10,
 },
 completedCard: {
 opacity: 0.5,
 },
 overdueCard: {
 borderColor: colors.danger,
 },
 reminderIcon: {
 width: 44,
 height: 44,
 borderRadius: 14,
 alignItems: 'center',
 justifyContent: 'center',
 flexShrink: 0,
 },
 reminderIconText: {
 fontSize: 20,
 },
 reminderBody: {
 flex: 1,
 minWidth: 0,
 },
 reminderTitle: {
 fontSize: 15,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: 4,
 },
 reminderMeta: {
 flexDirection: 'row',
 gap: 6,
 flexWrap: 'wrap',
 marginBottom: 4,
 },
 typeTag: {
 paddingVertical: 2,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 backgroundColor: 'rgba(0,0,0,0.04)',
 },
 typeTagText: {
 fontSize: 10,
 color: colors.muted,
 fontWeight: typography.weights.medium,
 },
 repeatTag: {
 paddingVertical: 2,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 backgroundColor: colors.primaryBg,
 },
 repeatTagText: {
 fontSize: 10,
 color: colors.primary,
 fontWeight: typography.weights.medium,
 },
 reminderDesc: {
 fontSize: 12,
 color: colors.muted,
 marginBottom: 4,
 lineHeight: 16,
 },
 reminderDate: {
 fontSize: 12,
 color: colors.muted,
 fontWeight: typography.weights.medium,
 },
 reminderDateOverdue: {
 color: colors.danger,
 },
 reminderActions: {
 flexDirection: 'column',
 gap: 6,
 flexShrink: 0,
 },
 actionBtn: {
 width: 32,
 height: 32,
 borderRadius: 10,
 alignItems: 'center',
 justifyContent: 'center',
 },
 doneBtn: {
 backgroundColor: 'rgba(108,138,105,0.1)',
 },
 delBtn: {
 backgroundColor: 'rgba(255,59,48,0.06)',
 },
 fab: {
 position: 'absolute',
 right: 20,
 width: 52,
 height: 52,
 borderRadius: 26,
 backgroundColor: colors.primary,...shadows.btn,
 alignItems: 'center',
 justifyContent: 'center',
 zIndex: 50,
 },
});
