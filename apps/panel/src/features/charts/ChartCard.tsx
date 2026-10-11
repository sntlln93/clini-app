import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ChartNoAxesColumn } from 'lucide-react';
import type { ReactNode } from 'react';

export const EMPTY_CHART_MESSAGE = 'Sin datos para el período.';

type ChartCardProps = {
    title: string;
    description?: string;
    /** No data at all: the plot is replaced by a plain message, never a flat line at 0. */
    isEmpty: boolean;
    children: ReactNode;
};

export function ChartCard({
    title,
    description,
    isEmpty,
    children,
}: ChartCardProps) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {isEmpty ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
                        <ChartNoAxesColumn
                            className="size-6"
                            aria-hidden="true"
                        />
                        {EMPTY_CHART_MESSAGE}
                    </div>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}
