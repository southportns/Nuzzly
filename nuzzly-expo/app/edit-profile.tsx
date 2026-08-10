import React, { useEffect, useState } from 'react';
import {
 View,
 Text,
 TextIn,
 TouchableOpacity,
 ScrollView,
 Image,
 StyleSheet,
 ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../src/components/PageHeader';
import FormField from '../src/components/FormField';
import BottomSheet from '../src/components/BottomSheet';
import ToastContainer from '../src/components/ToastContainer';
import { useToast } from '../src/hooks/useToast';
import { useAuth } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { writeGateway } from '../src/lib/gateway';
import { getProvinces, getCities } from '../src/lib/china-regions';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

const GENDERS = [{ value: 'female', label: '' },
 { value: 'male', label: '' },
 { value: 'other', label: 'Other' },];

export default function EditprofileScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { profile, session } = useAuth();
 const fetchprofile = useAuthStore((s) => s.fetchprofile);
 const { toasts, show } = useToast();

 const [username, setUsername] = useState('');
 const [bio, setBio] = useState('');
 const [gender, setGender] = useState('other');
 const [avatarUrl, setAvatarUrl] = useState('');
 const [selectedProvince, setSelectedProvince] = useState('');
 const [selectedCity, setSelectedCity] = useState('');
 const [saving, setSaving] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [showProvinceSheet, setShowProvinceSheet] = useState(false);
 const [showCitySheet, setShowCitySheet] = useState(false);

 const provinces = getProvinces();
 const cities = selectedProvince? getCities(selectedProvince): [];

 useEffect(() => {
 if (profile) {
 const p = profile as any;
 setUsername(p.username || '');
 setBio(p.bio || '');
 setAvatarUrl(p.avatar_url || '');
 setGender(p.gender || 'other');
 const region = p.region || '';
 if (region) {
 const parts = region.split(' · ');
 if (parts.length >= 1) setSelectedProvince(parts[0]);
 if (parts.length >= 2) setSelectedCity(parts[1]);
 }
 }
 }, [profile]);

 async function pickAvatar() {
 const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
 if (status!== 'granted') {
 show(' mutual', 'warning');
 return;
 }
 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: 'images',
 allowsEditing: true,
 aspect: [1, 1],
 quality: 0.9,
 });
 if (result.canceled ||!result.assets[0]) return;
 const asset = result.assets[0];
 if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
 show('ImageNot 5MB', 'warning');
 return;
 }
 await uploadAvatar(asset.uri);
 }

 async function uploadAvatar(uri: string) {
 const uid = session?.user?.id;
 if (!uid) return;
 setUploading(true);
 try {
 // Path: user-avatars/{uid}/avatar.jpg -- folder RLS
 const filePath = `${uid}/avatar.jpg`;
 const response = await fetch(uri);
 const blob = await response.blob();
 const { error: uploadError } = await supabase.storage.from('user-avatars').upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
 if (uploadError) throw uploadError;
 const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
 setAvatarUrl(urlData.publicUrl);
 show('Avatar Update', 'success');
 } catch (e: any) {
 show(e.message || 'UploadFailed', 'error');
 } finally {
 setUploading(false);
 }
 }

 async function handleSave() {
 if (saving) return;
 const uid = session?.user?.id;
 if (!uid) {
 show('Not Sign In', 'error');
 return;
 }
 if (!username.trim()) {
 show('Please fill inUsername', 'error');
 return;
 }
 if (bio.length > 200) {
 show('Biomostmany 200 ', 'error');
 return;
 }
 setSaving(true);
 try {
 const region = [selectedProvince, selectedCity].filter(Boolean).join(' · ');
 await writeGateway('UPDATE_PROFILE', {
 username: username.trim(),
 display_name: username.trim(),
 bio,
 avatar_url: avatarUrl,
 gender,
 region,
 });
 await fetchprofile();
 show('Saved Successfully', 'success');
 router.back();
 } catch (e: any) {
 show(e.message || 'Save Failed', 'error');
 } finally {
 setSaving(false);
 }
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <ToastContainer toasts={toasts} />
 <PageHeader title="Edit profile" />
 <ScrollView
 contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
 keyboardShouldPersistTaps="handled"
 showsVerticalScrollIndicator={false}
 >
 <TouchableOpacity activeOpacity={0.85} onPress={pickAvatar} style={styles.avatarSection}>
 <View style={styles.avatarWrap}>
 {avatarUrl? (<Image source={{ uri: avatarUrl }} style={styles.avatarImg} />): (<Image source={require('../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />)}
 {uploading? (<View style={styles.avatarOverlay}>
 <ActivityIndicator color="#fff" />
 </View>): null}
 </View>
 <Text style={styles.changeAvatar}>moreAvatar</Text>
 </TouchableOpacity>

 <FormField
 label="Username"
 type="in"
 value={username}
 onChange={setUsername}
 placeholder="Please enterUsername"
 required
 />

 <FormField
 label="Bio"
 type="textarea"
 value={bio}
 onChange={setBio}
 rows={3}
 placeholder="write1Biolet More..."
 />

 <FormField label="Gender">
 <View style={styles.radioGroup}>
 {GENDERS.map((g) => {
 const active = gender === g.value;
 return (<TouchableOpacity
 key={g.value}
 activeOpacity={0.8}
 onPress={() => setGender(g.value)}
 style={styles.radioItem}
 >
 <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
 {active? <View style={styles.radioDot} />: null}
 </View>
 <Text style={styles.radioText}>{g.label}</Text>
 </TouchableOpacity>);
 })}
 </View>
 </FormField>

 <FormField label=" ">
 <View style={styles.regionGroup}>
 <TouchableOpacity
 activeOpacity={0.7}
 style={styles.formSelect}
 onPress={() => setShowProvinceSheet(true)}
 >
 <Text style={[styles.formSelectText,!selectedProvince && styles.formSelectPlaceholderText]}>
 {selectedProvince || ''}
 </Text>
 <Ionicons name="chevron-down" size={14} color={colors.muted} />
 </TouchableOpacity>

 <TouchableOpacity
 activeOpacity={0.7}
 disabled={!selectedProvince}
 style={[styles.formSelect,!selectedProvince && styles.formSelectDisabled]}
 onPress={() => selectedProvince && setShowCitySheet(true)}
 >
 <Text style={[styles.formSelectText,!selectedCity && styles.formSelectPlaceholderText]}>
 {selectedCity || ''}
 </Text>
 <Ionicons name="chevron-down" size={14} color={colors.muted} />
 </TouchableOpacity>
 </View>
 </FormField>

 <TouchableOpacity
 activeOpacity={0.85}
 disabled={saving}
 onPress={handleSave}
 style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
 >
 {saving? (<ActivityIndicator color="#fff" />): (<Text style={styles.saveBtnText}>Save</Text>)}
 </TouchableOpacity>
 </ScrollView>

 <BottomSheet
 visible={showProvinceSheet}
 onClose={() => setShowProvinceSheet(false)}
 title="Select"
 >
 <ScrollView style={styles.regionSheetList} showsVerticalScrollIndicator={false}>
 {provinces.map((p) => (<TouchableOpacity
 key={p}
 activeOpacity={0.7}
 style={[styles.regionOption, selectedProvince === p && styles.regionOptionActive]}
 onPress={() => {
 setSelectedProvince(p);
 setSelectedCity('');
 setShowProvinceSheet(false);
 }}
 >
 <Text style={[styles.regionOptionText, selectedProvince === p && styles.regionOptionTextActive]}>
 {p}
 </Text>
 {selectedProvince === p? (<Ionicons name="checkmark" size={18} color={colors.primary} />): null}
 </TouchableOpacity>))}
 </ScrollView>
 </BottomSheet>

 <BottomSheet
 visible={showCitySheet}
 onClose={() => setShowCitySheet(false)}
 title="Select"
 >
 <ScrollView style={styles.regionSheetList} showsVerticalScrollIndicator={false}>
 {cities.map((c) => (<TouchableOpacity
 key={c}
 activeOpacity={0.7}
 style={[styles.regionOption, selectedCity === c && styles.regionOptionActive]}
 onPress={() => {
 setSelectedCity(c);
 setShowCitySheet(false);
 }}
 >
 <Text style={[styles.regionOptionText, selectedCity === c && styles.regionOptionTextActive]}>
 {c}
 </Text>
 {selectedCity === c? (<Ionicons name="checkmark" size={18} color={colors.primary} />): null}
 </TouchableOpacity>))}
 </ScrollView>
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
 paddingBottom: spacing.xl,
 },
 avatarSection: {
 alignItems: 'center',
 gap: spacing.sm,
 paddingVertical: spacing.xl,
 },
 avatarWrap: {
 width: 80,
 height: 80,
 borderRadius: 40,
 overflow: 'hidden',
 backgroundColor: colors.secondary,...shadows.sm,
 },
 avatarImg: {
 width: '100%',
 height: '100%',
 },
 avatarOverlay: {
 position: 'absolute',
 inset: 0,
 backgroundColor: 'rgba(0,0,0,0.35)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 changeAvatar: {
 fontSize: typography.sizes.sm,
 color: colors.primary,
 fontWeight: typography.weights.medium,
 },
 radioGroup: {
 flexDirection: 'row',
 gap: spacing.lg,
 },
 radioItem: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 6,
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
 fontSize: typography.sizes.md,
 color: colors.fg,
 },
 regionGroup: {
 flexDirection: 'row',
 gap: spacing.md,
 },
 formSelect: {
 flex: 1,
 height: sizes.in,
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingHorizontal: spacing.md,
 borderWidth: 1.5,
 borderColor: colors.border,
 borderRadius: radius.md,
 backgroundColor: colors.bg,
 },
 formSelectDisabled: {
 opacity: 0.5,
 },
 formSelectText: {
 fontSize: typography.sizes.base,
 color: colors.fg,
 },
 formSelectPlaceholderText: {
 color: colors.muted,
 },
 saveBtn: {
 width: '100%',
 height: sizes.button,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 marginTop: spacing.sm,...shadows.btn,
 },
 saveBtnDisabled: {
 opacity: 0.45,
 },
 saveBtnText: {
 color: '#fff',
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
 regionSheetList: {
 maxHeight: 360,
 },
 regionOption: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingVertical: spacing.md,
 paddingHorizontal: spacing.sm,
 borderBottomWidth: 1,
 borderBottomColor: 'rgba(0,0,0,0.04)',
 },
 regionOptionActive: {
 backgroundColor: colors.primaryBg,
 },
 regionOptionText: {
 fontSize: typography.sizes.md,
 color: colors.fg,
 },
 regionOptionTextActive: {
 color: colors.primary,
 fontWeight: typography.weights.semibold,
 },
});
