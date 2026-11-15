import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme, tabBarHeight } from '../lib/theme';

export type TabKey = 'feed' | 'rooms' | 'avatar' | 'messages';

const TABS: { key: TabKey; label: string; glyph: string }[] = [
  { key: 'feed', label: 'Feed', glyph: '◉' },
  { key: 'rooms', label: 'Rooms', glyph: '⬡' },
  { key: 'avatar', label: 'Avatar', glyph: '☻' },
  { key: 'messages', label: 'DMs', glyph: '✉' },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.item, selected && styles.itemActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.glyph, selected && styles.glyphActive]}>{tab.glyph}</Text>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: tabBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.md,
  },
  itemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
  },
  glyph: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  glyphActive: {
    color: theme.colors.accent,
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.textPrimary,
  },
});
