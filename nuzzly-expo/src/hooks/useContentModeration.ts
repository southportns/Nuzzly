import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ModerationPost {
 id: string;
 content?: string;
 review_status?: 'pending' | 'approved' | 'rejected' | 'auto_approved';
 reject_reason?: string;
 created_at?: string;
 public_profiles?: { display_name?: string; avatar_url?: string };
}

export interface ModerationStats {
 pending: number;
 approved: number;
 rejected: number;
}

const STATUS_LABELS: Record<string, string> = {
 pending: '',
 approved: ' ',
 rejected: ' ',
 auto_approved: '',
};

const STATUS_COLORS: Record<string, string> = {
 pending: '#d29922',
 approved: '#3fb950',
 rejected: '#f85149',
 auto_approved: '#58a6ff',
};

export function useContentModeration() {
 const [ModerationQueue, setModerationQueue] = useState<ModerationPost[]>([]);
 const [ModerationStats, setModerationStats] = useState<ModerationStats>({ pending: 0, approved: 0, rejected: 0 });
 const [loading, setLoading] = useState(false);

 const getUid = useCallback(async () => {
 const { data: sessionData } = await supabase.auth.getSession();
 return sessionData.session?.user?.id;
 }, []);

 const requireAdmin = useCallback(async () => {
 const uid = await getUid();
 if (!uid) throw new Error('Not Sign In');
 const { data: profile } = await supabase.from('profiles').select('is_admin, role').eq('id', uid).maybeSingle();
 if (!profile?.is_admin &&!['admin', 'Moderator'].includes(profile?.role as string)) {
 throw new Error('No Management');
 }
 return uid;
 }, [getUid]);

 const fetchModerationQueue = useCallback(async (status = 'pending', limit = 50) => {
 setLoading(true);
 const { data, error } = await supabase.from('community_posts').select('*, public_profiles(display_name, avatar_url)').eq('review_status', status).order('created_at', { ascending: false }).limit(limit);

 if (error) {
 console.warn('[useContentModeration] fetch error:', error.message);
 setModerationQueue([]);
 } else {
 setModerationQueue((data || []) as ModerationPost[]);
 }
 setLoading(false);
 }, []);

 const fetchModerationStats = useCallback(async () => {
 const [pending, approved, rejected] = await Promise.all([supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
 supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'approved'),
 supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'rejected'),]);

 setModerationStats({
 pending: pending.count || 0,
 approved: approved.count || 0,
 rejected: rejected.count || 0,
 });
 }, []);

 const approvePost = useCallback(async (postId: string) => {
 await requireAdmin();
 const { error } = await supabase.from('community_posts').update({ review_status: 'approved' }).eq('id', postId);
 if (error) throw new Error(error.message);
 setModerationQueue((prev) => prev.filter((p) => p.id!== postId));
 setModerationStats((s) => ({...s, pending: Math.max(0, s.pending - 1), approved: s.approved + 1 }));
 }, [requireAdmin]);

 const rejectPost = useCallback(async (postId: string, reason?: string) => {
 await requireAdmin();
 const { error } = await supabase.from('community_posts').update({ review_status: 'rejected', reject_reason: reason || 'ContentNot Community' }).eq('id', postId);
 if (error) throw new Error(error.message);
 setModerationQueue((prev) => prev.filter((p) => p.id!== postId));
 setModerationStats((s) => ({...s, pending: Math.max(0, s.pending - 1), rejected: s.rejected + 1 }));
 }, [requireAdmin]);

 const flagPost = useCallback(async (postId: string, reason?: string) => {
 const uid = await getUid();
 if (!uid) throw new Error('Not Sign In');
 const { error } = await supabase.from('community_reports').insert({
 post_id: postId,
 reporter_id: uid,
 reason,
 category: 'inappropriate',
 });
 if (error) throw new Error(error.message);
 }, [getUid]);

 const batchModerate = useCallback(async (postIds: string[], action: 'approve' | 'reject', reason?: string) => {
 await requireAdmin();
 const updates = action === 'approve'? { review_status: 'approved' }: { review_status: 'rejected', reject_reason: reason };

 const { error } = await supabase.from('community_posts').update(updates).in('id', postIds);
 if (error) throw new Error(error.message);

 setModerationQueue((prev) => prev.filter((p) =>!postIds.includes(p.id)));
 setModerationStats((s) => ({...s,
 pending: Math.max(0, s.pending - postIds.length),
 approved: action === 'approve'? s.approved + postIds.length: s.approved,
 rejected: action === 'reject'? s.rejected + postIds.length: s.rejected,
 }));
 }, [requireAdmin]);

 const getReviewStatusLabel = useCallback((status?: string) => STATUS_LABELS[status || ''] || status || 'Unknown', []);
 const getReviewStatusColor = useCallback((status?: string) => STATUS_COLORS[status || ''] || '#8b949e', []);

 return {
 ModerationQueue,
 ModerationStats,
 loading,
 fetchModerationQueue,
 fetchModerationStats,
 approvePost,
 rejectPost,
 flagPost,
 batchModerate,
 getReviewStatusLabel,
 getReviewStatusColor,
 };
}
