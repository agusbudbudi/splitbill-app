import { Poppins } from "@/constants/fonts";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [activityName, setActivityName] = useState(initialActivityName);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0); // State to track keyboard height

  useEffect(() => {
    setActivityName(initialActivityName);
  }, [initialActivityName, isVisible]);

  // Keyboard listener to update keyboardHeight
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSave = () => {
    if (activityName.trim()) {
      onSave(activityName.trim());
    }
  };

  // Calculate padding dynamically
  const isKeyboardVisible = keyboardHeight > 0;
  const sheetBottomPadding = isKeyboardVisible ? 6 : insets.bottom || 16; // Conditional padding

  return (
    <Modal
      animationType="none"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.springify().duration(500)}
          exiting={SlideOutDown.duration(300)}
          style={[styles.sheet, { paddingBottom: sheetBottomPadding }]} // Apply conditional padding
        >
          <View style={styles.header}>
            <Text style={styles.title}>Nama Aktivitas</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={24} color="#687076" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <TextInput
              value={activityName}
              onChangeText={setActivityName}
              placeholder="Contoh: Trip to Bali"
              placeholderTextColor="#687076"
              style={styles.input}
            />
            <Pressable
              style={[
                styles.saveButton,
                !activityName.trim() && styles.disabledButton,
              ]}
              disabled={!activityName.trim()}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Simpan & Lanjutkan</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    gap: 16,
    paddingBottom: 16,
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
