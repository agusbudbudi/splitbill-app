import { apiRequest } from "@/lib/auth/client";

import type {
  CreateSplitBillPayload,
  Participant,
  SplitBillRecord,
  PaymentMethodSnapshot,
} from "./types";

type ParticipantResponse = {
  id?: string;
  _id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type SplitBillRecordResponse = {
  id: string;
  ownerId?: string;
  activityName: string;
  occurredAt: string;
  participants: ParticipantResponse[];
  expenses: CreateSplitBillPayload["expenses"];
  additionalExpenses: CreateSplitBillPayload["additionalExpenses"];
  paymentMethodIds: string[];
  paymentMethodSnapshots?: PaymentMethodSnapshot[];
  summary: CreateSplitBillPayload["summary"];
  status: SplitBillRecord["status"];
  createdAt: string;
  updatedAt: string;
};

function mapParticipant(response: ParticipantResponse): Participant {
  return {
    id: response.id ?? response._id ?? "",
    name: response.name,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

function mapSplitBillRecord(record: SplitBillRecordResponse): SplitBillRecord {
  return {
    id: record.id,
    ownerId: record.ownerId ?? "",
    activityName: record.activityName,
    occurredAt: record.occurredAt,
    participants: (record.participants ?? []).map(mapParticipant),
    expenses: record.expenses,
    additionalExpenses: record.additionalExpenses,
    paymentMethodIds: record.paymentMethodIds,
    paymentMethodSnapshots: record.paymentMethodSnapshots ?? [],
    summary: record.summary,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function fetchParticipants(): Promise<Participant[]> {
  const result = await apiRequest<{
    success: boolean;
    participants: ParticipantResponse[];
  }>("/api/participants");

  return (result.participants ?? []).map(mapParticipant);
}

export async function createParticipant(name: string): Promise<Participant> {
  const result = await apiRequest<{
    success: boolean;
    participant: ParticipantResponse;
  }>("/api/participants", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  return mapParticipant(result.participant);
}

export async function deleteParticipant(participantId: string): Promise<void> {
  await apiRequest(`/api/participants/${participantId}`, {
    method: "DELETE",
  });
}

export async function createSplitBillRecord(
  payload: CreateSplitBillPayload
): Promise<SplitBillRecord> {
  const result = await apiRequest<{
    success: boolean;
    record: SplitBillRecordResponse;
  }>("/api/split-bills", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapSplitBillRecord(result.record);
}

export async function fetchSplitBillRecords(): Promise<SplitBillRecord[]> {
  const result = await apiRequest<{
    success: boolean;
    records: SplitBillRecordResponse[];
  }>("/api/split-bills");

  return (result.records ?? []).map(mapSplitBillRecord);
}

export async function fetchSplitBillRecord(
  recordId: string
): Promise<SplitBillRecord> {
  const result = await apiRequest<{
    success: boolean;
    record: SplitBillRecordResponse;
  }>(`/api/split-bills/${recordId}`);

  return mapSplitBillRecord(result.record);
}
