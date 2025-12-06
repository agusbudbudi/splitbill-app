import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Poppins } from "@/constants/fonts";
import { useSplitBill } from "@/context/split-bill-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/lib/split-bill/format";
import { hexToRgba } from "@/lib/utils/colors";

export default function AdditionalExpensesScreen() {
  const router = useRouter();
  const {
    participants: allParticipants,
    selectedParticipantIds,
    additionalExpenses,
    addAdditionalExpense,
    updateAdditionalExpense,
    removeAdditionalExpense,
  } = useSplitBill();

  // Filter participants based on selection
  const participants = useMemo(() => {
    if (selectedParticipantIds.length === 0) return allParticipants;
    return allParticipants.filter((p) => selectedParticipantIds.includes(p.id));
  }, [allParticipants, selectedParticipantIds]);

  const cardBackground = useThemeColor({}, "card");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const error = useThemeColor({}, "error");
  const warning = useThemeColor({}, "warning");
  const icon = useThemeColor({}, "icon");
  const primary = useThemeColor({}, "primary");
  const primaryDark = useThemeColor({}, "primaryDark");

  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9-]/g, "");
    setAmountInput(sanitized);
  };

  useEffect(() => {
    setSelectedParticipants((current) =>
      current.filter((id) => participants.some((person) => person.id === id))
    );
    setPaidBy((current) =>
      current && participants.some((person) => person.id === current)
        ? current
        : null
    );
  }, [participants]);

  const isEditing = editingId !== null;
  const canSubmit = useMemo(() => {
    const amount = Number(amountInput);
    return (
      description.trim().length > 0 &&
      !Number.isNaN(amount) &&
      paidBy !== null &&
      selectedParticipants.length > 0
    );
  }, [description, amountInput, paidBy, selectedParticipants.length]);

  const resetForm = () => {
    setDescription("");
    setAmountInput("");
    setPaidBy(null);
    setSelectedParticipants([]);
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleSubmit = () => {
    const normalizedAmount = Number(amountInput);

    if (!description.trim()) {
      setErrorMessage("Nama pengeluaran wajib diisi");
      return;
    }

    if (Number.isNaN(normalizedAmount)) {
      setErrorMessage("Jumlah harus angka");
      return;
    }

    if (!paidBy) {
      setErrorMessage("Pilih siapa yang membayar");
      return;
    }

    if (selectedParticipants.length === 0) {
      setErrorMessage("Pilih minimal satu teman untuk split");
      return;
    }

    const payload = {
      description: description.trim(),
      amount: normalizedAmount,
      paidBy,
      participants: selectedParticipants,
    };

    if (isEditing && editingId) {
      updateAdditionalExpense(editingId, payload);
    } else {
      addAdditionalExpense(payload);
    }

    resetForm();
  };

  const handleEdit = (expenseId: string) => {
    const target = additionalExpenses.find((item) => item.id === expenseId);
    if (!target) return;

    setDescription(target.description);
    setAmountInput(String(Math.round(target.amount)));
    setPaidBy(target.paidBy);
    setSelectedParticipants(target.participants);
    setEditingId(target.id);
    setErrorMessage(null);
  };

  const handleRemove = (expenseId: string) => {
    removeAdditionalExpense(expenseId);
    if (editingId === expenseId) {
      resetForm();
    }
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants((current) => {
      if (current.includes(participantId)) {
        return current.filter((id) => id !== participantId);
      }
      return [...current, participantId];
    });
  };

  const getParticipantName = (id: string) =>
    participants.find((person) => person.id === id)?.name ?? "Tidak diketahui";

  const hasEnoughParticipants = participants.length >= 2;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor }]}
    >
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.container}>
          {!hasEnoughParticipants ? (
            <Pressable
              style={[
                styles.participantEmptyState,
                {
                  backgroundColor: hexToRgba(warning, 0.1),
                  borderColor: hexToRgba(warning, 0.2),
                },
              ]}
              onPress={() => router.push("/participants")}
            >
              <View style={styles.participantEmptyContent}>
                <View
                  style={[
                    styles.warningIcon,
                    styles.warningPeopleIcon,
                    { backgroundColor: hexToRgba(warning, 0.15) },
                  ]}
                >
                  <MaterialIcons name="group" size={20} color={textColor} />
                </View>
                <View style={styles.participantEmptyTextWrapper}>
                  <Text
                    style={[styles.participantEmptyTitle, { color: textColor }]}
                  >
                    Yuk lengkapi daftar teman kamu
                  </Text>
                  <Text
                    style={[
                      styles.participantEmptySubtitle,
                      { color: textSecondary },
                    ]}
                  >
                    Tambah minimal 2 teman sebelum mencatat additional expense.
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={textColor}
                />
              </View>
            </Pressable>
          ) : (
            <View style={[styles.card, { backgroundColor: cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {isEditing
                  ? "Edit additional expense"
                  : "Tambah additional expense"}
              </Text>

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
                  Pembagian akan otomatis mengikuti proporsi pengeluaran utama
                  teman yang dipilih.
                </Text>
              </View>

              {errorMessage ? (
                <Text style={[styles.errorText, { color: error }]}>
                  {errorMessage}
                </Text>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: textColor }]}>
                  Nama pengeluaran
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Contoh: Pajak restoran"
                  placeholderTextColor={icon}
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      borderColor: hexToRgba(textColor, 0.1),
                    },
                  ]}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: textColor }]}>
                  Jumlah (Rp)
                </Text>
                <TextInput
                  value={amountInput}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor={icon}
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      borderColor: hexToRgba(textColor, 0.1),
                    },
                  ]}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: textColor }]}>
                  Dibayar oleh
                </Text>
                <View style={styles.choiceGroup}>
                  {participants.map((person) => {
                    const active = paidBy === person.id;
                    return (
                      <Pressable
                        key={person.id}
                        style={[
                          styles.choiceChip,
                          {
                            borderColor: hexToRgba(tint, 0.2),
                            backgroundColor: cardBackground,
                          },
                          active && [
                            styles.choiceChipActive,
                            {
                              backgroundColor: hexToRgba(tint, 0.1),
                              borderColor: tint,
                            },
                          ],
                        ]}
                        onPress={() => setPaidBy(person.id)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            { color: textColor },
                            active && [
                              styles.choiceTextActive,
                              { color: primaryDark },
                            ],
                          ]}
                        >
                          {person.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: textColor }]}>
                  Ditanggung oleh
                </Text>
                <Text style={[styles.helperText, { color: textSecondary }]}>
                  Pilih teman yang ikut menanggung biaya tambahan ini.
                </Text>
                <View style={styles.choiceGroupWrap}>
                  {participants.map((person) => {
                    const active = selectedParticipants.includes(person.id);
                    return (
                      <Pressable
                        key={person.id}
                        style={[
                          styles.choiceChip,
                          {
                            borderColor: hexToRgba(tint, 0.2),
                            backgroundColor: cardBackground,
                          },
                          active && [
                            styles.choiceChipActive,
                            {
                              backgroundColor: hexToRgba(tint, 0.1),
                              borderColor: tint,
                            },
                          ],
                        ]}
                        onPress={() => toggleParticipant(person.id)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            { color: textColor },
                            active && [
                              styles.choiceTextActive,
                              { color: primaryDark },
                            ],
                          ]}
                        >
                          {person.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: tint },
                  (!canSubmit || !hasEnoughParticipants) &&
                    styles.disabledButton,
                ]}
                disabled={!canSubmit || !hasEnoughParticipants}
                onPress={handleSubmit}
              >
                <Text
                  style={[styles.saveButtonText, { color: cardBackground }]}
                >
                  {isEditing ? "Simpan perubahan" : "Tambah additional expense"}
                </Text>
              </Pressable>

              {isEditing ? (
                <Pressable
                  style={[styles.cancelButton, { borderColor: error }]}
                  onPress={resetForm}
                >
                  <Text style={[styles.cancelButtonText, { color: error }]}>
                    Batalkan edit
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Additional expense tersimpan
              </Text>
              {additionalExpenses.length > 0 && (
                <View
                  style={[
                    styles.sectionBadge,
                    { backgroundColor: hexToRgba(primary, 0.1) },
                  ]}
                >
                  <Text style={[styles.sectionBadgeText, { color: primary }]}>
                    {additionalExpenses.length}
                  </Text>
                </View>
              )}
            </View>
            {additionalExpenses.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: hexToRgba(textColor, 0.02) },
                ]}
              >
                <Image
                  source={require("@/assets/images/splitbill-empty-state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  Belum ada additional expense
                </Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  Tambahkan biaya tambahan seperti pajak atau biaya layanan di
                  atas.
                </Text>
              </View>
            ) : (
              additionalExpenses
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((expense) => (
                  <View
                    key={expense.id}
                    style={[
                      styles.listItem,
                      { backgroundColor: hexToRgba(textColor, 0.02) },
                    ]}
                  >
                    <View style={styles.listHeader}>
                      <View>
                        <Text style={[styles.listTitle, { color: textColor }]}>
                          {expense.description}
                        </Text>
                        <Text
                          style={[styles.listMeta, { color: textSecondary }]}
                        >
                          Dibayar oleh {getParticipantName(expense.paidBy)}
                        </Text>
                      </View>
                      <Text style={[styles.listAmount, { color: tint }]}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>

                    <View style={styles.listParticipants}>
                      {expense.participants.map((participantId) => (
                        <View
                          key={participantId}
                          style={[
                            styles.listPill,
                            { backgroundColor: hexToRgba(tint, 0.1) },
                          ]}
                        >
                          <Text
                            style={[
                              styles.listPillText,
                              { color: primaryDark },
                            ]}
                          >
                            {getParticipantName(participantId)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.listActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleEdit(expense.id)}
                      >
                        <MaterialIcons name="edit" size={18} color={tint} />
                        <Text style={[styles.actionText, { color: tint }]}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleRemove(expense.id)}
                      >
                        <MaterialIcons name="delete" size={18} color={error} />
                        <Text
                          style={[
                            styles.actionText,
                            styles.actionTextDanger,
                            { color: error },
                          ]}
                        >
                          Hapus
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor,
              borderTopColor: hexToRgba(textColor, 0.1),
            },
          ]}
        >
          <Pressable
            style={[styles.footerButton, { backgroundColor: tint }]}
            onPress={() => router.replace("/expenses")}
          >
            <Text style={[styles.footerButtonText, { color: cardBackground }]}>
              Kembali ke Catat Pengeluaran
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 8,
    gap: 16,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontFamily: Poppins.semibold,
  },
  participantEmptyState: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  participantEmptyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  participantEmptyTextWrapper: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  participantEmptyTitle: {
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  participantEmptySubtitle: {
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  warningPeopleIcon: {},
  card: {
    borderRadius: 14,
    padding: 18,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  sectionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: {
    fontSize: 12,
    fontFamily: Poppins.semibold,
  },
  sectionSubtitle: {
    fontSize: 13,
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
    fontSize: 13,
    fontFamily: Poppins.medium,
    lineHeight: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: Poppins.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  choiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceGroupWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  choiceChipActive: {},
  choiceText: {
    fontFamily: Poppins.medium,
  },
  choiceTextActive: {
    fontFamily: Poppins.semibold,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: Poppins.semibold,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontFamily: Poppins.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    fontFamily: Poppins.medium,
  },
  emptyState: {
    padding: 18,
    borderRadius: 12,
    gap: 8,
    alignItems: "center",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontFamily: Poppins.semibold,
  },
  emptyText: {
    fontFamily: Poppins.regular,
    fontSize: 13,
    textAlign: "center",
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  listTitle: {
    fontFamily: Poppins.semibold,
    fontSize: 15,
  },
  listMeta: {
    fontFamily: Poppins.regular,
    fontSize: 12,
  },
  listAmount: {
    fontFamily: Poppins.semibold,
  },
  listParticipants: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listPillText: {
    fontFamily: Poppins.medium,
    fontSize: 12,
  },
  listActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontFamily: Poppins.medium,
  },
  actionTextDanger: {},
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerButtonText: {
    fontFamily: Poppins.semibold,
  },
});
