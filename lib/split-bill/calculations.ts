import { AdditionalExpense, Expense, Participant, ParticipantSummary, Settlement, SplitBillSummary } from './types';

function toPrecision(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildParticipantMap(participants: Participant[]): Record<string, ParticipantSummary> {
  return participants.reduce<Record<string, ParticipantSummary>>((acc, person) => {
    acc[person.id] = {
      participantId: person.id,
      paid: 0,
      owed: 0,
      balance: 0,
      owedItems: [],
    };
    return acc;
  }, {});
}

function distributeAmountEquallyCents(amount: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  const totalCents = Math.round(amount * 100);
  if (totalCents === 0) {
    return new Array(count).fill(0);
  }

  const baseShare = Math.floor(totalCents / count);
  let remainder = totalCents - baseShare * count;

  return Array.from({ length: count }, () => {
    const cents = baseShare + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {
      remainder -= 1;
    }
    return cents;
  });
}

function distributeAmountProportionallyCents(amount: number, weights: number[]): number[] {
  const count = weights.length;
  if (count === 0) {
    return [];
  }

  const totalCents = Math.round(amount * 100);
  if (totalCents === 0) {
    return new Array(count).fill(0);
  }

  const normalizedWeights = weights.map((weight) => (weight > 0 ? weight : 0));
  const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight === 0) {
    return distributeAmountEquallyCents(amount, count);
  }

  const shares = normalizedWeights.map((weight) => Math.floor((totalCents * weight) / totalWeight));
  let assigned = shares.reduce((sum, share) => sum + share, 0);
  let remainder = totalCents - assigned;

  const order = normalizedWeights
    .map((weight, index) => ({ weight, index }))
    .sort((a, b) => (b.weight === a.weight ? a.index - b.index : b.weight - a.weight));

  let pointer = 0;
  while (remainder > 0 && order.length > 0) {
    shares[order[pointer % order.length].index] += 1;
    remainder -= 1;
    pointer += 1;
  }

  return shares;
}

function applyMainExpenses(
  expenses: Expense[],
  participantMap: Record<string, ParticipantSummary>,
): { total: number; baseOwedSnapshot: Record<string, number> } {
  let totalCents = 0;

  expenses.forEach((expense) => {
    const { id, description, amount, paidBy, participants } = expense;
    // if (amount <= 0) {
    //   return;
    // }

    const validParticipants = participants.filter((participantId) => participantMap[participantId]);
    if (validParticipants.length === 0) {
      return;
    }

    const shares = distributeAmountEquallyCents(amount, validParticipants.length);
    validParticipants.forEach((participantId, index) => {
      const summary = participantMap[participantId];
      if (!summary) return;

      const share = shares[index] / 100;
      summary.owed = toPrecision(summary.owed + share);
      summary.owedItems.push({
        id,
        description,
        amount: toPrecision(share),
        type: 'base',
      });
    });

    const payer = participantMap[paidBy];
    if (payer) {
      payer.paid = toPrecision(payer.paid + amount);
    }

    totalCents += Math.round(amount * 100);
  });

  const baseOwedSnapshot: Record<string, number> = {};
  Object.keys(participantMap).forEach((participantId) => {
    baseOwedSnapshot[participantId] = participantMap[participantId].owed;
  });

  return {
    total: toPrecision(totalCents / 100),
    baseOwedSnapshot,
  };
}

function applyAdditionalExpenses(
  additionalExpenses: AdditionalExpense[],
  participantMap: Record<string, ParticipantSummary>,
  baseOwedSnapshot: Record<string, number>,
): number {
  let totalCents = 0;

  additionalExpenses.forEach((additional) => {
    const { id, description, amount, paidBy, participants } = additional;
    // if (amount <= 0) {
    //   return;
    // }

    const validParticipants = participants.filter((participantId) => participantMap[participantId]);
    if (validParticipants.length === 0) {
      return;
    }

    const payer = participantMap[paidBy];
    if (payer) {
      payer.paid = toPrecision(payer.paid + amount);
    }

    const weights = validParticipants.map((participantId) => baseOwedSnapshot[participantId] ?? 0);
    const sharesInCents = distributeAmountProportionallyCents(amount, weights);

    validParticipants.forEach((participantId, index) => {
      const summary = participantMap[participantId];
      if (!summary) return;

      const share = sharesInCents[index] / 100;
      summary.owed = toPrecision(summary.owed + share);
      summary.owedItems.push({
        id,
        description,
        amount: toPrecision(share),
        type: 'additional',
      });
    });

    totalCents += Math.round(amount * 100);
  });

  return toPrecision(totalCents / 100);
}

function settleBalances(participantMap: Record<string, ParticipantSummary>): Settlement[] {
  const creditors: ParticipantSummary[] = [];
  const debtors: ParticipantSummary[] = [];

  Object.values(participantMap).forEach((summary) => {
    summary.balance = toPrecision(summary.paid - summary.owed);
    if (summary.balance > 0) {
      creditors.push({ ...summary });
    } else if (summary.balance < 0) {
      debtors.push({ ...summary });
    }
  });

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const settlements: Settlement[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const amount = toPrecision(Math.min(creditor.balance, Math.abs(debtor.balance)));
    if (amount <= 0) {
      break;
    }

    settlements.push({
      from: debtor.participantId,
      to: creditor.participantId,
      amount,
    });

    creditor.balance = toPrecision(creditor.balance - amount);
    debtor.balance = toPrecision(debtor.balance + amount);

    if (Math.abs(creditor.balance) < 0.01) {
      creditorIndex += 1;
    }

    if (Math.abs(debtor.balance) < 0.01) {
      debtorIndex += 1;
    }
  }

  return settlements;
}

export function calculateSplitBillSummary(
  participants: Participant[],
  expenses: Expense[],
  additionalExpenses: AdditionalExpense[] = [],
): SplitBillSummary {
  const participantMap = buildParticipantMap(participants);
  const { total: mainTotal, baseOwedSnapshot } = applyMainExpenses(expenses, participantMap);
  const additionalTotal = applyAdditionalExpenses(additionalExpenses, participantMap, baseOwedSnapshot);
  const total = toPrecision(mainTotal + additionalTotal);
  const settlements = settleBalances(participantMap);

  return {
    total,
    perParticipant: Object.values(participantMap),
    settlements,
  };
}
