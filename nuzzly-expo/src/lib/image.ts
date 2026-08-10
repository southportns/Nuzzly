import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function compressImage(uri: string, maxSide = 1280, quality = 0.85) {
  const manipulated = await manipulateAsync(
    uri,
    [{ resize: { width: maxSide } }],
    { compress: quality, format: SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) {
    throw new Error('Image compression failed');
  }
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
