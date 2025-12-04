import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Poppins } from "@/constants/fonts";
import { SnackbarMessage } from "@/context/snackbar-context";

type SnackbarProps = {
  snackbar: SnackbarMessage | null;
  onClose: () => void;
};

const SNACKBAR_CONFIG = {
  success: {
    icon: "check-circle",
    backgroundColor: "#22c55e",
    color: "#ffffff",
  },
  error: {
    icon: "error",
    backgroundColor: "#ef4444",
    color: "#ffffff",
  },
  info: {
    icon: "info",
    backgroundColor: "#3462F2",
    color: "#ffffff",
  },
  warning: {
    icon: "warning",
    backgroundColor: "#f97316",
    color: "#ffffff",
  },
} as const;

const DEFAULT_DURATION = 4000;
const SNACKBAR_OFFSCREEN_TRANSLATEY = 200; // Estimated height for off-screen position

export function Snackbar({ snackbar, onClose }: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const animatedTranslateY = useRef(
    new Animated.Value(SNACKBAR_OFFSCREEN_TRANSLATEY)
  ).current; // Controls translateY animation

  const config = snackbar
    ? SNACKBAR_CONFIG[snackbar.type]
    : SNACKBAR_CONFIG.info;

  useEffect(() => {
    console.log(
      "--- Native Snackbar received snackbar prop (SLIDE ANIMATION with translateY) ---",
      snackbar
    );
    if (snackbar) {
      // Animate in (from off-screen to its natural position, translateY: 0)
      Animated.timing(animatedTranslateY, {
        toValue: 0, // Natural resting position (no translation)
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        // Animate out (move off-screen downwards)
        Animated.timing(animatedTranslateY, {
          toValue: SNACKBAR_OFFSCREEN_TRANSLATEY, // Move off-screen downwards
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onClose(); // Call onClose after animation completes
        });
      }, snackbar.duration ?? DEFAULT_DURATION);

      return () => {
        clearTimeout(timer);
        animatedTranslateY.setValue(SNACKBAR_OFFSCREEN_TRANSLATEY); // Reset to off-screen instantly
      };
    } else {
      animatedTranslateY.setValue(SNACKBAR_OFFSCREEN_TRANSLATEY); // Ensure hidden instantly
    }
  }, [snackbar, insets.bottom, onClose, animatedTranslateY]); // Depend on insets.bottom (for static bottom positioning), animatedTranslateY

  if (!snackbar) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          bottom: insets.bottom + 16, // Static bottom position
          top: undefined,
          transform: [{ translateY: animatedTranslateY }], // Apply translateY here
        },
      ]}
    >
      <MaterialIcons name={config.icon as any} size={24} color={config.color} />
      <Text style={[styles.message, { color: config.color }]}>
        {snackbar.message}
      </Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <MaterialIcons name="close" size={20} color={config.color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: Poppins.medium,
  },
  closeButton: {
    padding: 4,
  },
});
