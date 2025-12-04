import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Poppins } from "@/constants/fonts";
import { useSplitBill } from "@/context/split-bill-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import type {
  BankPaymentMethod,
  EWalletPaymentMethod,
  PaymentMethod,
} from "@/lib/split-bill/types";
import { hexToRgba } from "@/lib/utils/colors";

const bankSuggestions = [
  "BCA",
  "Mandiri",
  "BNI",
  "BRI",
  "CIMB Niaga",
  "Permata",
  "Danamon",
];

const ewalletSuggestions = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "Sakuku",
];

type MethodType =
  | BankPaymentMethod["category"]
  | EWalletPaymentMethod["category"];

function sanitizeNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function isBankMethod(method: PaymentMethod): method is BankPaymentMethod {
  return method.category === "bank_transfer";
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const {
    paymentMethods,
    selectedPaymentMethodIds,
    addPaymentMethod,
    removePaymentMethod,
    togglePaymentMethodSelection,
  } = useSplitBill();

  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const error = useThemeColor({}, "error");
  const icon = useThemeColor({}, "icon");
  const success = useThemeColor({}, "success");
  const primaryDark = useThemeColor({}, "primaryDark");

  const [methodType, setMethodType] = useState<MethodType>("bank_transfer");
  const [ownerName, setOwnerName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [walletProvider, setWalletProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [showWalletSuggestions, setShowWalletSuggestions] = useState(false);

  const sortedMethods = useMemo(
    () => paymentMethods.slice().sort((a, b) => b.createdAt - a.createdAt),
    [paymentMethods]
  );

  const selectedSet = useMemo(
    () => new Set(selectedPaymentMethodIds),
    [selectedPaymentMethodIds]
  );

  const resetForm = () => {
    setOwnerName("");
    setBankName("");
    setAccountNumber("");
    setWalletProvider("");
    setPhoneNumber("");
    setErrorMessage(null);
    setShowBankSuggestions(false);
    setShowWalletSuggestions(false);
  };

  const handleSwitchMethod = (type: MethodType) => {
    setMethodType(type);
    setShowBankSuggestions(false);
    setShowWalletSuggestions(false);
  };

  const handleAdd = () => {
    setErrorMessage(null);

    if (!methodType) {
      setErrorMessage("Pilih jenis metode pembayaran");
      return;
    }

    const owner = ownerName.trim();
    if (!owner) {
      setErrorMessage("Nama pemilik wajib diisi");
      return;
    }

    if (methodType === "bank_transfer") {
      const bank = bankName.trim();
      const account = accountNumber.trim();

      if (!bank) {
        setErrorMessage("Nama bank wajib diisi");
        return;
      }

      if (!account) {
        setErrorMessage("Nomor rekening wajib diisi");
        return;
      }

      addPaymentMethod({
        category: "bank_transfer",
        provider: bank,
        ownerName: owner,
        bankName: bank,
        accountNumber: account,
      });
    } else {
      const provider = walletProvider.trim();
      const phone = phoneNumber.trim();

      if (!provider) {
        setErrorMessage("Nama e-wallet wajib diisi");
        return;
      }

      if (!phone) {
        setErrorMessage("Nomor telepon wajib diisi");
        return;
      }

      addPaymentMethod({
        category: "ewallet",
        provider,
        ownerName: owner,
        phoneNumber: phone,
      });
    }

    resetForm();
  };

  const handleRemove = (
    event: GestureResponderEvent,
    paymentMethodId: string
  ) => {
    event.stopPropagation();
    removePaymentMethod(paymentMethodId);
  };

  const handleSelect = (paymentMethodId: string) => {
    togglePaymentMethodSelection(paymentMethodId);
  };

  const methodCountLabel = selectedPaymentMethodIds.length;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.hero, { backgroundColor: hexToRgba(tint, 0.05) }]}>
          <View
            style={[styles.heroIcon, { backgroundColor: hexToRgba(tint, 0.2) }]}
          >
            <MaterialIcons name="wallet" size={26} color={tint} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: text }]}>
              Kelola Metode Pembayaran
            </Text>
            <Text style={[styles.heroSubtitle, { color: text, opacity: 0.6 }]}>
              Simpan detail pembayaran favoritmu dan pilih untuk dibagikan ke
              teman.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <View
            style={[
              styles.methodSwitch,
              { backgroundColor: hexToRgba(text, 0.02) },
            ]}
          >
            <Pressable
              style={[
                styles.methodChip,
                methodType === "bank_transfer" && [
                  styles.methodChipActive,
                  { backgroundColor: card },
                ],
              ]}
              onPress={() => handleSwitchMethod("bank_transfer")}
            >
              <MaterialCommunityIcons
                name="bank"
                size={16}
                color={methodType === "bank_transfer" ? tint : textSecondary}
              />
              <Text
                style={[
                  styles.methodChipText,
                  { color: textSecondary },
                  methodType === "bank_transfer" && [
                    styles.methodChipTextActive,
                    { color: text },
                  ],
                ]}
              >
                Bank Transfer
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.methodChip,
                methodType === "ewallet" && [
                  styles.methodChipActive,
                  { backgroundColor: card },
                ],
              ]}
              onPress={() => handleSwitchMethod("ewallet")}
            >
              <MaterialCommunityIcons
                name="cellphone"
                size={16}
                color={methodType === "ewallet" ? tint : textSecondary}
              />
              <Text
                style={[
                  styles.methodChipText,
                  { color: textSecondary },
                  methodType === "ewallet" && [
                    styles.methodChipTextActive,
                    { color: text },
                  ],
                ]}
              >
                e-Wallet
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, { color: error }]}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: textSecondary }]}>
              Nama pemilik
            </Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              style={[
                styles.input,
                { borderColor: hexToRgba(text, 0.1), backgroundColor: card },
              ]}
              placeholder="Contoh: Agung Nugraha"
              placeholderTextColor={icon}
            />
          </View>

          {methodType === "bank_transfer" ? (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Nama bank
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  style={[
                    styles.input,
                    {
                      borderColor: hexToRgba(text, 0.1),
                      backgroundColor: card,
                    },
                  ]}
                  placeholder="Contoh: BCA"
                  placeholderTextColor={icon}
                  onFocus={() => setShowBankSuggestions(true)}
                />
                {showBankSuggestions ? (
                  <View style={styles.suggestionRow}>
                    {bankSuggestions.map((bank) => {
                      const active =
                        bankName.toLowerCase() === bank.toLowerCase();
                      return (
                        <Pressable
                          key={bank}
                          style={[
                            styles.suggestionChip,
                            {
                              borderColor: hexToRgba(text, 0.1),
                              backgroundColor: card,
                            },
                            active && [
                              styles.suggestionChipActive,
                              {
                                backgroundColor: hexToRgba(tint, 0.1),
                                borderColor: tint,
                              },
                            ],
                          ]}
                          onPress={() => setBankName(bank)}
                        >
                          <Text
                            style={[
                              styles.suggestionText,
                              { color: textSecondary },
                              active && [
                                styles.suggestionTextActive,
                                { color: primaryDark },
                              ],
                            ]}
                          >
                            {bank}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Nomor rekening
                </Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={(value) =>
                    setAccountNumber(sanitizeNumber(value))
                  }
                  style={[
                    styles.input,
                    {
                      borderColor: hexToRgba(text, 0.1),
                      backgroundColor: card,
                    },
                  ]}
                  placeholder="Contoh: 1234567890"
                  placeholderTextColor={icon}
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Nama e-wallet
                </Text>
                <TextInput
                  value={walletProvider}
                  onChangeText={setWalletProvider}
                  style={[
                    styles.input,
                    {
                      borderColor: hexToRgba(text, 0.1),
                      backgroundColor: card,
                    },
                  ]}
                  placeholder="Contoh: GoPay"
                  placeholderTextColor={icon}
                  onFocus={() => setShowWalletSuggestions(true)}
                />
                {showWalletSuggestions ? (
                  <View style={styles.suggestionRow}>
                    {ewalletSuggestions.map((wallet) => {
                      const active =
                        walletProvider.toLowerCase() === wallet.toLowerCase();
                      return (
                        <Pressable
                          key={wallet}
                          style={[
                            styles.suggestionChip,
                            {
                              borderColor: hexToRgba(text, 0.1),
                              backgroundColor: card,
                            },
                            active && [
                              styles.suggestionChipActive,
                              {
                                backgroundColor: hexToRgba(tint, 0.1),
                                borderColor: tint,
                              },
                            ],
                          ]}
                          onPress={() => setWalletProvider(wallet)}
                        >
                          <Text
                            style={[
                              styles.suggestionText,
                              { color: textSecondary },
                              active && [
                                styles.suggestionTextActive,
                                { color: primaryDark },
                              ],
                            ]}
                          >
                            {wallet}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Nomor telepon
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={(value) =>
                    setPhoneNumber(sanitizeNumber(value))
                  }
                  style={[
                    styles.input,
                    {
                      borderColor: hexToRgba(text, 0.1),
                      backgroundColor: card,
                    },
                  ]}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor={icon}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <Pressable
            style={[styles.saveButton, { backgroundColor: tint }]}
            onPress={handleAdd}
          >
            <Text style={[styles.saveButtonText, { color: card }]}>Simpan</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.sectionTitle, { color: text }]}>
              Metode tersimpan
            </Text>
            <Text style={[styles.sectionBadge, { color: tint }]}>
              {methodCountLabel} dipilih
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Tap kartu untuk pilih. Metode terpilih akan tampil di Ringkasan.
          </Text>

          {sortedMethods.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: hexToRgba(text, 0.02) },
              ]}
            >
              <Image
                source={require("@/assets/images/splitbill-empty-state.png")}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={[styles.emptyTitle, { color: text }]}>
                Belum ada metode pembayaran
              </Text>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Tambah lalu pilih yang kamu pakai untuk split bill.
              </Text>
            </View>
          ) : (
            <View style={styles.methodList}>
              {sortedMethods.map((method) => {
                const selected = selectedSet.has(method.id);
                const isBank = isBankMethod(method);
                return (
                  <Pressable
                    key={method.id}
                    style={[
                      styles.methodCard,
                      {
                        borderColor: hexToRgba(text, 0.1),
                        backgroundColor: card,
                      },
                      selected && [
                        styles.methodCardSelected,
                        {
                          borderColor: tint,
                          backgroundColor: hexToRgba(tint, 0.1),
                        },
                      ],
                    ]}
                    onPress={() => handleSelect(method.id)}
                  >
                    <View style={styles.methodCardHeader}>
                      <View
                        style={[
                          styles.methodIcon,
                          isBank
                            ? [
                                styles.methodIconBank,
                                { backgroundColor: hexToRgba(tint, 0.12) },
                              ]
                            : [
                                styles.methodIconWallet,
                                { backgroundColor: hexToRgba(tint, 0.12) },
                              ],
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isBank ? "bank" : "cellphone"}
                          size={18}
                          color={isBank ? primaryDark : tint}
                        />
                      </View>
                      <View style={styles.methodContent}>
                        <Text style={[styles.methodTitle, { color: text }]}>
                          {method.provider}
                        </Text>
                        <Text
                          style={[styles.methodOwner, { color: textSecondary }]}
                        >
                          {method.ownerName}
                        </Text>
                        <Text
                          style={[styles.methodMeta, { color: textSecondary }]}
                        >
                          {isBank
                            ? `Rek: ${method.accountNumber}`
                            : `No HP: ${method.phoneNumber}`}
                        </Text>
                      </View>
                      {selected ? (
                        <MaterialIcons
                          name="check-circle"
                          size={22}
                          color={success}
                        />
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.removeButton}
                      onPress={(event) => handleRemove(event, method.id)}
                    >
                      <MaterialIcons name="delete" size={18} color={error} />
                      <Text style={[styles.removeButtonText, { color: error }]}>
                        Hapus
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.backButton,
            {
              borderColor: hexToRgba(tint, 0.2),
              backgroundColor: hexToRgba(tint, 0.1),
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: tint }]}>Kembali</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 8,
    gap: 16,
  },
  hero: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    opacity: 0.6,
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  card: {
    borderRadius: 14,
    padding: 18,
    gap: 16,
  },
  methodSwitch: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 12,
  },
  methodChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 11,
  },
  methodChipActive: {
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
      },
      default: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
    elevation: Platform.OS === "android" ? 2 : 0,
  },
  methodChipText: {
    fontFamily: Poppins.medium,
  },
  methodChipTextActive: {},
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: Poppins.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  suggestionChipActive: {},
  suggestionText: {
    fontFamily: Poppins.medium,
    fontSize: 12,
  },
  suggestionTextActive: {},
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: Poppins.semibold,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  sectionBadge: {
    fontFamily: Poppins.medium,
    fontSize: 13,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  emptyState: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontFamily: Poppins.semibold,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: Poppins.regular,
    fontSize: 13,
    textAlign: "center",
  },
  methodList: {
    gap: 12,
  },
  methodCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  methodCardSelected: {},
  methodCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconBank: {},
  methodIconWallet: {},
  methodContent: {
    flex: 1,
    gap: 2,
  },
  methodTitle: {
    fontFamily: Poppins.semibold,
    fontSize: 15,
  },
  methodOwner: {
    fontFamily: Poppins.medium,
    fontSize: 13,
  },
  methodMeta: {
    fontFamily: Poppins.regular,
    fontSize: 12,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  removeButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 13,
  },
  errorText: {
    fontFamily: Poppins.medium,
  },
  backButton: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    justifyContent: "center",
  },
  backButtonText: {
    fontFamily: Poppins.semibold,
    fontSize: 16,
  },
});
