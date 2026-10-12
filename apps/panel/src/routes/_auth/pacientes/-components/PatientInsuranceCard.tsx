import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Patient } from '@/types/patient';

type PatientInsuranceCardProps = {
    patient: Pick<Patient, 'insurance_provider' | 'insurance_member_number'>;
};

// Always rendered, so a private ("particular") patient reads as such rather than as missing data.
export function PatientInsuranceCard({ patient }: PatientInsuranceCardProps) {
    const provider = patient.insurance_provider;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Obra social</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                {provider ? (
                    <>
                        <p className="text-sm font-medium">{provider.name}</p>
                        {patient.insurance_member_number && (
                            <p className="text-sm tabular-nums">
                                N° de afiliado:{' '}
                                {patient.insurance_member_number}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Particular (sin obra social)
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
