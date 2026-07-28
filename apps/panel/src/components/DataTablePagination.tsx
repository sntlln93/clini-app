import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

type DataTablePaginationProps = {
    currentPage: number;
    lastPage: number;
    total: number;
    label: string;
    onPageChange: (page: number) => void;
};

export function DataTablePagination({
    currentPage,
    lastPage,
    total,
    label,
    onPageChange,
}: DataTablePaginationProps) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
                Página {currentPage} de {lastPage} ({total} {label})
            </p>
            <Pagination className="mx-0 w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            disabled={currentPage <= 1}
                            onClick={() =>
                                onPageChange(Math.max(1, currentPage - 1))
                            }
                        />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext
                            disabled={currentPage >= lastPage}
                            onClick={() =>
                                onPageChange(
                                    Math.min(lastPage, currentPage + 1),
                                )
                            }
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
