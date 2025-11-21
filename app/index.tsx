import { Poppins } from "@/constants/fonts";
import { useAuth } from "@/context/auth-context";
import { useSplitBill } from "@/context/split-bill-context";
import { fetchSplitBillRecords } from "@/lib/split-bill/api";
import { formatCurrency } from "@/lib/split-bill/format";
import type { SplitBillRecord } from "@/lib/split-bill/types";
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

type BannerItem = {
  id: string;
  image: string;
  route?: string;
  external?: string;
};

const BANNERS: BannerItem[] = [
  {
    id: "profile",
    image: "https://splitbill-alpha.vercel.app/img/banner-profile.png",
    route: "/profile",
  },
  {
    id: "splitbill",
    image: "https://splitbill-alpha.vercel.app/img/banner-splitbill.png",
    route: "/scan",
  },
  {
    id: "wallet",
    image: "https://splitbill-alpha.vercel.app/img/banner-wallet.png",
    route: "/payment-methods",
  },
  {
    id: "feature",
    image: "https://splitbill-alpha.vercel.app/img/new-feature-banner.jpg",
    route: "/scan",
  },
  {
    id: "feedback",
    image: "https://splitbill-alpha.vercel.app/img/banner-feedback.jpg",
    external: "https://splitbill-alpha.vercel.app/review.html",
  },
];

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
      <View style={styles.historyCard}>
        <ActivityIndicator color="#4f46e5" />
        <Text style={styles.loadingText}>Tunggu sebentar ya..</Text>
      </View>
    );
  }

  const renderDraftCard = () => (
    <Pressable
      style={styles.draftCard}
      onPress={() => router.push("/expenses")}
    >
      <View style={styles.draftContent}>
        <View style={styles.draftTextContainer}>
          <Text style={styles.draftTitle}>Lanjutkan split bill</Text>
          <Text style={styles.draftSubtitle}>
            Kamu punya {draftExpenses.length} item pengeluaran yang belum
            disimpan.
          </Text>
        </View>
        <View style={styles.draftTotal}>
          <Text style={styles.draftTotalText}>
            {formatCurrency(draftSummary.total)}
          </Text>
        </View>
      </View>
      <View style={styles.draftAction}>
        <Text style={styles.draftActionText}>Lanjutkan</Text>
        <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
      </View>
    </Pressable>
  );

  const renderRecordCard = (record: SplitBillRecord) => {
    const participantCount = record.participants.length;
    return (
      <Pressable
        key={record.id}
        style={styles.previewCard}
        onPress={() => router.push(`/transactions/${record.id}` as never)}
      >
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleWrapper}>
            <MaterialIcons name="receipt-long" size={16} color="#4f46e5" />
            <Text style={styles.previewTitle} numberOfLines={1}>
              {record.activityName || "Tanpa Nama Aktivitas"}
            </Text>
          </View>
          <Text style={styles.previewDate}>
            {dateFormatter.format(new Date(record.occurredAt))}
          </Text>
        </View>
        <View style={styles.previewFooter}>
          <Text style={styles.previewParticipants}>
            {participantCount} orang
          </Text>
          <Text style={styles.previewTotal}>
            {formatCurrency(record.summary.total)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Terakhir Dilihat</Text>
        {hasRecords && !hasDraft && (
          <Pressable onPress={() => router.push("/transactions" as never)}>
            <Text style={styles.historyAction}>Lihat Semua</Text>
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

  const { width } = useWindowDimensions();

  const bannerWidth = Math.max(width - 32, 0);
  const bannerStride = bannerWidth + 12;
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const activeBannerRef = useRef(0);

  useEffect(() => {
    activeBannerRef.current = activeBanner;
  }, [activeBanner]);

  useEffect(() => {
    if (BANNERS.length <= 1 || bannerStride === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = (activeBannerRef.current + 1) % BANNERS.length;
      activeBannerRef.current = nextIndex;
      setActiveBanner(nextIndex);
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * bannerStride,
        animated: true,
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [bannerStride]);

  const handleBannerPress = (item: BannerItem) => {
    if (item.route) {
      router.push(item.route as never);
      return;
    }

    if (item.external) {
      Linking.openURL(item.external).catch(() => {
        // ignore errors
      });
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path as never);
  };

  // useEffect(() => {
  //   let cancelled = false;
  //   async function loadTransactionCount() {
  //     try {
  //       const records = await fetchSplitBillRecords();
  //       if (!cancelled) setTransactionCount(records.length);
  //     } catch {
  //       if (!cancelled) setTransactionCount(0);
  //     }
  //   }
  //   loadTransactionCount();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, []);

  const handleScan = () => {
    if (!isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }
    router.push("/scan");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.topBarWrapper}>
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
                  style={styles.profileButton}
                  onPress={() => router.push("/profile")}
                >
                  <MaterialIcons name="person" size={24} color="#0f172a" />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.loginLink}
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Text style={styles.loginText}>Masuk</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={styles.heroContainer}>
          <View style={styles.header}>
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.title}>
                  Bagi tagihan makin Easy dan Cepat
                </Text>
                <Text style={styles.subtitle}>
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
                style={styles.heroCta}
                onPress={() => router.push("/(auth)/register")}
              >
                <Text style={styles.heroCtaText}>Daftar & Pakai Scan AI</Text>
              </Pressable>
            ) : (
              <View style={styles.welcomeBox}>
                <Text style={styles.welcomeText}>
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
              const offsetX = event.nativeEvent.contentOffset.x;
              const index =
                bannerStride > 0 ? Math.round(offsetX / bannerStride) : 0;
              const clampedIndex = Math.max(
                0,
                Math.min(BANNERS.length - 1, index)
              );
              activeBannerRef.current = clampedIndex;
              setActiveBanner(clampedIndex);
            }}
          >
            {BANNERS.map((banner, index) => (
              <Pressable
                key={banner.id}
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
            {BANNERS.map((banner, index) => (
              <View
                key={banner.id}
                style={[
                  styles.bannerIndicator,
                  index === activeBanner && styles.bannerIndicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.statCard, styles.statBlue]}>
            <MaterialIcons name="event" size={20} color="#1d4ed8" />
            <Text style={styles.statLabel}>Kegiatan</Text>
            <Text style={styles.statValue}>
              {activityName || "Belum diisi"}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statIndigo]}>
            <FontAwesome5 name="user-friends" size={17} color="#4338ca" />
            <Text style={styles.statLabel}>Teman</Text>
            <Text style={styles.statValue}>{participants.length} orang</Text>
          </View>
          <View style={[styles.statCard, styles.statPurple]}>
            <MaterialIcons name="analytics" size={20} color="#7c3aed" />
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>
              {formatCurrency(summary.total)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mulai dari mana?</Text>
          <View style={styles.tiles}>
            <Pressable
              style={styles.tile}
              onPress={() => handleNavigate("/participants")}
            >
              <View style={[styles.iconCircle, styles.iconBlue]}>
                <FontAwesome5 name="users" size={18} color="#2563eb" />
              </View>
              <Text style={styles.tileTitle}>Kelola Teman</Text>
              <Text style={styles.tileDesc}>
                Tambah anggota geng kamu dulu.
              </Text>
            </Pressable>

            <Pressable
              style={styles.tile}
              onPress={() => handleNavigate("/expenses")}
            >
              <View style={[styles.iconCircle, styles.iconIndigo]}>
                <FontAwesome5 name="receipt" size={18} color="#4c1d95" />
              </View>
              <Text style={styles.tileTitle}>Catat Pengeluaran</Text>
              <Text style={styles.tileDesc}>
                Input manual expense yang mau dibagi.
              </Text>
            </Pressable>

            <Pressable
              style={styles.tile}
              onPress={() => handleNavigate("/summary")}
            >
              <View style={[styles.iconCircle, styles.iconPurple]}>
                <MaterialIcons name="summarize" size={20} color="#7c3aed" />
              </View>
              <Text style={styles.tileTitle}>Lihat Ringkasan</Text>
              <Text style={styles.tileDesc}>
                Cek siapa bayar berapa & siapa harus transfer.
              </Text>
            </Pressable>

            <Pressable
              style={styles.tile}
              onPress={() => handleNavigate("/payment-methods")}
            >
              <View style={[styles.iconCircle, styles.iconBlue]}>
                <MaterialIcons name="wallet" size={20} color="#2563eb" />
              </View>
              <Text style={styles.tileTitle}>Payment Method</Text>
              <Text style={styles.tileDesc}>
                Simpan detail pembayaran favorite kamu.
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.scanCard}>
          <View style={styles.scanHeaderRow}>
            <View style={styles.scanContent}>
              <Text style={styles.scanBadge}>Baru! Scan Bill AI </Text>
              <Text style={styles.scanTitle}>Scan Bill dengan AI 🎉</Text>
              <Text style={styles.scanDesc}>
                Cukup upload bill kamu, sisanya biar AI yang urus.
              </Text>
            </View>
            <Image
              source={require("@/assets/images/splitbill-scan.png")}
              style={styles.scanIllustration}
            />
          </View>
          <Pressable style={styles.scanButton} onPress={handleScan}>
            <Text style={styles.scanButtonText}>
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
    backgroundColor: "#f6fafb",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 24,
  },
  stickyHeader: {
    backgroundColor: "#f6fafb",
  },
  topBarWrapper: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#f6fafb",
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
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  loginLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38bdf8",
    alignSelf: "center",
    flexShrink: 0,
  },
  loginText: {
    color: "#38bdf8",
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  heroContainer: {
    marginHorizontal: 0,
  },
  header: {
    backgroundColor: "#1d4ed8",
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
    color: "#ffffff",
    fontFamily: Poppins.bold,
  },
  subtitle: {
    fontSize: 12,
    color: "#cbd5f5",
    fontFamily: Poppins.regular,
  },
  heroCta: {
    backgroundColor: "#facc15",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  heroCtaText: {
    color: "#1d293b",
    fontSize: 15,
    fontFamily: Poppins.semibold,
    textAlign: "center",
  },
  welcomeBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "stretch",
    width: "100%",
  },
  welcomeText: {
    color: "#e0f2fe",
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
    backgroundColor: "#c7d2fe",
    opacity: 0.5,
  },
  bannerIndicatorActive: {
    opacity: 1,
    backgroundColor: "#4f46e5",
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
    backgroundColor: "#ffffff",
    gap: 6,
  },
  statBlue: {
    backgroundColor: "#e0f2fe",
  },
  statIndigo: {
    backgroundColor: "#ede9fe",
  },
  statPurple: {
    backgroundColor: "#f3e8ff",
  },
  statLabel: {
    color: "#475569",
    fontSize: 12,
    fontFamily: Poppins.medium,
  },
  statValue: {
    fontSize: 14,
    color: "#0f172a",
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
    backgroundColor: "#ffffff",
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
  iconBlue: {
    backgroundColor: "#dbeafe",
  },
  iconIndigo: {
    backgroundColor: "#e0e7ff",
  },
  iconPurple: {
    backgroundColor: "#ede9fe",
  },
  iconPayment: {
    backgroundColor: "#fef3c7",
  },
  tileTitle: {
    fontSize: 14,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  tileDesc: {
    color: "#475569",
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  scanCard: {
    backgroundColor: "#e0f2fe",
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
  scanBadge: {
    color: "#ca8a04",
    fontSize: 13,
    fontFamily: Poppins.semibold,
    backgroundColor: "#fef08a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  scanTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontFamily: Poppins.bold,
  },
  scanDesc: {
    color: "#475569",
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  scanButton: {
    backgroundColor: "#7056ec",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  scanButtonText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
  scanIllustration: {
    width: 90,
    height: 90,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 80,
  },
  historyAction: {
    color: "#38bdf8",
    fontFamily: Poppins.semibold,
  },
  draftCard: {
    backgroundColor: "#4f46e5",
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
    color: "#ffffff",
    fontFamily: Poppins.bold,
    fontSize: 16,
  },
  draftSubtitle: {
    color: "#c7d2fe",
    fontSize: 13,
  },
  draftTotal: {
    paddingLeft: 12,
  },
  draftTotalText: {
    color: "#ffffff",
    fontFamily: Poppins.bold,
    fontSize: 18,
  },
  draftAction: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  draftActionText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
  previewContainer: {
    gap: 12,
  },
  previewCard: {
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
    fontSize: 15,
  },
  previewDate: {
    fontFamily: Poppins.regular,
    color: "#64748b",
    fontSize: 12,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewParticipants: {
    fontFamily: Poppins.medium,
    color: "#475569",
    fontSize: 13,
  },
  previewTotal: {
    fontFamily: Poppins.bold,
    color: "#4f46e5",
    fontSize: 16,
  },
  loadingText: {
    fontFamily: Poppins.regular,
    color: "#4f46e5",
    opacity: 0.6,
    fontSize: 14,
    marginTop: 12,
  },
});
