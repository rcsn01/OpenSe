import { useMemo, useState } from "react";
import { useReportsData } from "../../hooks/queries/useReports";
import "./CustomReportsSurface.css";

type Template = {
  id: string;
  name: string;
  fields: FieldId[];
};

type Schedule = {
  id: string;
  report_type: string;
  cadence: "daily" | "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string | null;
  recipients: string[] | null;
  created_at: string;
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "weekly-stockout-warning",
    name: "Weekly Stockout Warning",
    fields: [
      "sku",
      "productName",
      "category",
      "currentStock",
      "unitCost",
      "totalValue",
    ],
  },
  {
    id: "end-of-month-valuation",
    name: "End of Month Valuation",
    fields: [
      "sku",
      "productName",
      "currentStock",
      "unitCost",
      "totalValue",
      "margin",
    ],
  },
  {
    id: "q3-procurement-efficiency",
    name: "Q3 Procurement Efficiency",
    fields: [
      "sku",
      "productName",
      "unitCost",
      "cogs",
      "supplierName",
      "weeklyVelocity",
    ],
  },
  {
    id: "daily-shrinkage-report",
    name: "Daily Shrinkage Report",
    fields: [
      "sku",
      "productName",
      "category",
      "currentStock",
      "daysInInventory",
      "lastScanned",
    ],
  },
];

const FIELD_GROUPS = [
  {
    id: "inventory",
    title: "Inventory Fields",
    icon: "cube",
    fields: [
      { id: "sku", label: "SKU" },
      { id: "productName", label: "Product Name" },
      { id: "category", label: "Category" },
      { id: "currentStock", label: "Current Stock" },
      { id: "reorderPoint", label: "Reorder Point" },
      { id: "location", label: "Location" },
    ],
  },
  {
    id: "financial",
    title: "Financial Metrics",
    icon: "chart",
    fields: [
      { id: "unitCost", label: "Unit Cost" },
      { id: "totalValue", label: "Total Value" },
      { id: "sellingPrice", label: "Selling Price" },
      { id: "margin", label: "Margin" },
      { id: "cogs", label: "COGS" },
      { id: "holdingCost", label: "Holding Cost" },
    ],
  },
  {
    id: "activity",
    title: "Activity Data",
    icon: "clock",
    fields: [
      { id: "lastScanned", label: "Last Scanned" },
      { id: "lastReceived", label: "Last Received" },
      { id: "daysInInventory", label: "Days in Inventory" },
      { id: "weeklyVelocity", label: "Weekly Velocity" },
      { id: "supplierName", label: "Supplier Name" },
    ],
  },
] as const;

type FieldId = (typeof FIELD_GROUPS)[number]["fields"][number]["id"];

const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatReportType = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTimeOfDay = (value: string | null) => {
  if (!value) return "8:00 AM";
  const [hours = "08", minutes = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCadence = (schedule: Schedule) => {
  const timeLabel = formatTimeOfDay(schedule.time_of_day);

  if (schedule.cadence === "daily") return `Every day at ${timeLabel}`;
  if (schedule.cadence === "monthly")
    return `Day ${schedule.day_of_month ?? 1} at ${timeLabel}`;
  return `Every ${weekdayLabels[schedule.day_of_week ?? 1]} at ${timeLabel}`;
};

const fallbackSchedule: Schedule = {
  id: "fallback-schedule",
  report_type: "weekly_stockout_warning",
  cadence: "weekly",
  day_of_week: 1,
  day_of_month: null,
  time_of_day: "08:00:00",
  recipients: ["operations@company.com"],
  created_at: new Date().toISOString(),
};

const DATE_RANGE_OPTIONS = [
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "quarter", label: "This Quarter" },
  { value: "ytd", label: "Year to Date" },
];

const SORT_OPTIONS = [
  { value: "total-value-desc", label: "Total Value (Desc)" },
  { value: "total-value-asc", label: "Total Value (Asc)" },
  { value: "stock-desc", label: "Current Stock (Desc)" },
  { value: "stock-asc", label: "Current Stock (Asc)" },
  { value: "name-asc", label: "Product Name (A-Z)" },
];

const Icon = ({
  name,
}: {
  name: "plus" | "file" | "dots" | "cube" | "chart" | "clock";
}) => {
  if (name === "plus") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  if (name === "dots") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    );
  }
  if (name === "cube") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2z" />
        <path d="M12 22V11.5" />
        <path d="M20 6.5 12 11.5 4 6.5" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="20" x2="20" y2="20" />
        <line x1="7" y1="16" x2="7" y2="10" />
        <line x1="12" y1="16" x2="12" y2="4" />
        <line x1="17" y1="16" x2="17" y2="8" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
};

