import { supabase } from './supabase';
import type { RecipePhoto } from './types';
export async function resizePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an image smaller than 25 MB.');
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image resizing is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Could not process this image. Try a JPEG or PNG.')),
        'image/jpeg',
        0.82,
      ),
    );
  } finally {
    image.close();
  }
}
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read image.'));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(blob);
  });
}
const signedCache = new Map<string, { url: string; expires: number }>();
export async function signedPhotos(photos: RecipePhoto[]): Promise<RecipePhoto[]> {
  if (!supabase) return photos;
  const paths = photos
    .map((p) => p.storage_path)
    .filter((p) => !signedCache.has(p) || (signedCache.get(p)?.expires ?? 0) < Date.now());
  if (paths.length) {
    const { data, error } = await supabase.storage
      .from('recipe-photos')
      .createSignedUrls([...new Set(paths)], 3600);
    if (error) throw error;
    for (const item of data ?? []) {
      if (item.path && item.signedUrl)
        signedCache.set(item.path, { url: item.signedUrl, expires: Date.now() + 2700_000 });
    }
  }
  return photos.map((p) => ({ ...p, url: signedCache.get(p.storage_path)?.url }));
}
export async function uploadRecipePhoto(
  recipeId: string,
  file: File,
  position: number,
): Promise<RecipePhoto> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const blob = await resizePhoto(file);
  const path = `${recipeId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('recipe-photos')
    .upload(path, blob, { contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('recipe_photos')
    .insert({
      recipe_id: recipeId,
      storage_path: path,
      position,
      caption: file.name.replace(/\.[^.]+$/, ''),
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from('recipe-photos').remove([path]);
    throw error;
  }
  return (await signedPhotos([data]))[0];
}
