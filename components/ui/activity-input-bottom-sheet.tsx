import React from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { BottomSheet } from "./bottom-sheet";

type ActivityInputBottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (activityName: string) => void;
  initialActivityName: string;
};

export function ActivityInputBottomSheet({
  isVisible,
  onClose,
  onSave,
  initialActivityName,
}: ActivityInputBottomSheetProps) {
  const [activityName, setActivityName] = React.useState(initialActivityName);

  const handleSave = () => {
    onSave(activityName);
    onClose();
  };

  React.useEffect(() => {
    setActivityName(initialActivityName);
  }, [initialActivityName]);

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="BTW habis jalan kemana nih? ✈️"
    >
      <TextInput
        value={activityName}
        onChangeText={setActivityName}
        placeholder="Contoh: Bukber rame-rame"
        placeholderTextColor="#687076"
        style={styles.activityInput}
        returnKeyType="done"
      />
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Simpan</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  activityInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});

