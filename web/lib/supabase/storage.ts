// Supabase Storage helpers for PetTrust

import { createClient } from "@/lib/supabase/client"

const BUCKETS = {
  petAvatars: "pet-avatars",
  petAttachments: "pet-attachments",
  productImages: "product-images",
  reviewVouchers: "review-vouchers",
  userAvatars: "user-avatars",
} as const

export type UploadResult = {
  url: string | null
  path: string | null
  error: string | null
}

/**
 * Upload file to a public bucket and return public URL.
 * For private buckets (pet-attachments, review-vouchers) the returned `url` is
 * the public URL but reading the file is gated by RLS — clients should pass
 * the `path` to a signed-URL endpoint when display is required.
 */
export async function uploadFile(
  bucket: string,
  file: File,
  prefix: string = ""
): Promise<UploadResult> {
  const supabase = createClient()

  const ext = file.name.split(".").pop() ?? "jpg"
  const fileName = `${prefix ? prefix + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    return { url: null, path: null, error: error.message }
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, path: data.path, error: null }
}

/** Generate a time-limited signed URL for a private-bucket object. */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) return { url: null, error: error.message }
  return { url: data.signedUrl, error: null }
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error: error?.message ?? null }
}

export async function uploadPetAvatar(file: File, petId: string): Promise<UploadResult> {
  return uploadFile(BUCKETS.petAvatars, file, petId)
}

export async function uploadPetAttachment(
  file: File,
  profileId: string
): Promise<UploadResult> {
  return uploadFile(BUCKETS.petAttachments, file, profileId)
}

export async function deletePetAvatar(
  petId: string,
  path: string
): Promise<{ error: string | null }> {
  return deleteFile(BUCKETS.petAvatars, `${petId}/${path.split("/").pop()}`)
}

export async function deletePetAttachment(
  profileId: string,
  path: string
): Promise<{ error: string | null }> {
  return deleteFile(BUCKETS.petAttachments, `${profileId}/${path.split("/").pop()}`)
}

export async function uploadVoucher(file: File, reviewId: string): Promise<UploadResult> {
  return uploadFile(BUCKETS.reviewVouchers, file, reviewId)
}

export async function uploadProductImage(file: File, productId: string): Promise<UploadResult> {
  return uploadFile(BUCKETS.productImages, file, productId)
}

/**
 * Upload a user avatar to the user-avatars bucket.
 * Uses a fixed path per user so repeated uploads overwrite the previous avatar.
 */
export async function uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
  const supabase = createClient()
  const path = `${userId}/avatar.jpg`

  const { data, error } = await supabase.storage
    .from(BUCKETS.userAvatars)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
    })

  if (error) {
    return { url: null, path: null, error: error.message }
  }

  const { data: urlData } = supabase.storage
    .from(BUCKETS.userAvatars)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, path: data.path, error: null }
}

export async function deleteUserAvatar(userId: string): Promise<{ error: string | null }> {
  return deleteFile(BUCKETS.userAvatars, `${userId}/avatar.jpg`)
}
