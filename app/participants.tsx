import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const {
    participants,
    addParticipant,
    removeParticipant,
    selectedParticipantIds,
    toggleParticipantSelection,
  } = useSplitBill();
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
  const primary = useThemeColor({}, "primary");
  const primaryDark = useThemeColor({}, "primaryDark");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Atur Teman",
      headerStyle: { backgroundColor: primary, borderBottomWidth: 0 },
      headerTintColor: card,
      headerTitleStyle: { color: card },
      headerBackTitleStyle: { color: card },
    });
  }, [navigation, primary, card]);

  const canContinue = useMemo(
    () => selectedParticipantIds.length >= 2,
    [selectedParticipantIds.length]
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
      showSnackbar({
        message: "Login dulu yuk sebelum menambahkan teman 🔐",
        type: "error",
      });
      setTimeout(() => {
        router.push("/(auth)/login?redirect=/participants");
      }, 1500);
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
            error instanceof Error ? error.message : "Gagal menambah teman";
          if (!errors.includes(message)) {
            errors.push(message);
          }
        }
      }

      if (successCount > 0) {
        setName("");
        showSnackbar({
          message: `Berhasil menambahkan ${successCount} teman!`,
          type: "success",
        });
      }

      if (errors.length > 0) {
        showSnackbar({
          message: errors.join("\n"),
          type: "error",
        });
      }
    } catch (error) {
      showSnackbar({
        message: "Terjadi kesalahan, coba lagi nanti.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeParticipant(id);
      showSnackbar({
        message: "Berhasil menghapus teman.",
        type: "success",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "Gagal menghapus teman.",
        type: "error",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleContinue = () => {
    if (selectedParticipantIds.length < 2) {
      showSnackbar({
        message: "Pilih minimal 2 teman untuk lanjut split bill.",
        type: "error",
      });
      return;
    }
    router.push("/expenses");
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.topHero, { backgroundColor: primary }]}>
          <View style={[styles.topHeroIcon, { backgroundColor: "#4D75F5" }]}>
            <FontAwesome5 name="users" size={24} color={card} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: card }]}>
              Bentuk timmu dulu ✨
            </Text>
            <Text style={[styles.heroSubtitle, { color: card, opacity: 0.8 }]}>
              Tambah teman yang mau diajak split bill biar perhitungannya rapi.
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.content}
        >
          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: text }]}>
                Tambah Teman
              </Text>
            </View>
            <View style={styles.sectionSubtitleRow}>
              <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                Tips: Pisahkan dengan koma untuk tambah banyak sekaligus.
                Contoh: "Budi, Ani, Caca"
              </Text>
            </View>

            <View style={styles.inlineForm}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nama teman..."
                placeholderTextColor={icon}
                style={[
                  styles.input,
                  styles.flex1,
                  { color: text, borderColor: hexToRgba(text, 0.1) },
                  isNameFocused && [styles.inputFocused, { borderColor: tint }],
                ]}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                onSubmitEditing={handleAdd}
              />
              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: tint },
                  (!name.trim() || isSubmitting) && styles.addButtonDisabled,
                ]}
                onPress={handleAdd}
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={card} size="small" />
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
                List Teman
              </Text>
              {participants.length > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: hexToRgba(tint, 0.1) },
                  ]}
                >
                  <Text style={[styles.countBadgeText, { color: tint }]}>
                    {participants.length}
                  </Text>
                </View>
              )}
            </View>

            {participants.length > 0 && (
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: hexToRgba("#3B82F6", 0.1) },
                ]}
              >
                <View
                  style={[
                    styles.infoIconContainer,
                    { backgroundColor: "#3B82F6" },
                  ]}
                >
                  <MaterialIcons name="info" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.infoText, { color: "#1E40AF" }]}>
                  Pilih minimal 2 teman yang mau diajak split bill ya! Klik
                  namanya biar kepilih
                </Text>
              </View>
            )}

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
                  Belum ada teman
                </Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  Yuk tambah teman kamu dulu biar bisa mulai split bill!
                </Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {participants.map((item) => {
                  const isSelected = selectedParticipantIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.personRow,
                        {
                          backgroundColor: background,
                          borderColor: background,
                        },
                        isSelected && {
                          backgroundColor: hexToRgba(tint, 0.1),
                          borderColor: tint,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => toggleParticipantSelection(item.id)}
                    >
                      <View
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: getAvatarColor(item.name),
                            borderColor: background,
                          },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: "#fff" }]}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.personName, { color: text }]}>
                        {item.name}
                      </Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          void handleRemove(item.id);
                        }}
                        disabled={removingId === item.id || isSubmitting}
                        hitSlop={10}
                      >
                        <Text
                          style={[
                            styles.removeText,
                            { color: error },
                            (removingId === item.id || isSubmitting) &&
                              styles.removeTextDisabled,
                          ]}
                        >
                          {removingId === item.id ? "..." : "Hapus"}
                        </Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
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
            // !canContinue && styles.disabledButton, // Don't disable, show snackbar instead
          ]}
          onPress={handleContinue}
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
    paddingTop: 110,
  },
  content: {
    gap: 16,
  },
  topHero: {
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    minHeight: 140,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  topHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    borderWidth: 1,
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
    width: 80,
    height: 80,
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Poppins.medium,
    lineHeight: 20,
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
