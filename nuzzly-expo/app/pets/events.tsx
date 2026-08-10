import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextIn, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePetevents } from '../../src/hooks/usePetevents';
import PageHeader from '../../src/components/PageHeader';
import BottomSheet from '../../src/components/BottomSheet';
import EmptyState from '../../src/components/EmptyState';
import { colors, spacing, radius, shadows, typography } from '../../src/theme/tokens';

const EVENT_TYPE_OPTIONS = [
 { value: 'symptom', label: 'Symptom', icon: '🏥' },
 { value: 'medication', label: 'Medication', icon: '💊' },
 { value: 'vet_visit', label: 'Vet Visit', icon: '👨‍⚕️' },
 { value: 'vaccination', label: 'Vaccine', icon: '💉' },
 { value: 'other', label: 'Other', icon: '📝' },
];

const TYPE_COLORS: Record<string, string> = {
 symptom: '#FF3B30',
 medication: '#007AFF',
 vet_visit: '#34C759',
 vaccination: '#5856D6',
 other: '#999999',
};

export default function PeteventsScreen() {
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const petId = pet || '';
 const insets = useSafeAreaInsets();
 const { petevents, loading, fetchPetevents, createPetevent, geteventTypeLabel, groupeventsByDate } = usePetevents();

 const [showSheet, setShowSheet] = useState(false);
 const [newType, setNewType] = useState('symptom');
 const [newNotes, setNewNotes] = useState('');

 useEffect(() => {
 if (petId) fetchPetevents(petId);
 }, [petId]);

 const grouped = useMemo(() => groupeventsByDate(petevents), [petevents, groupeventsByDate]);
 const eventTypeCounts = useMemo(() => {
 const counts: Record<string, number> = {};
 for (const e of petevents) {
 counts[e.event_type] = (counts[e.event_type] || 0) + 1;
 }
 return counts;
 }, [petevents]);

 function formatDate(dateStr: string) {
 const d = new Date(dateStr);
 const today = new Date();
 if (d.toDateString() === today.toDateString()) return 'Today';
 return `${d.getMonth() + 1}M${d.getDate()}D`;
 }

 async function handleAdd() {
 if (!petId) return;
 try {
 await createPetevent({
 pet_id: petId,
 event_type: newType,
 notes: newNotes.trim() || null,
 });
 setShowSheet(false);
 setNewNotes('');
 setNewType('symptom');
 } catch (e: any) {
 Alert.alert('Add Failed', e.message || 'Add Failed');
 }
 }

 return (
 <View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Petevent" actionText="Record" onAction={() => setShowSheet(true)} showBack />

 {!loading && (
 <View style={styles.typeStats}>
 {EVENT_TYPE_OPTIONS.slice(0, 4).map((opt) => (
 <View key={opt.value} style={styles.typeItem}>
 <Text style={styles.typeIcon}>{opt.icon}</Text>
 <Text style={styles.typeCount}>{eventTypeCounts[opt.value] || 0}</Text>
 </View>
 ))}
 </View>
 )}

 <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
 {!loading && petevents.length === 0 && (
 <EmptyState icon="📅" title="NoneeventRecord" />
 )}

 {Object.entries(grouped).map(([date, events]) => (
 <View key={date} style={styles.timelineGroup}>
 <Text style={styles.timelineDate}>{formatDate(date)}</Text>
 {events.map((event) => (
 <View key={event.id || `${event.event_time}-${event.notes}`} style={styles.timelineItem}>
 <View
 style={[styles.timelineDot, { backgroundColor: TYPE_COLORS[event.event_type] || TYPE_COLORS.other }]}
 />
 <View style={styles.timelineContent}>
 <Text style={styles.eventType}>{geteventTypeLabel(event.event_type)}</Text>
 {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
 </View>
 </View>
 ))}
 </View>
 ))}
 </ScrollView>

 <BottomSheet
 visible={showSheet}
 onClose={() => setShowSheet(false)}
 title="Recordevent"
 footer={
 <>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setShowSheet(false)} style={styles.cancelBtn}>
 <Text style={styles.cancelBtnText}>Cancel</Text>
 </TouchableOpacity>
 <TouchableOpacity activeOpacity={0.8} onPress={handleAdd} style={styles.confirmBtn}>
 <Text style={styles.confirmBtnText}>Save</Text>
 </TouchableOpacity>
 </>
 }
 >
 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>eventType</Text>
 <View style={styles.typeOptions}>
 {EVENT_TYPE_OPTIONS.map((opt) => {
 const active = newType === opt.value;
 return (
 <TouchableOpacity
 key={opt.value}
 activeOpacity={0.8}
 onPress={() => setNewType(opt.value)}
 style={[styles.typeBtn, active && styles.typeBtnActive]}
 >
 <Text style={styles.typeBtnIcon}>{opt.icon}</Text>
 <Text style={[styles.typeBtnLabel, active && styles.typeBtnLabelActive]}>{opt.label}</Text>
 </TouchableOpacity>
 );
 })}
 </View>
 </View>
 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>Description</Text>
 <TextIn
 value={newNotes}
 onChangeText={setNewNotes}
 placeholder="RecordeventDetails..."
 placeholderTextColor={colors.muted}
 multiline
 numberOfLines={3}
 style={styles.textarea}
 />
 </View>
 </BottomSheet>
 </View>
 );
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 typeStats: {
 flexDirection: 'row',
 gap: spacing.sm,
 marginHorizontal: spacing.pageX,
 marginTop: spacing.md,
 marginBottom: spacing.sm,
 },
 typeItem: {
 flex: 1,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.md,
 alignItems: 'center',
 ...shadows.sm,
 },
 typeIcon: {
 fontSize: 24,
 marginBottom: 4,
 },
 typeCount: {
 fontSize: typography.sizes.xl,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 },
 timelineGroup: {
 marginHorizontal: spacing.pageX,
 marginBottom: spacing.lg,
 },
 timelineDate: {
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 timelineItem: {
 flexDirection: 'row',
 gap: spacing.md,
 marginBottom: spacing.sm,
 },
 timelineDot: {
 width: 12,
 height: 12,
 borderRadius: 6,
 marginTop: 4,
 },
 timelineContent: {
 flex: 1,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.md,
 ...shadows.sm,
 },
 eventType: {
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.medium,
 color: colors.fg,
 },
 eventNotes: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginTop: 4,
 },
 formGroup: {
 marginBottom: spacing.md,
 },
 formLabel: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginBottom: spacing.sm,
 fontWeight: typography.weights.semibold,
 },
 typeOptions: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: spacing.sm,
 },
 typeBtn: {
 width: '31%',
 alignItems: 'center',
 gap: 4,
 paddingVertical: spacing.md,
 borderRadius: radius.lg,
 backgroundColor: colors.bg,
 borderWidth: 1,
 borderColor: colors.border,
 },
 typeBtnActive: {
 backgroundColor: colors.primary,
 borderColor: colors.primary,
 },
 typeBtnIcon: {
 fontSize: 20,
 },
 typeBtnLabel: {
 fontSize: typography.sizes.sm,
 color: colors.fg,
 },
 typeBtnLabelActive: {
 color: colors.card,
 fontWeight: typography.weights.semibold,
 },
 textarea: {
 height: 80,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 padding: spacing.md,
 fontSize: typography.sizes.base,
 color: colors.fg,
 backgroundColor: colors.bg,
 textAlignVertical: 'top',
 },
 cancelBtn: {
 flex: 1,
 height: 46,
 borderRadius: radius.btn,
 backgroundColor: colors.bg,
 alignItems: 'center',
 justifyContent: 'center',
 borderWidth: 1,
 borderColor: colors.border,
 },
 cancelBtnText: {
 fontSize: typography.sizes.base,
 color: colors.fg,
 fontWeight: typography.weights.medium,
 },
 confirmBtn: {
 flex: 1,
 height: 46,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
 confirmBtnText: {
 fontSize: typography.sizes.base,
 color: '#fff',
 fontWeight: typography.weights.semibold,
 },
});
