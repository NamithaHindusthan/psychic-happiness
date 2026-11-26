import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/ThemeProvider';
import { fonts, radius, spacing } from '@/theme/colors';

/** Full-screen scrolling container that handles the keyboard and system bars. */
export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.xl,
    paddingBottom: insets.bottom + spacing.xl,
    paddingHorizontal: spacing.xl,
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ flexGrow: 1 }, padding]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.brand}>
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Ionicons name="checkmark-done" size={28} color={colors.onPrimary} />
      </View>
      <Text style={[styles.brandName, { color: colors.text, fontFamily: fonts.display }]}>TaskNest</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.title, { color: colors.text, fontFamily: fonts.display }]}>{children}</Text>;
}

export function Body({ children, muted = true }: { children: ReactNode; muted?: boolean }) {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: muted ? colors.textMuted : colors.text }]}>{children}</Text>;
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  secure?: boolean;
};

export function TextField({ label, error, secure, style, ...rest }: FieldProps) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.inputBackground, borderColor, borderWidth: focused || error ? 2 : 1 },
        ]}
      >
        <TextInput
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.fieldError, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.surfaceAlt;
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && variant === 'primary' ? colors.primaryPressed : bg,
          opacity: inactive && !loading ? 0.5 : 1,
        },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link" style={{ paddingVertical: spacing.sm }}>
      <Text style={[styles.link, { color: colors.link }]}>{title}</Text>
    </Pressable>
  );
}

export function Banner({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const { colors } = useTheme();
  const bg = kind === 'error' ? colors.dangerSoft : kind === 'success' ? colors.successSoft : colors.accentSoft;
  const fg = kind === 'error' ? colors.danger : kind === 'success' ? colors.success : colors.text;
  const icon = kind === 'error' ? 'alert-circle' : kind === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View
      style={[styles.banner, { backgroundColor: bg }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={kind === 'error' ? 'alert' : undefined}
    >
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'danger' }) {
  const { colors } = useTheme();
  const bg =
    tone === 'accent' ? colors.accentSoft : tone === 'success' ? colors.successSoft : tone === 'danger' ? colors.dangerSoft : colors.surfaceAlt;
  const fg = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.text;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg },
  logo: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 34, fontWeight: '700', marginTop: spacing.md, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, marginTop: spacing.xs, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.sm },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs + 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.md },
  fieldError: { fontSize: 13, marginTop: spacing.xs + 2 },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  link: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
});
