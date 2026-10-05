/** Provisional mark until the brand identity lands (#236). */
export function BrandMark() {
    return (
        <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-primary"
        >
            <span className="size-3 rounded-[3px] border-[2.5px] border-primary-foreground" />
        </span>
    );
}
