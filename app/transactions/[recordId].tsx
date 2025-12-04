import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { useSplitBill } from "@/context/split-bill-context";
import { fetchSplitBillRecord } from "@/lib/split-bill/api";
import { formatCurrency } from "@/lib/split-bill/format";
import type {
  PaymentMethod,
  PaymentMethodSnapshot,
  SplitBillRecord,
} from "@/lib/split-bill/types";
import { getAvatarColor } from "@/lib/utils/colors";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function SplitBillDetailScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const [record, setRecord] = useState<SplitBillRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { paymentMethods } = useSplitBill();
  const navigation = useNavigation();
  const captureAreaRef = useRef<View>(null);
  const [isSaving, setIsSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Detail Split Bill",
      headerStyle: { backgroundColor: "#3462F2", borderBottomWidth: 0 },
      headerTintColor: "#ffffff",
      headerTitleStyle: { color: "#ffffff" },
      headerBackTitleStyle: { color: "#ffffff" },
    });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;

    if (!recordId || typeof recordId !== "string") {
      setError("ID split bill tidak ditemukan");
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSplitBillRecord(recordId);
        if (!cancelled) {
          setRecord(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat detail.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const participantMap = useMemo(() => {
    if (!record) {
      return new Map<string, string>();
    }
    return new Map(record.participants.map((item) => [item.id, item.name]));
  }, [record]);

  const paymentMethodMap = useMemo(() => {
    const map = new Map<string, (typeof paymentMethods)[number]>();
    paymentMethods.forEach((method) => {
      map.set(method.id, method);
    });
    return map;
  }, [paymentMethods]);

  const selectedPaymentMethods = useMemo<
    (PaymentMethod | PaymentMethodSnapshot)[]
  >(() => {
    if (!record) {
      return [];
    }
    if (
      Array.isArray(record.paymentMethodSnapshots) &&
      record.paymentMethodSnapshots.length > 0
    ) {
      return record.paymentMethodSnapshots;
    }
    return record.paymentMethodIds
      .map((id) => paymentMethodMap.get(id))
      .filter((method): method is PaymentMethod => Boolean(method));
  }, [record, paymentMethodMap]);

  const hasAnySavedMethods =
    (record?.paymentMethodSnapshots?.length ?? 0) > 0 ||
    (record?.paymentMethodIds?.length ?? 0) > 0;

  const missingPaymentMethodIds = useMemo(() => {
    if (!record) {
      return [] as string[];
    }
    // If snapshots are present, we don't consider anything "missing"
    if (
      Array.isArray(record.paymentMethodSnapshots) &&
      record.paymentMethodSnapshots.length > 0
    ) {
      return [];
    }
    return record.paymentMethodIds.filter((id) => !paymentMethodMap.has(id));
  }, [record, paymentMethodMap]);

  const getName = (id: string) => participantMap.get(id) ?? "Tidak diketahui";

  const involvedParticipantsCount = useMemo(() => {
    if (!record) return 0;
    return record.summary.perParticipant.filter(
      (p) => p.paid !== 0 || p.owed !== 0 || Math.abs(p.balance) > 0
    ).length;
  }, [record]);

  const expenseCount = record?.expenses.length ?? 0;
  const additionalExpenseCount = record?.additionalExpenses.length ?? 0;

  const handleShareWhatsApp = () => {
    if (!record) {
      return;
    }

    const { activityName, occurredAt, expenses, additionalExpenses, summary } =
      record;

    const involvedParticipants = summary.perParticipant.filter(
      (item) => item.paid !== 0 || item.owed !== 0 || Math.abs(item.balance) > 0
    );

    const itemList = expenses
      .map((expense) => {
        const payerName = getName(expense.paidBy);
        const participantNames = expense.participants
          .map((participantId) => getName(participantId))
          .join(", ");

        return `• ${expense.description} (${formatCurrency(
          expense.amount
        )}) | Split dengan: ${participantNames || "-"} | Dibayar oleh: ${
          payerName || "-"
        }`;
      })
      .join("\n");

    const additionalItemsText = (additionalExpenses ?? [])
      .map((additional) => {
        const payerName = getName(additional.paidBy);
        const shareLines = involvedParticipants
          .map((participant) => {
            const owedItem = participant.owedItems.find(
              (item) => item.id === additional.id && item.type === "additional"
            );
            if (!owedItem || owedItem.amount <= 0) {
              return null;
            }
            return `  • ${getName(participant.participantId)}: ${formatCurrency(
              owedItem.amount
            )}`;
          })
          .filter((entry): entry is string => Boolean(entry));

        const headerLine = `• ${additional.description} (${formatCurrency(
          additional.amount
        )}) dibayar oleh: ${payerName || "Tidak diketahui"}`;

        return shareLines.length > 0
          ? `${headerLine}\n${shareLines.join("\n")}`
          : headerLine;
      })
      .filter(Boolean)
      .join("\n");

    const paymentSummary = summary.settlements
      .map((settlement) => {
        const from = getName(settlement.from);
        const to = getName(settlement.to);
        return `• ${from} → ${to}: *${formatCurrency(settlement.amount)}*`;
      })
      .join("\n");

    const hasPaymentSelection = selectedPaymentMethods.length > 0;
    const paymentMethodsText = hasPaymentSelection
      ? selectedPaymentMethods
          .map((method) => {
            if (method.category === "bank_transfer") {
              return `•⁠  ${method.provider} a.n ${method.ownerName} (${method.accountNumber})`;
            }
            return `•⁠  ${method.provider} a.n ${method.ownerName} (${method.phoneNumber})`;
          })
          .join("\n")
      : "Tidak ada";

    let message = `*🧾 Split Bill - Simplified*

Hai guys! Ini bill untuk ${activityName.trim() || "Tanpa Nama Aktivitas"}
📅 Tanggal: ${dateFormatter.format(new Date(occurredAt))}

*🛍️ Daftar Item:*
${itemList || "• Tidak ada pengeluaran utama"}`;

    if (additionalItemsText) {
      message += `

*💰 Additional Items:*
${additionalItemsText}`;
    }

    message += `

*📊 Ringkasan Pembayaran:*
${paymentSummary || "• Semua saldo sudah seimbang 🎉"}

*📥 Metode Pembayaran:*
${paymentMethodsText}

🔗 https://splitbill.my.id
_Dibuat dengan Split Bill App_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() => undefined);
  };

  const onDownloadSplitBill = async () => {
    try {
      if (!recordId) return;
      setIsSaving(true);

      const filename = `splitbill-${recordId}.png`;

      if (Platform.OS === "web") {
        const base64 = await captureRef(captureAreaRef, {
          format: "png",
          quality: 1,
          result: "base64",
        });
        const dataUrl = `data:image/png;base64,${base64}`;
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert("Berhasil", "Gambar berhasil diunduh.");
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin ditolak",
          "Tidak bisa menyimpan ke galeri tanpa izin."
        );
        return;
      }

      const uri = await captureRef(captureAreaRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const asset = await MediaLibrary.createAssetAsync(uri);
      const albumName = "SplitBill";
      const existing = await MediaLibrary.getAlbumAsync(albumName);
      if (existing) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], existing, false);
      } else {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      }
      Alert.alert("Berhasil", "Gambar disimpan ke galeri (album SplitBill).");
    } catch (e) {
      Alert.alert(
        "Gagal",
        e instanceof Error ? e.message : "Tidak bisa menyimpan gambar."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Memuat detail split bill...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Ups!</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : record ? (
          <>
            <View
              ref={captureAreaRef}
              collapsable={false}
              style={styles.container}
            >
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <MaterialIcons
                    name="receipt-long"
                    size={26}
                    color="#ffffff"
                  />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>{record.activityName}</Text>
                  <Text style={styles.heroSubtitle}>
                    {dateFormatter.format(new Date(record.occurredAt))} •{" "}
                    {expenseCount} pengeluaran
                    {additionalExpenseCount > 0
                      ? ` • ${additionalExpenseCount} tambahan`
                      : ""}{" "}
                    • Total {formatCurrency(record.summary.total)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.card, styles.shareCardClickable]}
                onPress={handleShareWhatsApp}
              >
                <View style={styles.shareRow}>
                  <View style={[styles.shareIcon, styles.shareIconWhatsApp]}>
                    <MaterialCommunityIcons
                      name="whatsapp"
                      size={20}
                      color="#22c55e"
                    />
                  </View>
                  <View style={styles.shareTextBlock}>
                    <Text style={styles.shareTitle}>Bagikan ke WhatsApp</Text>
                    <Text style={styles.shareSubtitle}>
                      Kirim ringkasan Split Bill ke grup dengan sekali klik
                    </Text>
                  </View>
                </View>
              </Pressable>

              <View style={{ gap: 16 }}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Ringkasan per Orang</Text>
                    <View style={styles.participantCountBadge}>
                      <Text style={styles.participantCountBadgeText}>
                        {involvedParticipantsCount}
                      </Text>
                    </View>
                  </View>

                  {record.summary.perParticipant
                    .filter(
                      (item) =>
                        item.paid !== 0 ||
                        item.owed !== 0 ||
                        Math.abs(item.balance) > 0
                    )
                    .map((item) => {
                      const participantId = item.participantId;
                      const name = getName(participantId);
                      const status =
                        item.balance > 0
                          ? "Menagih"
                          : item.balance < 0
                          ? "Membayar"
                          : "Lunas";

                      const settlementsToPay =
                        record.summary.settlements.filter(
                          (settlement) => settlement.from === participantId
                        );
                      const settlementsToReceive =
                        record.summary.settlements.filter(
                          (settlement) => settlement.to === participantId
                        );

                      const transferMessages: {
                        key: string;
                        text: string;
                        variant: "pay" | "receive" | "neutral";
                      }[] = [];

                      settlementsToPay.forEach((settlement, index) => {
                        transferMessages.push({
                          key: `${participantId}-pay-${index}`,
                          text: `Bayar ${formatCurrency(
                            settlement.amount
                          )} ke ${getName(settlement.to)}`,
                          variant: "pay",
                        });
                      });

                      settlementsToReceive.forEach((settlement, index) => {
                        transferMessages.push({
                          key: `${participantId}-receive-${index}`,
                          text: `Terima ${formatCurrency(
                            settlement.amount
                          )} dari ${getName(settlement.from)}`,
                          variant: "receive",
                        });
                      });

                      if (transferMessages.length === 0) {
                        if (item.balance > 0) {
                          transferMessages.push({
                            key: `${participantId}-balance-positive`,
                            text: `Kamu akan menerima ${formatCurrency(
                              item.balance
                            )}`,
                            variant: "receive",
                          });
                        } else if (item.balance < 0) {
                          transferMessages.push({
                            key: `${participantId}-balance-negative`,
                            text: `Kamu harus bayar ${formatCurrency(
                              Math.abs(item.balance)
                            )}`,
                            variant: "pay",
                          });
                        } else {
                          transferMessages.push({
                            key: `${participantId}-balance-neutral`,
                            text: "Saldo kamu sudah seimbang",
                            variant: "neutral",
                          });
                        }
                      }

                      return (
                        <View key={participantId} style={styles.personCard}>
                          <View style={styles.personHeader}>
                            <View style={styles.personHeaderLeft}>
                              <View
                                style={[
                                  styles.personAvatar,
                                  {
                                    backgroundColor:
                                      getAvatarColor(participantId),
                                  },
                                ]}
                              >
                                <Text style={styles.personAvatarText}>
                                  {name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.personInfo}>
                                <Text style={styles.personName}>{name}</Text>
                                <Text style={styles.personPaid}>
                                  Total Membayar:{" "}
                                  <Text style={styles.personPaidAmount}>
                                    {formatCurrency(item.paid)}
                                  </Text>
                                </Text>
                              </View>
                            </View>
                            <View style={styles.personExpense}>
                              <Text style={styles.personExpenseLabel}>
                                Total Pengeluaran
                              </Text>
                              <Text style={styles.personExpenseValue}>
                                {formatCurrency(item.owed)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.breakdownSection}>
                            <Text style={styles.sectionLabel}>
                              Detail Pengeluaran
                            </Text>
                            {item.owedItems.length === 0 ? (
                              <Text style={styles.emptyBreakdownText}>
                                Tidak ada pengeluaran langsung
                              </Text>
                            ) : (
                              item.owedItems.map((owedItem) => {
                                const isAdditional =
                                  owedItem.type === "additional";
                                const amountDisplay =
                                  owedItem.amount < 0
                                    ? `- ${formatCurrency(
                                        Math.abs(owedItem.amount)
                                      )}`
                                    : formatCurrency(owedItem.amount);

                                return (
                                  <View
                                    key={`${participantId}-${owedItem.id}`}
                                    style={styles.breakdownRow}
                                  >
                                    <View style={styles.breakdownInfo}>
                                      <Text style={styles.breakdownName}>
                                        {owedItem.description}
                                      </Text>
                                      {owedItem.amount < 0 ? (
                                        <View
                                          style={[
                                            styles.breakdownBadge,
                                            { backgroundColor: "#dcfce7" },
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.breakdownBadgeText,
                                              { color: "#166534" },
                                            ]}
                                          >
                                            Discount
                                          </Text>
                                        </View>
                                      ) : null}
                                      {isAdditional ? (
                                        <View style={styles.breakdownBadge}>
                                          <Text
                                            style={styles.breakdownBadgeText}
                                          >
                                            Proporsional
                                          </Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <Text
                                      style={[
                                        styles.breakdownAmount,
                                        owedItem.amount < 0 &&
                                          styles.breakdownAmountNegative,
                                      ]}
                                    >
                                      {amountDisplay}
                                    </Text>
                                  </View>
                                );
                              })
                            )}
                          </View>

                          <View style={styles.transferSection}>
                            <View style={styles.transferHeader}>
                              <Text style={styles.sectionLabel}>
                                Status Pembayaran
                              </Text>
                              <View
                                style={[
                                  styles.statusBadge,
                                  status === "Menagih"
                                    ? styles.statusBadgePositive
                                    : status === "Membayar"
                                    ? styles.statusBadgeNegative
                                    : styles.statusBadgeNeutral,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBadgeText,
                                    status === "Menagih"
                                      ? styles.statusTextPositive
                                      : status === "Membayar"
                                      ? styles.statusTextNegative
                                      : styles.statusTextNeutral,
                                  ]}
                                >
                                  {status}
                                </Text>
                              </View>
                            </View>
                            {transferMessages.map((message) => (
                              <Text
                                key={message.key}
                                style={[
                                  styles.transferText,
                                  message.variant === "receive"
                                    ? styles.transferTextPositive
                                    : message.variant === "pay"
                                    ? styles.transferTextNegative
                                    : message.variant === "neutral"
                                    ? styles.transferTextNeutral
                                    : null,
                                ]}
                              >
                                {message.text}
                              </Text>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionBody}>
                    <Text style={styles.sectionTitle}>Pelunasan</Text>
                    {record.summary.settlements.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Semua saldo sudah seimbang 🎉
                      </Text>
                    ) : (
                      record.summary.settlements.map((settlement, index) => (
                        <View
                          key={`${settlement.from}-${settlement.to}-${index}`}
                          style={styles.settlementRow}
                        >
                          <Text style={styles.settlementNames}>
                            {getName(settlement.from)} ➜{" "}
                            {getName(settlement.to)}
                          </Text>
                          <Text style={styles.settlementAmount}>
                            {formatCurrency(settlement.amount)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionBody}>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitle}>Pengeluaran</Text>
                      <View style={styles.participantCountBadge}>
                        <Text style={styles.participantCountBadgeText}>
                          {expenseCount}
                        </Text>
                      </View>
                    </View>
                    {record.expenses.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Tidak ada pengeluaran utama.
                      </Text>
                    ) : (
                      record.expenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseRow}>
                          <View style={styles.expenseInfo}>
                            <Text style={styles.expenseName}>
                              {expense.description}
                            </Text>
                            <Text style={styles.expenseMeta}>
                              Dibayar oleh {getName(expense.paidBy)} • Dibagi{" "}
                              {expense.participants.length} orang
                            </Text>
                          </View>
                          <Text style={styles.expenseAmount}>
                            {formatCurrency(expense.amount)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {record.additionalExpenses.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionBody}>
                      <View style={styles.sectionTitleContainer}>
                        <Text style={styles.sectionTitle}>
                          Additional Expense
                        </Text>
                        <View style={styles.participantCountBadge}>
                          <Text style={styles.participantCountBadgeText}>
                            {additionalExpenseCount}
                          </Text>
                        </View>
                      </View>
                      {record.additionalExpenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseRow}>
                          <View style={styles.expenseInfo}>
                            <Text style={styles.expenseName}>
                              {expense.description}
                            </Text>
                            <Text style={styles.expenseMeta}>
                              Dibayar oleh {getName(expense.paidBy)} •
                              Proporsional ke {expense.participants.length}{" "}
                              orang
                            </Text>
                          </View>
                          <Text style={styles.expenseAmount}>
                            {formatCurrency(expense.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {hasAnySavedMethods && (
                  <View style={styles.section}>
                    <View style={styles.sectionBody}>
                      <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
                      {selectedPaymentMethods.length > 0 ? (
                        <View style={styles.paymentList}>
                          {selectedPaymentMethods.map((method) => (
                            <View key={method.id} style={styles.paymentItem}>
                              <View
                                style={[
                                  styles.paymentIcon,
                                  method.category === "bank_transfer"
                                    ? styles.paymentIconBank
                                    : styles.paymentIconWallet,
                                ]}
                              >
                                <MaterialCommunityIcons
                                  name={
                                    method.category === "bank_transfer"
                                      ? "bank"
                                      : "cellphone"
                                  }
                                  size={20}
                                  color={
                                    method.category === "bank_transfer"
                                      ? "#1d4ed8"
                                      : "#3462F2"
                                  }
                                />
                              </View>
                              <View style={styles.paymentDetails}>
                                <Text style={styles.paymentName}>
                                  {method.provider}
                                </Text>
                                <Text style={styles.paymentOwner}>
                                  {method.ownerName}
                                </Text>
                                <Text style={styles.paymentMeta}>
                                  {method.category === "bank_transfer"
                                    ? `Rek: ${method.accountNumber}`
                                    : `No HP: ${method.phoneNumber}`}
                                </Text>
                              </View>
                            </View>
                          ))}

                          {missingPaymentMethodIds.length > 0 ? (
                            <View style={styles.paymentFallback}>
                              <Text style={styles.paymentFallbackTitle}>
                                Detail tambahan tidak ditemukan untuk ID
                                berikut:
                              </Text>
                              {missingPaymentMethodIds.map((id) => (
                                <Text
                                  key={id}
                                  style={styles.paymentFallbackText}
                                >
                                  {id}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.paymentFallback}>
                          <Text style={styles.paymentFallbackTitle}>
                            Detail metode pembayaran tidak ditemukan.
                          </Text>
                          {record.paymentMethodIds.map((id) => (
                            <Text key={id} style={styles.paymentFallbackText}>
                              {id}
                            </Text>
                          ))}
                          <Text style={styles.paymentFallbackHint}>
                            Coba cek kembali di halaman Metode Pembayaran untuk
                            memperbarui data.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {record && (
        <View style={styles.footer}>
          <Pressable
            style={styles.downloadButton}
            onPress={onDownloadSplitBill}
            disabled={isSaving}
          >
            <MaterialIcons name="file-download" size={18} color="#ffffff" />
            <Text style={styles.downloadButtonText}>
              {isSaving ? "Memproses..." : "Download Split Bill"}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6fafb",
  },
  container: {
    padding: 8,
    paddingVertical: 12,
    gap: 16,
    paddingTop: 100,
    backgroundColor: "#f6fafb",
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
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#b91c1c",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  shareCardClickable: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  shareIconWhatsApp: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  shareTextBlock: {
    flex: 1,
    gap: 4,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  shareSubtitle: {
    fontSize: 12,
    color: "#475569",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  hero: {
    backgroundColor: "#3462F2",
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    minHeight: 140,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: 24,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroSubtitle: {
    color: "#bfdbfe",
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionBody: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  personCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 16,
  },
  personHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  personHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  personAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  personInfo: {
    flex: 1,
    gap: 6,
  },
  personName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgePositive: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  statusBadgeNegative: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  statusBadgeNeutral: {
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  statusTextPositive: {
    color: "#15803d",
  },
  statusTextNegative: {
    color: "#b91c1c",
  },
  statusTextNeutral: {
    color: "#475569",
  },
  personPaid: {
    color: "#64748b",
    fontSize: 12,
  },
  personPaidAmount: {
    color: "#2563eb",
    fontWeight: "700",
  },
  personExpense: {
    alignItems: "flex-end",
    gap: 4,
  },
  personExpenseLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  personExpenseValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  breakdownSection: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyBreakdownText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 12,
  },
  breakdownInfo: {
    flex: 1,
    gap: 4,
    flexDirection: "row",
  },
  breakdownName: {
    color: "#1f2937",
    fontSize: 13,
  },
  breakdownBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  breakdownBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3462F2",
  },
  breakdownAmount: {
    fontWeight: "700",
    color: "#0f172a",
  },
  breakdownAmountNegative: {
    color: "#ef4444",
  },
  transferSection: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    gap: 6,
  },
  transferHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transferText: {
    fontSize: 12,
    color: "#475569",
  },
  transferTextPositive: {
    color: "#16a34a",
  },
  transferTextNegative: {
    color: "#ef4444",
  },
  transferTextNeutral: {
    color: "#475569",
  },
  settlementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f1f5f9",
  },
  settlementNames: {
    color: "#0f172a",
    fontWeight: "600",
  },
  settlementAmount: {
    color: "#2563eb",
    fontWeight: "700",
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  expenseInfo: {
    flex: 1,
    gap: 4,
  },
  expenseName: {
    color: "#0f172a",
    fontWeight: "600",
  },
  expenseMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  expenseAmount: {
    color: "#0f172a",
    fontWeight: "700",
  },
  paymentList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  paymentIconBank: {
    backgroundColor: "#dbeafe",
  },
  paymentIconWallet: {
    backgroundColor: "#ede9fe",
  },
  paymentDetails: {
    flex: 1,
    gap: 2,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  paymentOwner: {
    fontSize: 13,
    color: "#475569",
  },
  paymentMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  paymentFallback: {
    gap: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  paymentFallbackTitle: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 13,
  },
  paymentFallbackText: {
    color: "#475569",
    fontSize: 12,
  },
  paymentFallbackHint: {
    color: "#64748b",
    fontSize: 11,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
  positive: {
    color: "#15803d",
  },
  negative: {
    color: "#b91c1c",
  },
  neutral: {
    color: "#475569",
  },
  participantCountBadge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#f6fafb",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  downloadButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  downloadButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
