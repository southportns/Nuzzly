import { useEffect, useMemo, useState } from 'react';
import {
 View,
 Text,
 TextIn,
 TouchableOpacity,
 ScrollView,
 Image,
 StyleSheet,
 Alert,
 ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { writeGateway } from '../../src/lib/gateway';
import { usePets } from '../../src/hooks/usePets';
import PageHeader from '../../src/components/PageHeader';
import ChipGroup from '../../src/components/ChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const SPECIES = [{ value: 'cat', label: 'Cat' },
 { value: 'dog', label: 'Dog' },];
const STOMACH = [{ value: 'normal', label: 'Good' },
 { value: 'sensitive', label: 'Sensitive' },
 { value: 'very_sensitive', label: 'Very Sensitive' },];
const SOURCE = [{ value: 'purchased', label: 'Purchased' },
 { value: 'stray_adopted', label: 'Stray Adopted' },
 { value: 'home_raised', label: 'Home Raised' },
 { value: 'wild_rescued', label: 'Wild Rescued' },
 { value: 'other', label: 'Other' },];
const INDOOR = [{ value: 'indoor', label: 'Indoor Only' },
 { value: 'outdoor', label: 'Outdoor Only' },
 { value: 'both', label: 'Both' },];
const ACTIVITY = [{ value: 'low', label: 'Low' },
 { value: 'medium', label: 'Medium' },
 { value: 'high', label: 'premium' },];

interface BreedItem {
 canonical: string;
 aliases: string[];
}

