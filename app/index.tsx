import { Poppins } from "@/constants/fonts";
import { useAuth } from "@/context/auth-context";
import { useSplitBill } from "@/context/split-bill-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Banner as RemoteBanner } from "@/lib/split-bill/api";
import { fetchBanners, fetchSplitBillRecords } from "@/lib/split-bill/api";
import { formatCurrency } from "@/lib/split-bill/format";
import type { SplitBillRecord } from "@/lib/split-bill/types";
import { hexToRgba } from "@/lib/utils/colors";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function RecentSplits() {
  const router = useRouter();
  const { expenses: draftExpenses, summary: draftSummary } = useSplitBill();
  const { isAuthenticated, isInitializing } = useAuth();
  const [records, setRecords] = useState<SplitBillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");

  const hasDraft = draftExpenses.length > 0;
  const latestRecords = records.slice(0, 2);
  const hasRecords = latestRecords.length > 0;

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchSplitBillRecords();
      setRecords(data);
    } catch {
      // Silently fail
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isInitializing) return;
      loadRecords();
    }, [isInitializing, loadRecords])
  );

  if (!isAuthenticated || (!hasDraft && !hasRecords)) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.historyCard, { backgroundColor: card }]}>
        <ActivityIndicator color={tint} />
        <Text style={[styles.loadingText, { color: tint }]}>
          Tunggu sebentar ya..
        </Text>
      </View>
    );
  }

  const renderDraftCard = () => (
    <Pressable
      style={[styles.draftCard, { backgroundColor: tint }]}
      onPress={() => router.push("/expenses")}
    >
      <View style={styles.draftContent}>
        <View style={styles.draftTextContainer}>
          <Text style={[styles.draftTitle, { color: card }]}>
            Lanjutkan split bill
          </Text>
          <Text style={[styles.draftSubtitle, { color: hexToRgba(card, 0.8) }]}>
            Kamu punya {draftExpenses.length} item pengeluaran yang belum
            disimpan.
          </Text>
        </View>
        <View style={styles.draftTotal}>
          <Text style={[styles.draftTotalText, { color: card }]}>
            {formatCurrency(draftSummary.total)}
          </Text>
        </View>
      </View>
      <View
        style={[styles.draftAction, { backgroundColor: hexToRgba(card, 0.2) }]}
      >
        <Text style={[styles.draftActionText, { color: card }]}>Lanjutkan</Text>
        <MaterialIcons name="arrow-forward" size={16} color={card} />
      </View>
    </Pressable>
  );

  const renderRecordCard = (record: SplitBillRecord) => {
    const participantCount = record.participants.length;
    return (
      <Pressable
        key={record.id}
        style={[styles.previewCard, { backgroundColor: card }]}
        onPress={() => router.push(`/transactions/${record.id}` as never)}
      >
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleWrapper}>
            <MaterialIcons name="receipt-long" size={16} color={tint} />
            <Text
              style={[styles.previewTitle, { color: text }]}
              numberOfLines={1}
            >
              {record.activityName || "Tanpa Nama Aktivitas"}
            </Text>
          </View>
          <Text style={[styles.previewDate, { color: textSecondary }]}>
            {dateFormatter.format(new Date(record.occurredAt))}
          </Text>
        </View>
        <View style={styles.previewFooter}>
          <Text style={[styles.previewParticipants, { color: textSecondary }]}>
            {participantCount} orang
          </Text>
          <Text style={[styles.previewTotal, { color: tint }]}>
            {formatCurrency(record.summary.total)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: text }]}>
          Terakhir Dilihat
        </Text>
        {hasRecords && !hasDraft && (
          <Pressable onPress={() => router.push("/transactions" as never)}>
            <Text style={[styles.historyAction, { color: tint }]}>
              Lihat Semua
            </Text>
          </Pressable>
        )}
      </View>
      {hasDraft ? (
        renderDraftCard()
      ) : (
        <View style={styles.previewContainer}>
          {latestRecords.map(renderRecordCard)}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { activityName, participants, summary } = useSplitBill();

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const warning = useThemeColor({}, "warning");
  const primaryDark = useThemeColor({}, "primaryDark");
  const primaryLight = useThemeColor({}, "primaryLight");

  const { width } = useWindowDimensions();

  const bannerWidth = Math.max(width - 32, 0);
  const bannerStride = bannerWidth + 12;
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const [banners, setBanners] = useState<RemoteBanner[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const activeBannerRef = useRef(0);

  useEffect(() => {
    activeBannerRef.current = activeBanner;
  }, [activeBanner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBanners();
        if (!cancelled) setBanners(data);
      } catch {
        if (!cancelled) setBanners([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || bannerStride === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = (activeBannerRef.current + 1) % banners.length;
      activeBannerRef.current = nextIndex;
      setActiveBanner(nextIndex);
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * bannerStride,
        animated: true,
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [bannerStride, banners.length]);

  const handleBannerPress = (item: RemoteBanner) => {
    const route = item.route;
    if (!route) return;
    if (/^https?:\/\//i.test(route)) {
      Linking.openURL(route).catch(() => {});
    } else {
      router.push(route as never);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path as never);
  };

  const handleScan = () => {
    if (!isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }
    router.push("/scan");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        stickyHeaderIndices={[0]}
      >
        <View style={[styles.stickyHeader, { backgroundColor: background }]}>
          <View style={[styles.topBarWrapper, { backgroundColor: background }]}>
            <View style={styles.topBar}>
              <View style={styles.logoSection}>
                <Image
                  source={{
                    uri: "https://splitbill-alpha.vercel.app/img/logoSummary.png",
                  }}
                  style={styles.logo}
                />
              </View>
              {isAuthenticated ? (
                <Pressable
                  style={[
                    styles.profileButton,
                    { backgroundColor: hexToRgba(tint, 0.1) },
                  ]}
                  onPress={() => router.push("/profile")}
                >
                  <MaterialIcons name="person" size={24} color={text} />
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.loginLink, { borderColor: primaryLight }]}
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Text style={[styles.loginText, { color: primaryLight }]}>
                    Masuk
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={styles.heroContainer}>
          <View style={[styles.header, { backgroundColor: tint }]}>
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={[styles.title, { color: card }]}>
                  Bagi tagihan makin Easy dan Cepat
                </Text>
                <Text
                  style={[styles.subtitle, { color: hexToRgba(card, 0.8) }]}
                >
                  Scan bill pakai AI, split bill otomatis. Cepat dan akurat
                </Text>
              </View>
              <Image
                source={require("@/assets/images/splitbill-hero.png")}
                style={styles.heroImage}
              />
            </View>
            {!isAuthenticated ? (
              <Pressable
                style={[styles.heroCta, { backgroundColor: warning }]}
                onPress={() => router.push("/(auth)/register")}
              >
                <Text style={[styles.heroCtaText, { color: text }]}>
                  Daftar & Pakai Scan AI
                </Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.welcomeBox,
                  { backgroundColor: hexToRgba(card, 0.12) },
                ]}
              >
                <Text
                  style={[styles.welcomeText, { color: hexToRgba(card, 0.9) }]}
                >
                  Hi {user?.name?.split(" ")[0] || "Gengs"}! Split your bills,
                  super fast & easy!
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bannerSection}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={bannerStride}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerScrollContent}
            onMomentumScrollEnd={(event) => {
              if (banners.length === 0) {
                return;
              }
              const offsetX = event.nativeEvent.contentOffset.x;
              const index =
                bannerStride > 0 ? Math.round(offsetX / bannerStride) : 0;
              const clampedIndex = Math.max(
                0,
                Math.min(banners.length - 1, index)
              );
              activeBannerRef.current = clampedIndex;
              setActiveBanner(clampedIndex);
            }}
          >
            {banners.map((banner, index) => (
              <Pressable
                key={banner.id || String(index)}
                style={[styles.bannerItem, { width: bannerWidth }]}
                onPress={() => handleBannerPress(banner)}
              >
                <Image
                  source={{ uri: banner.image }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.bannerIndicators}>
            {banners.map((banner, index) => (
              <View
                key={banner.id || String(index)}
                style={[
                  styles.bannerIndicator,
                  { backgroundColor: hexToRgba(tint, 0.5) },
                  index === activeBanner && [
                    styles.bannerIndicatorActive,
                    { backgroundColor: tint },
                  ],
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.quickStats}>
          <View
            style={[
              styles.statCard,
              styles.statBlue,
              { backgroundColor: hexToRgba(tint, 0.05) },
            ]}
          >
            <MaterialIcons name="event" size={20} color={primaryDark} />
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Kegiatan
            </Text>
            <Text style={[styles.statValue, { color: text }]}>
              {activityName || "Belum diisi"}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              styles.statIndigo,
              { backgroundColor: hexToRgba(tint, 0.05) },
            ]}
          >
            <FontAwesome5 name="user-friends" size={17} color={primaryDark} />
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Teman
            </Text>
            <Text style={[styles.statValue, { color: text }]}>
              {participants.length} orang
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              styles.statPurple,
              { backgroundColor: hexToRgba(tint, 0.05) },
            ]}
          >
            <MaterialIcons name="analytics" size={20} color={tint} />
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Total
            </Text>
            <Text style={[styles.statValue, { color: text }]}>
              {formatCurrency(summary.total)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            Mulai dari mana?
          </Text>
          <View style={styles.tiles}>
            <Pressable
              style={[styles.tile, { backgroundColor: card }]}
              onPress={() => handleNavigate("/participants")}
            >
              <View
                style={[
                  styles.iconCircle,
                  styles.iconBlue,
                  { backgroundColor: hexToRgba(tint, 0.2) },
                ]}
              >
                <FontAwesome5 name="users" size={18} color={tint} />
              </View>
              <Text style={[styles.tileTitle, { color: text }]}>
                Kelola Teman
              </Text>
              <Text style={[styles.tileDesc, { color: textSecondary }]}>
                Tambah anggota geng kamu dulu.
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tile, { backgroundColor: card }]}
              onPress={() => handleNavigate("/expenses")}
            >
              <View
                style={[
                  styles.iconCircle,
                  styles.iconIndigo,
                  { backgroundColor: hexToRgba(tint, 0.15) },
                ]}
              >
                <FontAwesome5 name="receipt" size={18} color={primaryDark} />
              </View>
              <Text style={[styles.tileTitle, { color: text }]}>
                Catat Pengeluaran
              </Text>
              <Text style={[styles.tileDesc, { color: textSecondary }]}>
                Input manual expense yang mau dibagi.
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tile, { backgroundColor: card }]}
              onPress={() => handleNavigate("/summary")}
            >
              <View
                style={[
                  styles.iconCircle,
                  styles.iconPurple,
                  { backgroundColor: hexToRgba(tint, 0.1) },
                ]}
              >
                <MaterialIcons name="summarize" size={20} color={tint} />
              </View>
              <Text style={[styles.tileTitle, { color: text }]}>
                Lihat Ringkasan
              </Text>
              <Text style={[styles.tileDesc, { color: textSecondary }]}>
                Cek siapa bayar berapa & siapa harus transfer.
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tile, { backgroundColor: card }]}
              onPress={() => handleNavigate("/payment-methods")}
            >
              <View
                style={[
                  styles.iconCircle,
                  styles.iconBlue,
                  { backgroundColor: hexToRgba(tint, 0.2) },
                ]}
              >
                <MaterialIcons name="wallet" size={20} color={tint} />
              </View>
              <Text style={[styles.tileTitle, { color: text }]}>
                Payment Method
              </Text>
              <Text style={[styles.tileDesc, { color: textSecondary }]}>
                Simpan detail pembayaran favorite kamu.
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[styles.scanCard, { backgroundColor: hexToRgba(tint, 0.05) }]}
        >
          <View style={styles.scanHeaderRow}>
            <View style={styles.scanContent}>
              <Text style={[styles.scanTitle, { color: text }]}>
                Scan Bill dengan AI 🎉
              </Text>
              <Text style={[styles.scanDesc, { color: textSecondary }]}>
                Cukup upload bill kamu, sisanya biar AI yang urus.
              </Text>
            </View>
            <Image
              source={require("@/assets/images/splitbill-scan.png")}
              style={styles.scanIllustration}
            />
          </View>
          <Pressable
            style={[styles.scanButton, { backgroundColor: tint }]}
            onPress={handleScan}
          >
            <Text style={[styles.scanButtonText, { color: card }]}>
              {isAuthenticated ? "Mulai Scan Sekarang" : "Login untuk Scan"}
            </Text>
          </Pressable>
        </View>

        <RecentSplits />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 100,
    gap: 18,
  },
  stickyHeader: {},
  topBarWrapper: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    height: 30,
    aspectRatio: 210 / 65,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loginLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
    flexShrink: 0,
  },
  loginText: {
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  heroContainer: {
    marginHorizontal: 0,
  },
  header: {
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  heroRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: Poppins.bold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  heroCta: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  heroCtaText: {
    fontSize: 15,
    fontFamily: Poppins.semibold,
    textAlign: "center",
  },
  welcomeBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "stretch",
    width: "100%",
  },
  welcomeText: {
    fontFamily: Poppins.semibold,
    fontSize: 14,
  },
  heroImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  bannerSection: {
    gap: 12,
  },
  bannerScrollContent: {
    paddingRight: 12,
  },
  bannerItem: {
    height: 118,
    aspectRatio: 1080 / 339,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 12,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  bannerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  bannerIndicatorActive: {
    opacity: 1,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  statBlue: {},
  statIndigo: {},
  statPurple: {},
  statLabel: {
    fontSize: 12,
    fontFamily: Poppins.medium,
  },
  statValue: {
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Poppins.bold,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    flexBasis: "48%",
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBlue: {},
  iconIndigo: {},
  iconPurple: {},
  iconPayment: {},
  tileTitle: {
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  tileDesc: {
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  scanCard: {
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  scanHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  scanContent: {
    flex: 1,
    gap: 10,
  },
  scanTitle: {
    fontSize: 18,
    fontFamily: Poppins.bold,
  },
  scanDesc: {
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  scanButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  scanButtonText: {
    fontFamily: Poppins.semibold,
  },
  scanIllustration: {
    width: 90,
    height: 90,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 80,
  },
  historyAction: {
    fontFamily: Poppins.regular,
  },
  draftCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  draftContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  draftTextContainer: {
    flex: 1,
    gap: 4,
  },
  draftTitle: {
    fontFamily: Poppins.bold,
    fontSize: 16,
  },
  draftSubtitle: {
    fontSize: 13,
  },
  draftTotal: {
    paddingLeft: 12,
  },
  draftTotalText: {
    fontFamily: Poppins.bold,
    fontSize: 18,
  },
  draftAction: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  draftActionText: {
    fontFamily: Poppins.semibold,
  },
  previewContainer: {
    gap: 12,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  previewTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  previewTitle: {
    flex: 1,
    fontFamily: Poppins.semibold,
    fontSize: 15,
  },
  previewDate: {
    fontFamily: Poppins.regular,
    fontSize: 12,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewParticipants: {
    fontFamily: Poppins.medium,
    fontSize: 13,
  },
  previewTotal: {
    fontFamily: Poppins.bold,
    fontSize: 16,
  },
  loadingText: {
    fontFamily: Poppins.regular,
    opacity: 0.6,
    fontSize: 14,
    marginTop: 12,
  },
});
