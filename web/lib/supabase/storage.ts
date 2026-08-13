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

export async function uploadPetAvatar(
  file: File,
  userId: string,
  petId: string
): Promise<UploadResult> {
  const result = await uploadFile(BUCKETS.petAvatars, file, `${userId}/${petId}`)
  // Add cache-busting parameter to prevent Next.js Image component from caching old images
  if (result.url) {
    result.url = `${result.url}?t=${Date.now()}`
  }
  return result
}

export async function uploadPetAttachment(
  file: File,
  profileId: string
): Promise<UploadResult> {
  return uploadFile(BUCKETS.petAttachments, file, profileId)
}

export async function deletePetAvatar(
  userId: string,
  path: string
): Promise<{ error: string | null }> {
  // Remove any existing cache-busting parameter
  const cleanPath = path.split("?")[0]

  // If it's a full URL, extract the path portion
  if (cleanPath.startsWith("http")) {
    try {
      const url = new URL(cleanPath)
      // Path format: /storage/v1/object/public/pet-avatars/userId/petId/filename.jpg
      const pathMatch = url.pathname.match(/\/pet-avatars\/(.+)$/)
      if (pathMatch) {
        return deleteFile(BUCKETS.petAvatars, pathMatch[1])
      }
    } catch {
      // URL parsing failed, try other methods
    }
  }

  // If it's a relative path, format: userId/petId/filename.jpg or userId/petId/filename.jpg?t=xxx
  const parts = cleanPath.split("/")
  if (parts.length >= 3) {
    return deleteFile(BUCKETS.petAvatars, `${parts[parts.length - 3]}/${parts[parts.length - 2]}/${parts[parts.length - 1]}`)
  }

  // If only filename is available, use userId as prefix
  return deleteFile(BUCKETS.petAvatars, `${userId}/${parts[parts.length - 1]}`)
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
