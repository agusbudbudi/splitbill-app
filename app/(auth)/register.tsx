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
import { useThemeColor } from "@/hooks/use-theme-color";
import { hexToRgba } from "@/lib/utils/colors";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isSubmitting } = useAuth();

  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tint = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');
  const errorLight = useThemeColor({}, 'errorLight');
  const successColor = useThemeColor({}, 'success');
  const successLight = useThemeColor({}, 'successLight');
  const primaryDark = useThemeColor({}, 'primaryDark');
  const icon = useThemeColor({}, 'icon');

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.cardWrapper}
        >
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: text }]}>Split Bill App</Text>
            <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
              ⚡ Scan bill pakai AI, bikin split bill easy peasy!
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: text }]}>Daftar dulu 😎</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Hi Gengs! daftar dulu ya buat melanjutkan
              </Text>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: errorLight }]}>
                <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={[styles.successBox, { backgroundColor: successLight }]}>
                <Text style={[styles.successText, { color: successColor }]}>{message}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Nama Lengkap</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nama kamu"
                placeholderTextColor={icon}
                style={[styles.input, { borderColor: hexToRgba(text, 0.1) }, isNameFocused && [styles.inputFocused, { borderColor: tint }]]}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nama@email.com"
                placeholderTextColor={icon}
                style={[styles.input, { borderColor: hexToRgba(text, 0.1) }, isEmailFocused && [styles.inputFocused, { borderColor: tint }]]}
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
                placeholder="Minimal 6 karakter"
                placeholderTextColor={icon}
                style={[styles.input, { borderColor: hexToRgba(text, 0.1) }, isPasswordFocused && [styles.inputFocused, { borderColor: tint }]]}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Konfirmasi Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Ulangi password"
                placeholderTextColor={icon}
                style={[styles.input, { borderColor: hexToRgba(text, 0.1) }, isConfirmFocused && [styles.inputFocused, { borderColor: tint }]]}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: primaryDark }, isSubmitting && styles.disabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={[styles.primaryText, { color: card }]}>
                {isSubmitting ? "Memproses..." : "Daftar"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: textSecondary }]}>Sudah punya akun?</Text>
              <Pressable onPress={() => router.push("/(auth)/login")}>
                <Text style={[styles.switchLink, { color: primaryDark }]}>Masuk di sini</Text>
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
  successBox: {
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
  },
});
