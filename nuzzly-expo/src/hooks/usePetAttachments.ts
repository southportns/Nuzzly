import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface PetAttachment {
  id?: string;
  pet_id?: string;
  uploaded_by?: string;
  file_name?: string;
  file_path?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  category?: string;
  owner_type?: string;
  owner_id?: string;
  created_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  photo: '照片',
  medical: '医疗文件',
  vaccine: '疫苗证明',
  document: '证件',
  other: '其他',
};

const CATEGORY_ICONS: Record<string, string> = {
  photo: '📷',
  medical: '🏥',
  vaccine: '💉',
  document: '📄',
  other: '📎',
};

export function usePetAttachments() {
  const [attachments, setAttachments] = useState<PetAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchAttachments = useCallback(async (petId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pet_attachments')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[usePetAttachments] fetch error:', error.message);
      setAttachments([]);
    } else {
      setAttachments((data || []) as PetAttachment[]);
    }
    setLoading(false);
  }, []);

  const uploadAttachment = useCallback(async (payload: {
    pet_id: string;
    file: { name: string; type: string; size: number; uri: string };
    category?: string;
  }) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');

    const fileExt = payload.file.name.split('.').pop() || '';
    const fileName = `${payload.pet_id}/${Date.now()}.${fileExt}`;

    const response = await fetch(payload.file.uri);
    const blob = await response.blob();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pet-attachments')
      .upload(fileName, blob);

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('pet-attachments').getPublicUrl(fileName);

    await writeGateway('CREATE_PET_ATTACHMENT', {
      pet_id: payload.pet_id,
      uploaded_by: uid,
      file_name: payload.file.name,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_type: payload.file.type,
      file_size: payload.file.size,
      category: payload.category || 'other',
      owner_type: 'pet',
      owner_id: payload.pet_id,
    });

    const optimistic: PetAttachment = {
      pet_id: payload.pet_id,
      uploaded_by: uid,
      file_name: payload.file.name,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_type: payload.file.type,
      file_size: payload.file.size,
      category: payload.category || 'other',
      owner_type: 'pet',
      owner_id: payload.pet_id,
      created_at: new Date().toISOString(),
    };
    setAttachments((prev) => [optimistic, ...prev]);
    return optimistic;
  }, [getUid]);

  const deleteAttachment = useCallback(async (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (!attachment) throw new Error('附件不存在');

    await writeGateway('DELETE_PET_ATTACHMENT', { id });
    if (attachment.file_path) {
      const { error: storageError } = await supabase.storage.from('pet-attachments').remove([attachment.file_path]);
      if (storageError) console.warn('[usePetAttachments] storage delete error:', storageError.message);
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, [attachments]);

  const getAttachmentUrl = useCallback(async (path: string) => {
    const { data } = supabase.storage.from('pet-attachments').getPublicUrl(path);
    return data?.publicUrl;
  }, []);

  const getCategoryLabel = useCallback((category?: string) => CATEGORY_LABELS[category || ''] || category || '其他', []);
  const getCategoryIcon = useCallback((category?: string) => CATEGORY_ICONS[category || ''] || '📎', []);

  const formatFileSize = useCallback((bytes?: number) => {
    if (bytes == null) return '未知';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const isImageFile = useCallback((fileType?: string) => fileType?.startsWith('image/') || false, []);
  const isPdfFile = useCallback((fileType?: string) => fileType === 'application/pdf', []);

  return {
    attachments,
    loading,
    fetchAttachments,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    getCategoryLabel,
    getCategoryIcon,
    formatFileSize,
    isImageFile,
    isPdfFile,
  };
}
