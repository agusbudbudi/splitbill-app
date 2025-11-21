import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { Poppins } from "@/constants/fonts";
import { useAuth } from "@/context/auth-context";
import { useSnackbar } from "@/context/snackbar-context";
import { useSplitBill } from "@/context/split-bill-context";
import { getAvatarColor } from "@/lib/utils/colors";

export default function ParticipantsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { participants, addParticipant, removeParticipant } = useSplitBill();
  const [name, setName] = useState("");
  const [isNameFocused, setNameFocused] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canContinue = useMemo(
    () => participants.length >= 2,
    [participants.length]
  );

  const handleAdd = async () => {
    if (isSubmitting) {
      return;
    }

    const chunks = name
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (chunks.length === 0) {
      return;
    }

    const uniqueNames: string[] = [];
    const seen = new Set<string>();

    chunks.forEach((value) => {
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNames.push(value);
      }
    });

    if (!isAuthenticated) {
      Alert.alert(
        "Perlu Login",
        "Masuk terlebih dahulu untuk menyimpan daftar teman.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ke Halaman Login",
            onPress: () => router.push("/(auth)/login"),
          },
        ]
      );
      return;
    }

    setSubmitting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const value of uniqueNames) {
        try {
          await addParticipant(value);
          successCount += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Terjadi kesalahan.";
          errors.push(message);
        }
      }
    } finally {
      setSubmitting(false);
    }

    if (successCount > 0) {
      setName("");
      const message =
        successCount > 1
          ? `Berhasil menambahkan ${successCount} teman baru.`
          : `Berhasil menambahkan ${uniqueNames[0]}.`;
      showSnackbar({ message, type: "success" });
    }

    if (errors.length > 0) {
      const firstMessage = errors[0];
      const lower = firstMessage.toLowerCase();
      if (lower.includes("login") || lower.includes("token")) {
        Alert.alert("Perlu Login", firstMessage, [
          { text: "Batal", style: "cancel" },
          {
            text: "Ke Halaman Login",
            onPress: () => router.push("/(auth)/login"),
          },
        ]);
      } else {
        showSnackbar({ message: firstMessage, type: "error" });
      }
    }
  };

  const handleRemove = async (participantId: string) => {
    if (removingId) {
      return;
    }

    const participantName =
      participants.find((p) => p.id === participantId)?.name ?? "Peserta";

    setRemovingId(participantId);
    try {
      await removeParticipant(participantId);
      showSnackbar({
        message: `Berhasil menghapus ${participantName}.`,
        type: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus peserta.";
      showSnackbar({ message, type: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.content}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome5 name="users" size={24} color="#2762EA" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Bentuk timmu dulu ✨</Text>
              <Text style={styles.heroSubtitle}>
                Tambah teman yang mau diajak split bill biar perhitungannya
                rapi.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tambah Teman</Text>
            <View style={styles.sectionSubtitleRow}>
              <Text style={styles.sectionSubtitle}>
                Bisa langsung ketik beberapa nama dipisah koma, contoh: Adit,
                Beni, Clara
              </Text>
            </View>
            <View style={styles.inlineForm}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nama teman"
                placeholderTextColor="#687076"
                style={[
                  styles.input,
                  styles.flex1,
                  isNameFocused && styles.inputFocused,
                ]}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void handleAdd();
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
              <Pressable
                style={[
                  styles.addButton,
                  (isSubmitting || !name.trim()) && styles.addButtonDisabled,
                ]}
                onPress={() => {
                  void handleAdd();
                }}
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.addButtonText}>Tambah</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daftar Teman</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{participants.length}</Text>
              </View>
            </View>
            {participants.length === 0 ? (
              <View style={styles.emptyState}>
                <Image
                  source={require("@/assets/images/splitbill-empty-state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>Belum ada anggota</Text>
                <Text style={styles.emptyText}>
                  Minimal tambah dua orang dulu biar pembagian bisa dihitung.
                </Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {participants.map((item) => (
                  <View key={item.id} style={styles.personRow}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: getAvatarColor(item.id) },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Pressable
                      onPress={() => {
                        void handleRemove(item.id);
                      }}
                      disabled={removingId === item.id || isSubmitting}
                    >
                      <Text
                        style={[
                          styles.removeText,
                          (removingId === item.id || isSubmitting) &&
                            styles.removeTextDisabled,
                        ]}
                      >
                        {removingId === item.id ? "Menghapus..." : "Hapus"}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, !canContinue && styles.disabledButton]}
          disabled={!canContinue}
          onPress={() => router.push("/expenses")}
        >
          <Text style={styles.primaryText}>Lanjut Catat Pengeluaran</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6fafb",
  },
  container: {
    padding: 8,
    gap: 16,
  },
  content: {
    gap: 16,
  },
  hero: {
    backgroundColor: "rgba(224, 242, 254, 1.00)",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  heroIcon: {
    backgroundColor: "#DBE9FE",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    color: "#0f172a",
    opacity: 0.6,
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  countBadge: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#4c1d95",
    fontSize: 12,
    fontFamily: Poppins.semibold,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: Poppins.regular,
  },
  sectionSubtitleRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  sectionSubtitleIcon: {
    marginTop: 2,
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
  inlineForm: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: Poppins.semibold,
  },
  listContent: {
    gap: 12,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 21,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#ffffff",
    borderWidth: 2,
  },
  avatarText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
    fontSize: 14,
  },
  personName: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    fontFamily: Poppins.regular,
  },
  removeText: {
    color: "#ef4444",
    fontFamily: Poppins.semibold,
  },
  removeTextDisabled: {
    color: "#ef4444",
    opacity: 0.5,
  },
  emptyState: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    gap: 6,
    alignItems: "center",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontSize: 16,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontFamily: Poppins.regular,
  },
  footer: {
    padding: 16,
    backgroundColor: "#f6fafb",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  primaryButton: {
    backgroundColor: "#7056ec",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
