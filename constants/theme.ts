/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const Colors = {
  light: {
    primary: "#3462F2",
    primaryDark: "#2049C7",
    primaryLight: "#6F8CFA",
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#475569",
    success: "#22C55E",
    successLight: "#DCFCE7",
    warning: "#FACC15",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    yellowHighlight: "#FDE047",
    badge: "#fef08a",
    badgeText: "#ca8a04",

    // from existing theme structure
    tint: "#3462F2", // primary
    icon: "#475569", // text secondary
    tabIconDefault: "#475569", // text secondary
    tabIconSelected: "#3462F2", // primary
  },
  dark: {
    primary: "#3462F2",
    primaryDark: "#2049C7",
    primaryLight: "#6F8CFA",
    background: "#0F172A",
    card: "#1E293B",
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    success: "#22C55E",
    successLight: "#DCFCE7",
    warning: "#FACC15",
    error: "#EF4444",
    errorLight: "#FEE2E2",

    // from existing theme structure
    tint: "#6F8CFA", // primary light
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#6F8CFA", // primary light
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
