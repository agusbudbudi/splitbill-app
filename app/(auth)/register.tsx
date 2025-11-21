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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isSubmitting } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNameFocused, setNameFocused] = useState(false);
  const [isEmailFocused, setEmailFocused] = useState(false);
  const [isPasswordFocused, setPasswordFocused] = useState(false);
  const [isConfirmFocused, setConfirmFocused] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }

    try {
      setError(null);
      setMessage(null);
      await register({ name: name.trim(), email: email.trim(), password });
      setMessage("Registrasi berhasil! Mengarahkan ke Scan AI...");
      setTimeout(() => {
        router.replace("/scan");
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registrasi gagal, coba lagi."
      );
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
              <Text style={styles.title}>Daftar dulu 😎</Text>
              <Text style={styles.subtitle}>
                Hi Gengs! daftar dulu ya buat melanjutkan
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nama kamu"
                placeholderTextColor="#687076"
                style={[styles.input, isNameFocused && styles.inputFocused]}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

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
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#687076"
                style={[styles.input, isPasswordFocused && styles.inputFocused]}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Konfirmasi Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Ulangi password"
                placeholderTextColor="#687076"
                style={[styles.input, isConfirmFocused && styles.inputFocused]}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.disabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryText}>
                {isSubmitting ? "Memproses..." : "Daftar"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Sudah punya akun?</Text>
              <Pressable onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.switchLink}>Masuk di sini</Text>
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
    backgroundColor: "#1d4ed8",
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
    color: "#1d4ed8",
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
  successBox: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: "#15803d",
    fontSize: 14,
    textAlign: "center",
  },
});
