import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
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

type PageWindowItem =
    | { type: 'page'; page: number }
    | { type: 'ellipsis-left' }
    | { type: 'ellipsis-right' };

function buildPageWindow(
    currentPage: number,
    lastPage: number,
): PageWindowItem[] {
    const windowStart = Math.max(1, currentPage - 1);
    const windowEnd = Math.min(lastPage, currentPage + 1);

    const pages = new Set<number>([1, lastPage]);
    for (let page = windowStart; page <= windowEnd; page++) {
        pages.add(page);
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    const items: PageWindowItem[] = [];
    sortedPages.forEach((page, index) => {
        const previousPage = sortedPages[index - 1];
        if (previousPage !== undefined && page - previousPage > 1) {
            items.push({
                type: previousPage === 1 ? 'ellipsis-left' : 'ellipsis-right',
            });
        }
        items.push({ type: 'page', page });
    });

    return items;
}

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

    const pageWindow = buildPageWindow(currentPage, lastPage);

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
                    {pageWindow.map((item) =>
                        item.type === 'page' ? (
                            <PaginationItem key={`page-${item.page}`}>
                                <PaginationLink
                                    isActive={item.page === currentPage}
                                    onClick={() => onPageChange(item.page)}
                                >
                                    {item.page}
                                </PaginationLink>
                            </PaginationItem>
                        ) : (
                            <PaginationItem key={item.type}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        ),
                    )}
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
