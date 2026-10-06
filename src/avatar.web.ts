import * as ImagePicker from 'expo-image-picker';
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('No se pudo guardar la imagen.');
  return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
}
