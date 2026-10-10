import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';

type KpiCardProps = {
    title: string;
    value: string;
    /** One short line per supporting figure, under the headline number. */
    details?: ReactNode[];
    hint?: string;
};

/** A stat tile: one headline number, its supporting figures in muted ink, no chart. */
export function KpiCard({ title, value, details = [], hint }: KpiCardProps) {
    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <p className="text-3xl tracking-tight tabular-nums">{value}</p>
                {details.map((detail, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                        {detail}
                    </p>
                ))}
                {hint && (
                    <p className="pt-1 text-xs text-muted-foreground italic">
                        {hint}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
