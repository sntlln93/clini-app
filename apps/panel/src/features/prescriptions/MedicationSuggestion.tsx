import type { MedicationProduct } from '@/types/medication';
import { MedicationMarks } from './MedicationMarks';

type MedicationSuggestionProps = {
    product: MedicationProduct;
};

// «ergotamina+cafeína+asoc. · Montpellier».
function details(product: MedicationProduct): string {
    return [product.drug, product.laboratory].filter(Boolean).join(' · ');
}

// One catalog product offered under «Medicamento» (#377): its name and
// presentation, what it holds and who makes it, and its marks.
export function MedicationSuggestion({ product }: MedicationSuggestionProps) {
    return (
        <span className="flex min-w-0 flex-col items-start gap-0.5 py-0.5">
            <span className="font-medium wrap-break-word">
                {product.name}
                {product.presentation && ` — ${product.presentation}`}
            </span>
            {details(product) && (
                <span className="text-xs wrap-break-word text-muted-foreground">
                    {details(product)}
                </span>
            )}
            <MedicationMarks marks={product} />
        </span>
    );
}
