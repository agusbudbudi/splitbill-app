import { ActivityInputBottomSheet } from "@/components/ui/activity-input-bottom-sheet";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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

import { EditExpenseBottomSheet } from "@/components/edit-expense-bottom-sheet";
import { Poppins } from "@/constants/fonts";
import { useAuth } from "@/context/auth-context";
import { useSplitBill } from "@/context/split-bill-context";
import { formatCurrency } from "@/lib/split-bill/format";
import { Expense } from "@/lib/split-bill/types";

export default function ExpensesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    participants,
    expenses,
    additionalExpenses,
    addExpense,
    removeExpense,
    activityName,
    updateActivityName,
    updateExpense, // Add updateExpense here
  } = useSplitBill();

  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isDescriptionFocused, setDescriptionFocused] = useState(false);
  const [isAmountFocused, setAmountFocused] = useState(false);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);

  // State for editing expense
  const [isEditExpenseSheetVisible, setEditExpenseSheetVisible] =
    useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const hasParticipants = participants.length >= 2;

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

  const canSave = useMemo(() => {
    const amount = Number(amountInput);
    return (
      description.trim().length > 0 &&
      amount > 0 &&
      !!paidBy &&
      selectedParticipants.length > 0
    );
  }, [description, amountInput, paidBy, selectedParticipants.length]);

  const resetForm = () => {
    setDescription("");
    setAmountInput("");
    setPaidBy(null);
    setSelectedParticipants([]);
  };

  const handleAddExpense = () => {
    if (!canSave || !paidBy) return;

    addExpense({
      description: description.trim(),
      amount: Number(amountInput),
      paidBy,
      participants: selectedParticipants,
    });

    resetForm();
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpenseSheetVisible(true);
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  const handleSaveActivity = (newActivityName: string) => {
    updateActivityName(newActivityName);
    setBottomSheetVisible(false);
    router.push("/summary");
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            {/* <View style={styles.heroIcon}>
              <FontAwesome5 name="receipt" size={22} color="#1d4ed8" />
            </View> */}
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Catat pengeluaran</Text>
              <Text style={styles.heroSubtitle}>
                Input sendiri atau tinggal scan pakai AI. Cepat, simpel, beres!
              </Text>
            </View>
            <Pressable
              style={styles.heroButton}
              onPress={() =>
                router.push(isAuthenticated ? "/scan" : "/(auth)/login")
              }
            >
              <MaterialCommunityIcons
                name="line-scan"
                size={18}
                color="#0f172a"
              />
              <Text style={styles.heroButtonText}>
                {isAuthenticated ? "Scan AI" : "Login buat Scan"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Detail Pengeluaran</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Deskripsi</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Contoh: Makan malam di resto"
                placeholderTextColor="#687076"
                style={[
                  styles.input,
                  isDescriptionFocused && styles.inputFocused,
                ]}
                onFocus={() => setDescriptionFocused(true)}
                onBlur={() => setDescriptionFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Jumlah (Rp)</Text>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="0"
                placeholderTextColor="#687076"
                keyboardType="numeric"
                style={[styles.input, isAmountFocused && styles.inputFocused]}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
              />
            </View>

            {!hasParticipants ? (
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
                      Tambah minimal 2 teman sebelum catat expense.
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color="#7c2d12"
                  />
                </View>
              </Pressable>
            ) : null}

            {hasParticipants ? (
              <>
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
                  <View style={styles.choiceGroup}>
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
              </>
            ) : null}

            <Pressable
              style={[
                styles.saveButton,
                (!canSave || !hasParticipants) && styles.disabledButton,
              ]}
              disabled={!canSave || !hasParticipants}
              onPress={handleAddExpense}
            >
              <Text style={styles.saveText}>Simpan Expense</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.additionalButton,
              !hasParticipants && styles.disabledButton,
            ]}
            disabled={!hasParticipants}
            onPress={() => router.push("/additional-expenses")}
          >
            <View style={styles.additionalIcon}>
              <MaterialIcons name="request-quote" size={22} color="#7056ec" />
            </View>
            <View style={styles.additionalContent}>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Text style={styles.additionalTitle}>Additional expense</Text>
                <View style={styles.breakdownBadge}>
                  <Text style={styles.breakdownBadgeText}>Proporsional</Text>
                </View>
              </View>
              <Text style={styles.additionalSubtitle}>
                Tambahkan biaya tambahan (PPN, Service, Promo) dan bagi sesuai
                proporsi pengeluaran
              </Text>
            </View>
            {additionalExpenses.length > 0 ? (
              <View style={styles.additionalBadge}>
                <Text style={styles.additionalBadgeText}>
                  {additionalExpenses.length}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pengeluaran Tersimpan</Text>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Image
                  source={require("@/assets/images/splitbill-empty-state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>Belum ada data</Text>
                <Text style={styles.emptyText}>
                  Mulai catat atau pakai AI Scan buat isi otomatis.
                </Text>
              </View>
            ) : (
              <FlatList
                data={[...expenses].sort((a, b) => b.createdAt - a.createdAt)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const payer = participants.find(
                    (person) => person.id === item.paidBy
                  );
                  const participantDetails = item.participants.map(
                    (participantId) => {
                      const person = participants.find(
                        (participant) => participant.id === participantId
                      );
                      return {
                        id: participantId,
                        name: person?.name ?? "Teman",
                      };
                    }
                  );
                  const amountPerPerson = item.participants.length
                    ? item.amount / item.participants.length
                    : 0;
                  return (
                    <View style={styles.expenseCard}>
                      <View style={styles.expenseHeader}>
                        <View>
                          <Text style={styles.expenseTitle}>
                            {item.description}
                          </Text>
                          <Text style={styles.expenseMeta}>
                            Dibayar oleh {payer?.name ?? "—"}
                          </Text>
                        </View>
                        <Text style={styles.expenseAmount}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                      <View style={styles.expenseRow}>
                        <Text style={styles.expenseSplit}>
                          {item.participants.length} orang •{" "}
                          {formatCurrency(amountPerPerson)}/orang
                        </Text>
                      </View>
                      {participantDetails.length > 0 ? (
                        <View style={styles.expenseParticipants}>
                          {participantDetails.map((detail) => (
                            <View
                              key={`${item.id}-${detail.id}`}
                              style={styles.participantPill}
                            >
                              <Text style={styles.participantPillText}>
                                {detail.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <View style={styles.expenseActions}>
                        <Pressable
                          onPress={() => handleEditExpense(item)}
                          style={styles.editButtonIcon}
                        >
                          <MaterialIcons
                            name="edit"
                            size={16}
                            color="#2563eb"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => removeExpense(item.id)}
                          style={styles.deleteButtonIcon}
                        >
                          <MaterialIcons
                            name="delete"
                            size={16}
                            color="#ef4444"
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.primaryButton,
              expenses.length === 0 && styles.disabledButton,
            ]}
            disabled={expenses.length === 0}
            onPress={() => setBottomSheetVisible(true)}
          >
            <Text style={styles.primaryText}>Lihat Ringkasan</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ActivityInputBottomSheet
        isVisible={isBottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        onSave={handleSaveActivity}
        initialActivityName={activityName}
      />
      <EditExpenseBottomSheet
        isVisible={isEditExpenseSheetVisible}
        onClose={() => setEditExpenseSheetVisible(false)}
        expense={editingExpense}
        participants={participants}
        onSave={(updatedExpense) => {
          updateExpense(updatedExpense.id, {
            description: updatedExpense.description,
            amount: updatedExpense.amount,
            paidBy: updatedExpense.paidBy,
            participants: updatedExpense.participants,
          });
          setEditExpenseSheetVisible(false);
          setEditingExpense(null);
        }}
      />
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
  hero: {
    backgroundColor: "#1d4ed8",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    backgroundColor: "#e0f2fe",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    color: "#ffffff",
    opacity: 0.8,
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  heroButton: {
    backgroundColor: "#facc15",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroButtonText: {
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  field: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: "#1f2937",
    fontFamily: Poppins.medium,
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
  choiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4d4ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  choiceChipActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#8b5cf6",
  },
  choiceText: {
    color: "#1f2937",
    fontFamily: Poppins.medium,
  },
  choiceTextActive: {
    color: "#4c1d95",
    fontFamily: Poppins.medium,
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  helperText: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: Poppins.regular,
  },
  participantEmptyState: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fef08a",
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  participantEmptyContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flex: 1,
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
  additionalButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  additionalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  additionalContent: {
    flex: 1,
    gap: 4,
  },
  additionalTitle: {
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  additionalSubtitle: {
    fontFamily: Poppins.regular,
    color: "#64748b",
    fontSize: 12,
  },
  additionalBadge: {
    minWidth: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#7056ec",
    alignItems: "center",
    justifyContent: "center",
  },
  additionalBadgeText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
    fontSize: 12,
  },
  breakdownBadge: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  breakdownBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7c3aed",
  },
  expenseCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f8fafc",
    gap: 10,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseTitle: {
    fontSize: 16,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  expenseMeta: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: Poppins.regular,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseParticipants: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  expenseAmount: {
    fontSize: 18,
    color: "#2563eb",
    fontFamily: Poppins.semibold,
  },
  expenseSplit: {
    fontSize: 13,
    color: "#475569",
    fontFamily: Poppins.regular,
  },
  participantPill: {
    backgroundColor: "#ede9fe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantPillText: {
    color: "#4c1d95",
    fontSize: 12,
    fontFamily: Poppins.medium,
  },
  expenseActions: {
    flexDirection: "row",
    gap: 12, // Space between Edit and Delete buttons
    alignItems: "center",
    justifyContent: "flex-end",
  },
  editButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 20,
    backgroundColor: "#e0f2fe", // Light blue
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 20,
    backgroundColor: "#fee2e2", // Light red
    alignItems: "center",
    justifyContent: "center",
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
