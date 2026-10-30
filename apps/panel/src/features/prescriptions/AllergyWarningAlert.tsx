import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { entryDetails } from '@/lib/medical-history';
import type { AllergyWarning, WarnedAllergy } from './allergy-warning';

type AllergyWarningAlertProps = {
    warning: AllergyWarning;
    isPending: boolean;
    onConfirm: () => void;
    onDismiss: () => void;
};

// «Penicilina · Urticaria · Severidad grave».
function WarnedAllergyItem({ allergy }: { allergy: WarnedAllergy }) {
    const details = entryDetails({ ...allergy, approximate_date: null });

    return (
        <li className="wrap-break-word">
            <span className="font-medium">{allergy.description}</span>
            {details && ` · ${details}`}
        </li>
    );
}

function hiddenMessage(warning: AllergyWarning): string {
    const count = warning.hiddenAllergyIds.length;
    const lead =
        count === 1
            ? 'El paciente tiene una alergia registrada que coincide con esta medicación.'
            : `El paciente tiene ${count} alergias registradas que coinciden con esta medicación.`;

    return warning.reasonRequired
        ? `${lead} Para verla, abrí su historia clínica con un acceso excepcional.`
        : `${lead} Pedile el código para verla.`;
}

// The medication matches current allergies of the patient (#362). It doesn't
// block: «Indicar igual» saves it, and the history records the confirmation.
export function AllergyWarningAlert({
    warning,
    isPending,
    onConfirm,
    onDismiss,
}: AllergyWarningAlertProps) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Alergia vigente</AlertTitle>
            <AlertDescription className="space-y-2">
                {warning.allergies.length > 0 && (
                    <>
                        <p>
                            Lo que indicás coincide con{' '}
                            {warning.allergies.length === 1
                                ? 'una alergia vigente del paciente:'
                                : 'alergias vigentes del paciente:'}
                        </p>
                        <ul className="list-inside list-disc">
                            {warning.allergies.map((allergy) => (
                                <WarnedAllergyItem
                                    key={allergy.id}
                                    allergy={allergy}
                                />
                            ))}
                        </ul>
                    </>
                )}
                {warning.hiddenAllergyIds.length > 0 && (
                    <p>{hiddenMessage(warning)}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending && <Spinner data-icon="inline-start" />}
                        Indicar igual
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onDismiss}
                    >
                        Revisar la medicación
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}
