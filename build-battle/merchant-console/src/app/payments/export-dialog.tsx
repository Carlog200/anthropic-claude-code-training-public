"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMN_LABELS,
  EXPORT_COLUMNS,
  ExportColumn,
  ExportScope,
} from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

/**
 * Export options for the payments table (NWP-101).
 *
 * The choices here are a convenience; the route validates columns and scope
 * again on the server. Row counts come from the server-rendered page, so
 * nothing is filtered in the browser.
 */
export function ExportDialog({
  query,
  filteredCount,
  allCount,
}: {
  /** The current filter query string, without pagination. */
  query: string
  filteredCount: number
  allCount: number
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<ExportScope>("filter")
  const [columns, setColumns] = useState<ExportColumn[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ])

  const toggle = (column: ExportColumn, checked: boolean) => {
    setColumns((current) => {
      const next = checked
        ? [...current, column]
        : current.filter((c) => c !== column)
      // Keep the file's column order stable, whatever order boxes were ticked in.
      return EXPORT_COLUMNS.filter((c) => next.includes(c))
    })
  }

  const rowCount = scope === "all" ? allCount : filteredCount
  const params = new URLSearchParams(query)
  params.set("scope", scope)
  params.set("columns", columns.join(","))
  const href = `/api/payments/export?${params.toString()}`
  const canDownload = columns.length > 0

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose which payments and columns go into the CSV.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              Payments
            </legend>
            <ScopeOption
              id="export-scope-filter"
              label="Current filter"
              count={filteredCount}
              checked={scope === "filter"}
              onSelect={() => setScope("filter")}
            />
            <ScopeOption
              id="export-scope-all"
              label="All payments"
              count={allCount}
              checked={scope === "all"}
              onSelect={() => setScope("all")}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            {EXPORT_COLUMNS.map((column) => (
              <label
                key={column}
                htmlFor={`export-column-${column}`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  id={`export-column-${column}`}
                  type="checkbox"
                  className="size-4 accent-blue-500"
                  checked={columns.includes(column)}
                  onChange={(event) => toggle(column, event.target.checked)}
                />
                {EXPORT_COLUMN_LABELS[column]}
                {column === "last4" && (
                  <span className="text-xs text-gray-500">
                    Off by default. Leave off for files sent to merchants.
                  </span>
                )}
              </label>
            ))}
            {!canDownload && (
              <p role="status" className="text-sm text-red-600 dark:text-red-500">
                Choose at least one column to download.
              </p>
            )}
          </fieldset>
        </DrawerBody>

        <DrawerFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-gray-500 tabular-nums">
            {rowCount.toLocaleString()} {rowCount === 1 ? "row" : "rows"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DrawerClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DrawerClose>
            {canDownload ? (
              <Button asChild>
                <a href={href} onClick={() => setOpen(false)}>
                  Download CSV
                </a>
              </Button>
            ) : (
              <Button disabled>Download CSV</Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ScopeOption({
  id,
  label,
  count,
  checked,
  onSelect,
}: {
  id: string
  label: string
  count: number
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
    >
      <input
        id={id}
        type="radio"
        name="export-scope"
        className="size-4 accent-blue-500"
        checked={checked}
        onChange={onSelect}
      />
      {label}
      <span className="text-gray-500 tabular-nums">
        ({count.toLocaleString()} {count === 1 ? "payment" : "payments"})
      </span>
    </label>
  )
}
