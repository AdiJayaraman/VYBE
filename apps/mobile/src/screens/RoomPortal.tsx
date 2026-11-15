import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { ROOM_MOVE_TICK_MS, WALK_SPEED, clampToRoomBounds, type Vec3 } from '@vybe/3d-core';
import type {
  ChatMessageEvent,
  ClientToServerEvents,
  RoomParticipant,
  ServerToClientEvents,
} from '@vybe/shared-types';
import { SOCKET_URL, mobileApi } from '../lib/api';
import { theme } from '../lib/theme';
import { useMobileSession } from '../lib/session';
import { Joystick, type JoystickVector } from '../components/Joystick';

type VybeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface RoomPortalProps {
  slug: string;
  roomName: string;
  onExit: () => void;
}

const BOUNDS = { minX: -14, maxX: 14, minZ: -14, maxZ: 14 };

export function RoomPortal({ slug, roomName, onExit }: RoomPortalProps) {
  const { token, user } = useMobileSession();
  const socketRef = useRef<VybeSocket | null>(null);
  const positionRef = useRef<Vec3>([0, 0, 6]);
  const joystickRef = useRef<JoystickVector>({ x: 0, y: 0 });
  const movingRef = useRef(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void mobileApi
      .room(token, slug)
      .then((room) => {
        if (cancelled) return;
        setRoomId(room.id);
        positionRef.current = [0, 0, 6];
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Room not found');
      });
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  useEffect(() => {
    if (!token || !roomId) return;

    const socket: VybeSocket = io(`${SOCKET_URL}/spatial`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('room:join', { roomId }, (response) => {
        if (!response.ok) setError(response.error.message);
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (caught: Error) => setError(caught.message));

    socket.on('room:state_sync', (payload) => setParticipants(payload.participants));
    socket.on('room:player_joined', (participant) => {
      setParticipants((current) => [
        ...current.filter((member) => member.userId !== participant.userId),
        participant,
      ]);
    });
    socket.on('room:player_left', (payload) => {
      setParticipants((current) => current.filter((member) => member.userId !== payload.userId));
    });
    socket.on('room:chat_message', (message) => {
      setMessages((current) => [...current.slice(-49), message]);
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, roomId]);

  // 15Hz movement emitter driven by the joystick.
  useEffect(() => {
    if (!roomId) return;
    const timer = setInterval(() => {
      const socket = socketRef.current;
      if (!socket) return;
      const vector = joystickRef.current;
      const magnitude = Math.hypot(vector.x, vector.y);

      if (magnitude < 0.08) {
        if (movingRef.current) {
          movingRef.current = false;
          socket.emit('room:move', {
            roomId,
            position: positionRef.current,
            rotation: 0,
            animation: 'idle',
          });
        }
        return;
      }

      const delta = ROOM_MOVE_TICK_MS / 1000;
      const next = clampToRoomBounds(
        [
          positionRef.current[0] + vector.x * WALK_SPEED * delta,
          0,
          positionRef.current[2] + vector.y * WALK_SPEED * delta,
        ],
        BOUNDS,
      );
      positionRef.current = next;
      movingRef.current = true;

      socket.emit('room:move', {
        roomId,
        position: next,
        rotation: Number(Math.atan2(vector.x, vector.y).toFixed(3)),
        animation: 'walk',
      });
    }, ROOM_MOVE_TICK_MS);

    return () => clearInterval(timer);
  }, [roomId]);

  const sendChat = useCallback((): void => {
    const content = draft.trim();
    const socket = socketRef.current;
    if (!content || !socket || !roomId) return;
    socket.emit('room:chat', { roomId, content }, (response) => {
      if (response.ok) setDraft('');
    });
  }, [draft, roomId]);

  const exit = (): void => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('room:leave', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    onExit();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={exit} style={styles.exit}>
          <Text style={styles.exitText}>← Exit</Text>
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.roomName}>{roomName}</Text>
          <Text style={styles.meta}>
            {connected ? `${participants.length} live` : 'connecting…'} · {slug}
          </Text>
        </View>
        <View style={styles.liveDot} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.presence}>
        <Text style={styles.sectionLabel}>present in space</Text>
        <FlatList
          horizontal
          data={participants}
          keyExtractor={(item) => item.userId}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.participant, item.userId === user?.id && styles.participantSelf]}>
              <View style={[styles.dot, { backgroundColor: item.avatarConfig.topColor }]} />
              <Text style={styles.participantName}>{item.displayName}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.dim}>waiting for the room state…</Text>}
        />
        <Text style={styles.coordinates}>
          x {positionRef.current[0].toFixed(1)} · z {positionRef.current[2].toFixed(1)}
        </Text>
      </View>

      <View style={styles.chat}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.message}>
              <Text style={styles.messageUser}>{item.username}: </Text>
              {item.content}
            </Text>
          )}
          ListEmptyComponent={
            <Text style={styles.dim}>Room chat — say hi to everyone in the portal.</Text>
          }
        />
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the room…"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            maxLength={280}
            onSubmitEditing={sendChat}
          />
          <Pressable style={styles.send} onPress={sendChat}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        <Joystick onChange={(vector) => (joystickRef.current = vector)} />
        <View style={styles.emotes}>
          {(['wave', 'dance', 'sit'] as const).map((emote) => (
            <Pressable
              key={emote}
              style={styles.emote}
              onPress={() => {
                const socket = socketRef.current;
                if (socket && roomId) socket.emit('room:emote', { roomId, emote });
              }}
            >
              <Text style={styles.emoteText}>{emote}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  exit: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exitText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700' },
  roomName: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  meta: { color: theme.colors.accent, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.accent },
  error: { marginTop: theme.spacing.sm, color: theme.colors.danger, fontSize: 11 },
  presence: { marginTop: theme.spacing.lg, gap: theme.spacing.xs },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  participantSelf: { borderColor: theme.colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  participantName: { color: theme.colors.textPrimary, fontSize: 11, fontWeight: '600' },
  coordinates: { color: theme.colors.textSecondary, fontSize: 10, fontVariant: ['tabular-nums'] },
  chat: {
    flex: 1,
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(15, 22, 41, 0.75)',
    padding: theme.spacing.md,
  },
  message: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 18 },
  messageUser: { color: theme.colors.accent, fontWeight: '700' },
  composer: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  input: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    fontSize: 12,
  },
  send: {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  sendText: { color: '#F8FAFC', fontSize: 11, fontWeight: '800' },
  controls: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emotes: { gap: theme.spacing.sm, alignItems: 'flex-end' },
  emote: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  emoteText: { color: theme.colors.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dim: { color: theme.colors.textSecondary, fontSize: 11 },
});
