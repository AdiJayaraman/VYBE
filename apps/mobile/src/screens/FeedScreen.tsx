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
import type { FeedPost } from '@vybe/shared-types';
import { mobileApi } from '../lib/api';
import { theme } from '../lib/theme';
import { useMobileSession } from '../lib/session';

interface FeedScreenProps {
  onOpenRoom: (slug: string, name: string) => void;
}

export function FeedScreen({ onOpenRoom }: FeedScreenProps) {
  const { token, user } = useMobileSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const page = await mobileApi.feed(token);
      setPosts(page.items);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Feed failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async (post: FeedPost): Promise<void> => {
    if (!token) return;
    try {
      const result = await mobileApi.toggleLike(token, post.id);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, likedByMe: result.liked, likeCount: result.likeCount } : item,
        ),
      );
    } catch {
      // keep the optimistic state untouched on failure
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.dim}>loading spatial feed…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
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
            Your <Text style={styles.titleAccent}>Spatial</Text> Feed
          </Text>
          <Text style={styles.subtitle}>
            {user ? `@${user.username}` : 'demo'} · pull to refresh
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.dim}>
          No posts yet. Seed the demo data on the API, then pull to refresh.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: item.author.avatarConfig.topColor }]}>
              <Text style={styles.avatarText}>{item.author.displayName.slice(0, 1)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.author}>{item.author.displayName}</Text>
              <Text style={styles.handle}>@{item.author.username}</Text>
            </View>
          </View>

          {item.content ? <Text style={styles.content}>{item.content}</Text> : null}

          {item.linkedRoom ? (
            <View style={styles.portal}>
              <Text style={styles.portalTag}>3D ROOM SNAPSHOT</Text>
              <Text style={styles.portalName}>{item.linkedRoom.name}</Text>
              <Text style={styles.portalMeta}>
                {item.linkedRoom.themeTag} · {item.linkedRoom.activeParticipantCount}/
                {item.linkedRoom.maxParticipants} inside
              </Text>
              <Pressable
                style={styles.portalButton}
                onPress={() => onOpenRoom(item.linkedRoom!.slug, item.linkedRoom!.name)}
              >
                <Text style={styles.portalButtonText}>Jump Into 3D Space →</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <Pressable onPress={() => void toggleLike(item)} style={styles.likeButton}>
              <Text style={[styles.like, item.likedByMe && styles.liked]}>
                {item.likedByMe ? '♥' : '♡'} {item.likeCount}
              </Text>
            </Pressable>
            <Text style={styles.dim}>💬 {item.commentCount}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#F8FAFC', fontWeight: '800' },
  author: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 },
  handle: { color: theme.colors.textSecondary, fontSize: 11 },
  content: { color: theme.colors.textPrimary, fontSize: 13, lineHeight: 19 },
  portal: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.45)',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    padding: theme.spacing.md,
    gap: 4,
  },
  portalTag: { fontSize: 9, letterSpacing: 1.8, color: theme.colors.accent, fontWeight: '700' },
  portalName: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  portalMeta: { fontSize: 10, letterSpacing: 1, color: theme.colors.textSecondary },
  portalButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    alignItems: 'center',
  },
  portalButtonText: { color: '#F8FAFC', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginTop: 4 },
  likeButton: { paddingVertical: 4 },
  like: { color: theme.colors.textSecondary, fontSize: 12 },
  liked: { color: theme.colors.primary },
  dim: { color: theme.colors.textSecondary, fontSize: 11 },
});
