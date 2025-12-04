import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "@/context/auth-context";
import {
  createParticipant,
  deleteParticipant,
  fetchParticipants,
} from "@/lib/split-bill/api";
import { calculateSplitBillSummary } from "@/lib/split-bill/calculations";
import {
  AdditionalExpense,
  BankPaymentMethod,
  EWalletPaymentMethod,
  Expense,
  Participant,
  PaymentMethod,
  SplitBillSummary,
} from "@/lib/split-bill/types";
import {
  savePaymentMethods,
  loadPaymentMethods,
} from "@/lib/split-bill/payment-method-storage";

type SplitBillState = {
  activityName: string;
  participants: Participant[];
  expenses: Expense[];
  additionalExpenses: AdditionalExpense[];
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodIds: string[];
};

type SplitBillContextValue = {
  activityName: string;
  participants: Participant[];
  expenses: Expense[];
  additionalExpenses: AdditionalExpense[];
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodIds: string[];
  summary: SplitBillSummary;
  addParticipant: (name: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  addExpense: (payload: Omit<Expense, "id" | "createdAt">) => void;
  removeExpense: (expenseId: string) => void;
  updateExpense: (
    expenseId: string,
    payload: Omit<Expense, "id" | "createdAt">
  ) => void;
  addAdditionalExpense: (
    payload: Omit<AdditionalExpense, "id" | "createdAt">
  ) => void;
  updateAdditionalExpense: (
    expenseId: string,
    payload: Omit<AdditionalExpense, "id" | "createdAt">
  ) => void;
  removeAdditionalExpense: (expenseId: string) => void;
  addPaymentMethod: (
    payload:
      | Omit<BankPaymentMethod, "id" | "createdAt">
      | Omit<EWalletPaymentMethod, "id" | "createdAt">
  ) => void;
  removePaymentMethod: (paymentMethodId: string) => void;
  togglePaymentMethodSelection: (paymentMethodId: string) => void;
  clearSelectedPaymentMethods: () => void;
  updateActivityName: (name: string) => void;
  resetAll: () => void;
};

const SplitBillContext = createContext<SplitBillContextValue | undefined>(
  undefined
);

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

const initialState: SplitBillState = {
  activityName: "",
  participants: [],
  expenses: [],
  additionalExpenses: [],
  paymentMethods: [],
  selectedPaymentMethodIds: [],
};

export function SplitBillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SplitBillState>(initialState);
  const { isAuthenticated, isInitializing } = useAuth();

  // Load participants and payment methods on initialization
  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      setState(initialState);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const participants = await fetchParticipants();
        if (cancelled) return;

        setState((current) => ({
          ...current,
          participants,
        }));
      } catch (error) {
        console.error("Failed to load participants", error);
      }

      try {
        const { paymentMethods, selectedPaymentMethodIds } =
          await loadPaymentMethods();
        if (cancelled) return;

        setState((current) => ({
          ...current,
          paymentMethods,
          selectedPaymentMethodIds,
        }));
      } catch (error) {
        console.error("Failed to load payment methods", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing]);

  // Save payment methods when they change
  useEffect(() => {
    // Only save if not initializing and authenticated
    if (!isInitializing && isAuthenticated) {
      savePaymentMethods(state.paymentMethods, state.selectedPaymentMethodIds);
    }
  }, [state.paymentMethods, state.selectedPaymentMethodIds, isInitializing, isAuthenticated]);

  const addParticipant = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      if (!isAuthenticated) {
        throw new Error("Silakan login untuk menambah Teman.");
      }

      const exists = state.participants.some(
        (item) => item.name.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (exists) {
        throw new Error("Teman dengan nama ini sudah ada.");
      }

      const participant = await createParticipant(trimmed);

      setState((current) => {
        if (
          current.participants.some(
            (item) =>
              item.id === participant.id ||
              item.name.trim().toLowerCase() ===
                participant.name.trim().toLowerCase()
          )
        ) {
          return current;
        }

        return {
          ...current,
          participants: [...current.participants, participant],
        };
      });
    },
    [isAuthenticated, state.participants]
  );

  const removeParticipant = useCallback(
    async (participantId: string) => {
      const previousState = state;

      setState((current) => {
        const participants = current.participants.filter(
          (item) => item.id !== participantId
        );
        const expenses = current.expenses.filter(
          (expense) =>
            expense.paidBy !== participantId &&
            !expense.participants.includes(participantId)
        );
        const additionalExpenses = current.additionalExpenses
          .map((item) => ({
            ...item,
            participants: item.participants.filter(
              (id) => id !== participantId
            ),
          }))
          .filter(
            (item) =>
              item.paidBy !== participantId && item.participants.length > 0
          );

        return {
          ...current,
          participants,
          expenses,
          additionalExpenses,
        };
      });

      if (isAuthenticated && /^[a-fA-F0-9]{24}$/.test(participantId)) {
        try {
          await deleteParticipant(participantId);
        } catch (error) {
          setState(previousState);
          throw error instanceof Error
            ? error
            : new Error("Gagal menghapus peserta, coba lagi.");
        }
      }
    },
    [isAuthenticated, state]
  );

  const addExpense = useCallback(
    (payload: Omit<Expense, "id" | "createdAt">) => {
      if (
        !payload.description.trim() ||
        payload.participants.length === 0
      ) {
        return;
      }

      setState((current) => {
        const expense: Expense = {
          ...payload,
          id: createId("expense"),
          createdAt: Date.now(),
        };

        return {
          ...current,
          expenses: [...current.expenses, expense],
        };
      });
    },
    []
  );

  const updateExpense = useCallback(
    (expenseId: string, payload: Omit<Expense, "id" | "createdAt">) => {
      if (
        !payload.description.trim() ||
        payload.participants.length === 0 ||
        !payload.paidBy
      ) {
        return;
      }

      setState((current) => {
        const validParticipants = payload.participants.filter((participantId) =>
          current.participants.some(
            (participant) => participant.id === participantId
          )
        );
        const paidByExists = current.participants.some(
          (participant) => participant.id === payload.paidBy
        );

        if (!paidByExists || validParticipants.length === 0) {
          return current;
        }

        const expenses = current.expenses.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                description: payload.description,
                amount: payload.amount,
                participants: validParticipants,
                paidBy: payload.paidBy,
              }
            : item
        );

        return {
          ...current,
          expenses,
        };
      });
    },
    []
  );

  const removeExpense = useCallback((expenseId: string) => {
    setState((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }, []);

  const addAdditionalExpense = useCallback(
    (payload: Omit<AdditionalExpense, "id" | "createdAt">) => {
      if (
        !payload.description.trim() ||
        payload.participants.length === 0 ||
        !payload.paidBy
      ) {
        return;
      }

      setState((current) => {
        const validParticipants = payload.participants.filter((participantId) =>
          current.participants.some(
            (participant) => participant.id === participantId
          )
        );
        const paidByExists = current.participants.some(
          (participant) => participant.id === payload.paidBy
        );

        if (!paidByExists || validParticipants.length === 0) {
          return current;
        }

        const expense: AdditionalExpense = {
          ...payload,
          id: createId("additional"),
          createdAt: Date.now(),
          participants: validParticipants,
        };

        return {
          ...current,
          additionalExpenses: [...current.additionalExpenses, expense],
        };
      });
    },
    []
  );

  const updateAdditionalExpense = useCallback(
    (
      expenseId: string,
      payload: Omit<AdditionalExpense, "id" | "createdAt">
    ) => {
      if (
        !payload.description.trim() ||
        payload.participants.length === 0 ||
        !payload.paidBy
      ) {
        return;
      }

      setState((current) => {
        const validParticipants = payload.participants.filter((participantId) =>
          current.participants.some(
            (participant) => participant.id === participantId
          )
        );
        const paidByExists = current.participants.some(
          (participant) => participant.id === payload.paidBy
        );

        if (!paidByExists || validParticipants.length === 0) {
          return current;
        }

        const additionalExpenses = current.additionalExpenses.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                description: payload.description,
                amount: payload.amount,
                participants: validParticipants,
                paidBy: payload.paidBy,
              }
            : item
        );

        return {
          ...current,
          additionalExpenses,
        };
      });
    },
    []
  );

  const removeAdditionalExpense = useCallback((expenseId: string) => {
    setState((current) => ({
      ...current,
      additionalExpenses: current.additionalExpenses.filter(
        (expense) => expense.id !== expenseId
      ),
    }));
  }, []);

  const addPaymentMethod = useCallback(
    (
      payload:
        | Omit<BankPaymentMethod, "id" | "createdAt">
        | Omit<EWalletPaymentMethod, "id" | "createdAt">
    ) => {
      const ownerName = payload.ownerName.trim();
      const provider = payload.provider.trim();
      if (!ownerName || !provider) {
        return;
      }

      if (payload.category === "bank_transfer") {
        if (!payload.accountNumber.trim() || !payload.bankName.trim()) {
          return;
        }
      } else if (payload.category === "ewallet") {
        if (!payload.phoneNumber.trim()) {
          return;
        }
      }

      setState((current) => {
        const paymentMethod: PaymentMethod = {
          ...payload,
          ownerName,
          provider,
          id: createId("payment"),
          createdAt: Date.now(),
          ...(payload.category === "bank_transfer"
            ? {
                bankName: payload.bankName.trim(),
                accountNumber: payload.accountNumber.trim(),
              }
            : { phoneNumber: payload.phoneNumber.trim() }),
        } as PaymentMethod;

        return {
          ...current,
          paymentMethods: [...current.paymentMethods, paymentMethod],
        };
      });
    },
    []
  );

  const removePaymentMethod = useCallback((paymentMethodId: string) => {
    setState((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.filter(
        (method) => method.id !== paymentMethodId
      ),
      selectedPaymentMethodIds: current.selectedPaymentMethodIds.filter(
        (id) => id !== paymentMethodId
      ),
    }));
  }, []);

  const togglePaymentMethodSelection = useCallback(
    (paymentMethodId: string) => {
      setState((current) => {
        if (
          !current.paymentMethods.some(
            (method) => method.id === paymentMethodId
          )
        ) {
          return current;
        }

        const exists =
          current.selectedPaymentMethodIds.includes(paymentMethodId);
        const selectedPaymentMethodIds = exists
          ? current.selectedPaymentMethodIds.filter(
              (id) => id !== paymentMethodId
            )
          : [...current.selectedPaymentMethodIds, paymentMethodId];

        return {
          ...current,
          selectedPaymentMethodIds,
        };
      });
    },
    []
  );

  const clearSelectedPaymentMethods = useCallback(() => {
    setState((current) => ({
      ...current,
      selectedPaymentMethodIds: [],
    }));
  }, []);

  const updateActivityName = useCallback((name: string) => {
    setState((current) => ({
      ...current,
      activityName: name,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState((current) => ({
      ...initialState,
      participants: current.participants,
    }));
  }, []);

  const summary = useMemo(() => {
    if (state.participants.length === 0) {
      return { total: 0, perParticipant: [], settlements: [] };
    }

    return calculateSplitBillSummary(
      state.participants,
      state.expenses,
      state.additionalExpenses
    );
  }, [state.participants, state.expenses, state.additionalExpenses]);

  const value = useMemo<SplitBillContextValue>(
    () => ({
      activityName: state.activityName,
      participants: state.participants,
      expenses: state.expenses,
      additionalExpenses: state.additionalExpenses,
      paymentMethods: state.paymentMethods,
      selectedPaymentMethodIds: state.selectedPaymentMethodIds,
      summary,
      addParticipant,
      removeParticipant,
      addExpense,
      removeExpense,
      updateExpense,
      addAdditionalExpense,
      updateAdditionalExpense,
      removeAdditionalExpense,
      addPaymentMethod,
      removePaymentMethod,
      togglePaymentMethodSelection,
      clearSelectedPaymentMethods,
      updateActivityName,
      resetAll,
    }),
    [
      state,
      summary,
      addParticipant,
      removeParticipant,
      addExpense,
      removeExpense,
      updateExpense,
      addAdditionalExpense,
      updateAdditionalExpense,
      removeAdditionalExpense,
      addPaymentMethod,
      removePaymentMethod,
      togglePaymentMethodSelection,
      clearSelectedPaymentMethods,
      updateActivityName,
      resetAll,
    ]
  );

  return (
    <SplitBillContext.Provider value={value}>
      {children}
    </SplitBillContext.Provider>
  );
}

export function useSplitBill() {
  const context = useContext(SplitBillContext);
  if (!context) {
    throw new Error("useSplitBill must be used within SplitBillProvider");
  }
  return context;
}
