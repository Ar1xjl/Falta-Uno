import { getExpenseGroupKey, getEventRosterForBalance } from '../data/selectors'
import type { AppData } from '../types'

const EPSILON = 0.01

/**
 * Net balance per contact within one balance pool (see `getExpenseGroupKey`).
 * Positive = this contact is owed money overall (creditor).
 * Negative = this contact owes money overall (debtor).
 *
 * A single-event Expense splits equally among `splitContactIds`. A multi-event abono
 * (`coveredEventIds` set) divides the amount evenly across those events, then splits each
 * event's slice among *that event's* actual roster at calc time — so balances shift automatically
 * as rosters change, and a mid-series substitute only ever accrues the events they played.
 */
export function computeBalances(data: AppData, groupKey: string): Map<string, number> {
  const balances = new Map<string, number>()

  function add(contactId: string, amount: number) {
    balances.set(contactId, (balances.get(contactId) ?? 0) + amount)
  }

  for (const expense of data.expenses) {
    if (getExpenseGroupKey(data, expense) !== groupKey) continue
    add(expense.paidByContactId, expense.amount)

    if (expense.coveredEventIds && expense.coveredEventIds.length > 0) {
      const template = data.eventTemplates.find((t) => t.id === expense.eventTemplateId)
      const perEvent = expense.amount / expense.coveredEventIds.length
      for (const eventId of expense.coveredEventIds) {
        const roster = getEventRosterForBalance(data, eventId, template)
        if (roster.length === 0) continue
        const share = perEvent / roster.length
        for (const contactId of roster) add(contactId, -share)
      }
    } else if (expense.splitContactIds && expense.splitContactIds.length > 0) {
      const share = expense.amount / expense.splitContactIds.length
      for (const contactId of expense.splitContactIds) add(contactId, -share)
    }
  }

  for (const settlement of data.settlements) {
    if (settlement.groupKey !== groupKey) continue
    add(settlement.fromContactId, settlement.amount)
    add(settlement.toContactId, -settlement.amount)
  }

  return balances
}

/**
 * Combined net balance per contact across every bucket (see `computeBalances`) — a quick "who's up,
 * who's down overall" glance. Deliberately not used to drive settle-suggestions: two opposite debts in
 * different buckets (e.g. Tomi owes Juan for Golf, Juan owes Tomi for Padel balls) can net out here in a
 * way that hides the two real, separately-owed debts. Always drill into a single bucket to actually settle.
 */
export function computeTotalBalances(data: AppData, groupKeys: string[]): Map<string, number> {
  const total = new Map<string, number>()
  for (const key of groupKeys) {
    for (const [contactId, amount] of computeBalances(data, key)) {
      total.set(contactId, (total.get(contactId) ?? 0) + amount)
    }
  }
  return total
}

export interface SettleSuggestion {
  fromContactId: string
  toContactId: string
  amount: number
}

/** Greedy debt simplification (same approach Splitwise uses): repeatedly matches the largest debtor with the largest creditor, minimizing the number of suggested payments. */
export function simplifyDebts(balances: Map<string, number>): SettleSuggestion[] {
  const creditors: { contactId: string; amount: number }[] = []
  const debtors: { contactId: string; amount: number }[] = []

  for (const [contactId, amount] of balances.entries()) {
    if (amount > EPSILON) creditors.push({ contactId, amount })
    else if (amount < -EPSILON) debtors.push({ contactId, amount: -amount })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const suggestions: SettleSuggestion[] = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.amount, debtor.amount)
    if (amount > EPSILON) {
      suggestions.push({ fromContactId: debtor.contactId, toContactId: creditor.contactId, amount })
    }
    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount <= EPSILON) ci++
    if (debtor.amount <= EPSILON) di++
  }

  return suggestions
}
