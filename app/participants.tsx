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
import { useThemeColor } from "@/hooks/use-theme-color";
import { getAvatarColor, hexToRgba } from "@/lib/utils/colors";

export default function ParticipantsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { participants, addParticipant, removeParticipant } = useSplitBill();
  const [name, setName] = useState("");
  const [isNameFocused, setNameFocused] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const error = useThemeColor({}, "error");
  const icon = useThemeColor({}, "icon");
  const primaryDark = useThemeColor({}, "primaryDark");

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
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.content}
        >
          <View
            style={[styles.hero, { backgroundColor: hexToRgba(tint, 0.05) }]}
          >
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: hexToRgba(tint, 0.2) },
              ]}
            >
              <FontAwesome5 name="users" size={24} color={tint} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: text }]}>
                Bentuk timmu dulu ✨
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: text, opacity: 0.6 }]}
              >
                Tambah teman yang mau diajak split bill biar perhitungannya
                rapi.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>
              Tambah Teman
            </Text>
            <View style={styles.sectionSubtitleRow}>
              <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                Bisa langsung ketik beberapa nama dipisah koma, contoh: Adit,
                Beni, Clara
              </Text>
            </View>
            <View style={styles.inlineForm}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nama teman"
                placeholderTextColor={icon}
                style={[
                  styles.input,
                  styles.flex1,
                  { borderColor: hexToRgba(text, 0.1) },
                  isNameFocused && [styles.inputFocused, { borderColor: tint }],
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
                  { backgroundColor: tint },
                  (isSubmitting || !name.trim()) && styles.addButtonDisabled,
                ]}
                onPress={() => {
                  void handleAdd();
                }}
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={card} />
                ) : (
                  <Text style={[styles.addButtonText, { color: card }]}>
                    Tambah
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: text }]}>
                Daftar Teman
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: hexToRgba(tint, 0.1) },
                ]}
              >
                <Text style={[styles.countBadgeText, { color: primaryDark }]}>
                  {participants.length}
                </Text>
              </View>
            </View>
            {participants.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: hexToRgba(text, 0.02) },
                ]}
              >
                <Image
                  source={require("@/assets/images/splitbill-empty-state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={[styles.emptyTitle, { color: text }]}>
                  Belum ada anggota
                </Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  Minimal tambah dua orang dulu biar pembagian bisa dihitung.
                </Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {participants.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.personRow,
                      { backgroundColor: hexToRgba(text, 0.02) },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: getAvatarColor(item.id),
                          borderColor: card,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: card }]}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.personName, { color: text }]}>
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => {
                        void handleRemove(item.id);
                      }}
                      disabled={removingId === item.id || isSubmitting}
                    >
                      <Text
                        style={[
                          styles.removeText,
                          { color: error },
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

      <View
        style={[
          styles.footer,
          { backgroundColor: background, borderTopColor: hexToRgba(text, 0.1) },
        ]}
      >
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: tint },
            !canContinue && styles.disabledButton,
          ]}
          disabled={!canContinue}
          onPress={() => router.push("/expenses")}
        >
          <Text style={[styles.primaryText, { color: card }]}>
            Lanjut Catat Pengeluaran
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 8,
    gap: 16,
  },
  content: {
    gap: 16,
  },
  hero: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    opacity: 0.6,
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  card: {
    borderRadius: 12,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Poppins.semibold,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 12,
    fontFamily: Poppins.semibold,
  },
  sectionSubtitle: {
    fontSize: 13,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputFocused: {},
  inlineForm: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  addButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
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
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarText: {
    fontFamily: Poppins.semibold,
    fontSize: 14,
  },
  personName: {
    flex: 1,
    fontSize: 16,
    fontFamily: Poppins.regular,
  },
  removeText: {
    fontFamily: Poppins.semibold,
  },
  removeTextDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    padding: 16,
    borderRadius: 12,
    gap: 6,
    alignItems: "center",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: Poppins.regular,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
