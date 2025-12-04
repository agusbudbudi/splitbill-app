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
import { formatCurrency } from "@/lib/split-bill/format";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hexToRgba } from "@/lib/utils/colors";

export default function AdditionalExpensesScreen() {
  const router = useRouter();
  const {
    participants,
    additionalExpenses,
    addAdditionalExpense,
    updateAdditionalExpense,
    removeAdditionalExpense,
  } = useSplitBill();

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
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.container}>
          {!hasEnoughParticipants ? (
            <Pressable
              style={styles.participantEmptyState}
              onPress={() => router.push("/participants")}
            >
              <View style={styles.participantEmptyContent}>
                <View style={[styles.warningIcon, styles.warningPeopleIcon]}>
                  <MaterialIcons name="group" size={20} color="#7c2d12" />
                </View>
                <View style={styles.participantEmptyTextWrapper}>
                  <Text style={styles.participantEmptyTitle}>
                    Yuk lengkapi daftar teman kamu
                  </Text>
                  <Text style={styles.participantEmptySubtitle}>
                    Tambah minimal 2 teman sebelum mencatat additional expense.
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#7c2d12"
                />
              </View>
            </Pressable>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {isEditing
                  ? "Edit additional expense"
                  : "Tambah additional expense"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Pembagian akan otomatis mengikuti proporsi pengeluaran utama
                teman yang dipilih.
              </Text>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Nama pengeluaran</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Contoh: Pajak restoran"
                  placeholderTextColor="#687076"
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Jumlah (Rp)</Text>
                <TextInput
                  value={amountInput}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#687076"
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Dibayar oleh</Text>
                <View style={styles.choiceGroup}>
                  {participants.map((person) => {
                    const active = paidBy === person.id;
                    return (
                      <Pressable
                        key={person.id}
                        style={[
                          styles.choiceChip,
                          active && styles.choiceChipActive,
                        ]}
                        onPress={() => setPaidBy(person.id)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            active && styles.choiceTextActive,
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
                <Text style={styles.label}>Ditanggung oleh</Text>
                <Text style={styles.helperText}>
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
                          active && styles.choiceChipActive,
                        ]}
                        onPress={() => toggleParticipant(person.id)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            active && styles.choiceTextActive,
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
                  (!canSubmit || !hasEnoughParticipants) &&
                    styles.disabledButton,
                ]}
                disabled={!canSubmit || !hasEnoughParticipants}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Simpan perubahan" : "Tambah additional expense"}
                </Text>
              </Pressable>

              {isEditing ? (
                <Pressable style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Batalkan edit</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Additional expense tersimpan
              </Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {additionalExpenses.length}
                </Text>
              </View>
            </View>
            {additionalExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Image
                  source={require("@/assets/images/splitbill-empty-state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>
                  Belum ada additional expense
                </Text>
                <Text style={styles.emptyText}>
                  Tambahkan biaya tambahan seperti pajak atau biaya layanan di
                  atas.
                </Text>
              </View>
            ) : (
              additionalExpenses
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((expense) => (
                  <View key={expense.id} style={styles.listItem}>
                    <View style={styles.listHeader}>
                      <View>
                        <Text style={styles.listTitle}>
                          {expense.description}
                        </Text>
                        <Text style={styles.listMeta}>
                          Dibayar oleh {getParticipantName(expense.paidBy)}
                        </Text>
                      </View>
                      <Text style={styles.listAmount}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>

                    <View style={styles.listParticipants}>
                      {expense.participants.map((participantId) => (
                        <View key={participantId} style={styles.listPill}>
                          <Text style={styles.listPillText}>
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
                        <MaterialIcons name="edit" size={18} color="#1d4ed8" />
                        <Text style={styles.actionText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleRemove(expense.id)}
                      >
                        <MaterialIcons
                          name="delete"
                          size={18}
                          color="#ef4444"
                        />
                        <Text
                          style={[styles.actionText, styles.actionTextDanger]}
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

        <View style={styles.footer}>
          <Pressable
            style={styles.footerButton}
            onPress={() => router.replace("/expenses")}
          >
            <Text style={styles.footerButtonText}>
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
    backgroundColor: "#f6fafb",
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
    color: "#334155",
    fontFamily: Poppins.semibold,
  },
  participantEmptyState: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fef08a",
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
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  participantEmptySubtitle: {
    color: "#475569",
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  warningPeopleIcon: {
    backgroundColor: "rgba(250,204,21,0.12)",
  },
  card: {
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  sectionBadge: {
    backgroundColor: "#ede9fe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: {
    color: "#4c1d95",
    fontSize: 12,
    fontFamily: Poppins.semibold,
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#475569",
    fontFamily: Poppins.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
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
    borderColor: "#d4d4ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  choiceChipActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#8b5cf6",
  },
  choiceText: {
    color: "#0f172a",
    fontFamily: Poppins.medium,
  },
  choiceTextActive: {
    color: "#4c1d95",
  },
  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: Poppins.regular,
  },
  saveButton: {
    backgroundColor: "#3462F2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: "#ef4444",
    fontFamily: Poppins.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: "#ef4444",
    fontFamily: Poppins.medium,
  },
  emptyState: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    gap: 8,
    alignItems: "center",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  emptyText: {
    fontFamily: Poppins.regular,
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  listItem: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
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
    color: "#0f172a",
    fontSize: 15,
  },
  listMeta: {
    fontFamily: Poppins.regular,
    color: "#64748b",
    fontSize: 12,
  },
  listAmount: {
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  listParticipants: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listPill: {
    backgroundColor: "#ede9fe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listPillText: {
    color: "#4c1d95",
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
    color: "#1d4ed8",
  },
  actionTextDanger: {
    color: "#ef4444",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  footerButton: {
    backgroundColor: "#3462F2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
});
