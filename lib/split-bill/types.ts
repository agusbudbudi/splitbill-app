export type Participant = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  createdAt: number;
};

export type OwedItem = {
  id: string;
  description: string;
  amount: number;
  type: "base" | "additional";
};

export type ParticipantSummary = {
  participantId: string;
  paid: number;
  owed: number;
  balance: number;
  owedItems: OwedItem[];
};

export type PaymentMethodCategory = "bank_transfer" | "ewallet";

type PaymentMethodBase = {
  id: string;
  category: PaymentMethodCategory;
  provider: string;
  ownerName: string;
  createdAt: number;
};

export type BankPaymentMethod = PaymentMethodBase & {
  category: "bank_transfer";
  bankName: string;
  accountNumber: string;
};

export type EWalletPaymentMethod = PaymentMethodBase & {
  category: "ewallet";
  phoneNumber: string;
};

export type PaymentMethod = BankPaymentMethod | EWalletPaymentMethod;

export type PaymentMethodSnapshot = {
  id: string;
  category: PaymentMethodCategory;
  provider: string;
  ownerName: string;
  accountNumber?: string;
  phoneNumber?: string;
};

export type AdditionalExpense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  createdAt: number;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type SplitBillSummary = {
  total: number;
  perParticipant: ParticipantSummary[];
  settlements: Settlement[];
};

export type CreateSplitBillExpensePayload = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  createdAt: number;
};

export type CreateSplitBillAdditionalExpensePayload = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  createdAt: number;
};

export type CreateSplitBillPayload = {
  activityName: string;
  occurredAt: string;
  participants: Participant[];
  expenses: CreateSplitBillExpensePayload[];
  additionalExpenses: CreateSplitBillAdditionalExpensePayload[];
  paymentMethodIds: string[];
  // Snapshot of selected payment methods at save time (for display even if master data changes)
  paymentMethodSnapshots?: PaymentMethodSnapshot[];
  summary: SplitBillSummary;
};

export type SplitBillRecord = CreateSplitBillPayload & {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  status: "locked" | "editable";
};
