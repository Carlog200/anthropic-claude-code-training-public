import { merchantById } from "@/data/merchants"
import { Payment, PaymentFilters } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops chooses the columns and the scope (NWP-101). Both arrive from the
 * client, so the route validates them here against allowlists before they
 * reach the serializer or the filename.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** Labels for the export options dialog, in the same order as the columns. */
export const EXPORT_COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

/**
 * What ships when nobody chooses: every column except the card last four,
 * because most exports end up in front of a merchant.
 */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

export const EXPORT_SCOPES = ["filter", "all"] as const
export type ExportScope = (typeof EXPORT_SCOPES)[number]

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * Validate a comma-separated column list from the client.
 *
 * Missing means the default set. Present but empty, or naming any column
 * outside the allowlist, is rejected rather than quietly trimmed, so a typo
 * never silently drops a column. Duplicates collapse; order is kept.
 */
export function parseExportColumns(
  raw: string | null,
): Parsed<ExportColumn[]> {
  if (raw === null) return { ok: true, value: [...DEFAULT_EXPORT_COLUMNS] }

  const names = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  if (names.length === 0) {
    return { ok: false, error: "Choose at least one column to export." }
  }

  const unknown = names.filter(
    (name) => !EXPORT_COLUMNS.includes(name as ExportColumn),
  )
  if (unknown.length > 0) {
    return { ok: false, error: "The export request named a column that does not exist." }
  }

  return { ok: true, value: [...new Set(names as ExportColumn[])] }
}

/** Validate the export scope. Missing means the current filter. */
export function parseExportScope(raw: string | null): Parsed<ExportScope> {
  if (raw === null) return { ok: true, value: "filter" }
  if (EXPORT_SCOPES.includes(raw as ExportScope)) {
    return { ok: true, value: raw as ExportScope }
  }
  return { ok: false, error: "Export scope must be the current filter or all payments." }
}

/**
 * The scope part of the filename, built only from allowlisted values:
 * the parsed status and a merchant id that exists. Search text never
 * reaches the filename.
 */
export function exportScopeLabel(
  scope: ExportScope,
  filters: PaymentFilters,
): string {
  if (scope === "all") return "all"

  const parts: string[] = []
  if (filters.status && filters.status !== "all") parts.push(filters.status)
  if (filters.merchantId && merchantById(filters.merchantId)) {
    parts.push(filters.merchantId)
  }
  if (parts.length > 0) return parts.join("-")
  return filters.search ? "filtered" : "all"
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/** `payments-2026-08-13.csv`, or with a scope label `payments-disputed-2026-08-13.csv`. UTC date. */
export function exportFilename(date = new Date(), scopeLabel?: string): string {
  const day = date.toISOString().slice(0, 10)
  return scopeLabel ? `payments-${scopeLabel}-${day}.csv` : `payments-${day}.csv`
}
