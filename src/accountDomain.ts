// UTF-8 hex is filename-safe and cannot collide for different Firebase UIDs.
export function accountSuffix(uid: string, legacyOwner: string): string {
 if (!uid) throw new Error('Se requiere un usuario.');
 if (uid === legacyOwner) return '';
 return '-' + Array.from(new TextEncoder().encode(uid), n => n.toString(16).padStart(2, '0')).join('');
}