export default function PetCreateScreen() {
 const { id } = useLocalSearchParams<{ id?: string }>();
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { createPet, updatePet } = usePets();
 const editMode =!!id;

 const [form, setForm] = useState({
 name: '',
 species: 'cat',
 breed: '',
 gender: 'male',
 birth_date: '',
 age_Y: '',
 age_months: '',
 age_days: '',
 weight_kg: '',
 neutered: false,
 stomach_health: 'normal',
 pet_source: 'other',
 home_date: '',
 photo_url: '',
 is_active: true,
 });
 const [environment, setEnvironment] = useState({
 indoor_outdoor: 'indoor',
 activity_level: 'medium',
 multi_pet_household: false,
 pet_count: '2',
 has_children: false,
 });

 const [avatarFile, setAvatarFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
 const [avatarPreview, setAvatarPreview] = useState('');
 const [generatingAvatar, setGeneratingAvatar] = useState(false);
 const [generatedAvatar, setGeneratedAvatar] = useState(false);
 const [saving, setSaving] = useState(false);
 const [showBreedDropdown, setShowBreedDropdown] = useState(false);
 const [breedResults, setBreedResults] = useState<BreedItem[]>([]);
 const [breedCache, setBreedCache] = useState<BreedItem[]>([]);

 const today = useMemo(() => new Date().toISOString().split('T')[0], []);

 useEffect(() => {
 loadBreeds(form.species);
 if (id) loadPetData(id);
 }, [id]);

 useEffect(() => {
 setForm((f) => ({...f, breed: '' }));
 setBreedResults([]);
 loadBreeds(form.species);
 }, [form.species]);

 async function loadBreeds(species: string) {
 try {
 const { data } = await supabase.from('breed_aliases').select('canonical, alias').eq('species', species).limit(500);
 const map = new Map<string, string[]>();
 for (const row of data || []) {
 if (!map.has(row.canonical)) map.set(row.canonical, []);
 if (row.alias &&!map.get(row.canonical)!.includes(row.alias)) map.get(row.canonical)!.push(row.alias);
 }
 setBreedCache(Array.from(map.entries()).map(([canonical, aliases]) => ({ canonical, aliases })));
 } catch {
 setBreedCache([]);
 }
 }

 async function loadPetData(petId: string) {
 const { data: petData } = await supabase.from('pets').select('*').eq('id', petId).single();
 if (!petData) return;
 setForm({
 name: petData.name || '',
 species: petData.species || 'cat',
 breed: petData.breed || '',
 gender: petData.gender || 'male',
 birth_date: petData.birth_date || '',
 age_Y: petData.age_Y!= null? String(petData.age_Y): '',
 age_months: petData.age_months!= null? String(petData.age_months): '',
 age_days: petData.age_days!= null? String(petData.age_days): '',
 weight_kg: petData.weight_kg!= null? String(Math.round(petData.weight_kg * 100) / 100): '',
 neutered: petData.neutered || false,
 stomach_health: petData.stomach_health || 'normal',
 pet_source: petData.pet_source || 'other',
 home_date: petData.home_date || '',
 photo_url: petData.photo_url || '',
 is_active: petData.is_active!== false,
 });
 if (petData.photo_url) setAvatarPreview(petData.photo_url);
 const { data: envData } = await supabase.from('environment_profiles').select('*').eq('pet_id', petId).single();
 if (envData) {
 setEnvironment({
 indoor_outdoor: envData.indoor_outdoor || 'indoor',
 activity_level: envData.activity_level || 'medium',
 multi_pet_household: envData.multi_pet_household || false,
 pet_count: envData.pet_count? String(envData.pet_count): '2',
 has_children: envData.has_children || false,
 });
 }
 }

 async function pickAvatar() {
 const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
 if (status!== 'granted') {
 Alert.alert(' mutual');
 return;
 }
 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: 'images',
 allowsEditing: true,
 aspect: [1, 1],
 quality: 0.9,
 });
 if (!result.canceled && result.assets[0]) {
 const asset = result.assets[0];
 if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
 Alert.alert('ImageNot 5MB');
 return;
 }
 setAvatarFile(asset);
 setAvatarPreview(asset.uri);
 setGeneratedAvatar(false);
 }
 }

 async function generateAvatar() {
 if (!avatarFile || generatingAvatar) return;
 setGeneratingAvatar(true);
 try {
 const { data: session } = await supabase.auth.getSession();
 if (!session?.session) throw new Error('Not Sign In');
 const ext = avatarFile.uri.split('.').pop() || 'jpg';
 const fileName = `temp-avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
 const response = await fetch(avatarFile.uri);
 const blob = await response.blob();
 const { data: uploadData, error: uploadErr } = await supabase.storage.from('pet-avatars').upload(fileName, blob, {
 cacheControl: '3600',
 upsert: false,
 });
 if (uploadErr) throw uploadErr;
 const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(uploadData.path);
 setAvatarPreview(urlData.publicUrl);
 setGeneratedAvatar(true);
 Alert.alert(' ');
 } catch (err: any) {
 Alert.alert('Generation failed', err.message);
 } finally {
 setGeneratingAvatar(false);
 }
 }

 async function uploadAvatar(petId: string) {
 if (!avatarFile) return null;
 const { data: session } = await supabase.auth.getSession();
 const uid = session?.session?.user?.id;
 if (!uid) return null;
 const ext = avatarFile.uri.split('.').pop() || 'jpg';
 const fileName = `${uid}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
 const response = await fetch(avatarFile.uri);
 const blob = await response.blob();
 const { data, error } = await supabase.storage.from('pet-avatars').upload(fileName, blob, { cacheControl: '3600', upsert: false });
 if (error) {
 console.warn('[uploadAvatar]', error.message);
 return null;
 }
 const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(data.path);
 return urlData.publicUrl;
 }

 function onBreedSearch(text: string) {
 setForm((f) => ({...f, breed: text }));
 const q = text.trim().toLowerCase();
 if (!q) {
 setBreedResults([]);
 return;
 }
 setBreedResults(breedCache.filter((b) => b.canonical.toLowerCase().includes(q) || b.aliases.some((a) => a.toLowerCase().includes(q))).slice(0, 10));
 setShowBreedDropdown(true);
 }

 function selectBreed(canonical: string) {
 setForm((f) => ({...f, breed: canonical }));
 setShowBreedDropdown(false);
 setBreedResults([]);
 }

 function calcAgeFromBirth(date: string) {
 if (!date) return;
 const birth = new Date(date);
 const now = new Date();
 if (birth > now) return;
 let Y = now.getFullYear() - birth.getFullYear();
 let months = now.getMonth() - birth.getMonth();
 let days = now.getDate() - birth.getDate();
 if (days < 0) {
 months--;
 const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
 days += prevMonth.getDate();
 }
 if (months < 0) {
 Y--;
 months += 12;
 }
 setForm((f) => ({...f, age_Y: String(Y), age_months: String(months), age_days: String(days) }));
 }

 function goBack() {
 if (form.name || form.breed || form.weight_kg) {
 Alert.alert('OK Edit?', ' Complete Content Not Save. ', [{ text: 'Cancel', style: 'cancel' },
 { text: '', onPress: () => router.back() },]);
 return;
 }
 router.back();
 }

 async function handleSave() {
 if (saving) return;
 if (!form.name.trim()) {
 Alert.alert('Please fill inName');
 return;
 }
 const w = Number(form.weight_kg);
 if (form.weight_kg && (w <= 0 || w >= 200)) {
 Alert.alert('Weight 0-200 kg between');
 return;
 }
 setSaving(true);
 const petPayload = {
 name: form.name.trim(),
 species: form.species,
 breed: form.breed.trim(),
 gender: form.gender || 'unknown',
 birth_date: form.birth_date || null,
 age_Y: form.age_Y? Number(form.age_Y): 0,
 age_months: form.age_months? Number(form.age_months): 0,
 age_days: form.age_days? Number(form.age_days): 0,
 weight_kg: form.weight_kg? Math.round(Number(form.weight_kg) * 100) / 100: null,
 neutered: form.neutered,
 stomach_health: form.stomach_health || 'normal',
 pet_source: form.pet_source,
 home_date: form.home_date || null,
 photo_url: form.photo_url,
 is_active: true,
 };

 let pet;
 try {
 if (editMode) {
 pet = await updatePet(id, petPayload);
 } else {
 pet = await createPet(petPayload);
 }
 } catch (e: any) {
 setSaving(false);
 Alert.alert(editMode? 'Save Failed': 'CreateFailed', e.message);
 return;
 }

 const envPayload = {
 pet_id: pet.id,
 profile_id: pet.profile_id,
 indoor_outdoor: environment.indoor_outdoor,
 activity_level: environment.activity_level,
 multi_pet_household: environment.multi_pet_household,
 pet_count: environment.multi_pet_household? Number(environment.pet_count): 1,
 has_children: environment.has_children,
 };

 const tasks: Promise<any>[] = [];
 if (avatarFile) {
 tasks.push(uploadAvatar(pet.id).then((url) => {
 if (url) return writeGateway('UPDATE_PET', { id: pet.id, photo_url: url });
 }));
 }
 const envPromise = editMode? supabase.from('environment_profiles').upsert(envPayload, { onConflict: 'pet_id' }): supabase.from('environment_profiles').insert(envPayload);
 tasks.push(Promise.resolve(envPromise).then(() => {}));

 await Promise.allSettled(tasks);
 setSaving(false);
 Alert.alert(editMode? ' Save': 'CreateSuccess');
 router.back();
 }

 const renderFormField = (label: string, children: React.ReactNode, required?: boolean) => (<View style={styles.formGroup}>
 <Text style={styles.formLabel}>
 {label}
 {required? <Text style={styles.required}> *</Text>: null}
 </Text>
 {children}
 </View>);

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title={editMode? 'Edit Pet profiles': 'CreatePet profiles'} showBack onBack={goBack} />
 <ScrollView
 contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
 keyboardShouldPersistTaps="handled"
 >
 <View style={styles.headerGreeting}>
 <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.logo} />
 <Text style={styles.greetingMain}>
 {editMode? 'Edit Pet profiles': 'CreatePet profiles'}
 {'\n'}
 <Text style={styles.highlight}>{editMode? 'ModifyFur Babybelieve': 'Record Fur Baby'}</Text>
 </Text>
 </View>

 <View style={styles.formCard}>
 <TouchableOpacity activeOpacity={0.8} onPress={pickAvatar} style={styles.avatarUpload}>
 {avatarPreview? (<View style={styles.avatarPreview}>
 <Image source={{ uri: avatarPreview }} style={styles.avatarImg} />
 <View style={styles.avatarOverlay}>
 <Ionicons name="camera" size={20} color="#fff" />
 </View>
 </View>): (<View style={styles.avatarPlaceholder}>
 <Ionicons name="camera" size={20} color={colors.muted} />
 <Text style={styles.avatarPlaceholderText}>AddAvatar</Text>
 </View>)}
 </TouchableOpacity>

 {avatarFile &&!generatedAvatar? (<View style={styles.avatarGenBar}>
 <Text style={styles.avatarGenText}>UploadPhotoafter 3D</Text>
 <TouchableOpacity activeOpacity={0.8} disabled={generatingAvatar} onPress={generateAvatar} style={styles.avatarGenBtn}>
 {generatingAvatar? <ActivityIndicator size="small" color="#fff" />: <Text style={styles.avatarGenBtnText}></Text>}
 </TouchableOpacity>
 </View>): null}
 {avatarPreview && generatedAvatar? (<View style={styles.avatarGenDone}>
 <Ionicons name="checkmark" size={12} color="#27AE60" />
 <Text style={styles.avatarGenDoneText}> 3D</Text>
 </View>): null}

 {renderFormField('Name', (<TextIn
 value={form.name}
 onChangeText={(t) => setForm((f) => ({...f, name: t }))}
 placeholder="to Pet Name"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />), true)}

 {renderFormField('Type', (<ChipGroup value={form.species} options={SPECIES} onChange={(v) => setForm((f) => ({...f, species: v as string }))} />))}

 {renderFormField('Breed', (<View>
 <TextIn
 value={form.breed}
 onChangeText={onBreedSearch}
 onFocus={() => setShowBreedDropdown(true)}
 placeholder="Searchor EnterBreed, if Ragdoll"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />
 {showBreedDropdown && breedResults.length > 0? (<View style={styles.breedDropdown}>
 {breedResults.map((b) => (<TouchableOpacity key={b.canonical} activeOpacity={0.7} onPress={() => selectBreed(b.canonical)} style={styles.breedItem}>
 <Text style={styles.breedItemText}>{b.canonical}</Text>
 {b.aliases.length? <Text style={styles.breedAliases}>{b.aliases.slice(0, 2).join(', ')}</Text>: null}
 </TouchableOpacity>))}
 </View>): null}
 {showBreedDropdown && form.breed &&!breedResults.length? (<View style={styles.breedDropdown}>
 <TouchableOpacity activeOpacity={0.7} onPress={() => selectBreed(form.breed)} style={styles.breedItem}>
 <Text style={styles.breedItemText}>make use 「{form.breed}」</Text>
 </TouchableOpacity>
 </View>): null}
 </View>))}

 {renderFormField('Gender', (<View style={styles.radioGroup}>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setForm((f) => ({...f, gender: 'male' }))} style={styles.radioItem}>
 <View style={[styles.radioCircle, form.gender === 'male' && styles.radioCircleActive]}>
 {form.gender === 'male'? <View style={styles.radioDot} />: null}
 </View>
 <Text style={styles.radioText}>Male</Text>
 </TouchableOpacity>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setForm((f) => ({...f, gender: 'female' }))} style={styles.radioItem}>
 <View style={[styles.radioCircle, form.gender === 'female' && styles.radioCircleActive]}>
 {form.gender === 'female'? <View style={styles.radioDot} />: null}
 </View>
 <Text style={styles.radioText}>Female</Text>
 </TouchableOpacity>
 </View>))}

 {renderFormField('Birthday()', (<TextIn
 value={form.birth_date}
 onChangeText={(t) => { setForm((f) => ({...f, birth_date: t })); calcAgeFromBirth(t); }}
 placeholder="YYYY-MM-DD"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />))}

 {renderFormField('Age()', (<View style={styles.threeCol}>
 <View style={styles.ageWrap}>
 <TextIn
 value={form.age_Y}
 onChangeText={(t) => setForm((f) => ({...f, age_Y: t }))}
 keyboardType="numeric"
 placeholder="0"
 style={styles.ageIn}
 placeholderTextColor={colors.muted}
 />
 <Text style={styles.ageUnit}> Y</Text>
 </View>
 <View style={styles.ageWrap}>
 <TextIn
 value={form.age_months}
 onChangeText={(t) => setForm((f) => ({...f, age_months: t }))}
 keyboardType="numeric"
 placeholder="0"
 style={styles.ageIn}
 placeholderTextColor={colors.muted}
 />
 <Text style={styles.ageUnit}>M</Text>
 </View>
 <View style={styles.ageWrap}>
 <TextIn
 value={form.age_days}
 onChangeText={(t) => setForm((f) => ({...f, age_days: t }))}
 keyboardType="numeric"
 placeholder="0"
 style={styles.ageIn}
 placeholderTextColor={colors.muted}
 />
 <Text style={styles.ageUnit}> days</Text>
 </View>
 </View>))}

 {renderFormField('Weight(kg)', (<TextIn
 value={form.weight_kg}
 onChangeText={(t) => setForm((f) => ({...f, weight_kg: t }))}
 keyboardType="decimal-pad"
 placeholder="if: 4.8"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />))}

 {renderFormField('YesNoNeutered', (<View style={styles.radioGroup}>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setForm((f) => ({...f, neutered: true }))} style={styles.radioItem}>
 <View style={[styles.radioCircle, form.neutered === true && styles.radioCircleActive]}>
 {form.neutered === true? <View style={styles.radioDot} />: null}
 </View>
 <Text style={styles.radioText}> Neutered</Text>
 </TouchableOpacity>
 <TouchableOpacity activeOpacity={0.8} onPress={() => setForm((f) => ({...f, neutered: false }))} style={styles.radioItem}>
 <View style={[styles.radioCircle, form.neutered === false && styles.radioCircleActive]}>
 {form.neutered === false? <View style={styles.radioDot} />: null}
 </View>
 <Text style={styles.radioText}>Not Neutered</Text>
 </TouchableOpacity>
 </View>))}

 {renderFormField('Stomach', (<ChipGroup value={form.stomach_health} options={STOMACH} onChange={(v) => setForm((f) => ({...f, stomach_health: v as string }))} />))}

 {renderFormField('Source', (<ChipGroup value={form.pet_source} options={SOURCE} onChange={(v) => setForm((f) => ({...f, pet_source: v as string }))} />))}

 {renderFormField('to Date()', (<TextIn
 value={form.home_date}
 onChangeText={(t) => setForm((f) => ({...f, home_date: t }))}
 placeholder="YYYY-MM-DD"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />))}

 <View style={styles.sectionDivider} />
 <Text style={styles.sectionTitle}>environment</Text>

 {renderFormField('Indooroutside', (<ChipGroup value={environment.indoor_outdoor} options={INDOOR} onChange={(v) => setEnvironment((e) => ({...e, indoor_outdoor: v as string }))} />))}

 {renderFormField(' ', (<ChipGroup value={environment.activity_level} options={ACTIVITY} onChange={(v) => setEnvironment((e) => ({...e, activity_level: v as string }))} />))}

 <View style={styles.toggleRow}>
 <Text style={styles.toggleLabel}>many</Text>
 <TouchableOpacity
 activeOpacity={0.8}
 onPress={() => setEnvironment((e) => ({...e, multi_pet_household:!e.multi_pet_household }))}
 style={[styles.toggleTrack, environment.multi_pet_household && styles.toggleTrackActive]}
 >
 <View style={[styles.toggleThumb, environment.multi_pet_household && styles.toggleThumbActive]} />
 </TouchableOpacity>
 </View>

 {environment.multi_pet_household? (renderFormField('PetQuantity', (<TextIn
 value={environment.pet_count}
 onChangeText={(t) => setEnvironment((e) => ({...e, pet_count: t }))}
 keyboardType="numeric"
 placeholder="2"
 style={styles.in}
 placeholderTextColor={colors.muted}
 />))): null}

 <View style={styles.toggleRow}>
 <Text style={styles.toggleLabel}>Medium small</Text>
 <TouchableOpacity
 activeOpacity={0.8}
 onPress={() => setEnvironment((e) => ({...e, has_children:!e.has_children }))}
 style={[styles.toggleTrack, environment.has_children && styles.toggleTrackActive]}
 >
 <View style={[styles.toggleThumb, environment.has_children && styles.toggleThumbActive]} />
 </TouchableOpacity>
 </View>
 </View>

 <TouchableOpacity activeOpacity={0.8} disabled={saving} onPress={handleSave} style={styles.primaryBtn}>
 {saving? <ActivityIndicator color="#fff" />: <Text style={styles.primaryBtnText}>{editMode? 'SaveModify': 'Saveprofile'}</Text>}
 </TouchableOpacity>
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
 paddingBottom: spacing.xl,
 },
 headerGreeting: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 marginBottom: spacing.md,
 },
 logo: {
 width: 40,
 height: 40,
 borderRadius: 20,
 },
 greetingMain: {
 fontSize: typography.sizes['2xl'],
 fontWeight: typography.weights.bold,
 lineHeight: 26,
 color: colors.fg,
 },
 highlight: {
 fontSize: typography.sizes.base,
 color: colors.primary,
 fontWeight: typography.weights.medium,
 },
 formCard: {
 backgroundColor: colors.card,
 borderRadius: radius.xl,...shadows.card,
 borderWidth: 1,
 borderColor: colors.border,
 padding: spacing.card,
 marginBottom: spacing.md,
 },
 formGroup: {
 marginBottom: spacing.md,
 },
 formLabel: {
 fontSize: typography.sizes.base,
 color: colors.muted,
 marginBottom: spacing.sm,
 },
 required: {
 color: colors.primary,
 },
 in: {
 height: sizes.in - 8,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 paddingHorizontal: spacing.md,
 fontSize: typography.sizes.base,
 color: colors.fg,
 backgroundColor: colors.bg,
 },
 avatarUpload: {
 alignItems: 'center',
 marginBottom: spacing.md,
 },
 avatarPreview: {
 width: 72,
 height: 72,
 borderRadius: 36,
 overflow: 'hidden',
 borderWidth: 3,
 borderColor: colors.primary,
 },
 avatarImg: {
 width: '100%',
 height: '100%',
 },
 avatarOverlay: {
 position: 'absolute',
 inset: 0,
 backgroundColor: 'rgba(0,0,0,0.3)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 avatarPlaceholder: {
 width: 72,
 height: 72,
 borderRadius: 36,
 backgroundColor: colors.bg,
 borderWidth: 2,
 borderStyle: 'dashed',
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
 gap: 3,
 },
 avatarPlaceholderText: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 avatarGenBar: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 padding: spacing.sm,
 marginBottom: spacing.md,
 backgroundColor: 'rgba(155,89,182,0.08)',
 borderWidth: 1,
 borderColor: 'rgba(155,89,182,0.15)',
 borderRadius: radius.md,
 },
 avatarGenText: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 avatarGenBtn: {
 paddingVertical: 4,
 paddingHorizontal: 10,
 borderRadius: radius.sm,
 backgroundColor: '#9B59B6',
 },
 avatarGenBtnText: {
 color: '#fff',
 fontSize: typography.sizes.xs,
 fontWeight: typography.weights.semibold,
 },
 avatarGenDone: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 4,
 marginBottom: spacing.md,
 },
 avatarGenDoneText: {
 fontSize: typography.sizes.sm,
 color: '#27AE60',
 },
 radioGroup: {
 flexDirection: 'row',
 gap: spacing.lg,
 },
 radioItem: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 5,
 },
 radioCircle: {
 width: 18,
 height: 18,
 borderRadius: 9,
 borderWidth: 1.5,
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
 },
 radioCircleActive: {
 borderColor: colors.primary,
 },
 radioDot: {
 width: 9,
 height: 9,
 borderRadius: 5,
 backgroundColor: colors.primary,
 },
 radioText: {
 fontSize: typography.sizes.base,
 color: colors.fg,
 },
 threeCol: {
 flexDirection: 'row',
 gap: 6,
 },
 ageWrap: {
 flex: 1,
 flexDirection: 'row',
 alignItems: 'center',
 backgroundColor: colors.bg,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.sm,
 paddingHorizontal: spacing.sm,
 height: 36,
 },
 ageIn: {
 flex: 1,
 textAlign: 'center',
 fontSize: typography.sizes.base,
 color: colors.fg,
 padding: 0,
 },
 ageUnit: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginLeft: 2,
 },
 sectionDivider: {
 height: 1,
 backgroundColor: colors.border,
 marginVertical: spacing.md,
 },
 sectionTitle: {
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: spacing.md,
 paddingBottom: spacing.sm,
 borderBottomWidth: 1,
 borderBottomColor: colors.border,
 },
 toggleRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingVertical: spacing.sm,
 },
 toggleLabel: {
 fontSize: typography.sizes.base,
 color: colors.fg,
 },
 toggleTrack: {
 width: 44,
 height: 24,
 borderRadius: 12,
 backgroundColor: colors.border,
 justifyContent: 'center',
 padding: 2,
 },
 toggleTrackActive: {
 backgroundColor: colors.primary,
 },
 toggleThumb: {
 width: 20,
 height: 20,
 borderRadius: 10,
 backgroundColor: '#fff',...shadows.sm,
 },
 toggleThumbActive: {
 transform: [{ translateX: 20 }],
 },
 breedDropdown: {
 position: 'absolute',
 left: 0,
 right: 0,
 top: 40,
 backgroundColor: 'rgba(255,255,255,0.95)',
 borderWidth: 1,
 borderColor: 'rgba(255,255,255,0.5)',
 borderRadius: radius.md,...shadows.md,
 zIndex: 50,
 maxHeight: 160,
 },
 breedItem: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 padding: spacing.md,
 borderBottomWidth: 1,
 borderBottomColor: 'rgba(0,0,0,0.04)',
 },
 breedItemText: {
 fontSize: typography.sizes.sm,
 color: colors.fg,
 },
 breedAliases: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 primaryBtn: {
 height: sizes.button - 6,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
 },
 primaryBtnText: {
 color: '#fff',
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
});
