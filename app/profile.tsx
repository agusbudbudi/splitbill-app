import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";

const BANNER_URI = "https://splitbill-alpha.vercel.app/img/banner-profile.png";
const FOOTER_LOGO_URI =
  "https://splitbill-alpha.vercel.app/img/footer-icon.png";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isSubmitting, refreshUser } =
    useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      refreshUser().catch(() => undefined);
    }
  }, [isAuthenticated, user, refreshUser]);

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          "Cobain SplitBill buat kelola tagihan bareng teman! https://splitbill-alpha.vercel.app",
      });
    } catch {
      // ignore share cancellation
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const primaryMenus = [
    {
      icon: "receipt-long" as const,
      label: "Transaksi",
      onPress: () => router.push("/transactions"),
    },
    {
      icon: "wallet" as const,
      label: "Metode Pembayaran",
      onPress: () => router.push("/payment-methods"),
    },
    {
      icon: "group" as const,
      label: "Daftar Teman",
      onPress: () => router.push("/participants"),
    },
  ];

  const secondaryMenus = [
    {
      icon: "reviews" as const,
      label: "Ulasan & Feedback",
      onPress: () => router.push("/review"),
    },
    {
      icon: "share" as const,
      label: "Share SplitBill",
      onPress: shareApp,
    },
  ];

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={{ uri: BANNER_URI }} style={styles.banner} />

        <View style={styles.profileCard}>
          <View style={styles.profileMain}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={24} color="#0f172a" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {user?.name?.trim() || "Pengguna Split Bill"}
              </Text>
              <Text style={styles.email}>{user?.email || "-"}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.logoutButton, isSubmitting && styles.logoutDisabled]}
            onPress={handleLogout}
            disabled={isSubmitting}
          >
            <MaterialIcons
              name={isSubmitting ? "hourglass-top" : "logout"}
              size={16}
              color="#ef4444"
            />
          </Pressable>
        </View>

        <View style={styles.menuCard}>
          {primaryMenus.map((item, index) => (
            <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                index === primaryMenus.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconWrap}>
                  <MaterialIcons name={item.icon} size={16} color="#2563eb" />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color="#94a3b8" />
            </Pressable>
          ))}
        </View>

        <View style={styles.menuCard}>
          {secondaryMenus.map((item, index) => (
            <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                index === secondaryMenus.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconWrapAlt}>
                  <MaterialIcons name={item.icon} size={16} color="#7c3aed" />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color="#94a3b8" />
            </Pressable>
          ))}
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Kontak Kami</Text>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="#22c55e" />
            <Text style={styles.contactText}>WhatsApp: 0855-5949-6968</Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialIcons name="email" size={18} color="#2563eb" />
            <Text style={styles.contactText}>Email: agusbudbudi@gmail.com</Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons
              name="instagram"
              size={20}
              color="#f97316"
            />
            <Text style={styles.contactText}>Instagram: @splitbill.app</Text>
          </View>
        </View>

        <View style={styles.footerProfile}>
          <View style={styles.footerLogoRow}>
            <Text style={styles.footerTitle}>Tentang</Text>
            <Image
              source={{ uri: FOOTER_LOGO_URI }}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            <Text style={styles.footerBrand}>SplitBill</Text>
          </View>
          <Text style={styles.footerDescription}>
            Split bill jadi mudah, catat, bagi, dan selesaikan tanpa ribet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6fafb",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 8,
    gap: 16,
  },
  banner: {
    height: 118,
    aspectRatio: 1080 / 339,
    borderRadius: 14,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  email: {
    fontSize: 14,
    color: "#64748b",
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(248,113,113,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F6FAFB",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconWrapAlt: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    fontSize: 16,
    color: "#0f172a",
  },
  contactCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    color: "#475569",
  },
  footerProfile: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
  },
  footerLogoRow: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  footerLogo: {
    width: 24,
    height: 24,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  footerDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
