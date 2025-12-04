import { Poppins } from "@/constants/fonts";
import { parseCurrency } from "@/lib/split-bill/format";
import { Expense, Participant } from "@/lib/split-bill/types";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EditExpenseBottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  expense: Expense | null;
  participants: Participant[];
  onSave: (updatedExpense: Expense) => void;
};

export const EditExpenseBottomSheet: React.FC<EditExpenseBottomSheetProps> = ({
  isVisible,
  onClose,
  expense,
  participants,
  onSave,
}) => {
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmountInput(String(expense.amount));
      setPaidBy(expense.paidBy);
      setSelectedParticipants(expense.participants);
    } else {
      setDescription("");
      setAmountInput("");
      setPaidBy(null);
      setSelectedParticipants([]);
    }
  }, [expense, isVisible]);

  const insets = useSafeAreaInsets();

  const canSave = useMemo(() => {
    const amount = parseCurrency(amountInput);
    return (
      description.trim().length > 0 &&
      !Number.isNaN(amount) &&
      amount !== 0 &&
      !!paidBy &&
      selectedParticipants.length > 0
    );
  }, [description, amountInput, paidBy, selectedParticipants.length]);

  const handleSave = () => {
    if (expense && canSave && paidBy) {
      const updatedExpense: Expense = {
        ...expense,
        description: description.trim(),
        amount: parseCurrency(amountInput),
        paidBy: paidBy,
        participants: selectedParticipants,
      };
      onSave(updatedExpense);
      onClose();
    }
  };

  const toggleSelectedParticipant = (id: string) => {
    setSelectedParticipants((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.springify().duration(500)}
          exiting={SlideOutDown.duration(300)}
          style={[styles.sheet, { paddingBottom: insets.bottom || 16 }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Edit Pengeluaran</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
            >
              <MaterialIcons name="close" size={24} color="#687076" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>Deskripsi</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Contoh: Makan malam di resto"
                placeholderTextColor="#687076"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Jumlah (Rp)</Text>
              <TextInput
                value={amountInput}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9-]/g, "");
                  setAmountInput(numericValue);
                }}
                placeholder="0"
                placeholderTextColor="#687076"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
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
                      onPress={() => toggleSelectedParticipant(person.id)}
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
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.saveButton, !canSave && styles.disabledButton]}
              disabled={!canSave}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Update Expense</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: "85%", // Ensure sheet does not take full screen
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  closeButton: {
    padding: 4,
  },
  body: {
    // This will now be the ScrollView
  },
  scrollContent: {
    paddingBottom: 16, // Space for the content to not be blocked by footer
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: Poppins.medium,
    color: "#1f2937",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Poppins.regular,
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
  footer: {
    paddingTop: 16,
    paddingBottom: 16, // This padding will be inside the sheet
    backgroundColor: "#ffffff",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
