import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  exportFilename,
  exportScopeLabel,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * Query params, all validated here before use:
 * - the usual filters, through `parseFilters`
 * - `scope`: `filter` (default) or `all`
 * - `columns`: comma-separated, from `EXPORT_COLUMNS`; defaults to every
 *   column except the card last four
 *
 * Rows come from the shared query builder without pagination, so the file
 * holds every matching payment, not the page on screen.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const scope = parseExportScope(params.get("scope"))
  if (!scope.ok) return badRequest(scope.error)

  const columns = parseExportColumns(params.get("columns"))
  if (!columns.ok) return badRequest(columns.error)

  const filters = parseFilters(params)
  const matching =
    scope.value === "all"
      ? filterPayments({ status: "all" })
      : filterPayments(filters)
  const rows = sortPayments(matching, filters.sort, filters.direction)

  const filename = exportFilename(
    new Date(),
    exportScopeLabel(scope.value, filters),
  )

  return new Response(toCsv(rows, columns.value), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}

function badRequest(message: string) {
  return NextResponse.json({ error: { message } }, { status: 400 })
}
