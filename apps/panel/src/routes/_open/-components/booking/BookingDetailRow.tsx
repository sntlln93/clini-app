/** One term/value line of a booked appointment's `<dl>`: the confirmation's and the details page's. */
export function BookingDetailRow({
    term,
    value,
}: {
    term: string;
    value: string;
}) {
    return (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0 text-right font-medium wrap-break-word tabular-nums">
                {value}
            </dd>
        </div>
    );
}