export const CustomSavedReportsTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { data } = useReportsData(companyId);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState(
    DEFAULT_TEMPLATES[0].id,
  );
  const [selectedFields, setSelectedFields] = useState<FieldId[]>(
    DEFAULT_TEMPLATES[0].fields,
  );
  const [dateRange, setDateRange] = useState("last-30-days");
  const [sortBy, setSortBy] = useState("total-value-desc");

  const schedules = (data?.schedules ?? []) as Schedule[];
  const featuredSchedule = schedules[0] ?? fallbackSchedule;

  const activeTemplate = useMemo(
    () =>
      templates.find((template) => template.id === activeTemplateId) ?? null,
    [templates, activeTemplateId],
  );

  const fieldLookup = useMemo(
    () =>
      new Map(
        FIELD_GROUPS.flatMap((group) =>
          group.fields.map(
            (field) =>
              [field.id, { ...field, groupTitle: group.title }] as const,
          ),
        ),
      ),
    [],
  );

  const selectedFieldDetails = useMemo(
    () =>
      selectedFields
        .map((fieldId) => {
          const field = fieldLookup.get(fieldId);
          if (!field) return null;
          return {
            id: fieldId,
            label: field.label,
            groupTitle: field.groupTitle,
          };
        })
        .filter((field): field is NonNullable<typeof field> => field !== null),
    [fieldLookup, selectedFields],
  );

  const selectedGroupCount = useMemo(
    () =>
      FIELD_GROUPS.filter((group) =>
        group.fields.some((field) => selectedFields.includes(field.id)),
      ).length,
    [selectedFields],
  );

  const activeDateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)?.label ??
    "Last 30 Days";

  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
    "Total Value (Desc)";

  const scheduleRecipients =
    featuredSchedule.recipients ?? fallbackSchedule.recipients ?? [];
  const productCount = data?.products?.length ?? 0;
  const activeScheduleCount = schedules.length || 1;

  const handleTemplateSelect = (template: Template) => {
    setActiveTemplateId(template.id);
    setSelectedFields(template.fields);
  };

  const handleStartBlankReport = () => {
    setActiveTemplateId("");
    setSelectedFields([]);
  };

  const handleFieldToggle = (fieldId: FieldId) => {
    setSelectedFields((current) => {
      if (current.includes(fieldId)) {
        return current.filter((field) => field !== fieldId);
      }
      return [...current, fieldId];
    });
  };

  const handleSaveTemplate = () => {
    const nextTemplate: Template = {
      id: `custom-template-${Date.now()}`,
      name: `Custom Report ${templates.filter((item) => item.id.startsWith("custom-template-")).length + 1}`,
      fields: selectedFields,
    };

    setTemplates((current) => [nextTemplate, ...current]);
    setActiveTemplateId(nextTemplate.id);
  };

  return (
    <div className="custom-reports-studio">
      <section className="custom-reports-hero">
        <div className="custom-reports-hero-copy">
          <p className="custom-reports-eyebrow">Custom &amp; Saved Reports</p>
          <h3 className="custom-reports-title">Report Builder</h3>
          <p className="custom-reports-description">
            Build repeatable inventory, financial, and activity views without
            leaving the reports workspace.
          </p>
        </div>

        <div className="custom-reports-hero-actions">
          <button
            type="button"
            className="custom-reports-action-button custom-reports-action-button--ghost"
            onClick={handleSaveTemplate}
          >
            Save Template
          </button>
          <button
            type="button"
            className="custom-reports-action-button custom-reports-primary-action"
          >
            Generate Report
          </button>
        </div>
      </section>

      <div className="custom-reports-summary-row">
        <div className="custom-reports-summary-item">
          <span className="custom-reports-summary-label">Saved templates</span>
          <strong className="custom-reports-summary-value">
            {templates.length}
          </strong>
          <span className="custom-reports-summary-detail">
            Ready-to-run layouts
          </span>
        </div>
        <div className="custom-reports-summary-item">
          <span className="custom-reports-summary-label">Selected fields</span>
          <strong className="custom-reports-summary-value">
            {selectedFields.length}
          </strong>
          <span className="custom-reports-summary-detail">
            {selectedGroupCount} data groups included
          </span>
        </div>
        <div className="custom-reports-summary-item">
          <span className="custom-reports-summary-label">
            Scheduled delivery
          </span>
          <strong className="custom-reports-summary-value">
            {activeScheduleCount}
          </strong>
          <span className="custom-reports-summary-detail">
            {formatCadence(featuredSchedule)}
          </span>
        </div>
        <div className="custom-reports-summary-item">
          <span className="custom-reports-summary-label">Preview rows</span>
          <strong className="custom-reports-summary-value">
            {productCount}
          </strong>
          <span className="custom-reports-summary-detail">
            Products available in this workspace
          </span>
        </div>
      </div>

      <div className="custom-reports-layout">
        <aside className="custom-reports-rail">
          <section className="custom-reports-section">
            <div className="custom-reports-section-header">
              <div className="flex flex-col gap-1">
                <p className="custom-reports-section-kicker">Library</p>
                <h4 className="custom-reports-section-title">
                  Saved Templates
                </h4>
              </div>
              <button
                className="custom-reports-action-button custom-reports-action-button--ghost custom-reports-action-button--sm custom-reports-section-action"
                type="button"
                onClick={handleStartBlankReport}
              >
                <Icon name="plus" />
                Blank Report
              </button>
            </div>
            <p className="custom-reports-section-copy">
              Start from the reports your team already depends on, then branch
              into a custom version.
            </p>

            <div className="template-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-item ${template.id === activeTemplateId ? "active" : ""}`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <span className="template-item-icon">
                    <Icon name="file" />
                  </span>
                  <span className="template-item-body">
                    <span className="template-item-content">
                      {template.name}
                    </span>
                    <span className="template-item-meta">
                      {template.fields.length} fields
                    </span>
                  </span>
                  <span className="template-item-action" aria-hidden="true">
                    <Icon name="dots" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="custom-reports-section">
            <div className="custom-reports-section-header">
              <div className="flex flex-col gap-1">
                <p className="custom-reports-section-kicker">Automation</p>
                <h4 className="custom-reports-section-title">
                  Scheduled Delivery
                </h4>
              </div>
              <span className="custom-reports-pill">
                {activeScheduleCount} active
              </span>
            </div>
            <p className="custom-reports-section-copy">
              Keep recurring stakeholders updated with a delivery cadence tied
              to the saved report they need.
            </p>

            <div className="schedule-card">
              <div className="schedule-card-header">
                <span className="schedule-card-icon">
                  <Icon name="clock" />
                </span>
                <div className="flex flex-col gap-1">
                  <div className="schedule-card-title">
                    {formatReportType(featuredSchedule.report_type)}
                  </div>
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    {formatCadence(featuredSchedule)}
                  </div>
                </div>
              </div>
              <div className="schedule-card-divider" />
              <div className="schedule-card-meta-row">
                <span className="custom-reports-meta-label">Recipients</span>
                <span className="custom-reports-meta-value">
                  {scheduleRecipients.length}
                </span>
              </div>
              <div className="schedule-card-recipient">
                {scheduleRecipients[0] ?? "operations@company.com"}
              </div>
            </div>
          </section>
        </aside>

        <div className="custom-reports-main">
          <div className="custom-reports-workbench">
            <section className="custom-reports-builder">
              <div className="custom-reports-builder-header">
                <div className="flex flex-col gap-1">
                  <p className="custom-reports-section-kicker">Builder</p>
                  <h4 className="custom-reports-builder-title">
                    Report Builder
                  </h4>
                  <p className="custom-reports-section-copy">
                    Toggle the exact fields you want in the final export. Saved
                    templates update the field selection instantly.
                  </p>
                </div>
                {activeTemplate ? (
                  <div className="custom-reports-active-note">
                    Loaded from saved template. {selectedFields.length} fields
                    selected.
                  </div>
                ) : null}
              </div>

              <div className="builder-fields-grid">
                {FIELD_GROUPS.map((group) => {
                  const selectedInGroup = group.fields.filter((field) =>
                    selectedFields.includes(field.id),
                  ).length;

                  return (
                    <section
                      key={group.id}
                      className="builder-field-column"
                    >
                      <div className="builder-group-header">
                        <div
                          className="flex items-start gap-2.5"
                        >
                          <span className="builder-group-icon">
                            <Icon name={group.icon} />
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <div className="builder-group-title">
                              {group.title}
                            </div>
                            <div className="builder-group-meta">
                              {selectedInGroup} selected
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="builder-field-list">
                        {group.fields.map((field) => {
                          const isSelected = selectedFields.includes(field.id);

                          return (
                            <label
                              key={field.id}
                              className={`builder-field-option ${isSelected ? "is-selected" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleFieldToggle(field.id)}
                              />
                              <span className="builder-field-copy">
                                <span className="builder-field-label">
                                  {field.label}
                                </span>
                                <span className="builder-field-helper">
                                  {isSelected
                                    ? "Included in output"
                                    : "Optional field"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <aside className="custom-reports-preview">
              <section className="custom-reports-preview-section">
                <p className="custom-reports-section-kicker">Output</p>
                <h4 className="custom-reports-preview-title">
                  Selected Output
                </h4>
                <p className="custom-reports-section-copy">
                  Use this panel to sanity-check the shape of the report before
                  you generate or save it.
                </p>
              </section>

              <section className="custom-reports-preview-section">
                <div className="custom-reports-preview-grid">
                  <div className="custom-reports-preview-stat">
                    <span className="custom-reports-meta-label">
                      Date Range
                    </span>
                    <span className="custom-reports-meta-value">
                      {activeDateRangeLabel}
                    </span>
                  </div>
                  <div className="custom-reports-preview-stat">
                    <span className="custom-reports-meta-label">
                      Sort Order
                    </span>
                    <span className="custom-reports-meta-value">
                      {activeSortLabel}
                    </span>
                  </div>
                  <div className="custom-reports-preview-stat">
                    <span className="custom-reports-meta-label">
                      Rows Available
                    </span>
                    <span className="custom-reports-meta-value">
                      {productCount}
                    </span>
                  </div>
                  <div className="custom-reports-preview-stat">
                    <span className="custom-reports-meta-label">
                      First Recipient
                    </span>
                    <span className="custom-reports-meta-value">
                      {scheduleRecipients[0] ?? "operations@company.com"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="custom-reports-preview-section">
                <div className="custom-reports-preview-heading">
                  <span className="custom-reports-meta-label">
                    Included Fields
                  </span>
                  <span className="custom-reports-preview-count">
                    {selectedFieldDetails.length}
                  </span>
                </div>
                {selectedFieldDetails.length ? (
                  <div className="custom-reports-chip-list">
                    {selectedFieldDetails.map((field) => (
                      <span key={field.id} className="custom-reports-chip">
                        <span className="custom-reports-chip-label">
                          {field.label}
                        </span>
                        <span className="custom-reports-chip-group">
                          {field.groupTitle}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="custom-reports-empty-state">
                    Choose fields from the builder to preview the final report
                    output here.
                  </p>
                )}
              </section>

              <section className="custom-reports-preview-section">
                <div className="custom-reports-preview-heading">
                  <span className="custom-reports-meta-label">
                    Filters & Sorting
                  </span>
                </div>
                <div className="builder-filters-row">
                  <label className="custom-reports-filter-control">
                    <span className="custom-reports-filter-label">
                      Date range
                    </span>
                    <select
                      className="custom-reports-select"
                      value={dateRange}
                      onChange={(event) => setDateRange(event.target.value)}
                    >
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="custom-reports-filter-control">
                    <span className="custom-reports-filter-label">Sort by</span>
                    <select
                      className="custom-reports-select"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
