import { useEffect, useState } from 'react';
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
import { useAllergies, Allergy } from '../src/hooks/useAllergies';
import PageHeader from '../src/components/PageHeader';
import BottomSheet from '../src/components/BottomSheet';
import EmptyState from '../src/components/EmptyState';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const SEVERITY_OPTIONS = [{ value: 'mild', label: '' },
 { value: 'Moderate', label: 'Moderate' },
 { value: 'severe', label: 'Severity' },];

const SEVERITY_BG: Record<string, string> = {
 mild: '#e8f5e9',
 Moderate: '#fff3e0',
 severe: '#ffebee',
};

const SEVERITY_ICON: Record<string, string> = {
 mild: '⚠️',
 Moderate: '🔶',
 severe: '🔴',
};

function getSeverityClass(severity: string) {
 return SEVERITY_BG[severity] || SEVERITY_BG.mild;
}

function getSeverityIcon(severity: string) {
 return SEVERITY_ICON[severity] || '⚠️';
}

export default function AllergiesScreen() {
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const petId = pet || '';
 const insets = useSafeAreaInsets();
 const { allergies, loading, fetchAllergies, addAllergy, deleteAllergy, getSeverityLabel } =
 useAllergies();

 const [showSheet, setShowSheet] = useState(false);
 const [newAllergen, setNewAllergen] = useState('');
 const [newSeverity, setNewSeverity] = useState('mild');
 const [newConfirmed, setNewConfirmed] = useState(false);

 useEffect(() => {
 if (petId) fetchAllergies(petId);
 }, [petId]);

 async function handleAdd() {
 if (!newAllergen.trim() ||!petId) return;
 try {
 await addAllergy({
 pet_id: petId,
 allergen: newAllergen.trim(),
 severity: newSeverity as Allergy['severity'],
 confirmed: newConfirmed,
 });
 setShowSheet(false);
 setNewAllergen('');
 setNewSeverity('mild');
 setNewConfirmed(false);
 } catch (e: any) {
 Alert.alert('Add Failed', e.message || 'Please try again later');
 }
 }

 function handleDelete(allergy: Allergy) {
 Alert.alert('DeleteAllergy', `OKDelete"${allergy.allergen}"?`, [{ text: 'Cancel', style: 'cancel' },
 {
 text: 'Delete',
 style: 'destructive',
 onPress: async () => {
 try {
 await deleteAllergy(allergy.id);
 } catch (e: any) {
 Alert.alert('Delete Failed', e.message || 'Please try again later');
 }
 },
 },]);
 }

 const sheetFooter = (<View style={styles.sheetFooter}>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setShowSheet(false)} style={styles.btnCancel}>
 <Text style={styles.btnCancelText}>Cancel</Text>
 </TouchableOpacity>
 <TouchableOpacity
 activeOpacity={0.8}
 disabled={!newAllergen.trim()}
 onPress={handleAdd}
 style={[styles.btnConfirm,!newAllergen.trim() && styles.btnConfirmDisabled]}
 >
 <Text style={styles.btnConfirmText}>Add</Text>
 </TouchableOpacity>
 </View>);

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="AllergyManagement" actionText="Add" onAction={() => setShowSheet(true)} />

 <ScrollView
 contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
 showsVerticalScrollIndicator={false}
 >
 {loading? (<View style={styles.skeletonList}>
 {[1, 2, 3].map((i) => (<View key={i} style={styles.skeletonRow}>
 <View style={styles.shimmerCircle} />
 <View style={styles.shimmerLine} />
 </View>))}
 </View>): allergies.length === 0? (<EmptyState
 icon="🛡️"
 title="NoneAllergyRecord"
 description="AddAllergy HelpopenmutualcloseIngredients"
 />): (<View style={styles.list}>
 {allergies.map((allergy) => (<View key={allergy.id} style={styles.allergyCard}>
 <View style={[styles.allergyIcon, { backgroundColor: getSeverityClass(allergy.severity) }]}>
 <Text style={styles.allergyIconText}>{getSeverityIcon(allergy.severity)}</Text>
 </View>
 <View style={styles.allergyInfo}>
 <Text style={styles.allergyName}>{allergy.allergen}</Text>
 <View style={styles.allergyMeta}>
 <View
 style={[styles.severityTag,
 { backgroundColor: getSeverityClass(allergy.severity) },]}
 >
 <Text style={styles.severityTagText}>{getSeverityLabel(allergy.severity)}</Text>
 </View>
 {allergy.confirmed? (<View style={styles.confirmedTag}>
 <Text style={styles.confirmedTagText}>Confirmed</Text>
 </View>): null}
 </View>
 </View>
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => handleDelete(allergy)}
 style={styles.deleteBtn}
 >
 <Text style={styles.deleteBtnText}>×</Text>
 </TouchableOpacity>
 </View>))}
 </View>)}
 </ScrollView>

 <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title="AddAllergy" footer={sheetFooter}>
 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>AllergyName</Text>
 <TextIn
 value={newAllergen}
 onChangeText={setNewAllergen}
 placeholder="if:,, "
 placeholderTextColor={colors.muted}
 style={styles.formIn}
 />
 </View>

 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>Severity </Text>
 <View style={styles.severityOptions}>
 {SEVERITY_OPTIONS.map((opt) => {
 const active = newSeverity === opt.value;
 return (<TouchableOpacity
 key={opt.value}
 activeOpacity={0.8}
 onPress={() => setNewSeverity(opt.value)}
 style={[styles.severityBtn, active && styles.severityBtnActive]}
 >
 <Text style={[styles.severityBtnText, active && styles.severityBtnTextActive]}>
 {opt.label}
 </Text>
 </TouchableOpacity>);
 })}
 </View>
 </View>

 <View style={styles.formGroup}>
 <View style={styles.toggleRow}>
 <Text style={styles.formLabel}>ConfirmStatus</Text>
 <TouchableOpacity
 activeOpacity={0.8}
 onPress={() => setNewConfirmed((v) =>!v)}
 style={[styles.toggleBtn, newConfirmed && styles.toggleBtnActive]}
 >
 <View style={[styles.toggleDot, newConfirmed && styles.toggleDotActive]} />
 </TouchableOpacity>
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
 skeletonList: {
 paddingVertical: spacing.md,
 },
 skeletonRow: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 12,
 padding: 12,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 marginBottom: 8,
 },
 shimmerCircle: {
 width: 40,
 height: 40,
 borderRadius: 20,
 backgroundColor: 'rgba(0,0,0,0.06)',
 },
 shimmerLine: {
 flex: 1,
 height: 16,
 borderRadius: 4,
 backgroundColor: 'rgba(0,0,0,0.06)',
 maxWidth: '60%',
 },
 list: {
 paddingVertical: spacing.md,
 },
 allergyCard: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 12,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: 12,
 marginBottom: 8,
 },
 allergyIcon: {
 width: 40,
 height: 40,
 borderRadius: 20,
 alignItems: 'center',
 justifyContent: 'center',
 },
 allergyIconText: {
 fontSize: 18,
 },
 allergyInfo: {
 flex: 1,
 },
 allergyName: {
 fontSize: 15,
 fontWeight: typography.weights.medium,
 color: colors.fg,
 },
 allergyMeta: {
 flexDirection: 'row',
 gap: 8,
 marginTop: 4,
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
 confirmedTag: {
 paddingVertical: 2,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 backgroundColor: '#e3f2fd',
 },
 confirmedTagText: {
 fontSize: 11,
 color: '#1976d2',
 },
 deleteBtn: {
 width: 28,
 height: 28,
 borderRadius: 14,
 backgroundColor: colors.bg,
 alignItems: 'center',
 justifyContent: 'center',
 },
 deleteBtnText: {
 color: colors.muted,
 fontSize: 18,
 lineHeight: 22,
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
 severityOptions: {
 flexDirection: 'row',
 gap: 8,
 },
 severityBtn: {
 flex: 1,
 paddingVertical: 10,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 backgroundColor: colors.card,
 alignItems: 'center',
 },
 severityBtnActive: {
 backgroundColor: colors.primary,
 borderColor: colors.primary,
 },
 severityBtnText: {
 fontSize: 14,
 color: colors.fg,
 },
 severityBtnTextActive: {
 color: colors.card,
 },
 toggleRow: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 },
 toggleBtn: {
 width: 48,
 height: 28,
 borderRadius: 14,
 backgroundColor: colors.border,
 justifyContent: 'center',
 paddingHorizontal: 2,
 },
 toggleBtnActive: {
 backgroundColor: colors.primary,
 },
 toggleDot: {
 width: 24,
 height: 24,
 borderRadius: 12,
 backgroundColor: colors.card,
 },
 toggleDotActive: {
 alignSelf: 'flex-end',
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
