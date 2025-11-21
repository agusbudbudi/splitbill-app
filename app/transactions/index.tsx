import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { fetchSplitBillRecords } from "@/lib/split-bill/api";
import { formatCurrency } from "@/lib/split-bill/format";
import type { SplitBillRecord } from "@/lib/split-bill/types";
import { getAvatarColor } from "@/lib/utils/colors";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function TransactionsScreen() {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuth();
  const [records, setRecords] = useState<SplitBillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRecords = records.length > 0;

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSplitBillRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat transaksi.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshRecords = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchSplitBillRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat transaksi.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || isInitializing) {
        return;
      }

      loadRecords();
    }, [isAuthenticated, isInitializing, loadRecords])
  );

  const content = useMemo(() => {
    if (!isAuthenticated && !isInitializing) {
      return (
        <View style={styles.emptyState}>
          <Image
            source={require("@/assets/images/splitbill-empty-state.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Belum masuk akun</Text>
          <Text style={styles.emptyText}>
            Login dulu supaya kamu bisa lihat riwayat split bill kamu.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.primaryButtonText}>Masuk Sekarang</Text>
          </Pressable>
        </View>
      );
    }

    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat transaksi kamu...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Image
            source={require("@/assets/images/splitbill-empty-state.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Gagal memuat data</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable style={styles.primaryButton} onPress={loadRecords}>
            <Text style={styles.primaryButtonText}>Coba lagi</Text>
          </Pressable>
        </View>
      );
    }

    if (!hasRecords) {
      return (
        <View style={styles.emptyState}>
          <Image
            source={require("@/assets/images/splitbill-empty-state.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
          <Text style={styles.emptyText}>
            Simpan ringkasan split bill kamu, nanti bakal muncul di sini.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/summary")}
          >
            <Text style={styles.secondaryButtonText}>Buat split bill</Text>
          </Pressable>
        </View>
      );
    }

    const renderRecordCard = (record: SplitBillRecord) => {
      const participantsList = Array.isArray(record.participants)
        ? record.participants
        : [];
      const involvedParticipantsCount = record.summary.perParticipant.filter(
        (p) => p.paid !== 0 || p.owed !== 0 || Math.abs(p.balance) > 0
      ).length;

      const visibleParticipants = participantsList.slice(0, 3);
      const extraParticipantCount =
        involvedParticipantsCount > 3 ? involvedParticipantsCount - 3 : 0;
      const activityName =
        record.activityName?.trim() || "Tanpa Nama Aktivitas";
      const formattedDate = dateFormatter.format(new Date(record.occurredAt));
      const expenseCount = record.expenses.length;
      const additionalExpenseCount = record.additionalExpenses.length;

      return (
        <Pressable
          key={record.id}
          style={styles.card}
          onPress={() => router.push(`/transactions/${record.id}` as never)}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.activityHeader}>
                <MaterialIcons
                  name="receipt-long"
                  size={18}
                  color="#2563eb"
                  style={styles.activityIcon}
                />
                <Text style={styles.cardTitle}>{activityName}</Text>
              </View>
              <Text style={styles.activityDate}>{formattedDate}</Text>
              <Text style={styles.participantMeta}>
                {expenseCount} pengeluaran
                {additionalExpenseCount > 0
                  ? ` • ${additionalExpenseCount} tambahan`
                  : ""}
              </Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeValue}>
                {formatCurrency(record.summary.total)}
              </Text>
            </View>
          </View>
          <View style={styles.cardBottomRow}>
            <View style={styles.avatarGroup}>
              {visibleParticipants.map((participant, index) => {
                const name = participant.name?.trim() || "Teman";
                return (
                  <View
                    key={participant.id}
                    style={[
                      styles.avatarWrapper,
                      { backgroundColor: getAvatarColor(participant.id) },
                      index > 0 && styles.avatarOverlap,
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
              {extraParticipantCount > 0 ? (
                <View
                  style={[
                    styles.avatarWrapper,
                    styles.avatarOverflow,
                    visibleParticipants.length > 0 && styles.avatarOverlap,
                  ]}
                >
                  <Text style={styles.avatarOverflowText}>
                    +{extraParticipantCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.detailHint}>
              <Text style={styles.detailHintText}>Lihat Detail</Text>
              <MaterialIcons name="chevron-right" size={18} color="#39BEF8" />
            </View>
          </View>
        </Pressable>
      );
    };

    return <View style={styles.list}>{records.map(renderRecordCard)}</View>;
  }, [
    error,
    hasRecords,
    isAuthenticated,
    isInitializing,
    isLoading,
    isRefreshing,
    loadRecords,
    records,
    router,
  ]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshRecords}
              tintColor="#2563eb"
              colors={["#2563eb"]}
            />
          ) : undefined
        }
      >
        {content}
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
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    gap: 16,
    // borderColor: "#e2e8f0",
    // borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  cardTitleGroup: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  participantMeta: {
    color: "#64748b",
    fontSize: 13,
  },
  totalBadge: {
    alignItems: "flex-end",
    minWidth: 120,
  },
  totalBadgeValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#7055EB",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#EDE8FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 10,
  },
  avatarOverflow: {
    backgroundColor: "#EDE8FE",
  },
  avatarOverflowText: {
    color: "#7055EB",
    fontWeight: "600",
    fontSize: 10,
  },
  detailHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailHintText: {
    color: "#39BEF8",
    fontWeight: "600",
    fontSize: 13,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityIcon: {
    marginTop: 2,
  },
  activityDate: {
    color: "#64748b",
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  loadingBox: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#475569",
    fontSize: 14,
  },
});
