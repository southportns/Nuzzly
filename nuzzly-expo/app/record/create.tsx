import { useEffect, useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 TextIn,
 TouchableOpacity,
 Alert,
 StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePets } from '../../src/hooks/usePets';
import { useDietLogs } from '../../src/hooks/useDietLogs';
import { useHealth Recordss } from '../../src/hooks/useHealth Recordss';
import PageHeader from '../../src/components/PageHeader';
import FormField from '../../src/components/FormField';
import ChipGroup from '../../src/components/ChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const TABS = [{ value: 'diet', label: 'Diet' },
 { value: 'health', label: 'Health' },
 { value: 'weight', label: 'Weight' },];

const FOOD_TYPES = [{ value: 'dry_food', label: 'Dry Food', emoji: '🍖' },
 { value: 'wet_food', label: 'Wet Food', emoji: '🐟' },
 { value: 'water', label: '', emoji: '💧' },
 { value: 'treat', label: 'Treats', emoji: '🦴' },];

const RECORD_TYPES = [{ value: 'vaccination', label: 'Vaccine', emoji: '💉' },
 { value: 'symptom', label: 'Symptom', emoji: '🩺' },
 { value: 'medication', label: 'Medication', emoji: '💊' },
 { value: 'diagnosis', label: 'Diagnosis', emoji: '📋' },
 { value: 'checkup', label: 'Check-up', emoji: '🩻' },];

const SEVERITY = [{ value: 'mild', label: 'Mild' },
 { value: 'Moderate', label: 'Moderate' },
 { value: 'severe', label: 'Severe' },];

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

