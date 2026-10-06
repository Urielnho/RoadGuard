import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
  if (result.canceled) return null;
  const source = new File(result.assets[0].uri);
  const destination = new File(Paths.document, `roadguard-avatar-${Date.now()}.${source.extension.replace('.', '') || 'jpg'}`);
  source.copy(destination);
  return destination.uri;
}
