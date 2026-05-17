import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Tailwind classes applied to both <th> and <td>. */
  className?: string;
  /** Hide on small screens. */
  hideOn?: "sm" | "md" | "lg";
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Empty-state message. */
  empty?: string;
  /** Optional click handler for whole row. */
  onRowClick?: (row: T) => void;
}

/**
 * Generic responsive data table. Use Column[] to declare columns.
 * Columns can be hidden at breakpoints via `hideOn`.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  onRowClick,
}: Props<T>) {
  const hideClass = (h?: "sm" | "md" | "lg") => {
    switch (h) {
      case "sm":
        return "hidden sm:table-cell";
      case "md":
        return "hidden md:table-cell";
      case "lg":
        return "hidden lg:table-cell";
      default:
        return "";
    }
  };

  return (
    <div className="card-premium rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "px-4 py-3.5 text-left text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                  hideClass(c.hideOn),
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                {empty ?? "No results."}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-foreground/[0.05]",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3.5 text-foreground align-middle",
                    hideClass(c.hideOn),
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
