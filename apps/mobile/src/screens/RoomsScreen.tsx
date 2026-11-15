import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RoomSummary } from '@vybe/shared-types';
import { mobileApi } from '../lib/api';
import { theme } from '../lib/theme';
import { useMobileSession } from '../lib/session';

interface RoomsScreenProps {
  onOpenRoom: (slug: string, name: string) => void;
}

export function RoomsScreen({ onOpenRoom }: RoomsScreenProps) {
  const { token } = useMobileSession();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      setRooms(await mobileApi.rooms(token));
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 12000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.colors.accent}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>
            Live <Text style={styles.titleAccent}>3D Rooms</Text>
          </Text>
          <Text style={styles.subtitle}>tap a room to walk in</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.themeTag}>{item.themeTag}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.activeParticipantCount}/{item.maxParticipants}
              </Text>
            </View>
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {item.description || 'A custom VYBE space.'}
          </Text>
          <Pressable style={styles.button} onPress={() => onOpenRoom(item.slug, item.name)}>
            <Text style={styles.buttonText}>Enter room →</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.dim}>No rooms available yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  header: { marginBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  titleAccent: { color: theme.colors.accent },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  error: { marginTop: theme.spacing.sm, fontSize: 11, color: theme.colors.danger },
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  themeTag: { fontSize: 9, letterSpacing: 1.8, fontWeight: '700', color: theme.colors.accent },
  name: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  badge: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.accent },
  description: { fontSize: 11, lineHeight: 16, color: theme.colors.textSecondary },
  button: {
    marginTop: 4,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    alignItems: 'center',
  },
  buttonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 11, letterSpacing: 0.8 },
  dim: { color: theme.colors.textSecondary, fontSize: 11 },
});
