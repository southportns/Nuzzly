import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface Postprofile {
  display_name?: string;
  avatar_url?: string;
  username?: string;
}

export interface Post {
  id: string;
  profile_id: string;
  content: string;
  images?: string[] | null;
  pet_type?: string;
  breed?: string;
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  review_status: string;
  created_at: string;
  public_profiles?: Postprofile | Postprofile[];
}

const PAGE_SIZE = 20;

async function getUid() {
  const { data: session } = await supabase.auth.getSession();
  return session?.session?.user?.id;
}

async function preprocessImage(uri: string, name: string) {
  const manipulated = await manipulateAsync(
    uri,
    [{ resize: { width: 2048 } }],
    { compress: 0.85, format: SaveFormat.JPEG }
  );
  const ext = name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'png' ? 'jpg' : ext}`;
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  return { uri: manipulated.uri, filename, blob };
}

export function useCommunity() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [myLikedPostIds, setMyLikedPostIds] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async (options: { petType?: string; breed?: string; cursor?: string } = {}) => {
    setLoading(true);
    const uid = await getUid();

    try {
      let query = supabase
        .from('community_posts')
        .select(
          'id, profile_id, content, images, pet_type, breed, likes_count, comments_count, favorites_count, review_status, created_at, public_profiles!inner(display_name, avatar_url, username)'
        )
        .eq('is_deleted', false)
        .in('review_status', ['approved', 'auto_approved'])
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (options.petType) query = query.eq('pet_type', options.petType);
      if (options.breed && options.breed !== 'All Breeds') query = query.eq('breed', options.breed);
      if (options.cursor) query = query.lt('created_at', options.cursor);

      const { data, error } = await query;
      if (error) throw error;

      const newPosts = (data as Post[]) || [];
      setPosts((prev) => (options.cursor ? [...prev, ...newPosts] : newPosts));
      setHasMore(newPosts.length >= PAGE_SIZE);

      if (uid && newPosts.length > 0) {
        const postIds = newPosts.map((p) => p.id);
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('profile_id', uid)
          .in('post_id', postIds);
        if (likes) {
          setMyLikedPostIds((prev) => {
            const next = new Set(prev);
            likes.forEach((l: any) => next.add(l.post_id));
            return next;
          });
        }
      }
      return { data: newPosts, error: null };
    } catch (err) {
      console.warn('[useCommunity.fetchPosts]', err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(
    async (payload: {
      content: string;
      imageFiles?: { uri: string; name: string; type?: string }[];
      petType?: string;
      breed?: string;
    }) => {
      const uid = await getUid();
      if (!uid) return { data: null, error: { code: 'UNAUTHENTICATED', message: 'Please firstSign In' } };

      const imageUrls: string[] = [];
      for (const file of payload.imageFiles?.slice(0, 9) || []) {
        try {
          const { filename, blob } = await preprocessImage(file.uri, file.name);
          const path = `${uid}/${filename}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('community-posts')
            .upload(path, blob, { contentType: file.type || 'image/jpeg', upsert: false });
          if (uploadErr) {
            console.warn('[useCommunity.createPost] upload error:', uploadErr.message);
            continue;
          }
          const { data: urlData } = supabase.storage.from('community-posts').getPublicUrl(uploadData.path);
          imageUrls.push(urlData.publicUrl);
        } catch (e) {
          console.warn('[useCommunity.createPost] preprocess error:', e);
        }
      }

      const { data, error } = await supabase.rpc('create_community_post', {
        p_content: payload.content,
        p_images: imageUrls,
        p_pet_type: payload.petType || null,
        p_breed: payload.breed || null,
        p_ip_address: null,
      });

      if (error) {
        return { data: null, error };
      }

      await fetchPosts({});
      return { data, error: null };
    },
    [fetchPosts]
  );

  const toggleLike = useCallback(async (postId: string, liked: boolean) => {
    const uid = await getUid();
    if (!uid) return;

    if (liked) {
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('profile_id', uid);
      setMyLikedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p))
      );
    } else {
      await supabase.from('community_likes').insert({ post_id: postId, profile_id: uid });
      setMyLikedPostIds((prev) => {
        const next = new Set(prev);
        next.add(postId);
        return next;
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p)));
    }
  }, []);

  const reportPost = useCallback(async (postId: string, reason: string, category = 'other') => {
    const uid = await getUid();
    if (!uid) return { data: null, error: { code: 'UNAUTHENTICATED', message: 'Please firstSign In' } };
    try {
      const { data, error } = await supabase
        .from('community_reports')
        .insert({ post_id: postId, reporter_id: uid, reason, category })
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .update({ is_deleted: true })
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const checkVerify = useCallback(async () => {
    const uid = await getUid();
    if (!uid) return { verified: false, hasBirthDate: false };
    const { data } = await supabase.from('profiles').select('phone_verified_at, birth_date').eq('id', uid).single();
    return {
      verified: !!data?.phone_verified_at,
      hasBirthDate: !!data?.birth_date,
    };
  }, []);

  return {
    posts,
    loading,
    hasMore,
    myLikedPostIds,
    fetchPosts,
    createPost,
    toggleLike,
    reportPost,
    deletePost,
    checkVerify,
  };
}
