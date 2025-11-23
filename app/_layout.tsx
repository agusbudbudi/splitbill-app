import "@/polyfills/react-internals";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import type { TextInputProps, TextProps } from "react-native";
import { Platform, Text, TextInput } from "react-native"; // Added Platform import
import "react-native-reanimated";

import { Snackbar as NativeSnackbar } from "@/components/ui/snackbar"; // Renamed for clarity
import { Snackbar as WebSnackbar } from "@/components/ui/snackbar.web"; // Import web-specific Snackbar
import { AuthProvider } from "@/context/auth-context";
import { SnackbarProvider, useSnackbar } from "@/context/snackbar-context";
import { SplitBillProvider } from "@/context/split-bill-context";

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

function SnackbarRenderer() {
  const { snackbar, hideSnackbar } = useSnackbar();
  console.log("SnackbarRenderer snackbar state:", snackbar);

  // Conditionally select the Snackbar component based on platform
  const PlatformSpecificSnackbar = Platform.select({
    ios: NativeSnackbar,
    android: NativeSnackbar,
    web: WebSnackbar,
    default: NativeSnackbar, // Fallback for any other unexpected platform
  });

  // Render the selected Snackbar component
  return (
    <PlatformSpecificSnackbar snackbar={snackbar} onClose={hideSnackbar} />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const TextComponent = Text as typeof Text & {
      defaultProps?: Partial<TextProps>;
    };
    const TextInputComponent = TextInput as typeof TextInput & {
      defaultProps?: Partial<TextInputProps>;
    };

    const existingTextProps = TextComponent.defaultProps ?? {};
    TextComponent.defaultProps = {
      ...existingTextProps,
      style: [
        existingTextProps.style,
        { fontFamily: "Poppins_400Regular" },
      ].filter(Boolean),
    } as Partial<TextProps>;

    const existingInputProps = TextInputComponent.defaultProps ?? {};
    TextInputComponent.defaultProps = {
      ...existingInputProps,
      style: [
        existingInputProps.style,
        { fontFamily: "Poppins_400Regular" },
      ].filter(Boolean),
      placeholderTextColor: "#475569",
    } as Partial<TextInputProps>;

    SplashScreen.hideAsync().catch(() => {
      // ignore
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <SplitBillProvider>
          <SnackbarProvider>
            <Stack
              screenOptions={{
                headerShadowVisible: false,
                headerBackTitle: "Back",
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0f172a",
                },
                contentStyle: {
                  backgroundColor: "#f6fafb",
                },
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="participants"
                options={{ title: "Kelola Teman" }}
              />
              <Stack.Screen
                name="expenses"
                options={{ title: "Catat Pengeluaran" }}
              />
              <Stack.Screen
                name="additional-expenses"
                options={{ title: "Additional Expense" }}
              />
              <Stack.Screen
                name="payment-methods"
                options={{ title: "Metode Pembayaran" }}
              />
              <Stack.Screen
                name="transactions"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="summary"
                options={{ title: "Ringkasan Split Bill" }}
              />
              <Stack.Screen
                name="scan"
                options={{ title: "Scan Bill dengan AI" }}
              />
              <Stack.Screen name="profile" options={{ title: "Profil Kamu" }} />
              <Stack.Screen name="review" options={{ title: "Beri Ulasan" }} />
            </Stack>
            <SnackbarRenderer />
          </SnackbarProvider>
        </SplitBillProvider>
      </AuthProvider>
      <StatusBar style="dark" backgroundColor="#f6fafb" />
    </ThemeProvider>
  );
}
