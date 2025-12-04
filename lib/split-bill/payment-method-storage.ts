import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { PaymentMethod } from "@/lib/split-bill/types";

const PAYMENT_METHODS_KEY = "splitBillPaymentMethods";
const SELECTED_PAYMENT_METHOD_IDS_KEY = "splitBillSelectedPaymentMethodIds";

export async function savePaymentMethods(
  paymentMethods: PaymentMethod[],
  selectedPaymentMethodIds: string[]
): Promise<void> {
  try {
    const methodsJson = JSON.stringify(paymentMethods);
    const selectedIdsJson = JSON.stringify(selectedPaymentMethodIds);

    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(PAYMENT_METHODS_KEY, methodsJson);
      await SecureStore.setItemAsync(
        SELECTED_PAYMENT_METHOD_IDS_KEY,
        selectedIdsJson
      );
    } else {
      if (typeof window !== "undefined" && "localStorage" in window) {
        window.localStorage.setItem(PAYMENT_METHODS_KEY, methodsJson);
        window.localStorage.setItem(
          SELECTED_PAYMENT_METHOD_IDS_KEY,
          selectedIdsJson
        );
      }
    }
  } catch (error) {
    console.error("Failed to save payment methods:", error);
  }
}

export async function loadPaymentMethods(): Promise<{
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodIds: string[];
}> {
  let methods: PaymentMethod[] = [];
  let selectedIds: string[] = [];

  try {
    let methodsJson: string | null = null;
    let selectedIdsJson: string | null = null;

    if (Platform.OS !== "web") {
      methodsJson = await SecureStore.getItemAsync(PAYMENT_METHODS_KEY);
      selectedIdsJson = await SecureStore.getItemAsync(
        SELECTED_PAYMENT_METHOD_IDS_KEY
      );
    } else {
      if (typeof window !== "undefined" && "localStorage" in window) {
        methodsJson = window.localStorage.getItem(PAYMENT_METHODS_KEY);
        selectedIdsJson = window.localStorage.getItem(
          SELECTED_PAYMENT_METHOD_IDS_KEY
        );
      }
    }

    if (methodsJson) {
      methods = JSON.parse(methodsJson);
    }
    if (selectedIdsJson) {
      selectedIds = JSON.parse(selectedIdsJson);
    }
  } catch (error) {
    console.error("Failed to load payment methods:", error);
  }

  return { paymentMethods: methods, selectedPaymentMethodIds: selectedIds };
}
