import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';
import { writeGateway } from '../../src/lib/gateway';
import { useCommunity, Post } from '../../src/hooks/useCommunity';
import { useToast } from '../../src/hooks/useToast';
import ToastContainer from '../../src/components/ToastContainer';
import { colors, spacing, radius, sizes, typography, shadows } from '../../src/theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

const CAT_BREEDS = ['英国短毛猫', '布偶猫', '曼基康矮脚猫', '波斯猫', '暹罗猫', '美短', '橘猫', '狸花猫'];
const DOG_BREEDS = ['柯基', '金毛', '泰迪', '哈士奇', '柴犬', '拉布拉多', '边牧', '萨摩耶'];

const REPORT_CATEGORIES = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'violence', label: '暴力恐怖' },
  { value: 'pornography', label: '色情低俗' },
  { value: 'political', label: '政治敏感' },
  { value: 'fraud', label: '诈骗' },
  { value: 'privacy', label: '隐私泄露' },
  { value: 'other', label: '其他' },
];

interface PetItem {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  photo_url?: string;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function imageLayoutClass(count: number) {
  if (count === 1) return 'single';
  if (count === 2) return 'double';
  return 'grid';
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show, toasts } = useToast();
  const {
    posts,
    loading,
    hasMore,
    myLikedPostIds,
    fetchPosts,
    createPost,
    toggleLike,
    reportPost,
    deletePost,
    checkVerification,
  } = useCommunity();

  // filters
  const [petType, setPetType] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('全部品种');
  const [showBreed, setShowBreed] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [breedCache, setBreedCache] = useState<string[]>([]);

  // posts / user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPets, setUserPets] = useState<PetItem[]>([]);

