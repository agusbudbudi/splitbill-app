import { ActivityInputBottomSheet } from "@/components/ui/activity-input-bottom-sheet";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { useSnackbar } from "@/context/snackbar-context";
import { useSplitBill } from "@/context/split-bill-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/lib/split-bill/format";
import { Expense } from "@/lib/split-bill/types";
import { hexToRgba } from "@/lib/utils/colors";

export default function ExpensesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const {
    participants: allParticipants,
    selectedParticipantIds,
    expenses,
    additionalExpenses,
    addExpense,
    removeExpense,
    activityName,
    updateActivityName,
    updateExpense, // Add updateExpense here
  } = useSplitBill();

  // Filter participants based on selection
  const participants = useMemo(() => {
    if (selectedParticipantIds.length === 0) return allParticipants;
    return allParticipants.filter((p) => selectedParticipantIds.includes(p.id));
  }, [allParticipants, selectedParticipantIds]);

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const error = useThemeColor({}, "error");
  const warning = useThemeColor({}, "warning");
  const icon = useThemeColor({}, "icon");
  const primary = useThemeColor({}, "primary");
  const primaryDark = useThemeColor({}, "primaryDark");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Catat Pengeluaran",
      headerStyle: { backgroundColor: primary, borderBottomWidth: 0 },
      headerTintColor: card,
      headerTitleStyle: { color: card },
      headerBackTitleStyle: { color: card },
    });
  }, [navigation, primary, card]);

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
      !!paidBy &&
      selectedParticipants.length > 0 &&
      !Number.isNaN(amount) &&
      amount !== 0
    );
  }, [description, paidBy, selectedParticipants.length, amountInput]);

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9-]/g, "");
    setAmountInput(sanitized);
  };

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

    showSnackbar({
      message: `Berhasil menambahkan "${description.trim()}"`,
      type: "success",
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
    showSnackbar({
      message: "Split bill berhasil dibagi! Siap untuk direview 🚀",
      type: "success",
    });
    router.push("/summary");
  };

  const handleDeleteExpense = (expense: Expense) => {
    removeExpense(expense.id);
    showSnackbar({
      message: `Berhasil menghapus "${expense.description}"`,
      type: "success",
    });
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={[styles.topHero, { backgroundColor: primary }]}>
            <View style={[styles.topHeroIcon, { backgroundColor: "#4D75F5" }]}>
              <MaterialIcons name="receipt-long" size={26} color={card} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: card }]}>
                Catat pengeluaran tanpa ribet
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: card, opacity: 0.8 }]}
              >
                Input sendiri atau tinggal scan pakai AI. Cepat, simpel, beres!
              </Text>
            </View>
          </View>

          <View style={styles.heroWrapper}>
            <Pressable
              style={[styles.belowHero, { backgroundColor: "#FDE047" }]}
              onPress={() =>
                router.push(isAuthenticated ? "/scan" : "/(auth)/login")
              }
            >
              <View style={styles.belowHeroContent}>
                <Text style={[styles.belowHeroTitle, { color: text }]}>
                  {isAuthenticated
                    ? "🎉  Scan Bill pakai AI, auto kelar tanpa ribet!"
                    : "🤖  Login dulu buat auto-scan pakai AI"}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.card,
              styles.highlightCard,
              { backgroundColor: card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: text }]}>
              Detail Pengeluaran
            </Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Deskripsi</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Contoh: Makan malam di resto"
                placeholderTextColor={icon}
                style={[
                  styles.input,
                  { color: text, borderColor: hexToRgba(text, 0.1) },
                  isDescriptionFocused && [
                    styles.inputFocused,
                    { borderColor: tint },
                  ],
                ]}
                onFocus={() => setDescriptionFocused(true)}
                onBlur={() => setDescriptionFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: text }]}>Jumlah (Rp)</Text>
              <TextInput
                value={amountInput}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={icon}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.input,
                  { color: text, borderColor: hexToRgba(text, 0.1) },
                  isAmountFocused && [
                    styles.inputFocused,
                    { borderColor: tint },
                  ],
                ]}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
              />
            </View>

            {isAuthenticated && !hasParticipants ? (
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
                    <MaterialIcons name="group" size={20} color={text} />
                  </View>
                  <View style={styles.participantEmptyTextWrapper}>
                    <Text
                      style={[styles.participantEmptyTitle, { color: text }]}
                    >
                      Yuk lengkapi daftar teman kamu
                    </Text>
                    <Text
                      style={[
                        styles.participantEmptySubtitle,
                        { color: textSecondary },
                      ]}
                    >
                      Tambah minimal 2 teman sebelum mencatat expense.
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={text}
                  />
                </View>
              </Pressable>
            ) : null}

            {hasParticipants ? (
              <>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: text }]}>
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
                              backgroundColor: card,
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
                              { color: text },
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
                  <Text style={[styles.label, { color: text }]}>
                    Ditanggung oleh
                  </Text>
                  <View style={styles.choiceGroup}>
                    {participants.map((person) => {
                      const active = selectedParticipants.includes(person.id);
                      return (
                        <Pressable
                          key={person.id}
                          style={[
                            styles.choiceChip,
                            {
                              borderColor: hexToRgba(tint, 0.2),
                              backgroundColor: card,
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
                              { color: text },
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
              </>
            ) : null}

            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: tint },
                (!canSave || !hasParticipants) && styles.disabledButton,
              ]}
              disabled={!canSave || !hasParticipants}
              onPress={handleAddExpense}
            >
              <Text style={[styles.saveText, { color: card }]}>
                Simpan Expense
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.additionalButton,
              {
                backgroundColor: card,
                borderColor: hexToRgba(text, 0.1),
              },
              !hasParticipants && styles.disabledButton,
            ]}
            disabled={!hasParticipants}
            onPress={() => router.push("/additional-expenses")}
          >
            <View
              style={[
                styles.additionalIcon,
                { backgroundColor: hexToRgba(tint, 0.1) },
              ]}
            >
              <MaterialIcons name="request-quote" size={22} color={tint} />
            </View>
            <View style={styles.additionalContent}>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Text style={[styles.additionalTitle, { color: text }]}>
                  PPN, Service, Promo
                </Text>
                <View
                  style={[
                    styles.breakdownBadge,
                    { backgroundColor: hexToRgba(primaryDark, 0.12) },
                  ]}
                >
                  <Text
                    style={[styles.breakdownBadgeText, { color: primaryDark }]}
                  >
                    Proporsional
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.additionalSubtitle, { color: textSecondary }]}
              >
                Tambahkan biaya tambahan (PPN, Service, Promo) dan bagi sesuai
                proporsi pengeluaran
              </Text>
            </View>
            {additionalExpenses.length > 0 && (
              <View
                style={[styles.additionalBadge, { backgroundColor: primary }]}
              >
                <Text style={[styles.additionalBadgeText, { color: card }]}>
                  {additionalExpenses.length}
                </Text>
              </View>
            )}
          </Pressable>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>
              Pengeluaran Tersimpan
            </Text>
            {expenses.length === 0 ? (
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
                  Belum ada data
                </Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>
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
                    <View
                      style={[
                        styles.expenseCard,
                        { backgroundColor: hexToRgba(text, 0.02) },
                      ]}
                    >
                      <View style={styles.expenseHeader}>
                        <View>
                          <Text style={[styles.expenseTitle, { color: text }]}>
                            {item.description}
                          </Text>
                          <Text
                            style={[
                              styles.expenseMeta,
                              { color: textSecondary },
                            ]}
                          >
                            Dibayar oleh {payer?.name ?? "—"}
                          </Text>
                        </View>
                        <Text style={[styles.expenseAmount, { color: tint }]}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                      <View style={styles.expenseRow}>
                        <Text
                          style={[
                            styles.expenseSplit,
                            { color: textSecondary },
                          ]}
                        >
                          {item.participants.length} orang •{" "}
                          {formatCurrency(amountPerPerson)}/orang
                        </Text>
                      </View>
                      {participantDetails.length > 0 ? (
                        <View style={styles.expenseParticipants}>
                          {participantDetails.map((detail) => (
                            <View
                              key={`${item.id}-${detail.id}`}
                              style={[
                                styles.participantPill,
                                { backgroundColor: hexToRgba(tint, 0.1) },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.participantPillText,
                                  { color: primaryDark },
                                ]}
                              >
                                {detail.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <View style={styles.expenseActions}>
                        <Pressable
                          onPress={() => handleEditExpense(item)}
                          style={[
                            styles.editButtonIcon,
                            { backgroundColor: hexToRgba(tint, 0.2) },
                          ]}
                        >
                          <MaterialIcons name="edit" size={16} color={tint} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteExpense(item)}
                          style={[
                            styles.deleteButtonIcon,
                            { backgroundColor: hexToRgba(error, 0.2) },
                          ]}
                        >
                          <MaterialIcons
                            name="delete"
                            size={16}
                            color={error}
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

        <View
          style={[
            styles.footer,
            {
              backgroundColor: background,
              borderTopColor: hexToRgba(text, 0.1),
            },
          ]}
        >
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: tint },
              expenses.length === 0 && styles.disabledButton,
            ]}
            disabled={expenses.length === 0}
            onPress={() => setBottomSheetVisible(true)}
          >
            <Text style={[styles.primaryText, { color: card }]}>
              Lihat Ringkasan
            </Text>
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
          showSnackbar({
            message: `Berhasil mengupdate "${updatedExpense.description}"`,
            type: "success",
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
  },
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 8,
    gap: 18,
    paddingTop: 140,
  },
  heroWrapper: {
    position: "relative",
    zIndex: 1,
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
  heroIcon: {
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
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  belowHero: {
    position: "absolute",
    bottom: -20,
    left: 0,
    right: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    zIndex: 1,
  },
  belowHeroTitle: {
    fontSize: 14,
    fontFamily: Poppins.medium,
  },
  belowHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  belowHeroContent: {
    flex: 1,
    gap: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  highlightCard: {
    zIndex: 2,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Poppins.semibold,
  },
  field: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: Poppins.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputFocused: {},
  choiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  choiceChipActive: {},
  choiceText: {
    fontFamily: Poppins.medium,
  },
  choiceTextActive: {
    fontFamily: Poppins.medium,
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  helperText: {
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  participantEmptyState: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
  additionalButton: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  additionalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  additionalContent: {
    flex: 1,
    gap: 4,
  },
  additionalTitle: {
    fontFamily: Poppins.semibold,
  },
  additionalSubtitle: {
    fontFamily: Poppins.regular,
    fontSize: 12,
  },
  additionalBadge: {
    minWidth: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  additionalBadgeText: {
    fontFamily: Poppins.semibold,
    fontSize: 12,
  },
  breakdownBadge: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  breakdownBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  expenseCard: {
    borderRadius: 12,
    padding: 16,
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
    fontFamily: Poppins.semibold,
  },
  expenseMeta: {
    fontSize: 12,
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
    fontFamily: Poppins.semibold,
  },
  expenseSplit: {
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  participantPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantPillText: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
