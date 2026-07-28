import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { colors, spacing, radius, shadows } from '../../src/theme/tokens';

const LOGO = require('../../assets/images/mqpyqgao-logo.png');

export default function AvatarGenerateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [photoFile, setPhotoFile] = useState<{ uri: string; name: string; type?: string } | null>(
    null
  );
  const [photoPreview, setPhotoPreview] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const goBack = () => {
    router.replace('/');
  };

  const goToCreatePet = () => {
    router.push('/pet/create');
  };

  const triggerUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoFile({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setPhotoPreview(asset.uri);
      setAvatarUrl('');
    }
  };

  const generateAvatar = async () => {
    if (!photoFile || generating || avatarUrl) return;

    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) throw new Error('未登录');

      const response = await fetch(photoFile.uri);
      const blob = await response.blob();
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const fileName = `temp-avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('pet-avatars')
        .upload(fileName, blob, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(uploadData.path);
      setAvatarUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error('上传失败:', err);
      alert(err.message || '上传失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Image source={LOGO} style={styles.avatarImg} />
          </View>
          <TouchableOpacity style={styles.actionCircle} onPress={goBack} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={colors.fg} />
          </TouchableOpacity>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingMain}>
            生成3D卡通形象{'\n'}
            <Text style={styles.highlight}>AI帮你创建专属宠物形象</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.previewCard} onPress={triggerUpload} activeOpacity={0.9}>
          {avatarUrl ? (
            <View style={styles.previewImage}>
              <Image source={{ uri: avatarUrl }} style={styles.generatedImg} />
              <Text style={styles.previewHint}>卡通形象已生成</Text>
            </View>
          ) : photoPreview ? (
            <View style={styles.previewImage}>
              <Image source={{ uri: photoPreview }} style={styles.generatedImg} />
              <Text style={styles.previewHint}>点击可更换照片</Text>
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="camera-outline" size={48} color={colors.muted} />
              <Text style={styles.placeholderText}>点击上传宠物照片</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.actionArea}>
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (!photoFile || generating || !!avatarUrl) && styles.generateBtnDisabled,
            ]}
            disabled={!photoFile || generating || !!avatarUrl}
            onPress={generateAvatar}
            activeOpacity={0.8}
          >
            {generating && <ActivityIndicator color="#fff" style={styles.spinner} />}
            <Text style={styles.generateBtnText}>
              {generating ? '生成中...' : '生成3D卡通形象'}
            </Text>
          </TouchableOpacity>

          {avatarUrl ? (
            <View style={styles.successHint}>
              <Ionicons name="checkmark" size={16} color="#27AE60" />
              <Text style={styles.successHintText}>卡通形象已生成并保存</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.finishArea}>
          {avatarUrl ? (
            <TouchableOpacity style={styles.finishBtn} onPress={goToCreatePet} activeOpacity={0.8}>
              <Text style={styles.finishBtnText}>下一步：创建宠物档案</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipBtn} onPress={goToCreatePet} activeOpacity={0.8}>
              <Text style={styles.skipBtnText}>跳过，直接创建档案</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  avatarImg: {
    width: 40,
    height: 40,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  greeting: {
    marginTop: spacing.md,
  },
  greetingMain: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: colors.fg,
  },
  highlight: {
    color: colors.primary,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['2xl'],
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  previewImage: {
    alignItems: 'center',
    gap: spacing.md,
  },
  generatedImg: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    resizeMode: 'cover',
  },
  previewHint: {
    fontSize: 12,
    color: colors.muted,
  },
  previewPlaceholder: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.muted,
  },
  actionArea: {
    marginBottom: spacing.lg,
  },
  generateBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginRight: spacing.xs,
  },
  successHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  successHintText: {
    fontSize: 14,
    color: '#27AE60',
  },
  finishArea: {
    marginTop: spacing.lg,
  },
  finishBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.sm,
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipBtnText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
  },
});
