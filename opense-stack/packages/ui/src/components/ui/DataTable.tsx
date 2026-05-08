import { ArrowDown, ArrowUp } from "lucide-react";
import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Pagination } from "./Pagination";

type DataTableAlign = "left" | "center" | "right";
type DataTableVariant = "default" | "boxed" | "dashboard";

const alignmentClassNames: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const alignmentStyles: Record<DataTableAlign, CSSProperties> = {
  left: { textAlign: "left" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
};

const tableHeaderTextClassName =
  "text-[length:var(--typography-table-header-text-size)] leading-[var(--typography-table-header-text-line-height)] font-[var(--typography-table-header-text-weight)] tracking-[var(--typography-table-header-text-tracking)] text-[color:var(--typography-table-header-text-color)]";

const tableCellTextClassName =
  "text-[length:var(--typography-table-cell-text-size)] leading-[var(--typography-table-cell-text-line-height)] font-[var(--typography-table-cell-text-weight)] tracking-[var(--typography-table-cell-text-tracking)] text-[color:var(--typography-table-cell-text-color)]";

const dataTableVariantClassNames: Record<
  DataTableVariant,
  {
    tableWrap: string;
    table: string;
    headerCell: string;
    bodyCell: string;
    emptyStateCell: string;
    footer: string;
  }
> = {
  default: {
    tableWrap: "border-0 rounded-none bg-transparent",
    table: "bg-transparent",
    headerCell: "sticky top-0 z-[1] bg-transparent px-4 py-3 uppercase",
    bodyCell:
      "border-b border-[var(--color-shell-border)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer: "bg-transparent px-4 py-3",
  },
  boxed: {
    tableWrap:
      "rounded-[var(--radius-xl)] bg-[var(--color-surface-subtle)] px-3 py-2",
    table: "bg-transparent",
    headerCell: "sticky top-0 z-[1] bg-transparent px-4 py-3 uppercase",
    bodyCell:
      "border-b border-[var(--color-shell-border)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer: "px-4 py-3",
  },
  dashboard: {
    tableWrap: "border-0 bg-transparent",
    table: "bg-transparent",
    headerCell: "bg-transparent px-3 pt-0 pb-2.5 uppercase",
    bodyCell:
      "border-b border-[var(--color-shell-border)] px-3 py-2.5 align-top",
    emptyStateCell: "px-3 py-6 text-center",
    footer: "px-3 py-3 bg-transparent",
  },
};

export type DataTableColumn<Row, SortKey extends string = string> = {
  id: string;
  header: ReactNode;
  renderCell: (row: Row, index: number) => ReactNode;
  sortKey?: SortKey;
  sortable?: boolean;
  width?: CSSProperties["width"];
  align?: DataTableAlign;
  headerClassName?: string;
  cellClassName?: string;
  headerStyle?: CSSProperties;
  cellStyle?:
    | CSSProperties
    | ((row: Row, index: number) => CSSProperties | undefined);
};

type DataTablePaginationProps = {
  currentPage: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

type DataTableProps<Row, SortKey extends string = string> = {
  columns: Array<DataTableColumn<Row, SortKey>>;
  rows: Row[];
  getRowId: (row: Row, index: number) => string;
  variant?: DataTableVariant;
  emptyState?: ReactNode;
  className?: string;
  tableWrapClassName?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  footerClassName?: string;
  topRow?: ReactNode;
  topRowClassName?: string;
  topRowCellClassName?: string;
  minTableWidth?: CSSProperties["minWidth"];
  tableLayout?: CSSProperties["tableLayout"];
  sortField?: SortKey | null;
  sortDirection?: "asc" | "desc";
  onSortChange?: (sortKey: SortKey) => void;
  rowClassName?: string | ((row: Row, index: number) => string | undefined);
  getRowStyle?: (row: Row, index: number) => CSSProperties | undefined;
  getRowProps?: (
    row: Row,
    index: number,
  ) => HTMLAttributes<HTMLTableRowElement>;
  onRowClick?: (row: Row, index: number) => void;
  pagination?: DataTablePaginationProps;
};

export function DataTable<Row, SortKey extends string = string>({
  columns,
  rows,
  getRowId,
  variant = "default",
  emptyState,
  className,
  tableWrapClassName,
  tableClassName,
  theadClassName,
  tbodyClassName,
  footerClassName,
  topRow,
  topRowClassName,
  topRowCellClassName,
  minTableWidth,
  tableLayout,
  sortField,
  sortDirection = "asc",
  onSortChange,
  rowClassName,
  getRowStyle,
  getRowProps,
  onRowClick,
  pagination,
}: DataTableProps<Row, SortKey>) {
  const totalPages =
    pagination?.totalPages ??
    (typeof pagination?.totalItems === "number" &&
    typeof pagination?.itemsPerPage === "number"
      ? Math.max(1, Math.ceil(pagination.totalItems / pagination.itemsPerPage))
      : 1);
  const variantClassNames = dataTableVariantClassNames[variant];

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div
        className={cn(
          "table-wrap w-full overflow-auto",
          variantClassNames.tableWrap,
          tableWrapClassName,
        )}
      >
        <table
          className={cn(
            "table w-full border-collapse",
            variantClassNames.table,
            tableClassName,
          )}
          style={{ minWidth: minTableWidth, tableLayout }}
        >
          {columns.some((column) => typeof column.width !== "undefined") ? (
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} style={{ width: column.width }} />
              ))}
            </colgroup>
          ) : null}

          <thead className={theadClassName}>
            <tr>
              {columns.map((column) => {
                const align = column.align ?? "left";
                const isSortable = Boolean(
                  onSortChange && (column.sortable ?? column.sortKey),
                );
                const columnSortKey = (column.sortKey ?? column.id) as SortKey;
                const isActiveSort = isSortable && sortField === columnSortKey;
                const ariaSort = !isSortable
                  ? undefined
                  : isActiveSort
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";

                return (
                  <th
                    key={column.id}
                    aria-sort={ariaSort}
                    className={cn(
                      variantClassNames.headerCell,
                      tableHeaderTextClassName,
                      alignmentClassNames[align],
                      isSortable &&
                        "sortable-th cursor-pointer select-none transition-colors",
                      column.headerClassName,
                    )}
                    onClick={
                      isSortable
                        ? () => onSortChange?.(columnSortKey)
                        : undefined
                    }
                    style={{
                      ...alignmentStyles[align],
                      ...column.headerStyle,
                    }}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        align === "right" && "justify-end",
                        align === "center" && "justify-center",
                      )}
                    >
                      {column.header}
                      {isActiveSort ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className={tbodyClassName}>
            {topRow ? (
              <tr className={topRowClassName}>
                <td
                  colSpan={columns.length}
                  className={cn(
                    variantClassNames.bodyCell,
                    tableCellTextClassName,
                    topRowCellClassName,
                  )}
                >
                  {topRow}
                </td>
              </tr>
            ) : null}

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(
                    variantClassNames.emptyStateCell,
                    tableCellTextClassName,
                    "text-[color:var(--color-muted-foreground)]",
                  )}
                >
                  {emptyState ?? "No rows available."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const computedRowClassName =
                  typeof rowClassName === "function"
                    ? rowClassName(row, index)
                    : rowClassName;
                const rowProps = getRowProps?.(row, index) ?? {};
                const {
                  className: rowPropsClassName,
                  style: rowPropsStyle,
                  onClick: rowPropsOnClick,
                  ...restRowProps
                } = rowProps;

                return (
                  <tr
                    key={getRowId(row, index)}
                    {...restRowProps}
                    className={cn(
                      "transition-colors",
                      onRowClick && "cursor-pointer",
                      rowPropsClassName,
                      computedRowClassName,
                    )}
                    onClick={
                      rowPropsOnClick || onRowClick
                        ? (event) => {
                            rowPropsOnClick?.(event);
                            if (!event.defaultPrevented) {
                              onRowClick?.(row, index);
                            }
                          }
                        : undefined
                    }
                    style={{
                      ...rowPropsStyle,
                      ...getRowStyle?.(row, index),
                    }}
                  >
                    {columns.map((column) => {
                      const align = column.align ?? "left";
                      const computedCellStyle =
                        typeof column.cellStyle === "function"
                          ? column.cellStyle(row, index)
                          : column.cellStyle;

                      return (
                        <td
                          key={column.id}
                          className={cn(
                            variantClassNames.bodyCell,
                            tableCellTextClassName,
                            index === rows.length - 1 && "border-b-0",
                            alignmentClassNames[align],
                            column.cellClassName,
                          )}
                          style={{
                            ...alignmentStyles[align],
                            ...computedCellStyle,
                          }}
                        >
                          {column.renderCell(row, index)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div
          className={cn(
            "table-footer",
            variantClassNames.footer,
            footerClassName,
          )}
        >
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            onPageChange={pagination.onPageChange}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onItemsPerPageChange={pagination.onItemsPerPageChange}
            pageSizeOptions={pagination.pageSizeOptions}
            className={pagination.className}
          />
        </div>
      ) : null}
    </div>
  );
}
