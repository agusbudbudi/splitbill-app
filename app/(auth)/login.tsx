import { useRouter } from "expo-router";
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isSubmitting } = useAuth();

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
      router.replace("/scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.cardWrapper}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Split Bill App</Text>

            <Text style={styles.heroSubtitle}>
              ⚡ Scan bill pakai AI, bikin split bill easy peasy!
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Masuk dulu ya 👋🏻</Text>
              <Text style={styles.subtitle}>
                Hi Gengs! masuk untuk lanjut kelola split bill kamu.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nama@email.com"
                placeholderTextColor="#687076"
                style={[styles.input, isEmailFocused && styles.inputFocused]}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="******"
                placeholderTextColor="#687076"
                style={[styles.input, isPasswordFocused && styles.inputFocused]}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.disabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryText}>
                {isSubmitting ? "Memproses..." : "Masuk"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Belum punya akun?</Text>
              <Pressable onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.switchLink}>Daftar sekarang</Text>
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
    backgroundColor: "#f6fafb",
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
    color: "#0f172a",
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: "#2563eb",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    color: "#ffffff",
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
  switchText: {
    color: "#475569",
  },
  switchLink: {
    color: "#2563eb",
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
  },
});
