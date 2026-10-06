import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  background: '#F7F8FA', surface: '#FFFFFF', ink: '#18252B', muted: '#64747B',
  line: '#E5EBED', accent: '#16735A', accentSoft: '#EAF4F0', warning: '#946A10', danger: '#B83C47',
};

export function Button({ title, onPress, secondary = false, disabled = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.button, secondary && s.secondary, (pressed || disabled) && { opacity: 0.5 }]}>
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }

export function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <View style={s.metric}><Text style={s.caption}>{label}</Text><Text style={s.metricValue}>{value}</Text><Text style={s.muted}>{unit}</Text></View>;
}

export function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={s.disclosure}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpanded(value => !value)} style={s.disclosureButton}>
      <Text style={s.body}>{title}</Text><Text style={s.disclosureSymbol}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <View style={s.disclosureContent}>{children}</View>}
  </View>;
}

export function ValueRow({ label, value }: { label: string; value: string }) {
  return <View style={s.valueRow}><Text style={[s.body, { flex: 1 }]}>{label}</Text><Text style={s.value}>{value}</Text></View>;
}

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: colors.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  brandMark: { width: 24, height: 28, borderWidth: 2, borderColor: colors.accent, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  lane: { width: 2, height: 6, backgroundColor: colors.accent, borderRadius: 1 },
  headerAction: { minHeight: 44, minWidth: 44, paddingLeft: 12, justifyContent: 'center' },
  headerLink: { color: colors.muted, fontSize: 13 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 22 },
  pageHeading: { gap: 8, marginBottom: 6 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  hero: { color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -1, lineHeight: 40 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 23 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  caption: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  notice: { color: colors.warning, fontSize: 12, lineHeight: 20 },
  badge: { color: colors.accent, fontSize: 11, fontWeight: '600', backgroundColor: colors.accentSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, overflow: 'hidden' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20, gap: 16 },
  button: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stacked: { gap: 12 },
  vehicleGroup: { gap: 8 },
  vehicle: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, minHeight: 54 },
  vehicleSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  vehicleText: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  selection: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#AEBCC2', alignItems: 'center', justifyContent: 'center' },
  selectionActive: { borderColor: colors.accent },
  selectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  metric: { flex: 1, paddingVertical: 4, gap: 6 },
  metricValue: { color: colors.ink, fontSize: 30, fontWeight: '600', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  metricDivider: { width: 1, height: 60, backgroundColor: colors.line, marginHorizontal: 8 },
  riskNumber: { fontSize: 64, lineHeight: 76, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  riskTotal: { fontSize: 18, color: colors.muted, fontWeight: '400', letterSpacing: 0 },
  riskTrack: { height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden' },
  riskFill: { height: 4, borderRadius: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  disclosure: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  disclosureButton: { minHeight: 52, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  disclosureSymbol: { color: colors.muted, fontSize: 22, fontWeight: '300' },
  disclosureContent: { gap: 12, paddingBottom: 18 },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 5 },
  value: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', flexShrink: 1 },
  eventRow: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  empty: { alignItems: 'center', paddingVertical: 38, gap: 10 },
  emptySymbol: { color: colors.accent, fontSize: 36, marginBottom: 8 },
  nav: { width: '100%', maxWidth: 620, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 8, gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
  navItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  navItemActive: { backgroundColor: colors.accentSoft },
  navText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  navTextActive: { color: colors.accent, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: '#14252B66', padding: 24, justifyContent: 'center', alignItems: 'center' },
  alertCard: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
  modalContent: { gap: 18 },
});
