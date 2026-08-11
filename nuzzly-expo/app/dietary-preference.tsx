import { useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 TextInput,
 Alert,
 StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { writeGateway } from '../src/lib/gateway';
import PageHeader from '../src/components/PageHeader';
import FormField from '../src/components/FormField';
import ChipGroup from '../src/components/ChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const STOMACH = [{ value: 'normal', label: 'Normal' },
 { value: 'sensitive', label: 'Sensitive' },
 { value: 'very_sensitive', label: 'Very Sensitive' },];

const SEVERITY_LABEL: Record<string, string> = { mild: '', Moderate: 'Moderate', severe: 'Severity' };

interface AllergyItem {
 id: string;
 allergen: string;
 severity: string;
 severityLabel: string;
}

function genId(): string {
 return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function DietaryPreferenceScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { petId: rawPetId, petName: rawPetName } = useLocalSearchParams<{ petId?: string; petName?: string }>();
 const { session } = useAuth();

 const petId = rawPetId || '';
 const petName = rawPetName || 'Pet';

 const [currentFood, setCurrentFood] = useState('');
 const [stomachHealth, setStomachHealth] = useState('normal');
 const [allergies, setAllergies] = useState<AllergyItem[]>([]);
 const [newAllergen, setNewAllergen] = useState('');
 const [newSeverity, setNewSeverity] = useState('mild');
 const [notes, setNotes] = useState('');
 const [saving, setSaving] = useState(false);
 const [completed, setCompleted] = useState(false);

 const userId = (session as any)?.user?.id;

 function addAllergy() {
 if (!newAllergen.trim()) return;
 setAllergies((prev) => [...prev,
 {
 id: genId(),
 allergen: newAllergen.trim(),
 severity: newSeverity,
 severityLabel: SEVERITY_LABEL[newSeverity],
 },]);
 setNewAllergen('');
 setNewSeverity('mild');
 }

 function removeAllergy(id: string) {
 setAllergies((prev) => prev.filter((a) => a.id!== id));
 }

 async function handleSubmit() {
 if (!userId ||!petId) {
 Alert.alert('Error', 'ParameterError');
 return;
 }
 setSaving(true);
 try {
 const { error: petErr } = await writeGateway('UPDATE_PET', { id: petId, stomach_health: stomachHealth });
 if (petErr) throw petErr;

 const allergyErrors: string[] = [];
 for (const a of allergies) {
 const { error } = await writeGateway('CREATE_PET_ALLERGY', {
 pet_id: petId,
 allergen: a.allergen,
 severity: a.severity,
 confirmed: false,
 });
 if (error) allergyErrors.push(`${a.allergen}: ${error}`);
 }
 if (allergyErrors.length > 0) {
 Alert.alert('ptsSave Failed', `ptsAllergySave Failed: ${allergyErrors.join(', ')}`);
 }

 if (currentFood.trim()) {
 const { error: dietErr } = await writeGateway('CREATE_DIET_LOG', {
 pet_id: petId,
 profile_id: userId,
 food_name: currentFood.trim(),
 food_type: 'dry_food',
 notes: notes.trim() || ' Record',
 logged_date: new Date().toISOString().slice(0, 10),
 });
 if (dietErr) console.error('[DietaryPreference] create diet log failed:', dietErr);
 }

 setCompleted(true);
 } catch (e: any) {
 Alert.alert('Save Failed', e.message || 'Please try again later');
 } finally {
 setSaving(false);
 }
 }

 function goHome() {
 router.replace('/');
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title={completed? 'SettingsDone': 'Dietgood'} />

 {completed? (<View style={styles.completeBody}>
 <Text style={styles.completeIcon}>鉁</Text>
 <Text style={styles.completeTitle}>SettingsDone!</Text>
 <Text style={styles.completeDesc}>
 {petName} Dietgood Record, on thismore Recommendations
 </Text>
 <TouchableOpacity
 activeOpacity={0.8}
 style={styles.completeBtn}
 onPress={goHome}
 >
 <Text style={styles.completeBtnText}>ViewRecommendations</Text>
 </TouchableOpacity>
 </View>): (<ScrollView
 contentContainerStyle={[styles.editBody, { paddingBottom: insets.bottom + spacing['3xl'] }]}
 showsVerticalScrollIndicator={false}
 >
 <Text style={styles.quickTip}> {petName} Diet</Text>

 <FormField
 label="agoeat Cat Food/Dog Food"
 type="input"
 value={currentFood}
 onChange={setCurrentFood}
 placeholder="if: hopeCat Food"
 />

 <FormField label="Stomach">
 <ChipGroup options={STOMACH} value={stomachHealth} onChange={setStomachHealth} />
 </FormField>

 <View style={styles.allergySection}>
 <View style={styles.allergyHeader}>
 <Text style={styles.allergyLabel}>鈿狅笍 Allergy</Text>
 </View>

 {allergies.length > 0 && (<View style={styles.allergyTags}>
 {allergies.map((a) => (<View key={a.id} style={styles.allergyTag}>
 <Text style={styles.allergyTagText}>
 {a.allergen} 路 {a.severityLabel}
 </Text>
 <TouchableOpacity
 activeOpacity={0.6}
 onPress={() => removeAllergy(a.id)}
 style={styles.allergyDel}
 >
 <Text style={styles.allergyDelText}>脳</Text>
 </TouchableOpacity>
 </View>))}
 </View>)}

 <View style={styles.allergyAddRow}>
 <TextInput
 style={styles.allergyIn}
 value={newAllergen}
 onChangeText={setNewAllergen}
 placeholder="if:, "
 placeholderTextColor={colors.muted}
 returnKeyType="done"
 onSubmitEditing={addAllergy}
 />
 <View style={styles.severitySelect}>
 {(['mild', 'Moderate', 'severe'] as const).map((s) => (<TouchableOpacity
 key={s}
 activeOpacity={0.8}
 onPress={() => setNewSeverity(s)}
 style={[styles.severityOption, newSeverity === s && styles.severityOptionActive]}
 >
 <Text
 style={[styles.severityOptionText,
 newSeverity === s && styles.severityOptionTextActive,]}
 >
 {SEVERITY_LABEL[s]}
 </Text>
 </TouchableOpacity>))}
 </View>
 <TouchableOpacity
 activeOpacity={0.8}
 style={[styles.allergyAddBtn,!newAllergen.trim() && { opacity: 0.4 }]}
 disabled={!newAllergen.trim()}
 onPress={addAllergy}
 >
 <Text style={styles.allergyAddBtnText}>+</Text>
 </TouchableOpacity>
 </View>
 </View>

 <FormField
 label="OtherNotes"
 type="textarea"
 value={notes}
 onChange={setNotes}
 placeholder="if: Not likeenjoyWet Food, eatFreeze-Dried..."
 rows={2}
 />

 <View style={styles.submitArea}>
 <TouchableOpacity
 activeOpacity={0.8}
 style={[styles.submitBtn, saving && { opacity: 0.5 }]}
 disabled={saving}
 onPress={handleSubmit}
 >
 <Text style={styles.submitBtnText}>
 {saving? 'Saving......': 'Saveand Recommendations'}
 </Text>
 </TouchableOpacity>
 <TouchableOpacity activeOpacity={0.7} onPress={goHome} style={styles.skipBtn}>
 <Text style={styles.skipBtnText}>Skip, LaterSettings</Text>
 </TouchableOpacity>
 </View>
 </ScrollView>)}
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 editBody: {
 paddingHorizontal: spacing.lg,
 },
 quickTip: {
 textAlign: 'center',
 fontSize: typography.sizes.sm,
 color: colors.muted,
 paddingVertical: spacing.md,
 paddingBottom: spacing.xl,
 },
 completeBody: {
 alignItems: 'center',
 paddingHorizontal: spacing['3xl'],
 paddingTop: 60,
 },
 completeIcon: {
 fontSize: 56,
 marginBottom: spacing.lg,
 },
 completeTitle: {
 fontSize: typography.sizes['2xl'],
 fontWeight: typography.weights.bold,
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 completeDesc: {
 fontSize: typography.sizes.base,
 color: colors.muted,
 textAlign: 'center',
 lineHeight: 24,
 marginBottom: spacing['3xl'],
 },
 completeBtn: {
 width: '100%',
 height: sizes.button,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
 },
 completeBtnText: {
 color: '#fff',
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
 allergySection: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 marginBottom: spacing.md,
 },
 allergyHeader: {
 marginBottom: spacing.sm,
 },
 allergyLabel: {
 fontSize: typography.sizes.sm,
 fontWeight: typography.weights.medium,
 color: colors.fg,
 },
 allergyTags: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: spacing.sm,
 marginBottom: spacing.sm,
 },
 allergyTag: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.xs,
 paddingVertical: spacing.sm,
 paddingHorizontal: spacing.md,
 borderRadius: radius.btn,
 backgroundColor: 'rgba(255, 59, 48, 0.06)',
 borderWidth: 1,
 borderColor: 'rgba(255, 59, 48, 0.12)',
 },
 allergyTagText: {
 fontSize: typography.sizes.xs,
 color: colors.danger,
 fontWeight: typography.weights.medium,
 },
 allergyDel: {
 paddingLeft: spacing.xs,
 },
 allergyDelText: {
 color: colors.danger,
 fontSize: 14,
 opacity: 0.6,
 },
 allergyAddRow: {
 flexDirection: 'row',
 gap: spacing.sm,
 alignItems: 'center',
 },
 allergyIn: {
 flex: 1,
 height: 40,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.lg,
 paddingHorizontal: spacing.md,
 fontSize: typography.sizes.sm,
 backgroundColor: colors.bg,
 color: colors.fg,
 },
 severitySelect: {
 flexDirection: 'row',
 gap: 2,
 borderRadius: radius.lg,
 overflow: 'hidden',
 borderWidth: 1,
 borderColor: colors.border,
 },
 severityOption: {
 paddingVertical: 10,
 paddingHorizontal: 6,
 backgroundColor: colors.card,
 alignItems: 'center',
 },
 severityOptionActive: {
 backgroundColor: colors.primary,
 },
 severityOptionText: {
 fontSize: 11,
 color: colors.fg,
 },
 severityOptionTextActive: {
 color: '#fff',
 },
 allergyAddBtn: {
 width: 40,
 height: 40,
 borderRadius: radius.lg,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
 allergyAddBtnText: {
 color: '#fff',
 fontSize: 18,
 lineHeight: 22,
 },
 submitArea: {
 marginTop: spacing['2xl'],
 gap: spacing.md,
 },
 submitBtn: {
 width: '100%',
 height: sizes.button,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
 },
 submitBtnText: {
 color: '#fff',
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
 skipBtn: {
 alignItems: 'center',
 paddingVertical: spacing.sm,
 },
 skipBtnText: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
});
