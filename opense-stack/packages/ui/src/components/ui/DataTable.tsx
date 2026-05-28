import { ArrowDown, ArrowUp } from "lucide-react";
import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  isValidElement,
} from "react";
import { cn } from "../../lib/cn";
import { Button, type ButtonProps } from "./Button";
import { FilterDropdown, type FilterDropdownOption } from "./FilterDropdown";
import { Pagination } from "./Pagination";

type DataTableAlign = "left" | "center" | "right";
type DataTableVariant = "default" | "boxed" | "dashboard" | "operational";

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
    tableWrap: "border-0 rounded-none bg-[var(--color-table-row-bg)]",
    table: "bg-[var(--color-table-row-bg)]",
    headerCell:
      "sticky top-0 z-[1] border-b border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-4 py-4 uppercase",
    bodyCell:
      "border-b border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer:
      "border-t border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-6 py-4",
  },
  boxed: {
    tableWrap:
      "rounded-[var(--radius-xl)] bg-[var(--color-table-row-bg)] px-3 py-2",
    table: "bg-[var(--color-table-row-bg)]",
    headerCell:
      "sticky top-0 z-[1] border-b border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-4 py-4 uppercase",
    bodyCell:
      "border-b border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer:
      "border-t border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-6 py-4",
  },
  dashboard: {
    tableWrap: "border-0 bg-[var(--color-table-row-bg)]",
    table: "bg-[var(--color-table-row-bg)]",
    headerCell:
      "sticky top-0 z-[1] border-b border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-4 py-4 uppercase",
    bodyCell:
      "border-b border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer:
      "border-t border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-6 py-4",
  },
  operational: {
    tableWrap: "border-0 bg-[var(--color-table-row-bg)]",
    table: "bg-[var(--color-table-row-bg)]",
    headerCell:
      "border-b border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-4 py-4 uppercase",
    bodyCell:
      "border-b border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-4 py-3 align-middle",
    emptyStateCell: "px-4 py-6 text-center",
    footer:
      "border-t border-[var(--color-table-border)] bg-[var(--color-table-row-bg)] px-6 py-4",
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

type DataTableSelectionProps<Row> = {
  selectedRowIds: Set<string>;
  onToggleRow: (row: Row, rowId: string, index: number) => void;
  onToggleAll?: () => void;
  isRowDisabled?: boolean | ((row: Row, index: number) => boolean);
  selectAllLabel?: string;
  getRowLabel?: (row: Row, index: number) => string;
  columnWidth?: CSSProperties["width"];
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableTopRowFilter = {
  id?: string;
  value: string;
  options: FilterDropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
};

export type DataTableTopRowAction = {
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  title?: string;
  className?: string;
};

export type DataTableTopRowConfig = {
  filters?: DataTableTopRowFilter[];
  left?: ReactNode;
  right?: ReactNode;
  actions?: DataTableTopRowAction[];
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
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
  topRow?: ReactNode | DataTableTopRowConfig;
  topRowClassName?: string;
  topRowCellClassName?: string;
  bottomRow?: ReactNode;
  bottomRowClassName?: string;
  bottomRowCellClassName?: string;
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
  selection?: DataTableSelectionProps<Row>;
};

const topRowConfigKeys = [
  "filters",
  "left",
  "right",
  "actions",
  "className",
  "leftClassName",
  "rightClassName",
];

function isDataTableTopRowConfig(
  topRow: unknown,
): topRow is DataTableTopRowConfig {
  if (
    typeof topRow !== "object" ||
    topRow === null ||
    Array.isArray(topRow) ||
    isValidElement(topRow)
  ) {
    return false;
  }

  const keys = Object.keys(topRow);
  return (
    keys.length === 0 || keys.some((key) => topRowConfigKeys.includes(key))
  );
}

function hasTopRowSlotContent(slot: ReactNode) {
  return slot !== undefined && slot !== null && slot !== false;
}

function hasStructuredTopRowContent(topRow: DataTableTopRowConfig) {
  return Boolean(
    topRow.filters?.length ||
      topRow.actions?.length ||
      hasTopRowSlotContent(topRow.left) ||
      hasTopRowSlotContent(topRow.right),
  );
}

function renderStructuredTopRow(topRow: DataTableTopRowConfig) {
  if (!hasStructuredTopRowContent(topRow)) {
    return null;
  }

  const leftContent = Boolean(
    topRow.filters?.length || hasTopRowSlotContent(topRow.left),
  );
  const rightContent = Boolean(
    hasTopRowSlotContent(topRow.right) || topRow.actions?.length,
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        topRow.className,
      )}
    >
      {leftContent ? (
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-2",
            topRow.leftClassName,
          )}
        >
          {topRow.filters?.map((filter, index) => (
            <FilterDropdown
              key={filter.id ?? index}
              value={filter.value}
              options={filter.options}
              onChange={filter.onChange}
              ariaLabel={filter.ariaLabel}
              className={filter.className}
              menuClassName={filter.menuClassName}
            />
          ))}
          {topRow.left}
        </div>
      ) : null}

      {rightContent ? (
        <div
          className={cn(
            "ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2",
            topRow.rightClassName,
          )}
        >
          {topRow.right}
          {topRow.actions?.map((action, index) => (
            <Button
              key={action.id ?? index}
              type="button"
              variant={action.variant}
              size={action.size ?? "sm"}
              disabled={action.disabled}
              loading={action.loading}
              aria-label={action.ariaLabel}
              title={action.title}
              className={action.className}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  bottomRow,
  bottomRowClassName,
  bottomRowCellClassName,
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
  selection,
}: DataTableProps<Row, SortKey>) {
  const totalPages =
    pagination?.totalPages ??
    (typeof pagination?.totalItems === "number" &&
    typeof pagination?.itemsPerPage === "number"
      ? Math.max(1, Math.ceil(pagination.totalItems / pagination.itemsPerPage))
      : 1);
  const variantClassNames = dataTableVariantClassNames[variant];
  const columnSpan = columns.length + (selection ? 1 : 0);
  const selectableRows = selection
    ? rows
        .map((row, index) => ({ row, index }))
        .filter(({ row, index }) => {
          if (typeof selection.isRowDisabled === "function") {
            return !selection.isRowDisabled(row, index);
          }
          return !selection.isRowDisabled;
        })
    : [];
  const allVisibleRowsSelected =
    Boolean(selection) &&
    selectableRows.length > 0 &&
    selectableRows.every(({ row, index }) =>
      selection!.selectedRowIds.has(getRowId(row, index)),
    );
  const someVisibleRowsSelected =
    Boolean(selection) &&
    selectableRows.some(({ row, index }) =>
      selection!.selectedRowIds.has(getRowId(row, index)),
    );
  const renderedTopRow: ReactNode = isDataTableTopRowConfig(topRow)
    ? renderStructuredTopRow(topRow)
    : topRow;

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div
        className={cn(
          "table-wrap min-h-0 w-full flex-1 overflow-auto",
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
          {selection ||
          columns.some((column) => typeof column.width !== "undefined") ? (
            <colgroup>
              {selection ? (
                <col style={{ width: selection.columnWidth ?? 44 }} />
              ) : null}
              {columns.map((column) => (
                <col key={column.id} style={{ width: column.width }} />
              ))}
            </colgroup>
          ) : null}

          <thead className={theadClassName}>
            {renderedTopRow ? (
              <tr className={topRowClassName}>
                <td
                  colSpan={columnSpan}
                  className={cn(
                    variantClassNames.bodyCell,
                    tableCellTextClassName,
                    topRowCellClassName,
                  )}
                >
                  {renderedTopRow}
                </td>
              </tr>
            ) : null}

            <tr>
              {selection ? (
                <th
                  className={cn(
                    variantClassNames.headerCell,
                    tableHeaderTextClassName,
                    alignmentClassNames.center,
                    selection.headerClassName,
                  )}
                  style={alignmentStyles.center}
                >
                  <span className="inline-flex items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={
                        selection.selectAllLabel ?? "Select all visible rows"
                      }
                      checked={allVisibleRowsSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            someVisibleRowsSelected && !allVisibleRowsSelected;
                        }
                      }}
                      disabled={!selection.onToggleAll || selectableRows.length === 0}
                      onChange={selection.onToggleAll}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </span>
                </th>
              ) : null}
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnSpan}
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
                    {selection ? (
                      <td
                        className={cn(
                          variantClassNames.bodyCell,
                          tableCellTextClassName,
                          index === rows.length - 1 && "border-b-0",
                          alignmentClassNames.center,
                          selection.cellClassName,
                        )}
                        style={alignmentStyles.center}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${
                            selection.getRowLabel?.(row, index) ??
                            getRowId(row, index)
                          }`}
                          checked={selection.selectedRowIds.has(
                            getRowId(row, index),
                          )}
                          disabled={
                            typeof selection.isRowDisabled === "function"
                              ? selection.isRowDisabled(row, index)
                              : selection.isRowDisabled
                          }
                          onChange={() =>
                            selection.onToggleRow(row, getRowId(row, index), index)
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                    ) : null}
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
            {bottomRow ? (
              <tr className={bottomRowClassName}>
                <td
                  colSpan={columnSpan}
                  className={cn(
                    variantClassNames.bodyCell,
                    tableCellTextClassName,
                    "border-b-0",
                    bottomRowCellClassName,
                  )}
                >
                  {bottomRow}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div
          className={cn(
            "table-footer shrink-0",
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
