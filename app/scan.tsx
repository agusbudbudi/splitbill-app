import CameraIcon from "@/components/ui/camera-icon";
import GalleryIcon from "@/components/ui/gallery-icon";
import { MaterialIcons } from "@expo/vector-icons";
import { readAsStringAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useSnackbar } from "@/context/snackbar-context";
import { useSplitBill } from "@/context/split-bill-context";
import { formatCurrency, parseCurrency } from "@/lib/split-bill/format";

type ScanItem = {
  name: string;
  quantity?: string | number;
  total: number;
  participants: string[]; // IDs of participants for this item
};

type ScannedAdditionalExpense = {
  title: string;
  amount: number;
  participants: string[]; // IDs of participants for this additional expense
};

const BASE_URL = "https://splitbillbe.netlify.app";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1] ?? "");
      } else {
        reject(new Error("Gagal membaca file."));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Gagal membaca file."));
    reader.readAsDataURL(blob);
  });
}

async function readAssetAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Tidak dapat membaca file yang diunggah.");
    }
    const blob = await response.blob();
    return blobToBase64(blob);
  }

  return readAsStringAsync(uri, { encoding: "base64" });
}

export default function ScanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Scan Bill",
      headerStyle: { backgroundColor: "#3462F2", borderBottomWidth: 0 },
      headerTintColor: "#ffffff",
      headerTitleStyle: { color: "#ffffff" },
      headerBackTitleStyle: { color: "#ffffff" },
    });
  }, [navigation]);
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const {
    participants: allParticipants,
    selectedParticipantIds,
    addExpense,
    updateActivityName,
    addAdditionalExpense,
  } = useSplitBill();

  // Filter participants based on selection
  const participants = useMemo(() => {
    if (selectedParticipantIds.length === 0) return allParticipants;
    return allParticipants.filter((p) => selectedParticipantIds.includes(p.id));
  }, [allParticipants, selectedParticipantIds]);

  const [permissionChecked, setPermissionChecked] = useState(false);
  const [cameraPermissionChecked, setCameraPermissionChecked] = useState(false);
  const [selectedAsset, setSelectedAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [isScanning, setIsScanning] = useState(false);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [scannedAdditionalExpenses, setScannedAdditionalExpenses] = useState<
    ScannedAdditionalExpense[]
  >([]);
  const [billDate, setBillDate] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setSelectedParticipants((current) =>
      current.filter((id) => participants.some((person) => person.id === id))
    );

    if (participants.length > 0 && !paidBy) {
      setPaidBy(participants[0].id);
    } else if (paidBy && !participants.some((person) => person.id === paidBy)) {
      setPaidBy(participants[0]?.id ?? null);
    }

    if (participants.length > 0 && selectedParticipants.length === 0) {
      setSelectedParticipants(participants.map((person) => person.id));
    }
  }, [participants, paidBy, selectedParticipants.length]);

  const hasParticipants = participants.length >= 2;

  const totalAmount = useMemo(() => {
    return scanItems.reduce((sum, item) => sum + item.total, 0);
  }, [scanItems]);

  const totalAdditionalExpenses = useMemo(() => {
    return scannedAdditionalExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
  }, [scannedAdditionalExpenses]);

  const grandTotal = useMemo(() => {
    return totalAmount + totalAdditionalExpenses;
  }, [totalAmount, totalAdditionalExpenses]);

  // Loading messages for scan process
  const loadingMessages = [
    "Chill dulu AI lagi baca bill kamu ☕",
    "Lanjut ngopi biar AI yang kerja 🤖",
    "AI lagi itung-itung nih... 🧮",
    "Bentar ya, lagi scan struk kamu 📄",
  ];

  // Rotate loading messages while scanning
  useEffect(() => {
    if (!isScanning) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [isScanning, loadingMessages.length]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPermissionChecked(true);
    if (status !== "granted") {
      showSnackbar({
        message: "Izin akses galeri dibutuhkan untuk mengunggah struk.",
        type: "error",
      });
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermissionChecked(true);
    if (status !== "granted") {
      showSnackbar({
        message: "Izin akses kamera dibutuhkan untuk mengambil foto.",
        type: "error",
      });
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    if (!permissionChecked) {
      const allowed = await requestPermission();
      if (!allowed) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setSelectedAsset(asset);
    setScanItems([]);
  };

  const handleTakePhoto = async () => {
    if (!cameraPermissionChecked) {
      const allowed = await requestCameraPermission();
      if (!allowed) return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setSelectedAsset(asset);
    setScanItems([]);
  };

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipants((current) => {
      if (current.includes(participantId)) {
        if (current.length === 1) return current; // minimal satu orang
        return current.filter((id) => id !== participantId);
      }
      return [...current, participantId];
    });
  };

  const handleToggleItemParticipant = (
    itemIndex: number,
    participantId: string
  ) => {
    setScanItems((currentItems) => {
      const updatedItems = [...currentItems];
      const item = updatedItems[itemIndex];

      if (item.participants.includes(participantId)) {
        // Allow removing all participants (validation happens on save)
        item.participants = item.participants.filter(
          (id) => id !== participantId
        );
      } else {
        item.participants = [...item.participants, participantId];
      }

      return updatedItems;
    });
  };

  const handleToggleAdditionalExpenseParticipant = (
    expenseIndex: number,
    participantId: string
  ) => {
    setScannedAdditionalExpenses((currentExpenses) => {
      const updatedExpenses = [...currentExpenses];
      const expense = updatedExpenses[expenseIndex];

      if (expense.participants.includes(participantId)) {
        // Allow removing all participants (validation happens on save)
        expense.participants = expense.participants.filter(
          (id) => id !== participantId
        );
      } else {
        expense.participants = [...expense.participants, participantId];
      }

      return updatedExpenses;
    });
  };

  const handleScan = async () => {
    if (!selectedAsset) {
      showSnackbar({
        message: "Pilih foto struk terlebih dahulu.",
        type: "error",
      });
      return;
    }

    if (!hasParticipants) {
      showSnackbar({
        message: "Tambahkan minimal dua teman dulu sebelum scan.",
        type: "error",
      });
      return;
    }

    setIsScanning(true);

    try {
      let base64 = selectedAsset.base64;
      if (!base64) {
        base64 = await readAssetAsBase64(selectedAsset.uri);
      }

      let mimeType = selectedAsset.mimeType;
      if (!mimeType) {
        const ext = selectedAsset.uri.split(".").pop()?.toLowerCase();
        if (ext === "png") mimeType = "image/png";
        else if (ext === "webp") mimeType = "image/webp";
        else if (ext === "heic") mimeType = "image/heic";
        else mimeType = "image/jpeg";
      }

      const response = await fetch(`${BASE_URL}/api/gemini-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mime_type: mimeType,
          base64Image: base64,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.message ?? "Gagal memproses scan.");
      }

      const data = await response.json();

      // Extract merchant name if available
      const scannedMerchantName = data.merchant_name
        ? String(data.merchant_name).trim()
        : null;

      // Extract date if available
      const scannedDate = data.date ? String(data.date).trim() : null;

      // Extract receipt number if available
      const scannedReceiptNumber = data.receipt_number
        ? String(data.receipt_number).trim()
        : null;

      const items = Array.isArray(data.items)
        ? data.items
            .map((item: Record<string, unknown>) => ({
              name: String(item.name ?? "Item tidak diketahui"),
              quantity: item.quantity ?? null,
              total: parseCurrency(String(item.total ?? "0")),
              participants: [], // Initialize with empty array (unselected)
            }))
            .filter((item: ScanItem) => item.total > 0)
        : [];

      if (items.length === 0) {
        showSnackbar({
          message:
            "Tidak ada item yang berhasil dibaca, coba foto yang lebih jelas.",
          type: "error",
        });
        return;
      }

      // Extract additional expenses (tax, service_charge, discount)
      const additionalExpenses: ScannedAdditionalExpense[] = [];

      if (data.tax != null && data.tax !== 0) {
        additionalExpenses.push({
          title: "PPN",
          amount: parseCurrency(String(data.tax)),
          participants: [], // Default unselected
        });
      }

      if (data.service_charge != null && data.service_charge !== 0) {
        additionalExpenses.push({
          title: "Service Charge",
          amount: parseCurrency(String(data.service_charge)),
          participants: [], // Default unselected
        });
      }

      if (data.discount != null && data.discount !== 0) {
        // Ensure discount is negative
        const discountAmount = parseCurrency(String(data.discount));
        additionalExpenses.push({
          title: "Discount",
          amount: discountAmount > 0 ? -discountAmount : discountAmount,
          participants: [], // Default unselected
        });
      }

      setScanItems(items);
      setMerchantName(scannedMerchantName);
      setScannedAdditionalExpenses(additionalExpenses);
      setBillDate(scannedDate);
      setReceiptNumber(scannedReceiptNumber);
      showSnackbar({
        message: `Berhasil baca ${items.length} item & ${additionalExpenses.length} additional expense dari struk 🎉`,
        type: "success",
      });
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat scan, kamu bisa coba lagi 🙁",
        type: "error",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveExpenses = () => {
    if (!paidBy) {
      showSnackbar({ message: "Pilih siapa yang bayar dulu.", type: "error" });
      return;
    }

    // Validate all items first
    const itemsWithoutParticipants = scanItems.filter(
      (item) => !item.participants || item.participants.length === 0
    );

    if (itemsWithoutParticipants.length > 0) {
      const itemNames = itemsWithoutParticipants
        .map((item) => `"${item.name}"`)
        .join(", ");
      showSnackbar({
        message: `Pilih minimal 1 participant untuk item: ${itemNames}`,
        type: "error",
      });
      return;
    }

    let saved = 0;

    scanItems.forEach((item) => {
      if (item.total <= 0) return;

      const description = item.quantity
        ? `${item.name} x${item.quantity}`
        : item.name;
      addExpense({
        description,
        amount: item.total,
        paidBy,
        participants: item.participants,
      });
      saved += 1;
    });

    // Validate additional expenses
    const additionalExpensesWithoutParticipants =
      scannedAdditionalExpenses.filter(
        (expense) => !expense.participants || expense.participants.length === 0
      );

    if (additionalExpensesWithoutParticipants.length > 0) {
      const expenseNames = additionalExpensesWithoutParticipants
        .map((expense) => `"${expense.title}"`)
        .join(", ");
      showSnackbar({
        message: `Pilih minimal 1 participant untuk additional expense: ${expenseNames}`,
        type: "error",
      });
      return;
    }

    // Save additional expenses
    let savedAdditional = 0;
    scannedAdditionalExpenses.forEach((expense) => {
      if (expense.amount === 0) return;

      addAdditionalExpense({
        description: expense.title,
        amount: expense.amount,
        paidBy,
        participants: expense.participants,
      });
      savedAdditional += 1;
    });

    if (saved > 0) {
      // Set activity name from merchant name if available
      if (merchantName) {
        updateActivityName(merchantName);
      }

      const totalSaved = saved + savedAdditional;
      const message =
        savedAdditional > 0
          ? `Berhasil simpan ${saved} expense dan ${savedAdditional} additional expense dari hasil scan.`
          : `Berhasil simpan ${saved} expense dari hasil scan.`;

      showSnackbar({
        message,
        type: "success",
      });
      setScanItems([]);
      setScannedAdditionalExpenses([]);
      setSelectedAsset(null);
      setMerchantName(null); // Reset merchant name
      setBillDate(null); // Reset bill date
      setReceiptNumber(null); // Reset receipt number
      setTimeout(() => router.push("/expenses"), 1000);
    }
  };

  const renderSelectedImage = () => {
    if (!selectedAsset) return null;

    return (
      <View style={styles.previewCard}>
        <Image
          source={{ uri: selectedAsset.uri }}
          style={styles.previewImage}
        />
        <View style={styles.previewInfo}>
          <Text style={styles.previewName}>
            {selectedAsset.fileName ?? "Struk terpilih"}
          </Text>
          <Text style={styles.previewMeta}>
            {(selectedAsset.fileSize
              ? selectedAsset.fileSize / 1024
              : 0
            ).toFixed(1)}{" "}
            KB • {selectedAsset.mimeType ?? "image/jpeg"}
          </Text>
        </View>
        <Pressable
          style={styles.removePreview}
          onPress={() => setSelectedAsset(null)}
        >
          <Text style={styles.removePreviewText}>Ganti</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("../assets/images/splitbill-scan-hero.png")}
            style={styles.heroIcon}
          />

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Scan Bill pakai AI</Text>
            <Text style={styles.heroSubtitle}>
              Upload foto, biar AI yang bacain item dan totalnya otomatis.
            </Text>
          </View>
        </View>
        {!hasParticipants ? (
          <Pressable
            style={styles.warningCard}
            onPress={() => router.push("/participants")}
          >
            <View style={styles.warningContent}>
              <View style={[styles.warningIcon, styles.warningPeopleIcon]}>
                <MaterialIcons name="group" size={20} color="#7c2d12" />
              </View>
              <View style={styles.warningTextWrapper}>
                <Text style={styles.warningTitle}>
                  Yuk lengkapi daftar teman kamu
                </Text>
                <Text style={styles.warningText}>
                  Scan AI butuh daftar teman untuk membagi hasilnya.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#7c2d12" />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Upload foto Bill</Text>
          <Text style={styles.cardSubtitle}>
            Pastikan teksnya jelas dan tidak blur ya.
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              style={[styles.uploadButton, { flex: 1 }]}
              onPress={handlePickImage}
            >
              <GalleryIcon size={18} color="#0f172a" />
              <Text style={styles.uploadText}>Galeri</Text>
            </Pressable>
            <Pressable
              style={[styles.uploadButton, { flex: 1 }]}
              onPress={handleTakePhoto}
            >
              <CameraIcon size={18} color="#0f172a" />
              <Text style={styles.uploadText}>Kamera</Text>
            </Pressable>
          </View>
          {renderSelectedImage()}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Proses dengan AI</Text>
          <Text style={styles.cardSubtitle}>
            AI akan mencoba membaca daftar item, subtotal, dan total belanja.
          </Text>
          <Pressable
            style={[
              styles.scanButton,
              (!selectedAsset || isScanning || !hasParticipants) &&
                styles.disabledButton,
            ]}
            disabled={!selectedAsset || isScanning || !hasParticipants}
            onPress={handleScan}
          >
            {isScanning ? (
              <View style={styles.scanButtonLoading}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.scanButtonLoadingText}>
                  {loadingMessages[loadingMessageIndex]}
                </Text>
              </View>
            ) : (
              <Text style={styles.scanButtonText}>Mulai Scan</Text>
            )}
          </Pressable>
        </View>

        {scanItems.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Atur hasil scan</Text>
            <Text style={styles.cardSubtitle}>
              Pilih siapa yang bayar dan atur participant untuk setiap item.
            </Text>

            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>Dibayar oleh</Text>
              <View style={styles.chipGroupHorizontal}>
                {participants.map((person) => {
                  const active = paidBy === person.id;
                  return (
                    <Pressable
                      key={person.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPaidBy(person.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {person.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.scanListHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.scanListTitle}>Daftar item</Text>
                {scanItems.length > 0 && (
                  <View style={styles.scanListCountBadge}>
                    <Text style={styles.scanListCountText}>
                      {scanItems.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.scanListTotal}>
                Total {formatCurrency(totalAmount)}
              </Text>
            </View>

            {scanItems.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.scanItemCard}>
                <View style={styles.scanItemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanItemName}>{item.name}</Text>
                    {item.quantity ? (
                      <Text style={styles.scanItemMeta}>
                        Qty: {item.quantity}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.scanItemAmount}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>

                <View style={styles.itemParticipantsSection}>
                  <Text style={styles.itemParticipantsLabel}>
                    Ikut split bill:
                  </Text>
                  <View style={styles.chipGroupWrap}>
                    {participants.map((person) => {
                      const active = item.participants.includes(person.id);
                      return (
                        <Pressable
                          key={person.id}
                          style={[
                            styles.chipSmall,
                            active && styles.chipSmallActive,
                          ]}
                          onPress={() =>
                            handleToggleItemParticipant(index, person.id)
                          }
                        >
                          <Text
                            style={[
                              styles.chipSmallText,
                              active && styles.chipSmallTextActive,
                            ]}
                          >
                            {person.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}

            {scannedAdditionalExpenses.length > 0 && (
              <>
                <View style={styles.scanListHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.scanListTitle}>
                      Additional Expenses
                    </Text>
                    <View style={styles.scanListCountBadge}>
                      <Text style={styles.scanListCountText}>
                        {scannedAdditionalExpenses.length}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scanListTotal}>
                    Total {formatCurrency(totalAdditionalExpenses)}
                  </Text>
                </View>

                {scannedAdditionalExpenses.map((expense, index) => (
                  <View
                    key={`${expense.title}-${index}`}
                    style={[
                      styles.scanItemCard,
                      expense.amount < 0 && styles.discountCard,
                    ]}
                  >
                    <View style={styles.scanItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanItemName}>{expense.title}</Text>
                      </View>
                      <Text
                        style={[
                          styles.scanItemAmount,
                          expense.amount < 0 && styles.discountAmount,
                        ]}
                      >
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>

                    <View style={styles.itemParticipantsSection}>
                      <Text style={styles.itemParticipantsLabel}>
                        Ikut split bill:
                      </Text>
                      <View style={styles.chipGroupWrap}>
                        {participants.map((person) => {
                          const active = expense.participants.includes(
                            person.id
                          );
                          return (
                            <Pressable
                              key={person.id}
                              style={[
                                styles.chipSmall,
                                active && styles.chipSmallActive,
                              ]}
                              onPress={() =>
                                handleToggleAdditionalExpenseParticipant(
                                  index,
                                  person.id
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.chipSmallText,
                                  active && styles.chipSmallTextActive,
                                ]}
                              >
                                {person.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {(merchantName || billDate || receiptNumber) && (
              <View style={styles.billSummaryCard}>
                <Text style={styles.billSummaryTitle}>Bill untuk:</Text>

                {merchantName && (
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Merchant:</Text>
                    <Text style={styles.billInfoValue}>{merchantName}</Text>
                  </View>
                )}

                {billDate && (
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Tanggal:</Text>
                    <Text style={styles.billInfoValue}>{billDate}</Text>
                  </View>
                )}

                {receiptNumber && (
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>No. Struk:</Text>
                    <Text style={styles.billInfoValue}>{receiptNumber}</Text>
                  </View>
                )}

                <View style={styles.billTotalDivider} />

                <View style={styles.billTotalRow}>
                  <Text style={styles.billTotalLabel}>Grand Total:</Text>
                  <Text style={styles.billTotalValue}>
                    {formatCurrency(grandTotal)}
                  </Text>
                </View>
              </View>
            )}

            <Pressable style={styles.saveButton} onPress={handleSaveExpenses}>
              <Text style={styles.saveButtonText}>
                Simpan ke daftar pengeluaran
              </Text>
            </Pressable>
          </View>
        ) : null}
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
    gap: 18,
    paddingTop: 100,
    paddingBottom: 100,
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
    minHeight: 130,
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
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#bfdbfe",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    position: "relative",
    zIndex: 100,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: "#fde047",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  uploadText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  previewCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
  },
  previewInfo: {
    padding: 12,
    gap: 4,
  },
  previewName: {
    fontWeight: "700",
    color: "#0f172a",
  },
  previewMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  removePreview: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15,23,42,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  removePreviewText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  scanButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  scanButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scanButtonLoadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
  },
  successText: {
    color: "#22c55e",
    fontSize: 13,
  },
  selectorBlock: {
    gap: 10,
  },
  selectorLabel: {
    color: "#0f172a",
    fontWeight: "600",
  },
  chipGroupHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipGroupWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    backgroundColor: "#ffffff",
  },
  chipActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#8b5cf6",
  },
  chipText: {
    color: "#1f2937",
  },
  chipTextActive: {
    color: "#4c1d95",
  },
  scanListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
  },
  scanListTitle: {
    color: "#0f172a",
    fontWeight: "700",
  },
  scanListTotal: {
    color: "#1d4ed8",
    fontWeight: "800",
    fontSize: 14,
  },
  scanItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  scanItemCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingBottom: 12,
    gap: 12,
  },
  scanItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanItemName: {
    color: "#0f172a",
    fontWeight: "600",
  },
  scanItemMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  scanItemAmount: {
    fontWeight: "600",
  },
  itemParticipantsSection: {
    gap: 8,
  },
  itemParticipantsLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    backgroundColor: "#ffffff",
  },
  chipSmallActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#8b5cf6",
  },
  chipSmallText: {
    color: "#1f2937",
    fontSize: 12,
  },
  chipSmallTextActive: {
    color: "#4c1d95",
  },
  discountCard: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  discountAmount: {
    color: "#22c55e",
  },
  billSummaryCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    // borderWidth: 1,
    // borderColor: "#3462F3",
    gap: 6,
  },
  billSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3462F3",
    marginBottom: 4,
  },
  billInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  billInfoLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  billInfoValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  billTotalDivider: {
    height: 1,
    backgroundColor: "#3462F3",
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3462F3",
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3462F3",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#3462F2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  warningCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fef08a",
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flex: 1,
  },
  warningTextWrapper: {
    flex: 1,
    gap: 6,
  },
  warningTitle: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  warningText: {
    color: "#475569",
    fontSize: 12,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  warningPeopleIcon: {
    backgroundColor: "rgba(250,204,21,0.12)",
  },
  scanListCountBadge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  scanListCountText: {
    color: "#3462F2",
    fontWeight: "600",
    fontSize: 12,
  },
});
