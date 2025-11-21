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
import type {
  BankPaymentMethod,
  EWalletPaymentMethod,
  PaymentMethod,
} from "@/lib/split-bill/types";

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
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="wallet" size={26} color="#2563eb" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Kelola Metode Pembayaran</Text>
            <Text style={styles.heroSubtitle}>
              Simpan detail pembayaran favoritmu dan pilih untuk dibagikan ke
              teman.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.methodSwitch}>
            <Pressable
              style={[
                styles.methodChip,
                methodType === "bank_transfer" && styles.methodChipActive,
              ]}
              onPress={() => handleSwitchMethod("bank_transfer")}
            >
              <MaterialCommunityIcons
                name="bank"
                size={16}
                color={methodType === "bank_transfer" ? "#7056ec" : "#64748b"}
              />
              <Text
                style={[
                  styles.methodChipText,
                  methodType === "bank_transfer" && styles.methodChipTextActive,
                ]}
              >
                Bank Transfer
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.methodChip,
                methodType === "ewallet" && styles.methodChipActive,
              ]}
              onPress={() => handleSwitchMethod("ewallet")}
            >
              <MaterialCommunityIcons
                name="cellphone"
                size={16}
                color={methodType === "ewallet" ? "#7056ec" : "#64748b"}
              />
              <Text
                style={[
                  styles.methodChipText,
                  methodType === "ewallet" && styles.methodChipTextActive,
                ]}
              >
                e-Wallet
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nama pemilik</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              style={styles.input}
              placeholder="Contoh: Agung Nugraha"
              placeholderTextColor="#687076"
            />
          </View>

          {methodType === "bank_transfer" ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Nama bank</Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  style={styles.input}
                  placeholder="Contoh: BCA"
                  placeholderTextColor="#687076"
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
                            active && styles.suggestionChipActive,
                          ]}
                          onPress={() => setBankName(bank)}
                        >
                          <Text
                            style={[
                              styles.suggestionText,
                              active && styles.suggestionTextActive,
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
                <Text style={styles.label}>Nomor rekening</Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={(value) =>
                    setAccountNumber(sanitizeNumber(value))
                  }
                  style={styles.input}
                  placeholder="Contoh: 1234567890"
                  placeholderTextColor="#687076"
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Nama e-wallet</Text>
                <TextInput
                  value={walletProvider}
                  onChangeText={setWalletProvider}
                  style={styles.input}
                  placeholder="Contoh: GoPay"
                  placeholderTextColor="#687076"
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
                            active && styles.suggestionChipActive,
                          ]}
                          onPress={() => setWalletProvider(wallet)}
                        >
                          <Text
                            style={[
                              styles.suggestionText,
                              active && styles.suggestionTextActive,
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
                <Text style={styles.label}>Nomor telepon</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={(value) =>
                    setPhoneNumber(sanitizeNumber(value))
                  }
                  style={styles.input}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor="#687076"
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <Pressable style={styles.saveButton} onPress={handleAdd}>
            <Text style={styles.saveButtonText}>Simpan</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>Metode tersimpan</Text>
            <Text style={styles.sectionBadge}>{methodCountLabel} dipilih</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Tap kartu untuk pilih . Metode terpilih akan tampil di Ringkasan.
          </Text>

          {sortedMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Image
                source={require("@/assets/images/splitbill-empty-state.png")}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>Belum ada metode pembayaran</Text>
              <Text style={styles.emptyText}>
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
                      selected && styles.methodCardSelected,
                    ]}
                    onPress={() => handleSelect(method.id)}
                  >
                    <View style={styles.methodCardHeader}>
                      <View
                        style={[
                          styles.methodIcon,
                          isBank
                            ? styles.methodIconBank
                            : styles.methodIconWallet,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isBank ? "bank" : "cellphone"}
                          size={18}
                          color={isBank ? "#1d4ed8" : "#7c3aed"}
                        />
                      </View>
                      <View style={styles.methodContent}>
                        <Text style={styles.methodTitle}>
                          {method.provider}
                        </Text>
                        <Text style={styles.methodOwner}>
                          {method.ownerName}
                        </Text>
                        <Text style={styles.methodMeta}>
                          {isBank
                            ? `Rek: ${method.accountNumber}`
                            : `No HP: ${method.phoneNumber}`}
                        </Text>
                      </View>
                      {selected ? (
                        <MaterialIcons
                          name="check-circle"
                          size={22}
                          color="#22c55e"
                        />
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.removeButton}
                      onPress={(event) => handleRemove(event, method.id)}
                    >
                      <MaterialIcons name="delete" size={18} color="#ef4444" />
                      <Text style={styles.removeButtonText}>Hapus</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </Pressable>
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
    padding: 8,
    gap: 16,
    // paddingBottom: 32,
  },
  hero: {
    backgroundColor: "rgba(224, 242, 254, 1.00)",
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
    backgroundColor: "rgba(219, 233, 254, 1.00)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontFamily: Poppins.semibold,
  },
  heroSubtitle: {
    color: "#0f172a",
    opacity: 0.6,
    fontSize: 14,
    fontFamily: Poppins.regular,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    gap: 16,
  },
  methodSwitch: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f1f5f9",
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
    backgroundColor: "#ffffff",
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
    color: "#64748b",
  },
  methodChipTextActive: {
    color: "#0f172a",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#475569",
    fontFamily: Poppins.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
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
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  suggestionChipActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#7056ec",
  },
  suggestionText: {
    fontFamily: Poppins.medium,
    color: "#475569",
    fontSize: 12,
  },
  suggestionTextActive: {
    color: "#4c1d95",
  },
  saveButton: {
    backgroundColor: "#7056ec",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: Poppins.semibold,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    color: "#0f172a",
    fontFamily: Poppins.semibold,
  },
  sectionBadge: {
    fontFamily: Poppins.medium,
    color: "#7056ec",
    fontSize: 13,
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 13,
    fontFamily: Poppins.regular,
  },
  emptyState: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
  },
  emptyImage: {
    width: 100,
    height: 100,
  },
  emptyTitle: {
    fontFamily: Poppins.semibold,
    color: "#0f172a",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: Poppins.regular,
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  methodList: {
    gap: 12,
  },
  methodCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    backgroundColor: "#ffffff",
  },
  methodCardSelected: {
    borderColor: "#7056ec",
    backgroundColor: "#ede9fe",
  },
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
  methodIconBank: {
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  methodIconWallet: {
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  methodContent: {
    flex: 1,
    gap: 2,
  },
  methodTitle: {
    fontFamily: Poppins.semibold,
    color: "#0f172a",
    fontSize: 15,
  },
  methodOwner: {
    fontFamily: Poppins.medium,
    color: "#475569",
    fontSize: 13,
  },
  methodMeta: {
    fontFamily: Poppins.regular,
    color: "#64748b",
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
    color: "#ef4444",
    fontSize: 13,
  },
  errorText: {
    color: "#ef4444",
    fontFamily: Poppins.medium,
  },
  backButton: {
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
  backButtonText: {
    fontFamily: Poppins.semibold,
    color: "#2563eb",
    fontSize: 16,
  },
});
