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
import { useSplitBill } from "@/context/split-bill-context";
import { formatCurrency, parseCurrency } from "@/lib/split-bill/format";

type ScanItem = {
  name: string;
  quantity?: string | number;
  total: number;
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
  const { participants, addExpense } = useSplitBill();

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPermissionChecked(true);
    if (status !== "granted") {
      setError("Izin akses galeri dibutuhkan untuk mengunggah struk.");
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermissionChecked(true);
    if (status !== "granted") {
      setError("Izin akses kamera dibutuhkan untuk mengambil foto.");
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    setError(null);
    setSuccess(null);

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
    setError(null);
    setSuccess(null);

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

  const handleScan = async () => {
    if (!selectedAsset) {
      setError("Pilih foto struk terlebih dahulu.");
      return;
    }

    if (!hasParticipants) {
      setError("Tambahkan minimal dua teman dulu sebelum scan.");
      return;
    }

    setIsScanning(true);
    setError(null);
    setSuccess(null);

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
      const items = Array.isArray(data.items)
        ? data.items
            .map((item: Record<string, unknown>) => ({
              name: String(item.name ?? "Item tidak diketahui"),
              quantity: item.quantity ?? null,
              total: parseCurrency(String(item.total ?? "0")),
            }))
            .filter((item: ScanItem) => item.total > 0)
        : [];

      if (items.length === 0) {
        setError(
          "Tidak ada item yang berhasil dibaca, coba foto yang lebih jelas."
        );
        return;
      }

      setScanItems(items);
      setSuccess(`Berhasil baca ${items.length} item dari struk 🎉`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat scan, kamu bisa coba lagi 🙁"
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveExpenses = () => {
    if (!paidBy) {
      setError("Pilih siapa yang bayar dulu.");
      return;
    }

    if (selectedParticipants.length === 0) {
      setError("Pilih siapa saja yang ikut split.");
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
        participants: selectedParticipants,
      });
      saved += 1;
    });

    if (saved > 0) {
      setSuccess(`Berhasil simpan ${saved} expense dari hasil scan.`);
      setScanItems([]);
      setSelectedAsset(null);
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
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.scanButtonText}>Mulai Scan</Text>
            )}
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}
        </View>

        {scanItems.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Atur hasil scan</Text>
            <Text style={styles.cardSubtitle}>
              Pilih siapa yang bayar dan siapa yang ikut split.
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

            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>Ikut split bill</Text>
              <View style={styles.chipGroupWrap}>
                {participants.map((person) => {
                  const active = selectedParticipants.includes(person.id);
                  return (
                    <Pressable
                      key={person.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => handleToggleParticipant(person.id)}
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
              <View key={`${item.name}-${index}`} style={styles.scanItemRow}>
                <View>
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
            ))}

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
    minHeight: 150,
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
