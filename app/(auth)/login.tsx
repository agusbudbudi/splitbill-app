import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hexToRgba } from "@/lib/utils/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { login, isSubmitting } = useAuth();

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const errorColor = useThemeColor({}, "error");
  const icon = useThemeColor({}, "icon");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailFocused, setEmailFocused] = useState(false);
  const [isPasswordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setError(null);
      await login({ email: email.trim(), password: password.trim() });
      // Redirect to specified page or default to /scan
      router.replace((redirect as any) || "/scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.cardWrapper}
        >
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: text }]}>
              Split Bill App
            </Text>

            <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
              ⚡ Scan bill pakai AI, bikin split bill easy peasy!
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: text }]}>
                Masuk dulu ya 👋🏻
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Hi Gengs! masuk untuk lanjut kelola split bill kamu.
              </Text>
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: hexToRgba(errorColor, 0.1) },
                ]}
              >
                <Text style={[styles.errorText, { color: errorColor }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nama@email.com"
                placeholderTextColor={icon}
                style={[
                  styles.input,
                  { borderColor: hexToRgba(text, 0.1) },
                  isEmailFocused && [
                    styles.inputFocused,
                    { borderColor: tint },
                  ],
                ]}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="******"
                placeholderTextColor={icon}
                style={[
                  styles.input,
                  { borderColor: hexToRgba(text, 0.1) },
                  isPasswordFocused && [
                    styles.inputFocused,
                    { borderColor: tint },
                  ],
                ]}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: tint },
                isSubmitting && styles.disabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={[styles.primaryText, { color: card }]}>
                {isSubmitting ? "Memproses..." : "Masuk"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: textSecondary }]}>
                Belum punya akun?
              </Text>
              <Pressable onPress={() => router.push("/(auth)/register")}>
                <Text style={[styles.switchLink, { color: tint }]}>
                  Daftar sekarang
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingTop: 64,
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  cardWrapper: {
    gap: 20,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputFocused: {},
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  switchText: {},
  switchLink: {
    fontWeight: "600",
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
});
