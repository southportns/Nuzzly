import { useEffect, useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 TextIn,
 Alert,
 StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiseaseRecords, DiseaseRecord } from '../src/hooks/useDiseaseRecords';
import PageHeader from '../src/components/PageHeader';
import BottomSheet from '../src/components/BottomSheet';
import EmptyState from '../src/components/EmptyState';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const SEVERITY_OPTIONS = [{ value: 'mild', label: '' },
 { value: 'Moderate', label: 'Moderate' },
 { value: 'severe', label: 'Severity' },];

const STATUS_OPTIONS = [{ value: 'active', label: 'Ongoing' },
 { value: 'under_treatment', label: 'Under Treatment' },
 { value: 'chronic', label: 'slow' },
 { value: 'resolved', label: 'Recovered' },];

const STATUS_BG: Record<string, string> = {
 active: '#fff3e0',
 under_treatment: '#e3f2fd',
 chronic: '#f5f5f5',
 resolved: '#e8f5e9',
};

const STATUS_TEXT: Record<string, string> = {
 active: '#f57c00',
 under_treatment: '#1976d2',
 chronic: '#666',
 resolved: '#2e7d32',
};

const SEVERITY_BG: Record<string, string> = {
 mild: '#e8f5e9',
 Moderate: '#fff3e0',
 severe: '#ffebee',
};

