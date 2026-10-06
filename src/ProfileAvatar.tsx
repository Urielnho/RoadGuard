import { Image, Text, View } from 'react-native';
import { accents, Preferences } from './premiumDomain';
import { s } from './ui';
export function ProfileAvatar({ preferences }: { preferences: Preferences }) {
  const accent = accents[preferences.accent];
  const initials = preferences.displayName.trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase() || 'RG';
  return preferences.avatarUri
    ? <Image accessibilityLabel="Foto de perfil" source={{ uri: preferences.avatarUri }} style={s.avatar} />
    : <View style={[s.avatar, { backgroundColor: accent.soft }]}><Text style={[s.avatarText, { color: accent.color }]}>{initials}</Text></View>;
}
