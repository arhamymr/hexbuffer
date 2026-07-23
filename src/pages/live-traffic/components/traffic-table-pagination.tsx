import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export interface TrafficTablePaginationProps {
  showingStart: number;
  showingEnd: number;
  total: number;
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function TrafficTablePagination({
  showingStart,
  showingEnd,
  total,
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  isLoading,
  onPreviousPage,
  onNextPage,
}: TrafficTablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20 text-xs shrink-0 select-none">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>
          Showing {showingStart} – {showingEnd} of {total} item{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage || isLoading}
          className="h-6 text-[11px] px-2"
        >
          <CaretLeftIcon className="size-3 mr-1" />
          Previous
        </Button>
        <span className="text-[11px] font-medium text-muted-foreground px-1">
          Page {page} of {totalPages}
        </span>
        <Button
          size="xs"
          variant="outline"
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          className="h-6 text-[11px] px-2"
        >
          Next
          <CaretRightIcon className="size-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
