import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";

const API_URL = "https://splitbillbe.netlify.app/api/reviews";
const REVIEW_COOLDOWN_KEY = "lastReviewSubmissionTime";
const COOLDOWN_HOURS = 1;

async function getCooldownTime(): Promise<string | null> {
  try {
    // Use SecureStore on native platforms
    if (Platform.OS !== "web") {
      return await SecureStore.getItemAsync(REVIEW_COOLDOWN_KEY);
    }
  } catch {}
  try {
    // Fallback to localStorage on web
    if (typeof window !== "undefined" && "localStorage" in window) {
      return window.localStorage.getItem(REVIEW_COOLDOWN_KEY);
    }
  } catch {}
  return null;
}

async function setCooldownTime(value: string): Promise<void> {
  try {
    // Use SecureStore on native platforms
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(REVIEW_COOLDOWN_KEY, value);
      return;
    }
  } catch {}
  try {
    // Fallback to localStorage on web
    if (typeof window !== "undefined" && "localStorage" in window) {
      window.localStorage.setItem(REVIEW_COOLDOWN_KEY, value);
    }
  } catch {}
}

function formatTimeLeft(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let message = "Kirim ulasan selanjutnya setelah";
  if (hours > 0) {
    message += ` ${hours} jam`;
  }
  if (minutes > 0) {
    message += ` ${minutes} menit`;
  }
  if (hours === 0 && minutes === 0) {
    message += ` ${seconds} detik`;
  }
  return message;
}