export default function DiseasesScreen() {
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const petId = pet || '';
 const insets = useSafeAreaInsets();
 const { diseaseRecords, loading, fetchDiseaseRecords, createDiseaseRecord, getSeverityLabel, getStatusLabel } =
 useDiseaseRecords();

 const [showSheet, setShowSheet] = useState(false);
 const [newName, setNewName] = useState('');
 const [newSeverity, setNewSeverity] = useState('mild');
 const [newStatus, setNewStatus] = useState('active');

 useEffect(() => {
 if (petId) fetchDiseaseRecords(petId);
 }, [petId]);

 const stats = useMemo(() => {
 const active = diseaseRecords.filter((d) => d.status === 'active' || d.status === 'under_treatment');
 const chronic = diseaseRecords.filter((d) => d.status === 'chronic');
 const resolved = diseaseRecords.filter((d) => d.status === 'resolved');
 return { active, chronic, resolved };
 }, [diseaseRecords]);

 async function handleAdd() {
 if (!newName.trim() ||!petId) return;
 try {
 await createDiseaseRecord({
 pet_id: petId,
 name: newName.trim(),
 severity: newSeverity as DiseaseRecord['severity'],
 status: newStatus as DiseaseRecord['status'],
 });
 setShowSheet(false);
 setNewName('');
 setNewSeverity('mild');
 setNewStatus('active');
 } catch (e: any) {
 Alert.alert('Save Failed', e.message || 'Please try again later');
 }
 }

 function formatDate(dateStr?: string) {
 if (!dateStr) return '-';
 const d = new Date(dateStr);
 return `${d.getMonth() + 1}/${d.getDate()}`;
 }

 const sheetFooter = (<View style={styles.sheetFooter}>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setShowSheet(false)} style={styles.btnCancel}>
 <Text style={styles.btnCancelText}>Cancel</Text>
 </TouchableOpacity>
 <TouchableOpacity
 activeOpacity={0.8}
 disabled={!newName.trim()}
 onPress={handleAdd}
 style={[styles.btnConfirm,!newName.trim() && styles.btnConfirmDisabled]}
 >
 <Text style={styles.btnConfirmText}>Save</Text>
 </TouchableOpacity>
 </View>);

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Record" actionText="Add" onAction={() => setShowSheet(true)} />

 <ScrollView
 contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
 showsVerticalScrollIndicator={false}
 >
 {!loading && (<View style={styles.statsRow}>
 <View style={styles.statCard}>
 <Text style={[styles.statValue, { color: '#ff9500' }]}>{stats.active.length}</Text>
 <Text style={styles.statLabel}>Ongoing</Text>
 </View>
 <View style={styles.statCard}>
 <Text style={[styles.statValue, { color: '#585858' }]}>{stats.chronic.length}</Text>
 <Text style={styles.statLabel}>slow</Text>
 </View>
 <View style={styles.statCard}>
 <Text style={[styles.statValue, { color: '#34c759' }]}>{stats.resolved.length}</Text>
 <Text style={styles.statLabel}>Recovered</Text>
 </View>
 </View>)}

 {!loading && diseaseRecords.length === 0? (<EmptyState icon="🏥" title="NoneRecord" />): (<View style={styles.list}>
 {diseaseRecords.map((record) => (<View key={record.id} style={styles.recordCard}>
 <View style={[styles.recordIcon, { backgroundColor: SEVERITY_BG[record.severity] || '#f5f5f5' }]}>
 <Text style={styles.recordIconText}>🏥</Text>
 </View>
 <View style={styles.recordInfo}>
 <Text style={styles.recordName}>{record.name}</Text>
 <View style={styles.recordMeta}>
 <View
 style={[styles.statusTag,
 { backgroundColor: STATUS_BG[record.status] || '#f5f5f5' },]}
 >
 <Text style={[styles.statusTagText, { color: STATUS_TEXT[record.status] || '#666' }]}>
 {getStatusLabel(record.status)}
 </Text>
 </View>
 <View
 style={[styles.severityTag,
 { backgroundColor: SEVERITY_BG[record.severity] || '#f5f5f5' },]}
 >
 <Text style={styles.severityTagText}>{getSeverityLabel(record.severity)}</Text>
 </View>
 </View>
 </View>
 <Text style={styles.recordDate}>{formatDate(record.diagnosed_on)}</Text>
 </View>))}
 </View>)}
 </ScrollView>

 <BottomSheet
 visible={showSheet}
 onClose={() => setShowSheet(false)}
 title="Add DiseaseRecord"
 footer={sheetFooter}
 >
 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>Disease Name</Text>
 <TextIn
 value={newName}
 onChangeText={setNewName}
 placeholder="if:, Stomach"
 placeholderTextColor={colors.muted}
 style={styles.formIn}
 />
 </View>

 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>Severity </Text>
 <View style={styles.optionsRow}>
 {SEVERITY_OPTIONS.map((opt) => {
 const active = newSeverity === opt.value;
 return (<TouchableOpacity
 key={opt.value}
 activeOpacity={0.8}
 onPress={() => setNewSeverity(opt.value)}
 style={[styles.optionBtn, active && styles.optionBtnActive]}
 >
 <Text style={[styles.optionBtnText, active && styles.optionBtnTextActive]}>{opt.label}</Text>
 </TouchableOpacity>);
 })}
 </View>
 </View>

 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>agoStatus</Text>
 <View style={styles.optionsRow}>
 {STATUS_OPTIONS.map((opt) => {
 const active = newStatus === opt.value;
 return (<TouchableOpacity
 key={opt.value}
 activeOpacity={0.8}
 onPress={() => setNewStatus(opt.value)}
 style={[styles.optionBtn, active && styles.optionBtnActive]}
 >
 <Text style={[styles.optionBtnText, active && styles.optionBtnTextActive]}>{opt.label}</Text>
 </TouchableOpacity>);
 })}
 </View>
 </View>
 </BottomSheet>
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 body: {
 paddingHorizontal: spacing.pageX,
 paddingTop: spacing.md,
 },
 statsRow: {
 flexDirection: 'row',
 gap: 12,
 marginVertical: spacing.md,
 },
 statCard: {
 flex: 1,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.md,
 alignItems: 'center',
 },
 statValue: {
 fontSize: 28,
 fontWeight: typography.weights.semibold,
 },
 statLabel: {
 fontSize: 12,
 color: colors.muted,
 marginTop: 4,
 },
 list: {
 paddingVertical: spacing.md,
 },
 recordCard: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 12,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: 14,
 marginBottom: 8,
 },
 recordIcon: {
 width: 40,
 height: 40,
 borderRadius: 10,
 alignItems: 'center',
 justifyContent: 'center',
 },
 recordIconText: {
 fontSize: 20,
 },
 recordInfo: {
 flex: 1,
 },
 recordName: {
 fontSize: 15,
 fontWeight: typography.weights.medium,
 color: colors.fg,
 },
 recordMeta: {
 flexDirection: 'row',
 gap: 8,
 marginTop: 4,
 },
 statusTag: {
 paddingVertical: 2,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 },
 statusTagText: {
 fontSize: 11,
 },
 severityTag: {
 paddingVertical: 2,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 },
 severityTagText: {
 fontSize: 11,
 color: colors.fg,
 },
 recordDate: {
 fontSize: 13,
 color: colors.muted,
 },
 formGroup: {
 marginBottom: spacing.md,
 },
 formLabel: {
 fontSize: 14,
 color: colors.muted,
 marginBottom: spacing.sm,
 },
 formIn: {
 height: sizes.in,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 paddingHorizontal: spacing.md,
 fontSize: typography.sizes.md,
 color: colors.fg,
 backgroundColor: colors.bg,
 },
 optionsRow: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 8,
 },
 optionBtn: {
 paddingVertical: 8,
 paddingHorizontal: 14,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 backgroundColor: colors.card,
 },
 optionBtnActive: {
 backgroundColor: colors.primary,
 borderColor: colors.primary,
 },
 optionBtnText: {
 fontSize: 13,
 color: colors.fg,
 },
 optionBtnTextActive: {
 color: colors.card,
 },
 sheetFooter: {
 flexDirection: 'row',
 gap: spacing.md,
 marginTop: spacing.sm,
 },
 btnCancel: {
 flex: 1,
 paddingVertical: 12,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 backgroundColor: colors.card,
 alignItems: 'center',
 },
 btnCancelText: {
 fontSize: 15,
 color: colors.fg,
 },
 btnConfirm: {
 flex: 1,
 paddingVertical: 12,
 borderRadius: radius.md,
 backgroundColor: colors.primary,
 alignItems: 'center',
 },
 btnConfirmDisabled: {
 opacity: 0.5,
 },
 btnConfirmText: {
 fontSize: 15,
 color: colors.card,
 },
});
