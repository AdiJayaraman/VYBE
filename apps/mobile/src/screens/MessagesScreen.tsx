import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ConversationSummary, DirectMessageView } from '@vybe/shared-types';
import { mobileApi } from '../lib/api';
import { theme } from '../lib/theme';
import { useMobileSession } from '../lib/session';

export function MessagesScreen() {
  const { token, user } = useMobileSession();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<DirectMessageView[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const list = await mobileApi.conversations(token);
      setConversations(list);
      setActiveUserId((current) => current ?? list[0]?.user.id ?? null);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load conversations');
    }
  }, [token]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!token || !activeUserId) return;
    let cancelled = false;
    void mobileApi
      .thread(token, activeUserId)
      .then((messages) => {
        if (!cancelled) setThread(messages);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load thread');
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeUserId]);

  const send = async (): Promise<void> => {
    const content = draft.trim();
    if (!token || !activeUserId || !content) return;
    try {
      const message = await mobileApi.sendMessage(token, activeUserId, content);
      setThread((current) => [...current, message]);
      setDraft('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Message failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Direct <Text style={styles.titleAccent}>Messages</Text>
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        horizontal
        data={conversations}
        keyExtractor={(item) => item.user.id}
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setActiveUserId(item.user.id)}
            style={[styles.chip, item.user.id === activeUserId && styles.chipActive]}
          >
            <Text style={styles.chipText}>{item.user.displayName}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.dim}>No conversations yet.</Text>}
      />

      <FlatList
        data={thread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.content}</Text>
              {item.roomInvite ? (
                <Text style={styles.invite}>
                  ◈ {item.roomInvite.name} · {item.roomInvite.themeTag}
                </Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.dim}>Select a conversation and say hi.</Text>
        }
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          maxLength={1000}
          editable={Boolean(activeUserId)}
        />
        <Pressable style={styles.send} onPress={() => void send()} disabled={!draft.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
  titleAccent: { color: theme.colors.accent },
  error: { fontSize: 11, color: theme.colors.danger },
  chips: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  chip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: theme.spacing.sm,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(124,58,237,0.2)' },
  chipText: { fontSize: 11, fontWeight: '700', color: theme.colors.textPrimary },
  thread: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  bubble: { maxWidth: '82%', borderRadius: theme.radii.md, padding: theme.spacing.md },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: 'rgba(124,58,237,0.3)' },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(148,163,184,0.12)' },
  bubbleText: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 17 },
  invite: { marginTop: 6, fontSize: 10, color: theme.colors.accent, fontWeight: '700' },
  composer: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    fontSize: 12,
  },
  send: {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
  },
  sendText: { color: '#F8FAFC', fontSize: 11, fontWeight: '800' },
  dim: { color: theme.colors.textSecondary, fontSize: 11 },
});
