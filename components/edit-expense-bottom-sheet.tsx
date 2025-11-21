import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import { Poppins } from "@/constants/fonts";
import { parseCurrency } from "@/lib/split-bill/format";
import { Expense, Participant } from "@/lib/split-bill/types";
import { BottomSheet } from "./ui/bottom-sheet"; // Import the generic BottomSheet

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
  const [isDescriptionFocused, setDescriptionFocused] = useState(false);
  const [isAmountFocused, setAmountFocused] = useState(false);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmountInput(String(expense.amount));
      setPaidBy(expense.paidBy);
      setSelectedParticipants(expense.participants);
    } else {
      // Reset form if no expense is being edited
      setDescription("");
      setAmountInput("");
      setPaidBy(null);
      setSelectedParticipants([]);
    }
  }, [expense, isVisible]); // Reset when expense or visibility changes

  const canSave = useMemo(() => {
    const amount = parseCurrency(amountInput);
    return (
      description.trim().length > 0 &&
      amount > 0 &&
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
        // Ensure at least one participant is selected
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="Edit Pengeluaran" // Pass the title to the generic BottomSheet
    >
      <Animated.View
        entering={SlideInDown.springify().duration(500)}
        exiting={SlideOutDown.duration(300)}
        style={styles.animatedContainer} // Apply container styles here
      >
        <ScrollView
          style={{ backgroundColor: "#ffffff" }}
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
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
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                setAmountInput(numericValue);
              }}
              placeholder="0"
              placeholderTextColor="#687076"
              keyboardType="numeric"
              style={[styles.input, isAmountFocused && styles.inputFocused]}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
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
        <View style={styles.stickyFooter}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.disabledButton]}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Update Expense</Text>
          </Pressable>
        </View>
      </Animated.View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  animatedContainer: { // Renamed from 'container' to avoid conflict and emphasize it's for animation
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: "85%", // Adjust as needed
    width: "100%", // Ensure container takes full width
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    // The background color, border radius, etc. are now handled by the generic BottomSheet
  },
  content: {
    gap: 16,
    paddingBottom: 20, // Add padding for scrollable content
    backgroundColor: "#ffffff",
    flex: 1, // Ensure content takes up available space
  },
  stickyFooter: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    marginTop: 10,
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
