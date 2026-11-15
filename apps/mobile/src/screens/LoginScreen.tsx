import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useMobileSession } from '../lib/session';
import { theme } from '../lib/theme';

export function LoginScreen() {
  const { status, error, signIn, signInAs } = useMobileSession();
  const [email, setEmail] = useState('nova@vybe.space');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch {
      // surfaced through the session error state
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>V</Text>
        </View>
        <View>
          <Text style={styles.brand}>VYBE</Text>
          <Text style={styles.brandSub}>spatial network</Text>
        </View>
      </View>

      <Text style={styles.heading}>Step into your space</Text>
      <Text style={styles.copy}>Sign in to sync your feed, avatar and 3D rooms across devices.</Text>

      <Text style={styles.label}>email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@vybe.space"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />

      <Text style={styles.label}>password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="at least 8 characters"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />

      <Pressable
        onPress={() => void submit()}
        disabled={busy || status === 'loading'}
        style={[styles.primaryButton, (busy || status === 'loading') && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>
          {busy || status === 'loading' ? 'Connecting…' : 'Enter VYBE'}
        </Text>
      </Pressable>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>or jump in with a demo account</Text>
      <View style={styles.demoRow}>
        {DEMO_ACCOUNTS.map((account) => (
          <Pressable key={account.email} onPress={() => void signInAs(account.email)} style={styles.chip}>
            <Text style={styles.chipText}>{account.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Demo password: {DEMO_PASSWORD}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#F8FAFC', fontWeight: '900', fontSize: 18 },
  brand: { color: theme.colors.textPrimary, fontWeight: '900', letterSpacing: 4, fontSize: 15 },
  brandSub: {
    color: theme.colors.textSecondary,
    fontSize: 8,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: theme.spacing.xl,
  },
  copy: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: theme.spacing.md,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  errorBox: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  errorText: { color: theme.colors.danger, fontSize: 11, lineHeight: 16 },
  demoRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 6 },
  chip: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700' },
  hint: { color: theme.colors.textSecondary, fontSize: 10, marginTop: theme.spacing.sm },
});
