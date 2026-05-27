import { type ReactNode } from "react";
import { Button } from "../ui/Button";
import { StockStatusFilterDropdown } from "../ui/InventoryToolbarControls";
import { StackLayout } from "../layout/StackLayout";

type OrganisationTeamsPageProps = {
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: { value: string; label: string }[];
  canManageTeam: boolean;
  onInviteClick?: () => void;
  inviteLabel?: string;
  inviteIcon?: ReactNode;
  tableContent: ReactNode;
  secondaryContent?: ReactNode;
};

export function OrganisationTeamsPage({
  filterValue,
  onFilterChange,
  filterOptions,
  canManageTeam,
  onInviteClick,
  inviteLabel = "Actions",
  inviteIcon,
  tableContent,
  secondaryContent,
}: OrganisationTeamsPageProps) {
  return (
    <StackLayout className="min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col items-center justify-between gap-4 px-1 py-2 sm:flex-row">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <StockStatusFilterDropdown
              value={filterValue}
              options={filterOptions}
              onChange={onFilterChange}
              ariaLabel="Team role filter"
              menuClassName="min-w-[180px]"
            />
          </div>

          {canManageTeam && onInviteClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onInviteClick}
              className="w-full sm:w-auto"
            >
              {inviteIcon}
              {inviteLabel}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{tableContent}</div>
      </div>

      {secondaryContent}
    </StackLayout>
  );
}
