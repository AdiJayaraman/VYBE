import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TabBar, type TabKey } from './components/TabBar';
import { theme } from './lib/theme';
import { DEMO_ACCOUNTS, MobileSessionProvider, useMobileSession } from './lib/session';
import { LoginScreen } from './screens/LoginScreen';
import { AvatarScreen } from './screens/AvatarScreen';
import { FeedScreen } from './screens/FeedScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { RoomPortal } from './screens/RoomPortal';
import { RoomsScreen } from './screens/RoomsScreen';

interface ActiveRoom {
  slug: string;
  name: string;
}

function Shell() {
  const { user, signInAs, signOut } = useMobileSession();
  const [tab, setTab] = useState<TabKey>('feed');
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);

  if (!user) {
    return (
      <View style={styles.loginRoot}>
        <StatusBar style="light" />
        <LoginScreen />
      </View>
    );
  }

  if (activeRoom) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <RoomPortal
          slug={activeRoom.slug}
          roomName={activeRoom.name}
          onExit={() => setActiveRoom(null)}
        />
      </View>
    );
  }

  const openRoom = (slug: string, name: string): void => setActiveRoom({ slug, name });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <View>
            <Text style={styles.brand}>VYBE</Text>
            <Text style={styles.brandSub}>spatial network</Text>
          </View>
        </View>

        <View style={styles.accountRow}>
          {DEMO_ACCOUNTS.map((account) => (
            <Pressable
              key={account.email}
              onPress={() => void signInAs(account.email)}
              style={[
                styles.accountChip,
                user.username === account.email.split('@')[0] && styles.accountChipActive,
              ]}
            >
              <Text style={styles.accountText}>{account.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={signOut} style={styles.accountChip}>
            <Text style={styles.accountText}>sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {tab === 'feed' ? <FeedScreen onOpenRoom={openRoom} /> : null}
        {tab === 'rooms' ? <RoomsScreen onOpenRoom={openRoom} /> : null}
        {tab === 'avatar' ? <AvatarScreen /> : null}
        {tab === 'messages' ? <MessagesScreen /> : null}
      </View>

      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

export function App() {
  return (
    <MobileSessionProvider>
      <Shell />
    </MobileSessionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 52 : 32 },
  loginRoot: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 52 : 32 },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#F8FAFC', fontWeight: '900', fontSize: 16 },
  brand: { color: theme.colors.textPrimary, fontWeight: '900', letterSpacing: 4, fontSize: 14 },
  brandSub: {
    color: theme.colors.textSecondary,
    fontSize: 8,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  accountRow: { flexDirection: 'row', gap: theme.spacing.sm },
  accountChip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  accountChipActive: { borderColor: theme.colors.accent, backgroundColor: 'rgba(6,182,212,0.14)' },
  accountText: { color: theme.colors.textSecondary, fontSize: 9, fontWeight: '700' },
  errorPill: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  errorText: { color: theme.colors.danger, fontSize: 10 },
  content: { flex: 1 },
});
