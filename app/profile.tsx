import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hexToRgba } from "@/lib/utils/colors";

const BANNER_URI = "https://splitbill-alpha.vercel.app/img/banner-profile.png";
const FOOTER_LOGO_URI =
  "https://splitbill-alpha.vercel.app/img/footer-icon.png";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isSubmitting, refreshUser } =
    useAuth();

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const error = useThemeColor({}, "error");
  const icon = useThemeColor({}, "icon");
  const success = useThemeColor({}, "success");

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
          "Cobain SplitBill buat kelola tagihan bareng teman! https://splitbill.my.id/",
      });
    } catch {
      // ignore share cancellation
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[styles.safeArea, { backgroundColor: background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={tint} />
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
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={{ uri: BANNER_URI }} style={styles.banner} />

        <View style={[styles.profileCard, { backgroundColor: card }]}>
          <View style={styles.profileMain}>
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: hexToRgba(tint, 0.1) },
              ]}
            >
              <MaterialIcons name="person" size={24} color={text} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: text }]}>
                {user?.name?.trim() || "Pengguna Split Bill"}
              </Text>
              <Text style={[styles.email, { color: textSecondary }]}>
                {user?.email || "-"}
              </Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.logoutButton,
              { backgroundColor: hexToRgba(error, 0.16) },
              isSubmitting && styles.logoutDisabled,
            ]}
            onPress={handleLogout}
            disabled={isSubmitting}
          >
            <MaterialIcons
              name={isSubmitting ? "hourglass-top" : "logout"}
              size={16}
              color={error}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.menuCard,
            { backgroundColor: card, borderBottomColor: background },
          ]}
        >
          {primaryMenus.map((item, index) => (
            <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                { borderBottomColor: background },
                index === primaryMenus.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.menuIconWrap,
                    { backgroundColor: hexToRgba(tint, 0.12) },
                  ]}
                >
                  <MaterialIcons name={item.icon} size={16} color={tint} />
                </View>
                <Text style={[styles.menuText, { color: text }]}>
                  {item.label}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={icon} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.menuCard, { backgroundColor: card }]}>
          {secondaryMenus.map((item, index) => (
            <Pressable
              key={item.label}
              style={[
                styles.menuItem,
                { borderBottomColor: background },
                index === secondaryMenus.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.menuIconWrap,
                    { backgroundColor: hexToRgba(tint, 0.12) },
                  ]}
                >
                  <MaterialIcons name={item.icon} size={16} color={tint} />
                </View>
                <Text style={[styles.menuText, { color: text }]}>
                  {item.label}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={icon} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.contactCard, { backgroundColor: card }]}>
          <Text style={[styles.contactTitle, { color: text }]}>
            Kontak Kami
          </Text>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="whatsapp" size={20} color={success} />
            <Text style={[styles.contactText, { color: textSecondary }]}>
              WhatsApp: 0855-5949-6968
            </Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialIcons name="email" size={18} color={tint} />
            <Text style={[styles.contactText, { color: textSecondary }]}>
              Email: agusbudbudi@gmail.com
            </Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons
              name="instagram"
              size={20}
              color="#f97316"
            />
            <Text style={[styles.contactText, { color: textSecondary }]}>
              Instagram: @splitbill.app
            </Text>
          </View>
        </View>

        <View style={styles.footerProfile}>
          <View style={styles.footerLogoRow}>
            <Text style={[styles.footerTitle, { color: text }]}>Tentang</Text>
            <Image
              source={{ uri: FOOTER_LOGO_URI }}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.footerBrand, { color: text }]}>SplitBill</Text>
          </View>
          <Text style={[styles.footerDescription, { color: textSecondary }]}>
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
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 8,
    gap: 14,
  },
  banner: {
    height: 118,
    aspectRatio: 1080 / 339,
    borderRadius: 14,
  },
  profileCard: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    fontSize: 14,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  menuCard: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    fontSize: 16,
  },
  contactCard: {
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 14,
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
  },
  footerLogo: {
    width: 24,
    height: 24,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: "700",
  },
  footerDescription: {
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
