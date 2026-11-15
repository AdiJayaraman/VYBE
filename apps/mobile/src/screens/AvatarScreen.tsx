import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AVATAR_SURFACE_COLORS,
  HAIR_COLOR_SWATCHES,
  HAIR_STYLE_LABELS,
  OUTFIT_COLOR_SWATCHES,
  SKIN_TONE_LABELS,
} from '@vybe/3d-core';
import {
  DEFAULT_AVATAR_CONFIG,
  HAIR_STYLE_IDS,
  SKIN_TONES,
  type AvatarConfig,
} from '@vybe/shared-types';
import { mobileApi } from '../lib/api';
import { theme } from '../lib/theme';
import { useMobileSession } from '../lib/session';

export function AvatarScreen() {
  const { user, token, setUser } = useMobileSession();
  const [config, setConfig] = useState<AvatarConfig>(user?.avatarConfig ?? DEFAULT_AVATAR_CONFIG);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setConfig(user.avatarConfig);
  }, [user]);

  const patch = (partial: Partial<AvatarConfig>): void => {
    setConfig((current) => ({ ...current, ...partial }));
    setMessage(null);
  };

  const save = async (): Promise<void> => {
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await mobileApi.updateAvatar(token, config);
      setUser(profile);
      setMessage('Avatar synced');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Avatar <Text style={styles.titleAccent}>Studio</Text>
      </Text>
      <Text style={styles.subtitle}>modular config · synced to your profile</Text>

      <View style={styles.preview}>
        <View style={[styles.previewHead, { backgroundColor: AVATAR_SURFACE_COLORS[config.skinTone] }]} />
        <View
          style={[
            styles.previewHair,
            { backgroundColor: config.hairColor, borderColor: config.accessoryColor },
          ]}
        />
        <View style={[styles.previewTorso, { backgroundColor: config.topColor }]} />
        <View style={[styles.previewLegs, { backgroundColor: config.bottomColor }]} />
        <View style={[styles.previewShoes, { backgroundColor: config.shoesId === 'boots' ? '#0B1120' : '#F8FAFC' }]} />
      </View>

      <Text style={styles.section}>Skin tone</Text>
      <View style={styles.rowWrap}>
        {SKIN_TONES.map((tone) => (
          <Pressable
            key={tone}
            onPress={() => patch({ skinTone: tone })}
            style={[
              styles.swatch,
              { backgroundColor: AVATAR_SURFACE_COLORS[tone] },
              config.skinTone === tone && styles.swatchActive,
            ]}
            accessibilityLabel={SKIN_TONE_LABELS[tone]}
          />
        ))}
      </View>

      <Text style={styles.section}>Hair style</Text>
      <View style={styles.rowWrap}>
        {HAIR_STYLE_IDS.map((style) => (
          <Pressable
            key={style}
            onPress={() => patch({ hairStyleId: style })}
            style={[styles.chip, config.hairStyleId === style && styles.chipActive]}
          >
            <Text style={styles.chipText}>{HAIR_STYLE_LABELS[style]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Hair color</Text>
      <View style={styles.rowWrap}>
        {HAIR_COLOR_SWATCHES.map((color) => (
          <Pressable
            key={color}
            onPress={() => patch({ hairColor: color })}
            style={[
              styles.swatch,
              { backgroundColor: color },
              config.hairColor === color && styles.swatchActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.section}>Outfit color</Text>
      <View style={styles.rowWrap}>
        {OUTFIT_COLOR_SWATCHES.map((color) => (
          <Pressable
            key={color}
            onPress={() => patch({ topColor: color })}
            style={[
              styles.swatch,
              { backgroundColor: color },
              config.topColor === color && styles.swatchActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.section}>Neon accessory</Text>
      <View style={styles.rowWrap}>
        {(['none', 'visor', 'halo', 'earpiece', 'wings'] as const).map((accessory) => (
          <Pressable
            key={accessory}
            onPress={() => patch({ accessoryId: accessory })}
            style={[styles.chip, config.accessoryId === accessory && styles.chipActive]}
          >
            <Text style={styles.chipText}>{accessory}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.save} onPress={() => void save()} disabled={saving || !token}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save avatar'}</Text>
      </Pressable>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  titleAccent: { color: theme.colors.accent },
  subtitle: {
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  preview: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#0A1020',
    marginVertical: theme.spacing.sm,
  },
  previewHead: { width: 46, height: 46, borderRadius: 23 },
  previewHair: {
    position: 'absolute',
    top: 22,
    width: 54,
    height: 26,
    borderRadius: 18,
    borderWidth: 2,
  },
  previewTorso: { width: 84, height: 62, borderRadius: 16, marginTop: 4 },
  previewLegs: { width: 62, height: 34, borderRadius: 10 },
  previewShoes: { width: 70, height: 10, borderRadius: 5, marginTop: 2 },
  section: {
    marginTop: theme.spacing.md,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: 4 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: theme.colors.accent },
  chip: {
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(124,58,237,0.2)' },
  chipText: { fontSize: 10, fontWeight: '700', color: theme.colors.textPrimary },
  save: {
    marginTop: theme.spacing.xl,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#F8FAFC', fontWeight: '800', letterSpacing: 0.8, fontSize: 12 },
  success: { marginTop: theme.spacing.sm, fontSize: 11, color: theme.colors.accent },
  error: { marginTop: theme.spacing.sm, fontSize: 11, color: theme.colors.danger },
});
