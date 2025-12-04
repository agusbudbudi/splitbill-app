import { getAvatarColor } from "@/lib/utils/colors";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Poppins } from "@/constants/fonts";
import { useAuth } from "@/context/auth-context";
import { useSnackbar } from "@/context/snackbar-context";
import { useSplitBill } from "@/context/split-bill-context";
import { createSplitBillRecord } from "@/lib/split-bill/api";
import { formatCurrency } from "@/lib/split-bill/format";
import type {
  CreateSplitBillPayload,
  PaymentMethod,
  SplitBillRecord,
} from "@/lib/split-bill/types";

export default function SummaryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { showSnackbar } = useSnackbar();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Ringkasan",
      headerStyle: { backgroundColor: "#3462F2", borderBottomWidth: 0 },
      headerTintColor: "#ffffff",
      headerTitleStyle: { color: "#ffffff", fontFamily: Poppins.bold },
      headerBackTitleStyle: { color: "#ffffff" },
    });
  }, [navigation]);
  const {
    activityName,
    participants,
    expenses,
    additionalExpenses,
    paymentMethods,
    selectedPaymentMethodIds,
    summary,
    resetAll,
  } = useSplitBill();
  const { isAuthenticated } = useAuth();

  const hasData =
    participants.length > 0 &&
    (expenses.length > 0 || additionalExpenses.length > 0);
  const additionalCount = additionalExpenses.length;
  const selectedPaymentMethods = selectedPaymentMethodIds
    .map((id) => paymentMethods.find((method) => method.id === id))
    .filter((method): method is PaymentMethod => Boolean(method));
  const hasPaymentSelection = selectedPaymentMethods.length > 0;

  const [isSaving, setIsSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<SplitBillRecord | null>(null);
  const [showPostSaveButtons, setShowPostSaveButtons] = useState(false);
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);

  const getName = (id: string) =>
    participants.find((person) => person.id === id)?.name ?? "Tidak diketahui";

  const involvedParticipants = summary.perParticipant.filter(
    (item) => item.paid !== 0 || item.owed !== 0 || Math.abs(item.balance) > 0
  );

  const handleShareWhatsApp = () => {
    if (!hasData) {
      return;
    }

    const dateFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const today = dateFormatter.format(new Date());

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

    const additionalItemsText = additionalExpenses
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

Hai guys! Ini bill untuk ${activityName?.trim() || "Tanpa Nama Aktivitas"}
📅 Tanggal: ${today}

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

  const handleSaveSplitBill = async () => {
    if (!hasData || isSaving || savedRecord) {
      return;
    }

    if (!isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateSplitBillPayload = {
        activityName: activityName?.trim() || "Tanpa Nama Aktivitas",
        occurredAt: new Date().toISOString(),
        participants,
        expenses: expenses.map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          paidBy: expense.paidBy,
          participants: expense.participants,
          createdAt: expense.createdAt,
        })),
        additionalExpenses: additionalExpenses.map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          paidBy: expense.paidBy,
          participants: expense.participants,
          createdAt: expense.createdAt,
        })),
        paymentMethodIds: selectedPaymentMethodIds,
        // Snapshot of selected payment methods at save time to ensure detail page can render
        paymentMethodSnapshots: selectedPaymentMethods.map((method) => ({
          id: method.id,
          category: method.category,
          provider: method.provider,
          ownerName: method.ownerName,
          accountNumber:
            method.category === "bank_transfer"
              ? method.accountNumber
              : undefined,
          phoneNumber:
            method.category === "ewallet" ? method.phoneNumber : undefined,
        })),
        summary,
      };

      const record = await createSplitBillRecord(payload);
      setSavedRecord(record);
      showSnackbar({
        message: "Data split bill sudah tersimpan.",
        type: "success",
      });
      setShowPostSaveButtons(true);
      setShowFeedbackCard(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan split bill.";
      showSnackbar({ message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/splitbill-summary-hero.png")}
            style={styles.heroIcon}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              {activityName || "Ringkasan Split Bill"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {involvedParticipants.length} teman • {expenses.length}{" "}
              pengeluaran
              {additionalCount > 0 ? ` • ${additionalCount} tambahan` : ""} •
              Total {formatCurrency(summary.total)}
            </Text>
          </View>
        </View>

        {hasData ? (
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
        ) : null}

        {!hasData ? (
          <View style={styles.emptyState}>
            <Image
              source={require("@/assets/images/splitbill-empty-state.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Belum ada data</Text>
            <Text style={styles.emptyText}>
              Tambahkan teman dan catat pengeluaran dulu ya.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.replace("/expenses")}
            >
              <Text style={styles.emptyButtonText}>Tambah data sekarang</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Ringkasan per Orang</Text>
              </View>
              {involvedParticipants.map((item) => {
                const participantId = item.participantId;
                const name = getName(participantId);
                const status =
                  item.balance > 0
                    ? "Menagih"
                    : item.balance < 0
                    ? "Membayar"
                    : "Lunas";

                const settlementsToPay = summary.settlements.filter(
                  (settlement) => settlement.from === participantId
                );
                const settlementsToReceive = summary.settlements.filter(
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
                            { backgroundColor: getAvatarColor(participantId) },
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
                          const isAdditional = owedItem.type === "additional";
                          const amountDisplay =
                            owedItem.amount < 0
                              ? `- ${formatCurrency(Math.abs(owedItem.amount))}`
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
                                    <Text style={styles.breakdownBadgeText}>
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
                      <View style={styles.transferBody}>
                        {transferMessages.map((message) => (
                          <Text
                            key={message.key}
                            style={[
                              styles.transferText,
                              message.variant === "receive"
                                ? styles.transferTextPositive
                                : message.variant === "pay"
                                ? styles.transferTextNegative
                                : styles.transferTextNeutral,
                            ]}
                          >
                            {message.text}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Saran Pelunasan</Text>
              </View>
              {summary.settlements.length === 0 ? (
                <View style={styles.emptyMini}>
                  <Text style={styles.emptyText}>
                    Semua saldo sudah seimbang 🎉
                  </Text>
                </View>
              ) : (
                summary.settlements.map((settlement, index) => (
                  <View
                    key={`${settlement.from}-${settlement.to}-${index}`}
                    style={styles.settlementRow}
                  >
                    <View style={styles.settlementNames}>
                      <Text style={styles.settlementFrom}>
                        {getName(settlement.from)}
                      </Text>

                      <MaterialIcons
                        name="arrow-forward"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text style={styles.settlementTo}>
                        {getName(settlement.to)}
                      </Text>
                    </View>
                    <Text style={styles.settlementAmount}>
                      {formatCurrency(settlement.amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Metode Pembayaran</Text>
                {hasPaymentSelection ? (
                  <View style={styles.paymentCountBadge}>
                    <Text style={styles.paymentCountText}>
                      {selectedPaymentMethods.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              {hasPaymentSelection ? (
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
                          size={18}
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
                </View>
              ) : (
                <View style={styles.emptyMini}>
                  <Text style={styles.emptyText}>
                    Belum ada metode pembayaran yang dipilih.
                  </Text>
                </View>
              )}

              <Pressable
                style={styles.managePaymentButton}
                onPress={() => router.push("/payment-methods")}
              >
                <Text style={styles.managePaymentButtonText}>
                  {hasPaymentSelection
                    ? "Kelola Metode Pembayaran"
                    : "Tambah Metode"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.card, styles.deleteCardClickable]}
              onPress={() => {
                resetAll();
                router.replace("/");
              }}
            >
              <View style={styles.deleteRow}>
                <View style={[styles.deleteIcon, styles.deleteIconDanger]}>
                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color="#ef4444"
                  />
                </View>
                <View style={styles.deleteTextBlock}>
                  <Text style={styles.deleteTitle}>Hapus Data</Text>
                  <Text style={styles.deleteSubtitle}>
                    Ketuk untuk menghapus detail draft split bill
                  </Text>
                </View>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
      {showFeedbackCard && (
        <View style={styles.floatingCardContainer}>
          <Pressable
            style={styles.feedbackCard}
            onPress={() => {
              router.push("/review");
              setShowFeedbackCard(false);
            }}
          >
            <View style={styles.feedbackIcon}>
              <MaterialCommunityIcons
                name="message-star"
                size={24}
                color="#ffffff"
              />
            </View>
            <View style={styles.feedbackTextContainer}>
              <Text style={styles.feedbackTitle}>Suka dengan aplikasinya?</Text>
              <Text style={styles.feedbackSubtitle}>
                Beri ulasan dan masukanmu disini
              </Text>
            </View>
            <Pressable
              style={styles.feedbackCloseButton}
              onPress={() => setShowFeedbackCard(false)}
            >
              <MaterialCommunityIcons name="close" size={20} color="#f5f3ff" />
            </Pressable>
          </Pressable>
        </View>
      )}
      <View style={styles.footer}>
        {!showPostSaveButtons ? (
          <Pressable
            style={[
              styles.saveButton,
              (!hasData || Boolean(savedRecord) || isSaving) &&
                styles.saveButtonDisabled,
            ]}
            disabled={!hasData || Boolean(savedRecord) || isSaving}
            onPress={handleSaveSplitBill}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <MaterialCommunityIcons
                name="content-save"
                size={18}
                color="#ffffff"
              />
            )}
            <Text style={styles.saveButtonText}>
              {savedRecord ? "Tersimpan" : isSaving ? "Menyimpan..." : "Simpan"}
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={styles.homeButton}
              onPress={() => {
                resetAll();
                router.replace("/");
              }}
            >
              <MaterialCommunityIcons name="home" size={18} color="#2563eb" />
              <Text style={styles.homeButtonText}>Home</Text>
            </Pressable>
            <Pressable
              style={styles.viewHistoryButton}
              onPress={() => {
                resetAll();
                router.replace("/transactions");
              }}
            >
              <MaterialCommunityIcons
                name="history"
                size={18}
                color="#3462F2"
              />
              <Text style={styles.viewHistoryButtonText}>Lihat Riwayat</Text>
            </Pressable>
          </>
        )}
      </View>
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
    gap: 12,
    paddingTop: 100,
    zIndex: 1,
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
    width: 54,
    height: 54,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.bold,
  },
  heroSubtitle: {
    color: "#bfdbfe",
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    position: "relative",
    zIndex: 100,
  },
  shareCard: {
    backgroundColor: "rgba(224, 242, 254, 1.00)",
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
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  shareSubtitle: {
    fontSize: 12,
    color: "#475569",
    fontFamily: Poppins.regular,
  },
  deleteCardClickable: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  deleteIconDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  deleteTextBlock: {
    flex: 1,
    gap: 4,
  },
  deleteTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
    color: "#0f172a",
  },
  deleteSubtitle: {
    fontSize: 12,
    color: "#475569",
    fontFamily: Poppins.regular,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-start",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Poppins.bold,
    color: "#0f172a",
  },

  paymentCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ede9fe",
    alignItems: "center",
  },
  paymentCountText: {
    color: "#3462F2",
    fontSize: 12,
    fontFamily: Poppins.semibold,
  },
  shareInfoContent: {
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  shareInfoImage: {
    width: 160,
    height: 12.0,
  },
  shareInfoTextWrapper: {
    width: "100%",
    gap: 6,
    alignItems: "center",
  },
  shareInfoTitle: {
    fontSize: 16,
    fontFamily: Poppins.bold,
    color: "#0f172a",
  },
  shareInfoText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    textAlign: "center",
    fontFamily: Poppins.regular,
  },
  shareActionRow: {
    flexDirection: "column",
    gap: 12,
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
    fontSize: 14,
    fontFamily: Poppins.semibold,
  },
  personInfo: {
    flex: 1,
    gap: 6,
  },
  personName: {
    fontSize: 16,
    color: "#0f172a",
    fontFamily: Poppins.bold,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Poppins.regular,
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
    fontFamily: Poppins.regular,
  },
  personPaidAmount: {
    color: "#2563eb",
    fontFamily: Poppins.bold,
  },
  personExpense: {
    alignItems: "flex-end",
    gap: 4,
  },
  personExpenseLabel: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: Poppins.regular,
  },
  personExpenseValue: {
    color: "#0f172a",
    fontSize: 18,
    fontFamily: Poppins.bold,
  },
  breakdownSection: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: "#0f172a",
    fontFamily: Poppins.bold,
  },
  emptyBreakdownText: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: Poppins.regular,
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
    fontFamily: Poppins.regular,
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
    color: "#3462F2",
    fontFamily: Poppins.regular,
  },
  breakdownAmount: {
    fontFamily: Poppins.semibold,
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
  transferBody: {
    alignItems: "flex-start",
    gap: 4,
  },
  transferText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: Poppins.regular,
  },
  transferTextPositive: {
    color: "#16a34a",
    fontFamily: Poppins.regular,
  },
  transferTextNegative: {
    color: "#ef4444",
    fontFamily: Poppins.regular,
  },
  transferTextNeutral: {
    color: "#475569",
    fontFamily: Poppins.regular,
  },
  paymentList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    backgroundColor: "#ffffff",
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconBank: {
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  paymentIconWallet: {
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  paymentDetails: {
    flex: 1,
    gap: 2,
  },
  paymentName: {
    fontSize: 14,
    color: "#0f172a",
    fontFamily: Poppins.bold,
  },
  paymentOwner: {
    fontSize: 13,
    color: "#475569",
    fontFamily: Poppins.semibold,
  },
  paymentMeta: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: Poppins.regular,
  },
  managePaymentButton: {
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
    backgroundColor: "#f5f3ff",
  },
  managePaymentButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  settlementRow: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settlementNames: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settlementFrom: {
    color: "#ef4444",
    fontFamily: Poppins.semibold,
  },
  settlementTo: {
    color: "#22c55e",
    fontFamily: Poppins.semibold,
  },
  settlementAmount: {
    color: "#0f172a",
    fontFamily: Poppins.bold,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    fontFamily: Poppins.regular,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  emptyButtonText: {
    color: "#2563eb",
    fontFamily: Poppins.medium,
  },
  emptyMini: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  floatingCardContainer: {
    position: "absolute",
    bottom: 130,
    left: 16,
    right: 16,
    zIndex: 200,
  },
  feedbackCard: {
    backgroundColor: "#3462F2",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackTextContainer: {
    flex: 1,
    gap: 4,
  },
  feedbackTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  feedbackSubtitle: {
    color: "#ede9fe",
    fontSize: 12,
    fontFamily: Poppins.regular,
  },
  feedbackCloseButton: {
    padding: 4,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#f6fafb",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  homeButton: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  homeButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  viewHistoryButton: {
    borderWidth: 1,
    borderColor: "#ede9fe",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f3ff",
  },
  viewHistoryButtonText: {
    color: "#3462F2",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  shareButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#22c55e",
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: "center",
  },
  shareButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  shareButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#3462F2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#cbd5f5",
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
  positive: {
    color: "#22c55e",
    fontFamily: Poppins.semibold,
  },
  negative: {
    color: "#ef4444",
    fontFamily: Poppins.semibold,
  },
  neutral: {
    color: "#64748b",
    fontFamily: Poppins.semibold,
  },
});