export default function ReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Beri Ulasan",
      headerStyle: { backgroundColor: "#3462F2", borderBottomWidth: 0 },
      headerTintColor: "#ffffff",
      headerTitleStyle: { color: "#ffffff" },
      headerBackTitleStyle: { color: "#ffffff" },
    });
  }, [navigation]);

  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [contactPermission, setContactPermission] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReviewerNameFocused, setIsReviewerNameFocused] = useState(false);
  const [isReviewTextFocused, setIsReviewTextFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setReviewerName(user.name);
      setContactEmail(user.email);
      setContactPermission(true);
    }
  }, [user]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkCooldown = async () => {
      const lastSubmissionTime = await getCooldownTime();
      if (lastSubmissionTime) {
        const diff =
          new Date().getTime() - new Date(lastSubmissionTime).getTime();
        const cooldownMillis = COOLDOWN_HOURS * 60 * 60 * 1000;

        if (diff < cooldownMillis) {
          const timeLeft = cooldownMillis - diff;
          setCooldownMessage(formatTimeLeft(timeLeft));

          interval = setInterval(() => {
            const newDiff =
              new Date().getTime() - new Date(lastSubmissionTime).getTime();
            if (newDiff >= cooldownMillis) {
              setCooldownMessage(null);
              if (interval) clearInterval(interval);
            } else {
              setCooldownMessage(formatTimeLeft(cooldownMillis - newDiff));
            }
          }, 1000);
        }
      }
    };

    checkCooldown();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleRating = (rate: number) => {
    setRating(rate);
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert(
        "Rating Belum Diisi",
        "Silakan berikan rating bintang untuk melanjutkan."
      );
      return;
    }

    if (reviewText.trim() === "") {
      Alert.alert("Ulasan Kosong", "Mohon tuliskan ulasan atau feedback Anda.");
      return;
    }

    if (contactPermission) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        Alert.alert(
          "Email Tidak Valid",
          "Format email yang Anda masukkan tidak benar."
        );
        return;
      }
      const phoneRegex = /^(08|62)[0-9]{8,13}$/;
      if (!phoneRegex.test(contactPhone.replace(/\s+/g, ""))) {
        Alert.alert(
          "Nomor Telepon Tidak Valid",
          "Format nomor telepon yang Anda masukkan tidak benar."
        );
        return;
      }
    }

    setLoading(true);

    const reviewData = {
      rating,
      name: reviewerName.trim() || "Anonim",
      review: reviewText.trim(),
      contactPermission,
      email: contactPermission ? contactEmail : null,
      phone: contactPermission ? contactPhone : null,
    };

    try {
      const payload = {
        rating: Number(reviewData.rating),
        name: reviewData.name,
        review: reviewData.review,
        contactPermission: Boolean(reviewData.contactPermission),
        ...(reviewData.contactPermission
          ? {
              email: reviewData.email?.toLowerCase().trim(),
              phone: reviewData.phone?.replace(/\s+/g, ""),
            }
          : {}),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...payload,
          data: payload,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage =
          responseData.details?.map((d: any) => d.message).join("\n") ||
          responseData.error ||
          "Gagal mengirim ulasan, silakan coba lagi.";
        Alert.alert("Validasi Gagal", errorMessage);
        return;
      }

      await setCooldownTime(new Date().toISOString());

      Alert.alert(
        "Terima Kasih!",
        "Ulasan dan feedback Anda telah berhasil kami terima. 🙏"
      );
      router.back();
    } catch {
      Alert.alert(
        "Terjadi Kesalahan",
        "Tidak dapat mengirim ulasan saat ini. Silakan coba lagi nanti."
      );
    } finally {
      setLoading(false);
    }
  };

  const isCooldown = cooldownMessage !== null;

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/splitbill-review-hero.png")}
            style={styles.heroIcon}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Bagaimana Pengalamanmu?</Text>
            <Text style={styles.heroSubtitle}>
              Berikan ulasanmu untuk membantu kami menjadi lebih baik.
            </Text>
          </View>
        </View>

        {isCooldown && (
          <View style={styles.cooldownBanner}>
            <MaterialCommunityIcons
              name="timer-sand"
              size={20}
              color="#fbbf24"
            />
            <Text style={styles.cooldownText}>{cooldownMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rate) => (
              <TouchableOpacity
                key={rate}
                onPress={() => handleRating(rate)}
                style={styles.star}
                disabled={isCooldown}
              >
                <MaterialIcons
                  name={rate <= rating ? "star" : "star-border"}
                  size={36}
                  color={rate <= rating ? "#FFC700" : "#E2E8F0"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nama Lengkap (Opsional)</Text>
            <TextInput
              style={[
                styles.input,
                isReviewerNameFocused && styles.inputFocused,
                isCooldown && styles.inputDisabled,
              ]}
              placeholder="Nama kamu"
              placeholderTextColor="#94a3b8"
              value={reviewerName}
              onChangeText={setReviewerName}
              onFocus={() => setIsReviewerNameFocused(true)}
              onBlur={() => setIsReviewerNameFocused(false)}
              editable={!isCooldown}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ulasan dan Feedback</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                isReviewTextFocused && styles.inputFocused,
                isCooldown && styles.inputDisabled,
              ]}
              placeholder="Tuliskan masukan, saran, atau pujianmu di sini..."
              placeholderTextColor="#94a3b8"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              onFocus={() => setIsReviewTextFocused(true)}
              onBlur={() => setIsReviewTextFocused(false)}
              editable={!isCooldown}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              Saya bersedia dihubungi oleh tim SplitBill
            </Text>
            <Switch
              trackColor={{ false: "#E2E8F0", true: "#818cf8" }}
              thumbColor={contactPermission ? "#3462F2" : "#f4f3f4"}
              onValueChange={setContactPermission}
              value={contactPermission}
              disabled={isCooldown}
            />
          </View>

          {contactPermission && (
            <View style={styles.contactSection}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    isEmailFocused && styles.inputFocused,
                    isCooldown && styles.inputDisabled,
                  ]}
                  placeholder="Contoh: youremail@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  editable={!isCooldown}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nomor WhatsApp</Text>
                <TextInput
                  style={[
                    styles.input,
                    isPhoneFocused && styles.inputFocused,
                    isCooldown && styles.inputDisabled,
                  ]}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor="#94a3b8"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  editable={!isCooldown}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitButton,
            (loading || isCooldown) && styles.submitButtonDisabled,
          ]}
          onPress={submitReview}
          disabled={loading || isCooldown}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <MaterialCommunityIcons
              name={isCooldown ? "timer-sand-empty" : "send"}
              size={18}
              color="#ffffff"
            />
          )}
          <Text style={styles.submitButtonText}>
            {loading
              ? "Mengirim..."
              : isCooldown
              ? "Tunggu Dulu Ya"
              : "Kirim Ulasan"}
          </Text>
        </Pressable>
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
    fontSize: 18,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#bfdbfe",
    fontSize: 14,
    maxWidth: "80%",
  },
  cooldownBanner: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  cooldownText: {
    color: "#d97706",
    fontWeight: "600",
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 16,
    position: "relative",
    zIndex: 100,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  inputFocused: {
    borderColor: "#3462F2",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 12,
  },
  star: {
    padding: 4,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
    color: "#475569",
    fontWeight: "500",
  },
  contactSection: {
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#f6fafb",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#3462F2",
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    backgroundColor: "#a5b4fc",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
