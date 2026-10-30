import { Button } from '@/components/ui/button';
import type { MedicationProduct } from '@/types/medication';

type MedicationSuggestionsProps = {
    products: MedicationProduct[];
    onPick: (product: MedicationProduct) => void;
};

// The catalog products that match what was typed (#377): picking one fills
// the item; ignoring them keeps it free text.
export function MedicationSuggestions({
    products,
    onPick,
}: MedicationSuggestionsProps) {
    if (products.length === 0) {
        return null;
    }

    return (
        <ul
            aria-label="Sugerencias del Vademécum Nacional"
            className="max-h-64 space-y-1 overflow-auto rounded-lg border p-1"
        >
            {products.map((product) => (
                <li key={product.gtin}>
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full flex-col items-start gap-0 py-1.5 text-left whitespace-normal"
                        onClick={() => onPick(product)}
                    >
                        <span className="font-medium wrap-break-word">
                            {product.commercial_name}
                        </span>
                        <span className="text-xs font-normal wrap-break-word text-muted-foreground">
                            {product.generic_name} ·{' '}
                            {product.pharmaceutical_form.toLowerCase()},{' '}
                            {product.presentation.toLowerCase()}
                        </span>
                    </Button>
                </li>
            ))}
        </ul>
    );
}