export default function RecordCreateScreen() {
 const { type, petId } = useLocalSearchParams<{ type?: string; petId?: string }>();
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { pets, fetchPets, updatePet } = usePets();
 const { addDietLog } = useDietLogs();
 const { addHealth Records } = useHealth Recordss();

 const [tab, setTab] = useState(type === 'health'? 'health': type === 'weight'? 'weight': 'diet');
 const [saving, setSaving] = useState(false);

 const [selectedPetId, setSelectedPetId] = useState(petId || '');
 const [dietForm, setDietForm] = useState({
 food_name: '',
 food_type: 'dry_food',
 notes: '',
 logged_date: today(),
 });
 const [healthForm, setHealthForm] = useState({
 record_type: 'vaccination',
 severity: 'mild',
 record_time: now(),
 notes: '',
 });
 const [weightForm, setWeightForm] = useState({
 weight_kg: '',
 record_time: now(),
 notes: '',
 });

 const petOptions = useMemo(() =>
 pets.map((p) => ({
 value: p.id,
 label: p.name,
 emoji: SPECIES_EMOJI[p.species] || '🐾',
 })),
 [pets]);

 useEffect(() => {
 fetchPets().then(() => {
 if (!selectedPetId && pets.length) setSelectedPetId(pets[0].id);
 });
 }, []);

 useEffect(() => {
 if (!selectedPetId && pets.length) setSelectedPetId(pets[0].id);
 }, [pets]);

 function today() {
 return new Date().toISOString().slice(0, 10);
 }

 function now() {
 const d = new Date();
 const off = d.getTimezoneOffset();
 d.setMinutes(d.getMinutes() - off);
 return d.toISOString().slice(0, 16);
 }

 async function handleSave() {
 if (saving) return;
 if (!selectedPetId) {
 Alert.alert('Please selectPet');
 return;
 }

 setSaving(true);
 try {
 if (tab === 'diet') {
 if (!dietForm.food_name.trim()) {
 Alert.alert('Please fill in Name');
 setSaving(false);
 return;
 }
 await addDietLog({
 pet_id: selectedPetId,
 food_name: dietForm.food_name.trim(),
 food_type: dietForm.food_type,
 notes: dietForm.notes,
 logged_date: dietForm.logged_date,
 });
 } else if (tab === 'health') {
 if (!healthForm.notes.trim()) {
 Alert.alert('Please fill inDetails');
 setSaving(false);
 return;
 }
 await addHealth Records({
 pet_id: selectedPetId,
 record_type: healthForm.record_type,
 severity: healthForm.severity,
 record_time: healthForm.record_time,
 notes: healthForm.notes,
 });
 } else {
 if (!weightForm.weight_kg) {
 Alert.alert('Please fill inWeight');
 setSaving(false);
 return;
 }
 const kg = Math.round(Number(weightForm.weight_kg) * 100) / 100;
 await addHealth Records({
 pet_id: selectedPetId,
 record_type: 'weight',
 weight_kg: kg,
 record_time: weightForm.record_time,
 notes: weightForm.notes,
 });
 await updatePet(selectedPetId, { weight_kg: kg });
 }
 Alert.alert('Record Add');
 router.back();
 } catch (e: any) {
 Alert.alert('Add Failed', e.message || 'Please try again later');
 } finally {
 setSaving(false);
 }
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader
 title="Add Record"
 actionText="Save"
 actionLoading={saving}
 actionDisabled={saving}
 onAction={handleSave}
 />
 <ScrollView
 contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
 keyboardShouldPersistTaps="handled"
 >
 <View style={styles.tabBar}>
 {TABS.map((t) => {
 const active = tab === t.value;
 return (<TouchableOpacity
 key={t.value}
 activeOpacity={0.8}
 onPress={() => setTab(t.value)}
 style={[styles.tabItem, active && styles.tabItemActive]}
 >
 <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
 </TouchableOpacity>);
 })}
 </View>

 <FormField label="Select Pet" required>
 <ChipGroup options={petOptions} value={selectedPetId} onChange={setSelectedPetId} />
 {!pets.length? <Text style={styles.emptyHint}>NonePet, Please create firstprofile</Text>: null}
 </FormField>

 {tab === 'diet' && (<>
 <FormField
 label=" Name"
 required
 type="in"
 value={dietForm.food_name}
 onChange={(v: string) => setDietForm((f) => ({...f, food_name: v }))}
 placeholder="if: hopeCat Food"
 />
 <FormField label=" Type" required>
 <ChipGroup
 options={FOOD_TYPES}
 value={dietForm.food_type}
 onChange={(v: string) => setDietForm((f) => ({...f, food_type: v }))}
 />
 </FormField>
 <FormField
 label="Notes(/Timeetc.)"
 type="textarea"
 value={dietForm.notes}
 onChange={(v: string) => setDietForm((f) => ({...f, notes: v }))}
 placeholder="if: · 25g"
 rows={2}
 />
 <FormField label="Date" required>
 <TextIn
 value={dietForm.logged_date}
 onChangeText={(v) => setDietForm((f) => ({...f, logged_date: v }))}
 placeholder="YYYY-MM-DD"
 placeholderTextColor={colors.muted}
 style={styles.dateIn}
 />
 </FormField>
 </>)}

 {tab === 'health' && (<>
 <FormField label="Record Type" required>
 <ChipGroup
 options={RECORD_TYPES}
 value={healthForm.record_type}
 onChange={(v: string) => setHealthForm((f) => ({...f, record_type: v }))}
 />
 </FormField>
 <FormField label="Severity " required>
 <ChipGroup
 options={SEVERITY}
 value={healthForm.severity}
 onChange={(v: string) => setHealthForm((f) => ({...f, severity: v }))}
 />
 </FormField>
 <FormField label="Time" required>
 <TextIn
 value={healthForm.record_time}
 onChangeText={(v) => setHealthForm((f) => ({...f, record_time: v }))}
 placeholder="YYYY-MM-DDTHH:MM"
 placeholderTextColor={colors.muted}
 style={styles.dateIn}
 />
 </FormField>
 <FormField
 label="Detailssaynext"
 type="textarea"
 value={healthForm.notes}
 onChange={(v: string) => setHealthForm((f) => ({...f, notes: v }))}
 placeholder="if: Cat3Vaccine · Completed · Next 2026-09"
 rows={3}
 />
 </>)}

 {tab === 'weight' && (<>
 <FormField
 label="Weight(kg)"
 required
 type="number"
 value={weightForm.weight_kg}
onChange={(v: string) =>
					setWeightForm((f) => ({...f, weight_kg: v }))
				}
 placeholder="if: 4.8"
 />
 <FormField label="Time" required>
 <TextIn
 value={weightForm.record_time}
 onChangeText={(v) => setWeightForm((f) => ({...f, record_time: v }))}
 placeholder="YYYY-MM-DDTHH:MM"
 placeholderTextColor={colors.muted}
 style={styles.dateIn}
 />
 </FormField>
 <FormField
 label="Notes"
 type="textarea"
 value={weightForm.notes}
 onChange={(v: string) => setWeightForm((f) => ({...f, notes: v }))}
 placeholder="Optional"
 rows={2}
 />
 </>)}
 </ScrollView>
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
 tabBar: {
 flexDirection: 'row',
 gap: spacing.sm,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: 4,
 marginBottom: spacing.md,...shadows.card,
 },
 tabItem: {
 flex: 1,
 alignItems: 'center',
 paddingVertical: spacing.sm + 2,
 borderRadius: radius.md,
 },
 tabItemActive: {
 backgroundColor: colors.primary,
 },
 tabText: {
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.medium,
 color: colors.muted,
 },
 tabTextActive: {
 color: colors.card,
 fontWeight: typography.weights.semibold,
 },
 emptyHint: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 paddingVertical: spacing.sm,
 },
 dateIn: {
 height: sizes.in,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 paddingHorizontal: spacing.md,
 fontSize: typography.sizes.md,
 color: colors.fg,
 backgroundColor: colors.bg,
 },
});