  // create post modal
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [imageFiles, setImageFiles] = useState<{ uri: string; name: string; type?: string }[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('other');

  // phone verify
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // agreement / privacy
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // image preview
  const [previewingImage, setPreviewingImage] = useState<string | null>(null);

  const breedOptionsStatic = petType === 'cat'
    ? ['全部品种', ...CAT_BREEDS]
    : petType === 'dog'
    ? ['全部品种', ...DOG_BREEDS]
    : ['全部品种', ...CAT_BREEDS, ...DOG_BREEDS];

  const breedOptions = breedCache.length > 0 ? breedCache : breedOptionsStatic;
  const filteredBreeds = breedSearch.trim()
    ? breedOptions.filter((b) => b.toLowerCase().includes(breedSearch.trim().toLowerCase()))
    : breedOptions;

  const loadBreeds = useCallback(async (species?: string) => {
    try {
      let query = supabase.from('breed_aliases').select('canonical').limit(500);
      if (species) query = query.eq('species', species);
      const { data } = await query;
      const unique = [...new Set((data || []).map((r: any) => r.canonical))];
      setBreedCache(['全部品种', ...unique]);
    } catch {
      setBreedCache(breedOptionsStatic);
    }
  }, [breedOptionsStatic]);

  const refresh = useCallback(async () => {
    await fetchPosts({
      petType: petType || undefined,
      breed: selectedBreed,
    });
  }, [fetchPosts, petType, selectedBreed]);

  const loadUserPets = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, photo_url')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      setUserPets((data || []) as PetItem[]);
    } catch {
      setUserPets([]);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;
    await fetchPosts({
      petType: petType || undefined,
      breed: selectedBreed,
      cursor: lastPost.created_at,
    });
  }, [fetchPosts, hasMore, loading, petType, posts, selectedBreed]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id || null;
      if (!mounted) return;
      setCurrentUserId(uid);
      const { verified } = await checkVerification();
      if (!mounted) return;
      setPhoneVerified(verified);
      await loadBreeds();
      if (uid) await loadUserPets(uid);
      await refresh();
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSelectedBreed('全部品种');
    loadBreeds(petType || undefined);
    refresh();
  }, [petType]);

  const handleToggleLike = useCallback((post: Post) => {
    toggleLike(post.id, myLikedPostIds.has(post.id));
  }, [toggleLike, myLikedPostIds]);

  const handleReport = useCallback((post: Post) => {
    setReportingPost(post);
    setReportReason('');
    setReportCategory('other');
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportingPost) return;
    const { error } = await reportPost(reportingPost.id, reportReason, reportCategory);
    if (error) {
      show('举报失败，请稍后重试', 'error');
    } else {
      show('举报已提交，我们将尽快处理', 'success');
      setShowReportModal(false);
    }
  }, [reportPost, reportingPost, reportReason, reportCategory, show]);

  const handleDelete = useCallback(async (post: Post) => {
    const { error } = await deletePost(post.id);
    if (error) show('删除失败', 'error');
    else show('已删除', 'success');
  }, [deletePost, show]);

  const triggerFileInput = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 9 - imageFiles.length,
      quality: 0.9,
    });
    if (result.canceled) return;
    const toAdd = result.assets.slice(0, 9 - imageFiles.length).filter((a) => {
      if ((a.fileSize || 0) > 5 * 1024 * 1024) {
        show('图片大小不能超过5MB', 'warning');
        return false;
      }
      return true;
    });
    setImageFiles((prev) => [...prev, ...toAdd.map((a) => ({ uri: a.uri, name: a.fileName || 'image.jpg', type: a.mimeType || 'image/jpeg' }))]);
    setPreviewUrls((prev) => [...prev, ...toAdd.map((a) => a.uri)]);
  }, [imageFiles.length, show]);

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreatePost = useCallback(async () => {
    if (!agreedToTerms) {
      show('请先同意社区规范和隐私政策', 'warning');
      return;
    }
    if (!phoneVerified) {
      setShowPhoneVerify(true);
      return;
    }

    let postPetType: string | undefined;
    let breed: string | undefined;
    if (selectedPetId) {
      const pet = userPets.find((p) => p.id === selectedPetId);
      if (pet) {
        postPetType = pet.species;
        breed = pet.breed || undefined;
      }
    }

    setSubmitting(true);
    const { error } = await createPost({
      content: newContent,
      imageFiles,
      petType: postPetType,
      breed,
    });
    setSubmitting(false);

    if (error) {
      show('发布失败', 'error');
      return;
    }

    show('发布成功', 'success');
    setShowCreatePost(false);
    setNewContent('');
    setSelectedPetId('');
    setImageFiles([]);
    setPreviewUrls([]);
    setAgreedToTerms(false);
  }, [agreedToTerms, phoneVerified, selectedPetId, userPets, createPost, newContent, imageFiles, show]);

  const sendVerifyCode = useCallback(async () => {
    if (!/^1\d{10}$/.test(phoneNumber)) {
      show('请输入正确的手机号', 'warning');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+86${phoneNumber}` });
      if (error) throw error;
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) clearInterval(timer);
          return Math.max(0, c - 1);
        });
      }, 1000);
      show('验证码已发送', 'success');
    } catch (e: any) {
      show(e.message || '验证码发送失败', 'error');
    }
  }, [phoneNumber, show]);

  const submitPhoneVerify = useCallback(async () => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+86${phoneNumber}`,
        token: verifyCode,
        type: 'sms',
      });
      if (error) throw error;
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (uid) {
        try {
          await writeGateway('UPDATE_PROFILE', { phone_verified_at: new Date().toISOString() });
        } catch (e: any) {
          console.error('[Community.submitPhoneVerify] update profile:', e.message);
        }
      }
      setPhoneVerified(true);
      setShowPhoneVerify(false);
      show('认证成功', 'success');
    } catch (e: any) {
      show(e.message || '验证失败', 'error');
    }
  }, [phoneNumber, verifyCode, show]);

  const renderPost = (post: Post) => {
    const profile = Array.isArray(post.public_profiles) ? post.public_profiles[0] : post.public_profiles;
    const liked = myLikedPostIds.has(post.id);
    const layout = imageLayoutClass(post.images?.length || 0);

    return (
      <View key={post.id} style={styles.postCard}>
        <View style={styles.postUser}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, styles.postAvatarFallback]}>
              <Text style={styles.postAvatarFallbackText}>{(profile?.display_name || '?')[0]}</Text>
            </View>
          )}
          <Text style={styles.postUsername} numberOfLines={1}>{profile?.display_name || '匿名用户'}</Text>
        </View>
        <View style={styles.postContent}>
          <Text style={styles.postText} numberOfLines={5}>{post.content}</Text>
          {post.images && post.images.length > 0 && (
            <View style={[styles.postImages, layout === 'single' && styles.postImagesSingle, layout === 'double' && styles.postImagesDouble]}>
              {post.images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.9}
                  onPress={() => setPreviewingImage(img)}
                  style={[styles.postImgWrap, layout === 'single' && styles.postImgWrapSingle, layout === 'double' && styles.postImgWrapDouble]}
                >
                  <Image source={{ uri: img }} style={styles.postImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.postMeta}>
            <TouchableOpacity style={[styles.postAction, liked && styles.postActionLiked]} onPress={() => handleToggleLike(post)} activeOpacity={0.7}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.primary : colors.muted} />
              <Text style={[styles.postActionText, liked && styles.postActionTextLiked]}>{post.likes_count || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postAction} onPress={() => handleReport(post)} activeOpacity={0.7}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.muted} />
              <Text style={styles.postActionText}>举报</Text>
            </TouchableOpacity>
            {post.profile_id === currentUserId && (
              <TouchableOpacity style={styles.postAction} onPress={() => handleDelete(post)} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
            <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCreateModal = () => (
    <Modal visible={showCreatePost} animationType="slide" transparent onRequestClose={() => setShowCreatePost(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCreatePost(false)} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreatePost(false)} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>发布动态</Text>
            <TouchableOpacity
              style={[styles.modalSubmit, (!newContent.trim() || submitting) && styles.modalSubmitDisabled]}
              disabled={!newContent.trim() || submitting}
              onPress={handleCreatePost}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSubmitText}>{submitting ? '发布中' : '发布'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {!phoneVerified && (
              <TouchableOpacity style={styles.verifyBanner} onPress={() => setShowPhoneVerify(true)} activeOpacity={0.8}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.warning} />
                <Text style={styles.verifyBannerText}>需要完成手机号认证后才能发帖，点击认证</Text>
              </TouchableOpacity>
            )}
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="分享你和毛孩子的故事..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              style={styles.postInput}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{newContent.length}/2000</Text>

            {previewUrls.length > 0 ? (
              <View style={styles.imagePreviewGrid}>
                {previewUrls.map((url, idx) => (
                  <View key={idx} style={styles.previewItem}>
                    <Image source={{ uri: url }} style={styles.previewImg} />
                    <TouchableOpacity style={styles.previewRemove} onPress={() => removeImage(idx)} activeOpacity={0.8}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {previewUrls.length < 9 && (
                  <TouchableOpacity style={styles.previewAdd} onPress={triggerFileInput} activeOpacity={0.8}>
                    <Ionicons name="add" size={24} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.addImageRow} onPress={triggerFileInput} activeOpacity={0.8}>
                <Ionicons name="image-outline" size={20} color={colors.muted} />
                <Text style={styles.addImageText}>添加图片</Text>
              </TouchableOpacity>
            )}

            {userPets.length > 0 && (
              <View style={styles.petSelectSection}>
                <Text style={styles.petSelectLabel}>关联宠物</Text>
                <View style={styles.petSelectList}>
                  {userPets.map((pet) => {
                    const active = selectedPetId === pet.id;
                    return (
                      <TouchableOpacity
                        key={pet.id}
                        style={[styles.petSelectItem, active && styles.petSelectItemActive]}
                        onPress={() => setSelectedPetId(active ? '' : pet.id)}
                        activeOpacity={0.8}
                      >
                        {pet.photo_url ? (
                          <Image source={{ uri: pet.photo_url }} style={styles.petSelectAvatar} />
                        ) : (
                          <View style={[styles.petSelectAvatar, styles.petSelectAvatarFallback]}>
                            <Text style={styles.petSelectAvatarFallbackText}>{pet.name[0]}</Text>
                          </View>
                        )}
                        <View style={styles.petSelectInfo}>
                          <Text style={styles.petSelectName} numberOfLines={1}>{pet.name}</Text>
                          <Text style={styles.petSelectMeta} numberOfLines={1}>
                            {pet.breed || (pet.species === 'cat' ? '猫猫' : pet.species === 'dog' ? '狗狗' : '其他')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.agreementRow}
              onPress={() => setAgreedToTerms((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                {agreedToTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.agreementText}>
                我已阅读并同意
                <Text style={styles.link} onPress={() => setShowAgreement(true)}>《社区规范》</Text>
                和
                <Text style={styles.link} onPress={() => setShowPrivacy(true)}>《隐私政策》</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderReportModal = () => (
    <Modal visible={showReportModal} animationType="fade" transparent onRequestClose={() => setShowReportModal(false)}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowReportModal(false)} />
        <View style={[styles.modalContent, styles.modalSm, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>举报</Text>
            <TouchableOpacity
              style={[styles.modalSubmit, !reportReason.trim() && styles.modalSubmitDisabled]}
              disabled={!reportReason.trim()}
              onPress={submitReport}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSubmitText}>提交</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.reportCategories}>
              {REPORT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.reportCatBtn, reportCategory === cat.value && styles.reportCatBtnActive]}
                  onPress={() => setReportCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reportCatText, reportCategory === cat.value && styles.reportCatTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="请描述举报原因..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
              style={styles.postInput}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPhoneVerifyModal = () => (
    <Modal visible={showPhoneVerify} animationType="fade" transparent onRequestClose={() => setShowPhoneVerify(false)}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPhoneVerify(false)} />
        <View style={[styles.modalContent, styles.modalSm, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPhoneVerify(false)} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>手机号认证</Text>
            <TouchableOpacity
              style={[styles.modalSubmit, (!phoneNumber.trim() || !verifyCode.trim()) && styles.modalSubmitDisabled]}
              disabled={!phoneNumber.trim() || !verifyCode.trim()}
              onPress={submitPhoneVerify}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSubmitText}>验证</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.verifyHint}>根据《互联网跟帖评论服务管理规定》，发帖需完成手机号实名认证</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="请输入手机号"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={11}
              style={styles.verifyInput}
            />
            <View style={styles.verifyCodeRow}>
              <TextInput
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="验证码"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.verifyInput, styles.verifyCodeInput]}
              />
              <TouchableOpacity
                style={[styles.verifyCodeBtn, countdown > 0 && styles.verifyCodeBtnDisabled]}
                disabled={countdown > 0}
                onPress={sendVerifyCode}
                activeOpacity={0.8}
              >
                <Text style={styles.verifyCodeBtnText}>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAgreementModal = (title: string, content: React.ReactNode) => (
    <Modal visible={title === '社区规范' ? showAgreement : showPrivacy} animationType="slide" transparent onRequestClose={() => (title === '社区规范' ? setShowAgreement(false) : setShowPrivacy(false))}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => (title === '社区规范' ? setShowAgreement(false) : setShowPrivacy(false))} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => (title === '社区规范' ? setShowAgreement(false) : setShowPrivacy(false))} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={styles.modalClosePlaceholder} />
          </View>
          <ScrollView style={styles.modalBody}>{content}</ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/images/nuzzly-zuhe.png')} style={styles.brandLogo} />
        <TouchableOpacity style={styles.actionCircle} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={18} color={colors.fg} />
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.toggleGroup}>
          {['', 'cat', 'dog'].map((t) => (
            <TouchableOpacity
              key={t || 'all'}
              style={[styles.toggleOption, petType === t && styles.toggleOptionActive]}
              onPress={() => { setPetType(t); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleOptionText, petType === t && styles.toggleOptionTextActive]}>
                {t === '' ? '全部' : t === 'cat' ? '猫猫' : '狗狗'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Pressable
          style={[styles.searchBreedWrapper, (showBreed || selectedBreed !== '全部品种') && styles.searchBreedWrapperActive]}
          onPress={() => setShowBreed(true)}
        >
          <Ionicons name="search" size={16} color={(showBreed || selectedBreed !== '全部品种') ? colors.primary : colors.muted} />
          <TextInput
            value={breedSearch}
            onChangeText={(text) => { setBreedSearch(text); setShowBreed(true); }}
            placeholder={selectedBreed === '全部品种' ? '搜索品种...' : selectedBreed}
            placeholderTextColor={(showBreed || selectedBreed !== '全部品种') ? colors.primary : colors.muted}
            style={styles.breedSearchInput}
            onFocus={() => setShowBreed(true)}
          />
          {selectedBreed !== '全部品种' && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setSelectedBreed('全部品种'); setBreedSearch(''); refresh(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={12} color={colors.muted} />
            </TouchableOpacity>
          )}
        </Pressable>
      </View>

      {showBreed && (
        <Pressable style={styles.breedDropdownBackdrop} onPress={() => setShowBreed(false)}>
          <View style={styles.breedDropdown}>
            {filteredBreeds.length === 0 ? (
              <Text style={styles.dropdownEmpty}>没有找到相关品种</Text>
            ) : (
              filteredBreeds.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.breedDropdownItem, selectedBreed === b && styles.breedDropdownItemSelected]}
                  onPress={() => { setSelectedBreed(b); setShowBreed(false); setBreedSearch(''); refresh(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breedDropdownItemText, selectedBreed === b && styles.breedDropdownItemTextSelected]}>{b}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Pressable>
      )}

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={200}
      >
        {loading && posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🐾</Text>
            <Text style={styles.emptyText}>加载中...</Text>
          </View>
        ) : !loading && posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>还没有帖子，快来发第一条吧！</Text>
          </View>
        ) : (
          <>
            {posts.map(renderPost)}
            {loading && posts.length > 0 && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>加载更多...</Text>
              </View>
            )}
            {!hasMore && posts.length > 0 && <Text style={styles.noMore}>没有更多了</Text>}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: 16 + insets.bottom + 51 + 8 }]} onPress={() => setShowCreatePost(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modals */}
      {renderCreateModal()}
      {renderReportModal()}
      {renderPhoneVerifyModal()}
      {renderAgreementModal('社区规范', (
        <>
          <Text style={styles.agreementH3}>一、社区准则</Text>
          <Text style={styles.agreementP}>1. 尊重他人，友善交流，不发布攻击、侮辱、歧视性内容。</Text>
          <Text style={styles.agreementP}>2. 不发布虚假、误导性信息，包括但不限于虚假产品推荐、不实饲养经验。</Text>
          <Text style={styles.agreementP}>3. 不发布广告、推广、引流等商业内容。</Text>
          <Text style={styles.agreementP}>4. 不发布涉及政治、色情、暴力的内容。</Text>
          <Text style={styles.agreementP}>5. 不发布涉及个人隐私的信息（如他人手机号、住址等）。</Text>
          <Text style={styles.agreementH3}>二、违规处理</Text>
          <Text style={styles.agreementP}>违反社区规范的内容将被删除，严重违规者将被限制发帖权限。</Text>
          <Text style={styles.agreementH3}>三、未成年人保护</Text>
          <Text style={styles.agreementP}>14周岁以下用户发帖需监护人同意，夜间（22:00-6:00）不可发帖。</Text>
        </>
      ))}
      {renderAgreementModal('隐私政策', (
        <>
          <Text style={styles.agreementH3}>信息收集</Text>
          <Text style={styles.agreementP}>我们收集您的手机号码用于实名认证，收集您发布的文字和图片内容用于社区展示。</Text>
          <Text style={styles.agreementH3}>信息使用</Text>
          <Text style={styles.agreementP}>手机号码仅用于实名认证，不会向其他用户展示。发布的内容将根据《网络安全法》要求留存6个月。</Text>
          <Text style={styles.agreementH3}>信息保护</Text>
          <Text style={styles.agreementP}>我们采用行业标准的加密技术保护您的个人信息，不会向第三方出售您的个人数据。</Text>
          <Text style={styles.agreementH3}>您的权利</Text>
          <Text style={styles.agreementP}>您有权查看、修改、删除您的个人信息。账号注销后，您的帖子将匿名化处理（显示为"已注销用户"）。</Text>
        </>
      ))}

      {/* Image preview */}
      <Modal visible={!!previewingImage} transparent animationType="fade" onRequestClose={() => setPreviewingImage(null)}>
        <TouchableOpacity style={styles.imagePreviewOverlay} activeOpacity={1} onPress={() => setPreviewingImage(null)}>
          {previewingImage && <Image source={{ uri: previewingImage }} style={styles.imagePreviewFull} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
    paddingBottom: 0,
  },
  brandLogo: {
    height: 32,
    width: 120,
    resizeMode: 'contain',
  },
  actionCircle: {
    width: 41.31,
    height: 41.31,
    borderRadius: sizes.avatarSm / 2,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    position: 'relative',
    zIndex: 10,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 40,
  },
  toggleOption: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: colors.primary,
  },
  toggleOptionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  toggleOptionTextActive: {
    color: '#fff',
  },
  searchBreedWrapper: {
    flex: 1,
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchBreedWrapperActive: {
    borderColor: colors.primary,
    ...shadows.btn,
  },
  breedSearchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
    padding: 0,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breedDropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  breedDropdown: {
    position: 'absolute',
    top: 96,
    right: spacing['2xl'],
    left: spacing['2xl'] + 160,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: 20,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    maxHeight: 320,
  },
  dropdownEmpty: {
    padding: spacing.xl,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.muted,
  },
  breedDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  breedDropdownItemSelected: {
    backgroundColor: 'rgba(139,94,70,0.08)',
  },
  breedDropdownItemText: {
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  breedDropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  feed: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
  },
  feedContent: {
    flexGrow: 1,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  postUser: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 48,
  },
  postAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  postAvatarFallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarFallbackText: {
    fontSize: 20,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  postUsername: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    textAlign: 'center',
    maxWidth: 64,
  },
  postContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  postText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.fg,
  },
  postImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImagesSingle: {},
  postImagesDouble: {},
  postImgWrap: {
    width: (screenWidth - 96 - 48 - 12) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postImgWrapSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  postImgWrapDouble: {
    width: (screenWidth - 96 - 48 - 6) / 2,
    aspectRatio: 1,
  },
  postImg: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postActionLiked: {},
  postActionText: {
    fontSize: 12,
    color: colors.muted,
  },
  postActionTextLiked: {
    color: colors.primary,
  },
  postTime: {
    fontSize: 11,
    color: colors.muted,
    marginLeft: 'auto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.muted,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingMoreText: {
    fontSize: 13,
    color: colors.muted,
  },
  noMore: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: 12,
    color: colors.muted,
  },
  bottomSpacer: {
    height: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    ...shadows.btn,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalSm: {
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClosePlaceholder: {
    width: 32,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  modalSubmit: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  modalSubmitDisabled: {
    opacity: 0.4,
  },
  modalSubmitText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: '#fff',
  },
  modalBody: {
    padding: spacing.lg,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  verifyBannerText: {
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  postInput: {
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.fg,
    minHeight: 100,
    padding: 0,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  imagePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  previewItem: {
    width: (screenWidth - 64) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAdd: {
    width: (screenWidth - 64) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  addImageText: {
    fontSize: 13,
    color: colors.muted,
  },
  petSelectSection: {
    marginTop: spacing.lg,
  },
  petSelectLabel: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  petSelectList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  petSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flex: 1,
    minWidth: 140,
  },
  petSelectItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139,94,70,0.06)',
  },
  petSelectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  petSelectAvatarFallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petSelectAvatarFallbackText: {
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  petSelectInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  petSelectName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  petSelectMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreementText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  reportCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reportCatBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  reportCatBtnActive: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
  },
  reportCatText: {
    fontSize: 12,
    color: colors.fg,
  },
  reportCatTextActive: {
    color: '#fff',
  },
  verifyHint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  verifyInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: typography.sizes.base,
    backgroundColor: colors.card,
    color: colors.fg,
    marginBottom: spacing.md,
  },
  verifyCodeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  verifyCodeInput: {
    flex: 1,
    marginBottom: 0,
  },
  verifyCodeBtn: {
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyCodeBtnDisabled: {
    opacity: 0.4,
  },
  verifyCodeBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  agreementH3: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  agreementP: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 4,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewFull: {
    width: '100%',
    height: '100%',
  },
});
