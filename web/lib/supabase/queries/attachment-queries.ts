import { createClient } from '../server'
import type { Database } from '@/lib/database.types'

type PetAttachment = Database['public']['Tables']['pet_attachments']['Row']

export async function getAttachments(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_attachments')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getAttachmentById(attachmentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_attachments')
    .select('*')
    .eq('id', attachmentId)
    .single()

  if (error) throw error
  return data
}

export async function createAttachment(attachment: Omit<PetAttachment, 'id' | 'created_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_attachments')
    .insert(attachment)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAttachment(attachmentId: string) {
  const supabase = await createClient()

  // 先获取附件信息用于删除Storage文件
  const { data: attachment } = await supabase
    .from('pet_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()

  // 删除Storage文件
  if (attachment?.file_path) {
    await supabase.storage.from('pet-attachments').remove([attachment.file_path])
  }

  // 删除数据库记录
  const { error } = await supabase
    .from('pet_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) throw error
}

export async function getAttachmentsByCategory(petId: string, category: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_attachments')
    .select('*')
    .eq('pet_id', petId)
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function uploadAttachment(file: File, petId: string, category: string, uploadedBy: string) {
  const supabase = await createClient()

  // 生成文件路径
  const fileExt = file.name.split('.').pop()
  const fileName = `${petId}/${Date.now()}.${fileExt}`

  // 上传文件到Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('pet-attachments')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // 获取文件URL
  const { data: urlData } = supabase.storage
    .from('pet-attachments')
    .getPublicUrl(fileName)

  // 保存附件记录
  const { data, error } = await supabase
    .from('pet_attachments')
    .insert({
      pet_id: petId,
      uploaded_by: uploadedBy,
      file_name: file.name,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      category,
      owner_type: 'pet',
      owner_id: petId
    })
    .select()
    .single()

  if (error) throw error
  return data
}
